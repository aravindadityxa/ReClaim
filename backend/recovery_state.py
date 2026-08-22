"""Recovery workflow state machine and state tracking."""

from enum import Enum
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any


class RecoveryState(str, Enum):
    """State machine states for recovery workflows."""
    DETECTED = "DETECTED"           # Opportunity detected, not yet planned
    PLANNED = "PLANNED"             # Recovery plan created
    READY = "READY"                 # Plan validated, ready for execution
    EXECUTING = "EXECUTING"         # Action being executed
    WAITING = "WAITING"             # Waiting for outcome (e.g., customer response)
    SUCCEEDED = "SUCCEEDED"         # Current action succeeded
    FAILED = "FAILED"               # Current action failed
    RETRYING = "RETRYING"           # Attempting the same action again
    REPLANNING = "REPLANNING"       # Creating new plan after failure
    STOPPED = "STOPPED"             # Workflow stopped
    RECOVERED = "RECOVERED"         # Revenue successfully recovered
    LOST = "LOST"                   # Revenue marked as lost


class RecoveryStateTransition:
    """Define valid state transitions."""
    
    VALID_TRANSITIONS = {
        RecoveryState.DETECTED: [RecoveryState.PLANNED, RecoveryState.STOPPED],
        RecoveryState.PLANNED: [RecoveryState.READY, RecoveryState.STOPPED],
        RecoveryState.READY: [RecoveryState.EXECUTING, RecoveryState.STOPPED],
        RecoveryState.EXECUTING: [RecoveryState.WAITING, RecoveryState.SUCCEEDED, RecoveryState.FAILED, RecoveryState.STOPPED],
        RecoveryState.WAITING: [RecoveryState.SUCCEEDED, RecoveryState.FAILED, RecoveryState.STOPPED],
        RecoveryState.SUCCEEDED: [RecoveryState.RECOVERED, RecoveryState.STOPPED],
        RecoveryState.FAILED: [RecoveryState.RETRYING, RecoveryState.REPLANNING, RecoveryState.STOPPED],
        RecoveryState.RETRYING: [RecoveryState.EXECUTING, RecoveryState.REPLANNING, RecoveryState.STOPPED],
        RecoveryState.REPLANNING: [RecoveryState.PLANNED, RecoveryState.STOPPED],
        RecoveryState.RECOVERED: [RecoveryState.STOPPED],
        RecoveryState.STOPPED: [],  # Final state
        RecoveryState.LOST: [],     # Final state
    }
    
    @staticmethod
    def is_valid(from_state: RecoveryState, to_state: RecoveryState) -> bool:
        """Check if a state transition is valid."""
        return to_state in RecoveryStateTransition.VALID_TRANSITIONS.get(from_state, [])
    
    @staticmethod
    def validate(from_state: RecoveryState, to_state: RecoveryState) -> None:
        """Validate a state transition, raise if invalid."""
        if not RecoveryStateTransition.is_valid(from_state, to_state):
            raise ValueError(f"Invalid transition: {from_state} -> {to_state}")


class ExecutionResult(str, Enum):
    """Result status of an execution."""
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    UNKNOWN = "UNKNOWN"  # Unknown outcome (e.g., timeout)
    DUPLICATE = "DUPLICATE"  # Duplicate execution detected


@dataclass
class ActionExecution:
    """Record of a single action execution attempt."""
    execution_id: str
    opportunity_id: str
    action_type: str
    attempt_number: int
    state_before: RecoveryState
    state_after: RecoveryState
    result: ExecutionResult
    provider_reference: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expected_value: Optional[float] = None
    expected_recovery: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "execution_id": self.execution_id,
            "opportunity_id": self.opportunity_id,
            "action_type": self.action_type,
            "attempt_number": self.attempt_number,
            "state_before": self.state_before.value,
            "state_after": self.state_after.value,
            "result": self.result.value,
            "provider_reference": self.provider_reference,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "expected_value": self.expected_value,
            "expected_recovery": self.expected_recovery,
        }


@dataclass
class RecoveryWorkflowState:
    """Complete state of a recovery workflow."""
    opportunity_id: str
    current_state: RecoveryState
    current_action: Optional[str] = None
    attempt_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    customer_contact_count: int = 0
    plan: Optional[Dict[str, Any]] = None
    executions: Optional[list] = None  # List of ActionExecution records
    last_action_time: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    stopping_reason: Optional[str] = None
    final_status: Optional[str] = None  # RECOVERED, LOST, FAILED, STOPPED
    
    def __post_init__(self):
        if self.executions is None:
            self.executions = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "opportunity_id": self.opportunity_id,
            "current_state": self.current_state.value,
            "current_action": self.current_action,
            "attempt_count": self.attempt_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "customer_contact_count": self.customer_contact_count,
            "plan": self.plan,
            "executions": [e.to_dict() if hasattr(e, 'to_dict') else e for e in self.executions],
            "last_action_time": self.last_action_time.isoformat() if self.last_action_time else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "stopping_reason": self.stopping_reason,
            "final_status": self.final_status,
        }
