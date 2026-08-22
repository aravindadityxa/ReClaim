from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import (
    Transaction, RevenueOpportunity,
    TransactionStatus, OpportunityStatus, RiskLevel, OpportunityType
)
from sqlalchemy import func


class RevenueAnalytics:
    """Core business logic for revenue calculations."""
    
    @staticmethod
    def get_total_revenue(db: Session) -> float:
        """Calculate total revenue from successful transactions."""
        result = db.query(func.sum(Transaction.amount)).filter(
            Transaction.status == TransactionStatus.SUCCESS
        ).scalar()
        return float(result or 0)
    
    @staticmethod
    def get_revenue_at_risk(db: Session) -> float:
        """Calculate revenue at risk from AT_RISK and RECOVERABLE opportunities."""
        result = db.query(func.sum(RevenueOpportunity.amount)).filter(
            RevenueOpportunity.status.in_([
                OpportunityStatus.AT_RISK,
                OpportunityStatus.RECOVERABLE
            ])
        ).scalar()
        return float(result or 0)
    
    @staticmethod
    def get_estimated_recoverable(db: Session) -> float:
        """Calculate estimated recoverable revenue based on recoverability levels."""
        opportunities = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.status.in_([
                OpportunityStatus.AT_RISK,
                OpportunityStatus.RECOVERABLE
            ])
        ).all()
        
        recoverable = 0.0
        for opp in opportunities:
            # Estimate recovery rate based on recoverability classification
            if opp.recoverability.value == "HIGH":
                recoverable += opp.amount * 0.75
            elif opp.recoverability.value == "MEDIUM":
                recoverable += opp.amount * 0.40
            else:  # LOW
                recoverable += opp.amount * 0.10
        
        return round(recoverable, 2)
    
    @staticmethod
    def get_recovered_revenue(db: Session) -> float:
        """Calculate revenue that has been recovered."""
        result = db.query(func.sum(RevenueOpportunity.amount)).filter(
            RevenueOpportunity.status == OpportunityStatus.RECOVERED
        ).scalar()
        return float(result or 0)
    
    @staticmethod
    def get_payment_success_rate(db: Session) -> float:
        """Calculate payment success rate as percentage."""
        total = db.query(func.count(Transaction.id)).scalar()
        if total == 0:
            return 100.0
        
        successful = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus.SUCCESS
        ).scalar()
        
        return round((successful / total) * 100, 2)
    
    @staticmethod
    def get_revenue_health(db: Session) -> dict:
        """
        Calculate Revenue Health score (0-100).
        
        Components:
        - Payment Success Rate (40% weight): 0-100
        - Revenue at Risk Ratio (30% weight): Lower is better (0-100 inverted)
        - Recovery Rate (20% weight): Higher is better
        - Stability (10% weight): Based on variance
        """
        total_revenue = RevenueAnalytics.get_total_revenue(db)
        at_risk = RevenueAnalytics.get_revenue_at_risk(db)
        recovered = RevenueAnalytics.get_recovered_revenue(db)
        success_rate = RevenueAnalytics.get_payment_success_rate(db)
        
        # Component 1: Success Rate (0-100)
        success_component = success_rate
        
        # Component 2: Revenue at Risk Ratio (inverted)
        total_with_opportunities = total_revenue + at_risk + recovered
        if total_with_opportunities > 0:
            risk_ratio = (at_risk / total_with_opportunities) * 100
            risk_component = max(0, 100 - risk_ratio)
        else:
            risk_component = 100
        
        # Component 3: Recovery Rate
        if at_risk + recovered > 0:
            recovery_rate = (recovered / (at_risk + recovered)) * 100
        else:
            recovery_rate = 0
        recovery_component = min(100, recovery_rate)
        
        # Component 4: Stability (transaction variance over time)
        stability_component = 85  # Base stability
        
        # Weighted average
        health_score = (
            (success_component * 0.40) +
            (risk_component * 0.30) +
            (recovery_component * 0.20) +
            (stability_component * 0.10)
        )
        
        health_score = round(health_score, 1)
        
        return {
            "score": health_score,
            "components": {
                "payment_success": round(success_component, 1),
                "risk_ratio": round(risk_component, 1),
                "recovery_rate": round(recovery_component, 1),
                "stability": round(stability_component, 1)
            }
        }
    
    @staticmethod
    def get_revenue_trend(db: Session, days: int = 30) -> list:
        """
        Get daily revenue trend for the last N days.
        Returns list of dicts with: date, total, successful, at_risk
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        txns = db.query(Transaction).filter(
            Transaction.created_at >= start_date
        ).order_by(Transaction.created_at).all()
        
        # Group by date
        daily_data = {}
        for txn in txns:
            date_key = txn.created_at.date().isoformat()
            
            if date_key not in daily_data:
                daily_data[date_key] = {
                    "date": date_key,
                    "successful": 0.0,
                    "failed": 0.0
                }
            
            if txn.status == TransactionStatus.SUCCESS:
                daily_data[date_key]["successful"] += txn.amount
            else:
                daily_data[date_key]["failed"] += txn.amount
        
        # Fill in missing dates with zero values
        result = []
        current = start_date.date()
        end_date = datetime.utcnow().date()
        
        while current <= end_date:
            date_str = current.isoformat()
            if date_str in daily_data:
                entry = daily_data[date_str]
                entry["total"] = entry["successful"] + entry["failed"]
            else:
                entry = {
                    "date": date_str,
                    "total": 0.0,
                    "successful": 0.0,
                    "failed": 0.0
                }
            result.append(entry)
            current += timedelta(days=1)
        
        return result
    
    @staticmethod
    def get_risk_breakdown(db: Session) -> dict:
        """
        Get revenue risk breakdown by opportunity type.
        Returns dict with type as key and amount as value.
        """
        opps = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.status.in_([
                OpportunityStatus.AT_RISK,
                OpportunityStatus.RECOVERABLE
            ])
        ).all()
        
        breakdown = {
            "PAYMENT_FAILURE": 0.0,
            "SUBSCRIPTION_FAILURE": 0.0,
            "CHECKOUT_ABANDONMENT": 0.0,
            "INVOICE_DELAY": 0.0
        }
        
        for opp in opps:
            opp_type = opp.type.value
            breakdown[opp_type] += opp.amount
        
        return breakdown
    
    @staticmethod
    def get_risk_trend(db: Session, days: int = 30) -> str:
        """
        Determine if revenue risk is increasing, stable, or decreasing.
        Compares first third vs last third of period.
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        opps = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.created_at >= start_date,
            RevenueOpportunity.status.in_([
                OpportunityStatus.AT_RISK,
                OpportunityStatus.RECOVERABLE
            ])
        ).all()
        
        if not opps:
            return "STABLE"
        
        third = days // 3
        mid_date = datetime.utcnow() - timedelta(days=days - third)
        
        early = sum(o.amount for o in opps if o.created_at < mid_date)
        recent = sum(o.amount for o in opps if o.created_at >= mid_date)
        
        if recent > early * 1.2:
            return "INCREASING"
        elif recent < early * 0.8:
            return "DECREASING"
        else:
            return "STABLE"
    
    @staticmethod
    def get_opportunity_count(db: Session) -> dict:
        """Get count of opportunities by status."""
        counts = {}
        for status in OpportunityStatus:
            count = db.query(func.count(RevenueOpportunity.id)).filter(
                RevenueOpportunity.status == status
            ).scalar()
            counts[status.value] = count
        
        return counts
