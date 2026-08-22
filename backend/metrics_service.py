"""Operational metrics collection for recovery platform."""

from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)


class OperationalMetrics:
    """Collect and report operational metrics."""

    def __init__(self, db: Session):
        """Initialize metrics collector."""
        self.db = db

    def get_recovery_attempts_metrics(self) -> Dict[str, Any]:
        """Get recovery attempt metrics."""
        try:
            from models import RecoveryAttempt

            total_attempts = self.db.query(RecoveryAttempt).count()
            successful = self.db.query(RecoveryAttempt).filter(
                RecoveryAttempt.result == "SUCCEEDED"
            ).count()
            failed = self.db.query(RecoveryAttempt).filter(
                RecoveryAttempt.result == "FAILED"
            ).count()

            success_rate = (successful / total_attempts * 100) if total_attempts > 0 else 0

            return {
                "total_attempts": total_attempts,
                "successful": successful,
                "failed": failed,
                "success_rate": round(success_rate, 2),
                "pending_execution": self.db.query(RecoveryAttempt).filter(
                    RecoveryAttempt.result.is_(None)
                ).count(),
            }
        except Exception as e:
            logger.error(f"Error getting recovery attempt metrics: {str(e)}")
            return {}

    def get_recovery_workflows_metrics(self) -> Dict[str, Any]:
        """Get recovery workflow metrics."""
        try:
            from models import RecoveryExecution, RecoveryState

            total_workflows = self.db.query(RecoveryExecution).count()
            active_workflows = self.db.query(RecoveryExecution).filter(
                RecoveryExecution.current_state.in_([
                    RecoveryState.EXECUTING,
                    RecoveryState.PLANNING,
                    RecoveryState.WAITING,
                ])
            ).count()
            failed_workflows = self.db.query(RecoveryExecution).filter(
                RecoveryExecution.current_state == RecoveryState.FAILED
            ).count()
            stopped_workflows = self.db.query(RecoveryExecution).filter(
                RecoveryExecution.current_state == RecoveryState.STOPPED
            ).count()

            return {
                "total_workflows": total_workflows,
                "active": active_workflows,
                "failed": failed_workflows,
                "stopped": stopped_workflows,
                "completed": self.db.query(RecoveryExecution).filter(
                    RecoveryExecution.completed_at.isnot(None)
                ).count(),
            }
        except Exception as e:
            logger.error(f"Error getting workflow metrics: {str(e)}")
            return {}

    def get_governance_metrics(self) -> Dict[str, Any]:
        """Get governance and approval metrics."""
        try:
            from models import ApprovalRequestModel, ApprovalRequestStatus
            from governance_service import governance_engine

            pending_approvals = self.db.query(ApprovalRequestModel).filter(
                ApprovalRequestModel.status == ApprovalRequestStatus.PENDING
            ).count()
            approved = self.db.query(ApprovalRequestModel).filter(
                ApprovalRequestModel.status == ApprovalRequestStatus.APPROVED
            ).count()
            rejected = self.db.query(ApprovalRequestModel).filter(
                ApprovalRequestModel.status == ApprovalRequestStatus.REJECTED
            ).count()

            return {
                "pending_approvals": pending_approvals,
                "approved": approved,
                "rejected": rejected,
                "is_paused": governance_engine.is_paused if governance_engine else False,
                "active_policies": (
                    sum(1 for p in governance_engine.policy_set.policies.values() if p.enabled)
                    if governance_engine and governance_engine.policy_set
                    else 0
                ),
            }
        except Exception as e:
            logger.error(f"Error getting governance metrics: {str(e)}")
            return {}

    def get_revenue_metrics(self) -> Dict[str, Any]:
        """Get revenue and recovery metrics."""
        try:
            from models import RevenueOpportunity, OpportunityStatus, RecoveryAttempt

            at_risk = self.db.query(RevenueOpportunity).filter(
                RevenueOpportunity.status.in_([OpportunityStatus.AT_RISK, OpportunityStatus.RECOVERABLE])
            ).all()

            recovered = self.db.query(RevenueOpportunity).filter(
                RevenueOpportunity.status == OpportunityStatus.RECOVERED
            ).all()

            at_risk_amount = sum(o.amount for o in at_risk) if at_risk else 0
            recovered_amount = sum(o.amount for o in recovered) if recovered else 0

            # Get average recovery time
            completed_attempts = self.db.query(RecoveryAttempt).filter(
                RecoveryAttempt.completed_at.isnot(None)
            ).all()

            avg_recovery_time = 0
            if completed_attempts:
                total_time = sum(
                    (a.completed_at - a.created_at).total_seconds()
                    for a in completed_attempts
                    if a.completed_at
                )
                avg_recovery_time = round(total_time / len(completed_attempts))

            return {
                "revenue_at_risk": round(at_risk_amount, 2),
                "revenue_recovered": round(recovered_amount, 2),
                "at_risk_opportunities": len(at_risk),
                "average_recovery_time_seconds": avg_recovery_time,
            }
        except Exception as e:
            logger.error(f"Error getting revenue metrics: {str(e)}")
            return {}

    def get_action_executor_metrics(self) -> Dict[str, Any]:
        """Get action execution metrics."""
        try:
            from models import RecoveryAttempt

            # Group by action type
            attempts_by_action = {}
            all_attempts = self.db.query(RecoveryAttempt).all()

            for attempt in all_attempts:
                action = attempt.action_type
                if action not in attempts_by_action:
                    attempts_by_action[action] = {
                        "total": 0,
                        "successful": 0,
                        "failed": 0,
                        "success_rate": 0,
                    }

                attempts_by_action[action]["total"] += 1
                if attempt.result == "SUCCEEDED":
                    attempts_by_action[action]["successful"] += 1
                elif attempt.result == "FAILED":
                    attempts_by_action[action]["failed"] += 1

            # Calculate success rates
            for action in attempts_by_action:
                total = attempts_by_action[action]["total"]
                successful = attempts_by_action[action]["successful"]
                attempts_by_action[action]["success_rate"] = (
                    round(successful / total * 100, 2) if total > 0 else 0
                )

            return {
                "by_action_type": attempts_by_action,
                "total_actions": sum(a["total"] for a in attempts_by_action.values()),
            }
        except Exception as e:
            logger.error(f"Error getting executor metrics: {str(e)}")
            return {}

    def get_measurement_metrics(self) -> Dict[str, Any]:
        """Get recovery measurement metrics."""
        try:
            from models import RecoveryOutcome

            total_outcomes = self.db.query(RecoveryOutcome).count()
            succeeded = self.db.query(RecoveryOutcome).filter(
                RecoveryOutcome.outcome_status == "SUCCEEDED"
            ).count()

            total_recovered = self.db.query(RecoveryOutcome).with_entities(
                lambda: RecoveryOutcome.recovered_amount.sum()
            ).scalar() or 0

            total_incremental = self.db.query(RecoveryOutcome).with_entities(
                lambda: RecoveryOutcome.estimated_incremental_revenue.sum()
            ).scalar() or 0

            return {
                "total_outcomes": total_outcomes,
                "succeeded_outcomes": succeeded,
                "total_recovered_amount": round(float(total_recovered), 2),
                "total_incremental_revenue": round(float(total_incremental), 2),
            }
        except Exception as e:
            logger.error(f"Error getting measurement metrics: {str(e)}")
            return {}

    def get_error_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get error metrics from recent period."""
        try:
            from models import RecoveryAttempt

            cutoff = datetime.utcnow() - timedelta(hours=hours)

            recent_attempts = self.db.query(RecoveryAttempt).filter(
                RecoveryAttempt.created_at >= cutoff
            ).all()

            error_count = sum(1 for a in recent_attempts if a.result == "FAILED")

            error_codes = {}
            for attempt in recent_attempts:
                if attempt.error_code:
                    error_codes[attempt.error_code] = error_codes.get(attempt.error_code, 0) + 1

            return {
                "period_hours": hours,
                "total_errors": error_count,
                "error_codes": error_codes,
            }
        except Exception as e:
            logger.error(f"Error getting error metrics: {str(e)}")
            return {}

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics snapshot."""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "recovery_attempts": self.get_recovery_attempts_metrics(),
            "workflows": self.get_recovery_workflows_metrics(),
            "governance": self.get_governance_metrics(),
            "revenue": self.get_revenue_metrics(),
            "executor": self.get_action_executor_metrics(),
            "measurement": self.get_measurement_metrics(),
            "errors_24h": self.get_error_metrics(24),
        }
