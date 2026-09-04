"""Recovery analytics and portfolio metrics."""

from typing import Dict, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import RevenueOpportunity, Customer, OpportunityStatus, OpportunityType
from recovery_engine import RecoveryRecommendationEngine
from recovery_models import (
    RecoveryPortfolioMetrics, RecoveryOpportunitySummary,
    RecoveryDashboardMetrics
)
from risk_analytics import RiskAnalytics


class RecoveryAnalytics:
    """Compute recovery intelligence metrics at portfolio level."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self.recovery_engine = RecoveryRecommendationEngine(db)
        self.risk_analytics = RiskAnalytics(db)
        self._db_id_cache = None  # Track db session for cache invalidation
        self._all_opportunities_cache = None  # Cache all at-risk opportunities
        self._recommendations_cache = None  # Cache recommendations computed during portfolio metrics
        self._customer_histories_cache = None  # Cache customer histories
    
    def get_portfolio_metrics(self) -> RecoveryPortfolioMetrics:
        """
        Get aggregated recovery metrics for merchant portfolio.
        Cache recommendations for reuse by get_recovery_queue.
        
        Returns:
            RecoveryPortfolioMetrics with portfolio-level insights
        """
        # Get all at-risk opportunities with eager loading
        from sqlalchemy.orm import joinedload
        at_risk_opps = self.db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.customer),
            joinedload(RevenueOpportunity.transaction)
        ).filter(
            RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE])
        ).all()
        
        if not at_risk_opps:
            return self._empty_portfolio_metrics()
        
        # Pre-fetch all customer opportunities with eager loading
        from sqlalchemy.orm import joinedload
        all_customer_opps = self.db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.customer),
            joinedload(RevenueOpportunity.transaction)
        ).filter(
            RevenueOpportunity.customer_id.in_(list(customer_ids))
        ).all() if customer_ids else []
        
        # Build customer history cache (store for reuse)
        customer_histories = {}
        for cust_id in customer_ids:
            cust_opps = [o for o in all_customer_opps if o.customer_id == cust_id]
            recovered_count = len([o for o in cust_opps if o.status == OpportunityStatus.RECOVERED])
            customer_histories[cust_id] = {
                "recovery_rate": recovered_count / len(cust_opps) if cust_opps else 0.5,
                "total_value": sum(o.amount for o in cust_opps) if cust_opps else 0,
            }
        
        self._customer_histories_cache = customer_histories  # Cache for get_recovery_queue
        
        # Get recommendations for all opportunities (cache for reuse)
        recommendations_by_id = {}  # Map opportunity_id -> recommendation
        recommendations = []
        total_contacts = 0
        action_distribution = {}
        
        for opp in at_risk_opps:
            # Get risk info
            risk_info = self.risk_analytics.compute_opportunity_risk(opp.id)
            
            # Use cached customer history
            customer_history = customer_histories.get(opp.customer_id, {
                "recovery_rate": 0.5,
                "total_value": 0,
            })
            
            # Get recommendation
            try:
                rec = self.recovery_engine.get_recommendation(opp, risk_info, customer_history)
                recommendations.append(rec)
                recommendations_by_id[opp.id] = (rec, risk_info)  # Cache for queue
                
                # Track action distribution
                action = rec.recommended_action
                action_distribution[action] = action_distribution.get(action, 0) + 1
                
                # Estimate contacts (some actions contact customer)
                if action not in ["NO_ACTION", "DELAY_AND_RETRY"]:
                    total_contacts += 1
            except Exception:
                pass
        
        self._recommendations_cache = recommendations_by_id  # Store for get_recovery_queue
        
        if not recommendations:
            return self._empty_portfolio_metrics()
        
        # Calculate metrics
        total_revenue_at_risk = sum(opp.amount for opp in at_risk_opps)
        
        total_expected_recoverable = sum(rec.expected_recovered_amount for rec in recommendations)
        
        expected_recovery_from_actions = sum(
            rec.expected_recovered_amount for rec in recommendations
            if rec.recommended_action != "NO_ACTION"
        )
        
        estimated_recovery_percentage = (
            (expected_recovery_from_actions / total_revenue_at_risk * 100)
            if total_revenue_at_risk > 0 else 0
        )
        
        high_priority_count = len([
            r for r in recommendations
            if r.expected_net_value > r.expected_recovered_amount * 0.3
        ])
        
        avg_recovery_probability = (
            sum(rec.recovery_probability for rec in recommendations) / len(recommendations)
            if recommendations else 0
        )
        
        avg_friction = (
            sum(rec.customer_friction_score for rec in recommendations) / len(recommendations)
            if recommendations else 0
        )
        
        # Estimate recovery effort
        estimated_effort_hours = len(at_risk_opps) * 0.25  # Roughly 15 min per opportunity
        
        return RecoveryPortfolioMetrics(
            total_revenue_at_risk=round(total_revenue_at_risk, 2),
            total_expected_recoverable_revenue=round(total_expected_recoverable, 2),
            expected_recovery_from_recommended_actions=round(expected_recovery_from_actions, 2),
            estimated_recovery_percentage=round(estimated_recovery_percentage, 1),
            high_priority_opportunity_count=high_priority_count,
            total_estimated_contacts=total_contacts,
            estimated_recovery_effort_hours=round(estimated_effort_hours, 1),
            average_recovery_probability=round(avg_recovery_probability, 3),
            average_friction_score=int(avg_friction),
            action_distribution=action_distribution
        )
    
    def get_recovery_queue(self, limit: int = 20) -> List[Dict]:
        """
        Get top recovery opportunities ranked by expected net value.
        Reuses recommendations cached by get_portfolio_metrics if available.
        
        Args:
            limit: Maximum number of opportunities to return
            
        Returns:
            List of top recovery opportunities
        """
        # If recommendations were already computed (by portfolio metrics call), reuse them
        if self._recommendations_cache is not None and self._customer_histories_cache is not None:
            at_risk_opps = self.db.query(RevenueOpportunity).filter(
                RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE])
            ).all()
            
            opportunities = []
            
            def get_recoverability_score(recoverability_enum):
                recoverability_str = recoverability_enum.value if hasattr(recoverability_enum, 'value') else str(recoverability_enum)
                if recoverability_str == "HIGH":
                    return 100
                elif recoverability_str == "MEDIUM":
                    return 66
                else:  # LOW
                    return 33
            
            # Reuse cached recommendations - no recomputation needed
            for opp in at_risk_opps:
                if opp.id in self._recommendations_cache:
                    rec, risk_info = self._recommendations_cache[opp.id]
                    
                    opportunities.append({
                        "opportunity_id": opp.id,
                        "amount": opp.amount,
                        "recommended_action": rec.recommended_action,
                        "expected_recovery": rec.expected_recovered_amount,
                        "recovery_probability": rec.recovery_probability,
                        "expected_net_value": rec.expected_net_value,
                        "customer_friction": rec.customer_friction_score,
                        "recommended_time": rec.next_best_time.recommended_date,
                        "risk_score": risk_info.get("risk_score", 0),
                        "recoverability_score": get_recoverability_score(opp.recoverability),
                        "status": opp.status.value,
                    })
            
            # Sort by expected net value descending
            opportunities.sort(key=lambda x: x["expected_net_value"], reverse=True)
            return opportunities[:limit]
        
        # Fallback: if portfolio metrics wasn't called, compute independently
        at_risk_opps = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE])
        ).all()
        
        # Pre-fetch all customer opportunities to avoid N+1 queries
        customer_ids = set(opp.customer_id for opp in at_risk_opps)
        all_customer_opps = self.db.query(RevenueOpportunity).filter(
            RevenueOpportunity.customer_id.in_(list(customer_ids))
        ).all() if customer_ids else []
        
        # Build customer history cache
        customer_histories = {}
        for cust_id in customer_ids:
            cust_opps = [o for o in all_customer_opps if o.customer_id == cust_id]
            recovered_count = len([o for o in cust_opps if o.status == OpportunityStatus.RECOVERED])
            customer_histories[cust_id] = {
                "recovery_rate": recovered_count / len(cust_opps) if cust_opps else 0.5,
                "total_value": sum(o.amount for o in cust_opps) if cust_opps else 0,
            }
        
        opportunities = []
        
        # Helper to convert recoverability enum to numeric score
        def get_recoverability_score(recoverability_enum):
            recoverability_str = recoverability_enum.value if hasattr(recoverability_enum, 'value') else str(recoverability_enum)
            if recoverability_str == "HIGH":
                return 100
            elif recoverability_str == "MEDIUM":
                return 66
            else:  # LOW
                return 33
        
        for opp in at_risk_opps:
            try:
                risk_info = self.risk_analytics.compute_opportunity_risk(opp.id)
                
                # Use cached customer history instead of querying
                customer_history = customer_histories.get(opp.customer_id, {
                    "recovery_rate": 0.5,
                    "total_value": 0,
                })
                
                rec = self.recovery_engine.get_recommendation(opp, risk_info, customer_history)
                
                opportunities.append({
                    "opportunity_id": opp.id,
                    "amount": opp.amount,
                    "recommended_action": rec.recommended_action,
                    "expected_recovery": rec.expected_recovered_amount,
                    "recovery_probability": rec.recovery_probability,
                    "expected_net_value": rec.expected_net_value,
                    "customer_friction": rec.customer_friction_score,
                    "recommended_time": rec.next_best_time.recommended_date,
                    "risk_score": risk_info.get("risk_score", 0),
                    "recoverability_score": get_recoverability_score(opp.recoverability),
                    "status": opp.status.value,
                })
            except Exception:
                pass
        
        # Sort by expected net value descending
        opportunities.sort(key=lambda x: x["expected_net_value"], reverse=True)
        
        return opportunities[:limit]
    
    def get_dashboard_metrics(self) -> RecoveryDashboardMetrics:
        """
        Get comprehensive recovery dashboard metrics.
        
        Returns:
            RecoveryDashboardMetrics with all dashboard data
        """
        portfolio = self.get_portfolio_metrics()
        queue = self.get_recovery_queue(10)
        
        # Get top opportunities as summaries
        top_opportunities = []
        for item in queue:
            opp = self.db.query(RevenueOpportunity).filter(
                RevenueOpportunity.id == item["opportunity_id"]
            ).first()
            
            if opp:
                top_opportunities.append(RecoveryOpportunitySummary(
                    opportunity_id=opp.id,
                    amount=opp.amount,
                    risk_score=item["risk_score"],
                    recoverability_score=50,  # Simplified
                    recommended_action=item["recommended_action"],
                    expected_recovery=item["expected_recovery"],
                    recovery_probability=item["recovery_probability"],
                    expected_net_value=item["expected_net_value"],
                    customer_friction=item["customer_friction"],
                    recommended_time=item["recommended_time"],
                    status=opp.status.value
                ))
        
        # Recovery potential by type
        recovery_by_type = self._get_recovery_by_opportunity_type()
        
        # Expected recovery timeline (next 30 days)
        timeline = self._get_expected_recovery_timeline()
        
        # Customer contact projection (next 7 days)
        contacts = self._get_customer_contact_projection()
        
        return RecoveryDashboardMetrics(
            portfolio_metrics=portfolio,
            top_opportunities=top_opportunities,
            action_distribution=portfolio.action_distribution,
            recovery_potential_by_type=recovery_by_type,
            expected_recovery_timeline=timeline,
            customer_contact_projection=contacts
        )
    
    def _get_recovery_by_opportunity_type(self) -> Dict[str, float]:
        """Get expected recovery potential by opportunity type."""
        by_type = {}
        
        for opp_type in OpportunityType:
            opps = self.db.query(RevenueOpportunity).filter(
                RevenueOpportunity.type == opp_type,
                RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE])
            ).all()
            
            if opps:
                total = sum(o.amount for o in opps)
                by_type[opp_type.value] = round(total, 2)
        
        return by_type
    
    def _get_expected_recovery_timeline(self) -> List[Dict]:
        """Get projected recovery amounts by day for next 30 days."""
        timeline = []
        now = datetime.utcnow()
        
        for day in range(30):
            target_date = now + timedelta(days=day)
            date_str = target_date.strftime("%Y-%m-%d")
            
            # Simplified: distributed recovery
            daily_expected = 5000 + (day * 100)  # Synthetic progression
            
            timeline.append({
                "date": date_str,
                "expected_recovery": daily_expected
            })
        
        return timeline
    
    def _get_customer_contact_projection(self) -> Dict[str, int]:
        """Get estimated customer contacts by day for next 7 days."""
        contacts = {}
        now = datetime.utcnow()
        
        for day in range(7):
            target_date = now + timedelta(days=day)
            date_str = target_date.strftime("%Y-%m-%d")
            
            # Simplified: varies by day
            estimated_contacts = 8 + (day * 2)
            
            contacts[date_str] = estimated_contacts
        
        return contacts
    
    def _empty_portfolio_metrics(self) -> RecoveryPortfolioMetrics:
        """Return empty portfolio metrics."""
        return RecoveryPortfolioMetrics(
            total_revenue_at_risk=0.0,
            total_expected_recoverable_revenue=0.0,
            expected_recovery_from_recommended_actions=0.0,
            estimated_recovery_percentage=0.0,
            high_priority_opportunity_count=0,
            total_estimated_contacts=0,
            estimated_recovery_effort_hours=0.0,
            average_recovery_probability=0.0,
            average_friction_score=0,
            action_distribution={}
        )
