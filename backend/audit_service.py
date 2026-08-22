"""Audit trail recording for recovery workflows."""

from typing import Optional, Dict, Any, List
from datetime import datetime
from recovery_state import RecoveryWorkflowState, ActionExecution, RecoveryState
import json
import logging

logger = logging.getLogger(__name__)


class AuditTrail:
    """Record audit events for recovery workflows."""
    
    def __init__(self):
        """Initialize audit trail."""
        self.events: List[Dict[str, Any]] = []
    
    def record_event(
        self,
        event_type: str,
        opportunity_id: str,
        details: Dict[str, Any],
        severity: str = "INFO",
    ) -> None:
        """
        Record an audit event.
        
        Args:
            event_type: Type of event (PLAN_CREATED, ACTION_EXECUTED, etc.)
            opportunity_id: Affected opportunity
            details: Event-specific details
            severity: INFO, WARNING, ERROR
        """
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "opportunity_id": opportunity_id,
            "severity": severity,
            "details": details,
        }
        
        self.events.append(event)
        logger.log(
            getattr(logging, severity, logging.INFO),
            f"Audit: {event_type} for {opportunity_id}: {json.dumps(details, default=str)}"
        )
    
    def record_state_transition(
        self,
        opportunity_id: str,
        from_state: RecoveryState,
        to_state: RecoveryState,
        reason: Optional[str] = None,
    ) -> None:
        """Record a state transition."""
        
        self.record_event(
            event_type="STATE_TRANSITION",
            opportunity_id=opportunity_id,
            details={
                "from_state": from_state.value,
                "to_state": to_state.value,
                "reason": reason,
            }
        )
    
    def record_action_execution(
        self,
        opportunity_id: str,
        execution: ActionExecution,
        policy_decision: Optional[str] = None,
    ) -> None:
        """Record an action execution."""
        
        self.record_event(
            event_type="ACTION_EXECUTED",
            opportunity_id=opportunity_id,
            details={
                "execution_id": execution.execution_id,
                "action_type": execution.action_type,
                "attempt_number": execution.attempt_number,
                "result": execution.result.value,
                "provider_reference": execution.provider_reference,
                "error_code": execution.error_code,
                "policy_decision": policy_decision,
                "expected_value": execution.expected_value,
            }
        )
    
    def record_policy_decision(
        self,
        opportunity_id: str,
        decision: str,
        reason: Optional[str] = None,
        details: Optional[Dict] = None,
    ) -> None:
        """Record a policy decision (allowed/rejected)."""
        
        self.record_event(
            event_type="POLICY_DECISION",
            opportunity_id=opportunity_id,
            details={
                "decision": decision,
                "reason": reason,
                **(details or {})
            }
        )
    
    def record_stopping_rule(
        self,
        opportunity_id: str,
        rule: str,
        reason: Optional[str] = None,
    ) -> None:
        """Record that a stopping rule was triggered."""
        
        self.record_event(
            event_type="STOPPING_RULE_TRIGGERED",
            opportunity_id=opportunity_id,
            details={
                "rule": rule,
                "reason": reason,
            },
            severity="WARNING"
        )
    
    def record_idempotency_check(
        self,
        opportunity_id: str,
        execution_id: str,
        action_type: str,
        is_duplicate: bool,
        previous_result: Optional[str] = None,
    ) -> None:
        """Record idempotency check result."""
        
        self.record_event(
            event_type="IDEMPOTENCY_CHECK",
            opportunity_id=opportunity_id,
            details={
                "execution_id": execution_id,
                "action_type": action_type,
                "is_duplicate": is_duplicate,
                "previous_result": previous_result,
            }
        )
    
    def record_replan(
        self,
        opportunity_id: str,
        previous_action: Optional[str],
        new_action: Optional[str],
        reason: Optional[str] = None,
    ) -> None:
        """Record that we're replanning after failure."""
        
        self.record_event(
            event_type="REPLAN",
            opportunity_id=opportunity_id,
            details={
                "previous_action": previous_action,
                "new_action": new_action,
                "reason": reason,
            }
        )
    
    def record_workflow_completion(
        self,
        opportunity_id: str,
        final_status: str,
        stopping_reason: Optional[str] = None,
        recovered_amount: Optional[float] = None,
    ) -> None:
        """Record workflow completion."""
        
        self.record_event(
            event_type="WORKFLOW_COMPLETED",
            opportunity_id=opportunity_id,
            details={
                "final_status": final_status,
                "stopping_reason": stopping_reason,
                "recovered_amount": recovered_amount,
            }
        )
    
    def get_audit_trail(self) -> List[Dict[str, Any]]:
        """Get all audit events."""
        return self.events.copy()
    
    def get_opportunity_audit(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Get audit events for specific opportunity."""
        return [e for e in self.events if e.get("opportunity_id") == opportunity_id]
    
    def to_dict(self) -> Dict[str, Any]:
        """Export audit trail as dict."""
        return {
            "event_count": len(self.events),
            "events": self.events,
            "exported_at": datetime.utcnow().isoformat(),
        }


class AuditStore:
    """Persistent storage of audit trails (could be database)."""
    
    def __init__(self):
        """Initialize audit store."""
        self.trails: Dict[str, List[Dict]] = {}
    
    def save_trail(self, opportunity_id: str, trail: AuditTrail) -> None:
        """Save an audit trail."""
        self.trails[opportunity_id] = trail.get_audit_trail()
    
    def get_trail(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Retrieve audit trail for opportunity."""
        return self.trails.get(opportunity_id, [])
    
    def get_all_trails(self) -> Dict[str, List[Dict]]:
        """Get all trails."""
        return self.trails.copy()


# Global audit store
audit_store = AuditStore()
