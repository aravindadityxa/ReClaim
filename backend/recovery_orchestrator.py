"""Recovery orchestrator - agent planner for bounded recovery workflows."""

from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import logging
import uuid

from models import RevenueOpportunity, OpportunityStatus, RecoveryAttempt, RecoveryExecution as RecoveryExecutionModel
from recovery_state import (
    RecoveryWorkflowState, RecoveryState, ActionExecution, ExecutionResult,
    RecoveryStateTransition
)
from recovery_strategies import RecoveryActionType, ActionEligibilityEngine, RECOVERY_ACTIONS
from recovery_engine import RecoveryRecommendationEngine
from recovery_timing import TimingEngine
from recovery_config import RECOVERY_BOUNDS
from policy_guard import PolicyGuard, ExecutionValidator
from action_executor import executor
from audit_service import AuditTrail
from governance_service import governance_engine, GovernanceDecision
from approval_service import approval_queue

logger = logging.getLogger(__name__)


class RecoveryOrchestrator:
    """Orchestrate recovery workflows with bounded autonomy."""
    
    def __init__(self, db: Session):
        """Initialize orchestrator."""
        self.db = db
        self.workflows: Dict[str, RecoveryWorkflowState] = {}
        self.recommendation_engine = RecoveryRecommendationEngine(db)
        self.timing_engine = TimingEngine()
    
    def create_workflow(self, opportunity_id: str) -> Tuple[RecoveryWorkflowState, Optional[str]]:
        """
        Create a new recovery workflow for an opportunity.
        
        Returns:
            (workflow_state, error_message_if_failed)
        """
        
        # Load opportunity
        opp = self.db.query(RevenueOpportunity).filter_by(id=opportunity_id).first()
        if not opp:
            return None, f"Opportunity not found: {opportunity_id}"
        
        # Create workflow state
        workflow = RecoveryWorkflowState(
            opportunity_id=opportunity_id,
            current_state=RecoveryState.DETECTED,
            started_at=datetime.utcnow(),
        )
        
        self.workflows[opportunity_id] = workflow
        logger.info(f"Created workflow for {opportunity_id}")
        
        return workflow, None
    
    def plan_recovery(self, opportunity_id: str, audit: Optional[AuditTrail] = None) -> Tuple[RecoveryWorkflowState, Optional[str]]:
        """
        Create a recovery plan from recommendation.
        
        Returns:
            (updated_workflow_state, error_message_if_failed)
        """
        
        workflow = self.workflows.get(opportunity_id)
        if not workflow:
            return None, f"Workflow not found: {opportunity_id}"
        
        # Verify state transition
        try:
            RecoveryStateTransition.validate(workflow.current_state, RecoveryState.PLANNED)
        except ValueError as e:
            return None, str(e)
        
        # Load opportunity
        opp = self.db.query(RevenueOpportunity).filter_by(id=opportunity_id).first()
        if not opp:
            return None, f"Opportunity not found: {opportunity_id}"
        
        # Get recommendation
        try:
            recommendation = self.recommendation_engine.get_recommendation(opportunity_id)
        except Exception as e:
            if audit:
                audit.record_event("PLAN_CREATION_FAILED", opportunity_id, {"error": str(e)}, "ERROR")
            return None, f"Could not generate recovery plan: {e}"
        
        # Extract plan
        plan = {
            "primary_action": recommendation.recommended_action,
            "primary_expected_value": recommendation.expected_net_value,
            "expected_recovery": recommendation.expected_recovered_amount,
            "recovery_probability": recommendation.recovery_probability,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        workflow.plan = plan
        workflow.current_state = RecoveryState.PLANNED
        
        if audit:
            audit.record_event("PLAN_CREATED", opportunity_id, {
                "primary_action": recommendation.recommended_action,
                "expected_value": recommendation.expected_net_value,
                "recovery_probability": recommendation.recovery_probability,
            })
        
        logger.info(f"Planned recovery for {opportunity_id}: {recommendation.recommended_action}")
        return workflow, None
    
    def validate_and_ready(self, opportunity_id: str, audit: Optional[AuditTrail] = None) -> Tuple[RecoveryWorkflowState, Optional[str]]:
        """
        Validate plan and mark as ready for execution.
        
        Returns:
            (updated_workflow_state, error_message_if_failed)
        """
        
        workflow = self.workflows.get(opportunity_id)
        if not workflow:
            return None, f"Workflow not found: {opportunity_id}"
        
        # Verify state transition
        try:
            RecoveryStateTransition.validate(workflow.current_state, RecoveryState.READY)
        except ValueError as e:
            return None, str(e)
        
        # Validate workflow state consistency
        is_valid, error = PolicyGuard.validate_workflow_state(workflow)
        if not is_valid:
            if audit:
                audit.record_event("VALIDATION_FAILED", opportunity_id, {"error": error}, "ERROR")
            return None, f"Workflow validation failed: {error}"
        
        # Check stopping rules early
        should_stop, stop_reason = PolicyGuard.check_stopping_rules(workflow)
        if should_stop:
            workflow.current_state = RecoveryState.STOPPED
            workflow.stopping_reason = stop_reason
            if audit:
                audit.record_stopping_rule(opportunity_id, stop_reason)
            return workflow, None
        
        workflow.current_state = RecoveryState.READY
        
        if audit:
            audit.record_event("WORKFLOW_READY", opportunity_id, {"plan": workflow.plan})
        
        logger.info(f"Workflow ready for execution: {opportunity_id}")
        return workflow, None
    
    def execute_next_action(
        self,
        opportunity_id: str,
        is_simulation: bool = False,
        audit: Optional[AuditTrail] = None,
    ) -> Tuple[RecoveryWorkflowState, Optional[str]]:
        """
        Execute the next recovery action with governance validation.
        
        Returns:
            (updated_workflow_state, error_message_if_failed)
        """
        
        workflow = self.workflows.get(opportunity_id)
        if not workflow:
            return None, f"Workflow not found: {opportunity_id}"
        
        # Load opportunity
        opp = self.db.query(RevenueOpportunity).filter_by(id=opportunity_id).first()
        if not opp:
            return None, f"Opportunity not found: {opportunity_id}"
        
        # Determine next action
        next_action = self._select_next_action(workflow, opp, audit)
        if not next_action:
            workflow.current_state = RecoveryState.STOPPED
            workflow.stopping_reason = "No eligible action found"
            if audit:
                audit.record_stopping_rule(opportunity_id, "No eligible action")
            return workflow, None
        
        # Get recommendation for metrics
        recommendation = self.recommendation_engine.get_recommendation(opportunity_id) if workflow.plan else None
        expected_value = recommendation.expected_net_value if recommendation else 0
        recovery_probability = recommendation.recovery_probability if recommendation else 0
        friction_score = recommendation.customer_friction_score if recommendation else 50
        
        # Count customer actions (for contact limits)
        daily_actions = 0  # Would query database in production
        weekly_actions = 0  # Would query database in production
        
        # Governance evaluation
        governance_eval = governance_engine.evaluate(
            action_type=next_action,
            amount=opp.amount,
            expected_value=expected_value,
            recovery_probability=recovery_probability,
            friction_score=friction_score,
            customer_id=opp.customer_id,
            attempt_count=workflow.attempt_count,
            customer_contact_count=workflow.customer_contact_count,
            daily_actions_for_customer=daily_actions,
            weekly_actions_for_customer=weekly_actions,
        )
        
        # Record governance decision
        if audit:
            audit.record_policy_decision(
                opportunity_id,
                governance_eval.decision.value,
                governance_eval.reason,
                {"policies_checked": governance_eval.policies_checked, "violations": governance_eval.violations}
            )
        
        # Handle governance decision
        if governance_eval.decision == GovernanceDecision.BLOCKED:
            workflow.current_state = RecoveryState.STOPPED
            workflow.stopping_reason = f"Governance blocked: {governance_eval.reason}"
            return workflow, None
        
        elif governance_eval.decision == GovernanceDecision.DEFERRED:
            workflow.current_state = RecoveryState.WAITING
            workflow.stopping_reason = governance_eval.reason
            logger.info(f"Action deferred for {opportunity_id}: {governance_eval.reason}")
            return workflow, None
        
        elif governance_eval.decision == GovernanceDecision.REQUIRES_APPROVAL:
            # Create approval request
            approval_req = approval_queue.create_request(
                opportunity_id=opportunity_id,
                customer_id=opp.customer_id,
                action_type=next_action,
                amount=opp.amount,
                expected_value=expected_value,
                recovery_probability=recovery_probability,
                reason=governance_eval.reason,
            )
            workflow.current_state = RecoveryState.WAITING
            workflow.stopping_reason = f"Awaiting approval: {approval_req.id}"
            logger.info(f"Approval required for {opportunity_id}: {approval_req.id}")
            return workflow, None
        
        # ALLOWED - proceed with execution
        # Validate action execution
        can_execute, rejection_reason = PolicyGuard.can_execute_action(
            next_action,
            workflow,
            opp.amount,
            opp.type.value if hasattr(opp.type, 'value') else str(opp.type),
            opp.failure_reason,
        )
        
        if not can_execute:
            if audit:
                audit.record_policy_decision(opportunity_id, "REJECTED", rejection_reason)
            return None, f"Action rejected by safety check: {rejection_reason}"
        
        if audit:
            audit.record_policy_decision(opportunity_id, "APPROVED", details={"action": next_action})
        
        # Execute action
        execution_id = str(uuid.uuid4())
        
        # Validate execution request
        is_valid, validation_error = ExecutionValidator.validate_execution_request(
            next_action,
            opportunity_id,
            opp.amount,
            opp.customer.email if opp.customer else "",
        )
        
        if not is_valid:
            if audit:
                audit.record_event("EXECUTION_VALIDATION_FAILED", opportunity_id, {"error": validation_error}, "ERROR")
            return None, f"Execution validation failed: {validation_error}"
        
        # Execute
        result = executor.execute(
            opportunity_id,
            next_action,
            opp.amount,
            opp.customer.email if opp.customer else "",
            is_simulation=is_simulation,
        )
        
        # Convert result to execution record
        try:
            execution = ActionExecution(
                execution_id=execution_id,
                opportunity_id=opportunity_id,
                action_type=next_action,
                attempt_number=workflow.attempt_count + 1,
                state_before=workflow.current_state,
                state_after=RecoveryState.EXECUTING,
                result=ExecutionResult(result.get("status", "UNKNOWN")),
                provider_reference=result.get("provider_reference"),
                error_code=result.get("error_code"),
                error_message=result.get("error_message"),
                executed_at=datetime.utcnow(),
                expected_value=workflow.plan.get("primary_expected_value") if workflow.plan else None,
                expected_recovery=workflow.plan.get("expected_recovery") if workflow.plan else None,
            )
        except ValueError:
            execution = ActionExecution(
                execution_id=execution_id,
                opportunity_id=opportunity_id,
                action_type=next_action,
                attempt_number=workflow.attempt_count + 1,
                state_before=workflow.current_state,
                state_after=RecoveryState.EXECUTING,
                result=ExecutionResult.UNKNOWN,
                provider_reference=result.get("provider_reference"),
                error_code=result.get("error_code"),
                error_message=result.get("error_message"),
                executed_at=datetime.utcnow(),
            )
        
        # Update workflow
        workflow.executions.append(execution)
        workflow.attempt_count += 1
        workflow.current_action = next_action
        workflow.last_action_time = datetime.utcnow()
        
        # Track customer contacts
        if next_action in ["PAYMENT_LINK", "CUSTOMER_REMINDER", "INVOICE_REMINDER"]:
            workflow.customer_contact_count += 1
        
        # Determine new state based on result
        if execution.result == ExecutionResult.SUCCEEDED:
            workflow.success_count += 1
            workflow.current_state = RecoveryState.SUCCEEDED
            workflow.final_status = "RECOVERED"
        elif execution.result == ExecutionResult.FAILED:
            workflow.failure_count += 1
            workflow.current_state = RecoveryState.FAILED
        elif execution.result == ExecutionResult.UNKNOWN:
            workflow.current_state = RecoveryState.WAITING
        else:
            workflow.current_state = RecoveryState.FAILED
        
        if audit:
            audit.record_action_execution(opportunity_id, execution, governance_eval.decision.value)
        
        logger.info(f"Executed {next_action} for {opportunity_id}: {execution.result.value} (Governance: {governance_eval.decision.value})")
        
        return workflow, None
    
    def _select_next_action(
        self,
        workflow: RecoveryWorkflowState,
        opportunity: RevenueOpportunity,
        audit: Optional[AuditTrail] = None,
    ) -> Optional[str]:
        """Select the next action to execute."""
        
        # Get eligible actions
        eligible_actions = ActionEligibilityEngine.get_eligible_actions(
            opportunity,
            opportunity.type.value if hasattr(opportunity.type, 'value') else str(opportunity.type),
            opportunity.failure_reason or "",
            workflow.attempt_count
        )
        
        if not eligible_actions:
            return None
        
        # Filter out NO_ACTION if other options exist
        no_action_only = [a for a in eligible_actions if a != RecoveryActionType.NO_ACTION]
        if no_action_only:
            eligible_actions = no_action_only
        
        # Sort by expected net value
        if workflow.plan:
            # Return primary action first
            primary = workflow.plan.get("primary_action")
            if primary and RecoveryActionType(primary) in eligible_actions:
                return primary
        
        # Default: return highest expected value action
        best_action = eligible_actions[0]
        best_value = -float('inf')
        
        for action in eligible_actions:
            config = RECOVERY_ACTIONS.get(action)
            if config:
                expected_value = opportunity.amount * config.base_recovery_probability - config.action_cost
                if expected_value > best_value:
                    best_value = expected_value
                    best_action = action
        
        return best_action.value
    
    def should_continue_recovery(
        self,
        opportunity_id: str,
        audit: Optional[AuditTrail] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Determine if recovery should continue after current action.
        
        Returns:
            (should_continue, reason_to_stop_if_not_continuing)
        """
        
        workflow = self.workflows.get(opportunity_id)
        if not workflow:
            return False, "Workflow not found"
        
        # Check stopping rules
        should_stop, reason = PolicyGuard.check_stopping_rules(workflow)
        if should_stop:
            return False, reason
        
        # Check if already recovered
        if workflow.final_status == "RECOVERED":
            return False, "Revenue already recovered"
        
        # Check if should replan
        should_replan, replan_reason = PolicyGuard.should_replan(workflow)
        if should_replan:
            return True, None
        
        return False, "No eligible recovery path"
    
    def get_workflow(self, opportunity_id: str) -> Optional[RecoveryWorkflowState]:
        """Get workflow state."""
        return self.workflows.get(opportunity_id)
