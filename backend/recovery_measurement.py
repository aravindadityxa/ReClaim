"""Phase 6: Recovery outcome measurement and learning."""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
import json

from models import RecoveryOutcome, RecoveryAttempt, RecoveryExecution
from recovery_strategies import RecoveryActionType

logger = logging.getLogger(__name__)


class RecoveryMeasurement:
    """Measure recovery outcomes for learning and optimization."""
    
    def __init__(self, db: Session):
        """Initialize measurement engine."""
        self.db = db
    
    def record_outcome(
        self,
        opportunity_id: str,
        recovery_execution_id: Optional[str],
        action_type: str,
        amount_at_risk: float,
        expected_recovery: float,
        expected_probability: float,
        outcome_status: str,
        recovered_amount: float,
        customer_id: str,
        failure_reason: Optional[str] = None,
        payment_method: Optional[str] = None,
        opportunity_type: Optional[str] = None,
        customer_segment: Optional[str] = None,
        risk_level: Optional[str] = None,
        attempts: int = 1,
        time_to_recovery: Optional[int] = None,
        friction_score: Optional[float] = None,
    ) -> RecoveryOutcome:
        """
        Record a recovery outcome.
        
        Args:
            outcome_status: SUCCEEDED, FAILED, ABANDONED, PARTIAL
        """
        
        # Calculate incremental revenue
        estimated_incremental = self._calculate_incremental_revenue(
            outcome_status,
            recovered_amount,
            amount_at_risk,
            expected_recovery,
            expected_probability,
        )
        
        outcome = RecoveryOutcome(
            id=f"outcome_{opportunity_id}_{datetime.utcnow().timestamp()}",
            opportunity_id=opportunity_id,
            recovery_execution_id=recovery_execution_id,
            action_type=action_type,
            amount_at_risk=amount_at_risk,
            expected_recovery=expected_recovery,
            expected_recovery_probability=expected_probability,
            outcome_status=outcome_status,
            recovered_amount=recovered_amount,
            estimated_incremental_revenue=estimated_incremental,
            attribution_method="DETERMINISTIC",
            customer_id=customer_id,
            failure_reason=failure_reason,
            payment_method=payment_method,
            opportunity_type=opportunity_type,
            customer_segment=customer_segment,
            risk_level=risk_level,
            attempts=attempts,
            time_to_recovery=time_to_recovery,
            friction_score=friction_score,
            outcome_recorded_at=datetime.utcnow(),
        )
        
        self.db.add(outcome)
        self.db.commit()
        self.db.refresh(outcome)
        
        logger.info(f"Recorded outcome for {opportunity_id}: {outcome_status}")
        return outcome
    
    def _calculate_incremental_revenue(
        self,
        outcome_status: str,
        recovered_amount: float,
        amount_at_risk: float,
        expected_recovery: float,
        expected_probability: float,
    ) -> float:
        """
        Calculate estimated incremental revenue.
        
        Deterministic attribution for test data:
        - If SUCCESS and recovered > expected: incremental = recovered - expected
        - If SUCCESS and recovered <= expected: incremental = 50% of expected
        - If PARTIAL: incremental = recovered * 0.8
        - If FAILED: incremental = 0
        """
        
        if outcome_status == "SUCCEEDED":
            if recovered_amount > expected_recovery:
                return recovered_amount - expected_recovery
            else:
                return expected_recovery * 0.5
        elif outcome_status == "PARTIAL":
            return recovered_amount * 0.8
        else:
            return 0.0
    
    def get_recovery_funnel(self, days: int = 30) -> Dict[str, Any]:
        """
        Get recovery funnel metrics.
        
        Returns stages: At Risk -> Eligible -> Planned -> Attempted -> Recovered
        """
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Stage 1: At Risk (all opportunities with at-risk status)
        from models import RevenueOpportunity, OpportunityStatus
        
        at_risk = self.db.query(func.count(RevenueOpportunity.id), func.sum(RevenueOpportunity.amount)).filter(
            RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE]),
            RevenueOpportunity.created_at >= cutoff_date,
        ).first()
        
        # Stage 2: Recovered (from outcomes)
        recovered_outcomes = self.db.query(RecoveryOutcome).filter(
            RecoveryOutcome.outcome_status == "SUCCEEDED",
            RecoveryOutcome.created_at >= cutoff_date,
        ).all()
        
        recovered_count = len(recovered_outcomes)
        recovered_amount = sum(o.recovered_amount for o in recovered_outcomes)
        
        # Calculate funnel
        at_risk_count = at_risk[0] or 0
        at_risk_amount = at_risk[1] or 0.0
        
        funnel = {
            "at_risk": {
                "count": at_risk_count,
                "amount": float(at_risk_amount),
            },
            "recovered": {
                "count": recovered_count,
                "amount": float(recovered_amount),
            },
            "conversion_rate": (
                (recovered_count / at_risk_count * 100) if at_risk_count > 0 else 0
            ),
            "period_days": days,
        }
        
        return funnel
    
    def get_strategy_performance(self, strategy: Optional[str] = None) -> Dict[str, Any]:
        """Get performance metrics by recovery strategy."""
        
        query = self.db.query(RecoveryOutcome)
        if strategy:
            query = query.filter(RecoveryOutcome.action_type == strategy)
        
        outcomes = query.all()
        
        if not outcomes:
            return {
                "strategy": strategy or "ALL",
                "attempts": 0,
                "success_count": 0,
                "recovery_rate": 0,
                "total_recovered": 0,
                "average_recovered": 0,
                "confidence": "INSUFFICIENT_DATA",
            }
        
        success_count = sum(1 for o in outcomes if o.outcome_status == "SUCCEEDED")
        total_recovered = sum(o.recovered_amount for o in outcomes)
        average_recovered = total_recovered / len(outcomes) if outcomes else 0
        
        recovery_rate = (success_count / len(outcomes) * 100) if outcomes else 0
        
        # Confidence based on sample size
        if len(outcomes) < 10:
            confidence = "LOW"
        elif len(outcomes) < 30:
            confidence = "MEDIUM"
        else:
            confidence = "HIGH"
        
        return {
            "strategy": strategy or "ALL",
            "attempts": len(outcomes),
            "success_count": success_count,
            "recovery_rate": round(recovery_rate, 1),
            "total_recovered": float(total_recovered),
            "average_recovered": float(average_recovered),
            "average_attempts": round(sum(o.attempts for o in outcomes) / len(outcomes), 1) if outcomes else 0,
            "average_friction": round(sum(o.friction_score for o in outcomes if o.friction_score) / len([o for o in outcomes if o.friction_score]), 1) if any(o.friction_score for o in outcomes) else None,
            "confidence": confidence,
            "sample_size": len(outcomes),
        }
    
    def get_cohort_performance(self, cohort_type: str, cohort_value: str) -> Dict[str, Any]:
        """
        Get strategy performance for a cohort.
        
        Cohort types: payment_method, failure_reason, opportunity_type, customer_segment, risk_level
        """
        
        field_map = {
            "payment_method": RecoveryOutcome.payment_method,
            "failure_reason": RecoveryOutcome.failure_reason,
            "opportunity_type": RecoveryOutcome.opportunity_type,
            "customer_segment": RecoveryOutcome.customer_segment,
            "risk_level": RecoveryOutcome.risk_level,
        }
        
        field = field_map.get(cohort_type)
        if not field:
            return {"error": f"Unknown cohort type: {cohort_type}"}
        
        outcomes = self.db.query(RecoveryOutcome).filter(field == cohort_value).all()
        
        if not outcomes:
            return {
                "cohort_type": cohort_type,
                "cohort_value": cohort_value,
                "attempts": 0,
                "confidence": "NO_DATA",
            }
        
        success_count = sum(1 for o in outcomes if o.outcome_status == "SUCCEEDED")
        total_recovered = sum(o.recovered_amount for o in outcomes)
        
        # Best strategy for this cohort
        best_strategy = None
        best_rate = 0
        strategy_counts = {}
        
        for outcome in outcomes:
            strategy = outcome.action_type
            if strategy not in strategy_counts:
                strategy_counts[strategy] = {"total": 0, "success": 0}
            strategy_counts[strategy]["total"] += 1
            if outcome.outcome_status == "SUCCEEDED":
                strategy_counts[strategy]["success"] += 1
        
        for strategy, counts in strategy_counts.items():
            rate = counts["success"] / counts["total"]
            if rate > best_rate:
                best_rate = rate
                best_strategy = strategy
        
        return {
            "cohort_type": cohort_type,
            "cohort_value": cohort_value,
            "attempts": len(outcomes),
            "success_count": success_count,
            "recovery_rate": round((success_count / len(outcomes) * 100) if outcomes else 0, 1),
            "total_recovered": float(total_recovered),
            "average_recovered": float(total_recovered / len(outcomes)) if outcomes else 0,
            "best_strategy": best_strategy,
            "best_strategy_rate": round(best_rate * 100, 1),
            "strategy_breakdown": {
                strategy: {
                    "attempts": counts["total"],
                    "success_rate": round(counts["success"] / counts["total"] * 100, 1),
                }
                for strategy, counts in strategy_counts.items()
            },
        }
    
    def get_incremental_revenue_summary(self, days: int = 30) -> Dict[str, Any]:
        """Get incremental revenue measurements."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        outcomes = self.db.query(RecoveryOutcome).filter(
            RecoveryOutcome.created_at >= cutoff_date,
        ).all()
        
        total_recovered = sum(o.recovered_amount for o in outcomes)
        total_incremental = sum(o.estimated_incremental_revenue or 0 for o in outcomes)
        
        return {
            "period_days": days,
            "total_recovered": float(total_recovered),
            "estimated_incremental_revenue": float(total_incremental),
            "incremental_percentage": round((total_incremental / total_recovered * 100) if total_recovered > 0 else 0, 1),
            "outcome_count": len(outcomes),
        }
    
    def get_strategy_recommendations(self, opportunity_type: str) -> List[Dict[str, Any]]:
        """
        Get recommended strategies based on historical performance.
        
        Ranks strategies by recovery rate for similar opportunities.
        """
        
        outcomes = self.db.query(RecoveryOutcome).filter(
            RecoveryOutcome.opportunity_type == opportunity_type,
        ).all()
        
        if not outcomes or len(outcomes) < 5:
            return []
        
        strategies = {}
        for outcome in outcomes:
            strategy = outcome.action_type
            if strategy not in strategies:
                strategies[strategy] = {"total": 0, "success": 0, "recovered": 0}
            strategies[strategy]["total"] += 1
            if outcome.outcome_status == "SUCCEEDED":
                strategies[strategy]["success"] += 1
                strategies[strategy]["recovered"] += outcome.recovered_amount
        
        recommendations = []
        for strategy, metrics in strategies.items():
            if metrics["total"] >= 5:  # Minimum sample size
                rate = metrics["success"] / metrics["total"]
                recommendations.append({
                    "strategy": strategy,
                    "recovery_rate": round(rate * 100, 1),
                    "attempts": metrics["total"],
                    "total_recovered": float(metrics["recovered"]),
                    "confidence": "HIGH" if metrics["total"] >= 20 else "MEDIUM",
                })
        
        # Sort by recovery rate
        recommendations.sort(key=lambda x: x["recovery_rate"], reverse=True)
        return recommendations
