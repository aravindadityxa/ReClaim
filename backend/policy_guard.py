"""Policy guard - validate actions against safety rules."""

from typing import Tuple, Optional
from recovery_state import RecoveryWorkflowState, RecoveryState
from recovery_strategies import RecoveryActionType, ActionEligibilityEngine, RECOVERY_ACTIONS
from recovery_config import RECOVERY_BOUNDS
import logging

logger = logging.getLogger(__name__)


class PolicyGuard:
    """Enforce safety policies before action execution."""
    
    @staticmethod
    def check_stopping_rules(workflow_state: RecoveryWorkflowState) -> Tuple[bool, Optional[str]]:
        """
        Check if any stopping rule has been triggered.
        
        Returns:
            (should_stop, reason)
        """
        
        # Rule 1: Maximum recovery attempts reached
        if workflow_state.attempt_count >= RECOVERY_BOUNDS.max_recovery_attempts:
            return True, f"Maximum recovery attempts ({RECOVERY_BOUNDS.max_recovery_attempts}) reached"
        
        # Rule 2: Maximum customer contacts reached
        if workflow_state.customer_contact_count >= RECOVERY_BOUNDS.max_customer_contacts:
            return True, f"Maximum customer contacts ({RECOVERY_BOUNDS.max_customer_contacts}) reached"
        
        # Rule 3: Plan already expired (more than max_plan_duration_days old)
        if workflow_state.started_at and workflow_state.plan:
            from datetime import datetime, timedelta
            age_days = (datetime.utcnow() - workflow_state.started_at).days
            if age_days > RECOVERY_BOUNDS.max_plan_duration_days:
                return True, f"Recovery plan expired (>{RECOVERY_BOUNDS.max_plan_duration_days} days old)"
        
        # Rule 4: Already recovered
        if workflow_state.final_status == "RECOVERED":
            return True, "Revenue already recovered"
        
        # Rule 5: Already marked lost
        if workflow_state.final_status == "LOST":
            return True, "Revenue marked as lost"
        
        # Rule 6: Current state is already stopped
        if workflow_state.current_state in [RecoveryState.STOPPED, RecoveryState.RECOVERED, RecoveryState.LOST]:
            return True, f"Workflow already in terminal state: {workflow_state.current_state.value}"
        
        return False, None
    
    @staticmethod
    def can_execute_action(
        action_type: str,
        workflow_state: RecoveryWorkflowState,
        opportunity_amount: float,
        opportunity_type: str,
        failure_reason: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if an action can be safely executed.
        
        Returns:
            (can_execute, reason_if_rejected)
        """
        
        # First check stopping rules
        should_stop, stop_reason = PolicyGuard.check_stopping_rules(workflow_state)
        if should_stop:
            return False, f"Stopping rule triggered: {stop_reason}"
        
        # Validate action type is supported
        try:
            action_enum = RecoveryActionType(action_type)
        except ValueError:
            return False, f"Unknown action type: {action_type}"
        
        # Check action eligibility based on opportunity
        eligible = ActionEligibilityEngine.is_action_eligible(
            action_enum,
            None,  # We don't have full opp object here
            opportunity_type,
            failure_reason or "",
            workflow_state.attempt_count
        )
        
        if not eligible:
            return False, f"Action not eligible: {action_type}"
        
        # Check action's max attempts
        action_config = RECOVERY_ACTIONS.get(action_enum)
        if action_config:
            action_attempts = sum(
                1 for e in workflow_state.executions
                if (e.get("action_type") == action_type if isinstance(e, dict) else e.action_type == action_type)
            )
            if action_attempts >= action_config.max_allowed_attempts:
                return False, f"Action {action_type} max attempts ({action_config.max_allowed_attempts}) reached"
        
        # Check if this would exceed customer contact limit
        # (only for actions that involve customer contact)
        contact_actions = {
            RecoveryActionType.PAYMENT_LINK,
            RecoveryActionType.CUSTOMER_REMINDER,
            RecoveryActionType.INVOICE_REMINDER,
        }
        
        if action_enum in contact_actions:
            if workflow_state.customer_contact_count >= RECOVERY_BOUNDS.max_customer_contacts:
                return False, f"Would exceed max customer contacts ({RECOVERY_BOUNDS.max_customer_contacts})"
        
        # Check minimum expected value
        if action_config and opportunity_amount > 0:
            expected_value = opportunity_amount * action_config.base_recovery_probability - action_config.action_cost
            if expected_value < RECOVERY_BOUNDS.min_expected_value:
                return False, f"Expected value (₹{expected_value:.0f}) below minimum (₹{RECOVERY_BOUNDS.min_expected_value})"
        
        # Check minimum recovery probability
        if action_config:
            if action_config.base_recovery_probability < RECOVERY_BOUNDS.min_recovery_probability:
                return False, f"Recovery probability ({action_config.base_recovery_probability:.0%}) below minimum ({RECOVERY_BOUNDS.min_recovery_probability:.0%})"
        
        return True, None
    
    @staticmethod
    def check_idempotency(
        workflow_state: RecoveryWorkflowState,
        action_type: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if this action has already been executed.
        
        Returns:
            (is_first_execution, previous_execution_id_or_reason)
        """
        
        if not workflow_state.executions:
            return True, None
        
        # Check for duplicate execution of same action in recent state
        for execution in workflow_state.executions:
            if isinstance(execution, dict):
                if execution.get("action_type") == action_type and execution.get("state_after") in [
                    RecoveryState.SUCCEEDED.value,
                    RecoveryState.FAILED.value,
                ]:
                    return False, f"Action {action_type} already executed in this workflow"
            else:
                if execution.action_type == action_type and execution.state_after in [
                    RecoveryState.SUCCEEDED,
                    RecoveryState.FAILED,
                ]:
                    return False, f"Action {action_type} already executed in this workflow"
        
        return True, None
    
    @staticmethod
    def should_replan(workflow_state: RecoveryWorkflowState) -> Tuple[bool, Optional[str]]:
        """
        Determine if we should replan after a failure.
        
        Returns:
            (should_replan, reason)
        """
        
        # Check if we can retry with more attempts
        if workflow_state.attempt_count >= RECOVERY_BOUNDS.max_recovery_attempts:
            return False, "Maximum attempts reached, cannot replan"
        
        # Check if plan has expired
        if workflow_state.started_at and workflow_state.plan:
            from datetime import datetime, timedelta
            age_days = (datetime.utcnow() - workflow_state.started_at).days
            if age_days > RECOVERY_BOUNDS.max_plan_duration_days:
                return False, "Plan expired, cannot replan"
        
        # If we have attempts left and haven't exceeded contacts, we can replan
        if workflow_state.attempt_count < RECOVERY_BOUNDS.max_recovery_attempts:
            return True, "Can attempt alternative action"
        
        return False, "No replan strategy available"
    
    @staticmethod
    def validate_workflow_state(state: RecoveryWorkflowState) -> Tuple[bool, Optional[str]]:
        """
        Validate that a workflow state is consistent and safe.
        
        Returns:
            (is_valid, error_message_if_invalid)
        """
        
        # State must be valid
        try:
            if isinstance(state.current_state, str):
                RecoveryState(state.current_state)
        except ValueError:
            return False, f"Invalid state: {state.current_state}"
        
        # Counts must be non-negative
        if state.attempt_count < 0 or state.success_count < 0 or state.failure_count < 0:
            return False, "Attempt counts cannot be negative"
        
        # Counts should be consistent
        if state.success_count + state.failure_count > state.attempt_count:
            return False, "Success + failure count exceeds attempt count"
        
        # If stopped, should have a reason
        if state.current_state == RecoveryState.STOPPED and not state.stopping_reason:
            return False, "STOPPED state requires stopping_reason"
        
        return True, None


class ExecutionValidator:
    """Validate specific execution before it happens."""
    
    @staticmethod
    def validate_execution_request(
        action_type: str,
        opportunity_id: str,
        amount: float,
        customer_email: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate an execution request has all required data.
        
        Returns:
            (is_valid, error_message_if_invalid)
        """
        
        if not action_type or not isinstance(action_type, str):
            return False, "action_type is required and must be a string"
        
        if not opportunity_id or not isinstance(opportunity_id, str):
            return False, "opportunity_id is required and must be a string"
        
        if amount <= 0:
            return False, "amount must be positive"
        
        # Some actions require email
        if action_type in ["PAYMENT_LINK", "CUSTOMER_REMINDER", "INVOICE_REMINDER"]:
            if not customer_email or "@" not in customer_email:
                return False, f"action {action_type} requires valid customer_email"
        
        return True, None
