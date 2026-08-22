"""Governance service - Evaluate policy decisions."""

from typing import Optional, Dict, Any, List
from datetime import datetime, time
from enum import Enum
import logging
import json

from policy_rules import PolicySet, PolicyType

logger = logging.getLogger(__name__)


class GovernanceDecision(str, Enum):
    """Governance decision outcomes."""
    ALLOWED = "ALLOWED"
    BLOCKED = "BLOCKED"
    REQUIRES_APPROVAL = "REQUIRES_APPROVAL"
    DEFERRED = "DEFERRED"


class GovernanceEvaluation:
    """Result of governance evaluation."""
    
    def __init__(
        self,
        decision: GovernanceDecision,
        action: str,
        reason: str,
        policies_checked: List[str],
        violations: List[str],
        warnings: List[str],
        approval_required: bool = False,
        timestamp: Optional[datetime] = None,
    ):
        """Initialize evaluation result."""
        self.decision = decision
        self.action = action
        self.reason = reason
        self.policies_checked = policies_checked
        self.violations = violations
        self.warnings = warnings
        self.approval_required = approval_required
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            "decision": self.decision.value,
            "action": self.action,
            "reason": self.reason,
            "policies_checked": self.policies_checked,
            "violations": self.violations,
            "warnings": self.warnings,
            "approval_required": self.approval_required,
            "timestamp": self.timestamp.isoformat(),
        }


class GovernanceEngine:
    """Evaluate actions against policies."""
    
    def __init__(self, policy_set: Optional[PolicySet] = None):
        """Initialize governance engine."""
        self.policy_set = policy_set or PolicySet()
        self.is_paused = False
    
    def pause(self) -> None:
        """Pause all recovery execution."""
        self.is_paused = True
        logger.warning("Governance Engine: Recovery execution PAUSED")
    
    def resume(self) -> None:
        """Resume execution with re-validation requirement."""
        self.is_paused = False
        logger.info("Governance Engine: Recovery execution RESUMED")
    
    def evaluate(
        self,
        action_type: str,
        amount: float,
        expected_value: float,
        recovery_probability: float,
        friction_score: float,
        customer_id: str,
        attempt_count: int,
        customer_contact_count: int,
        daily_actions_for_customer: int,
        weekly_actions_for_customer: int,
    ) -> GovernanceEvaluation:
        """
        Evaluate if an action should be allowed.
        
        Returns:
            GovernanceEvaluation with decision and details
        """
        
        policies_checked = []
        violations = []
        warnings = []
        
        # Check 1: System paused?
        if self.is_paused:
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason="Recovery execution is paused",
                policies_checked=["SYSTEM_PAUSED"],
                violations=["SYSTEM_PAUSED"],
                warnings=[],
            )
        
        # Check 2: Action in allowlist
        policies_checked.append("ALLOWED_ACTIONS")
        allowed_actions = self.policy_set.get_policy_value(PolicyType.ALLOWED_ACTIONS)
        if allowed_actions and action_type not in allowed_actions:
            violations.append(f"Action not in allowlist: {action_type}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Action {action_type} is not allowed",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 3: Action not blocked
        policies_checked.append("BLOCKED_ACTIONS")
        blocked_actions = self.policy_set.get_policy_value(PolicyType.BLOCKED_ACTIONS)
        if blocked_actions and action_type in blocked_actions:
            violations.append(f"Action is blocked: {action_type}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Action {action_type} is blocked",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 4: Expected value threshold
        policies_checked.append("MIN_EXPECTED_VALUE")
        min_expected_value = self.policy_set.get_policy_value(PolicyType.MIN_EXPECTED_VALUE)
        if min_expected_value is not None and expected_value < min_expected_value:
            violations.append(f"Expected value {expected_value} below minimum {min_expected_value}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Expected recovery value below threshold (₹{min_expected_value})",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 5: Recovery probability
        policies_checked.append("MIN_RECOVERY_PROBABILITY")
        min_probability = self.policy_set.get_policy_value(PolicyType.MIN_RECOVERY_PROBABILITY)
        if min_probability is not None and recovery_probability < min_probability:
            violations.append(f"Recovery probability {recovery_probability} below minimum {min_probability}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Recovery probability too low",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 6: Friction score
        policies_checked.append("MAX_CUSTOMER_FRICTION")
        max_friction = self.policy_set.get_policy_value(PolicyType.MAX_CUSTOMER_FRICTION)
        if max_friction is not None and friction_score > max_friction:
            violations.append(f"Friction score {friction_score} exceeds maximum {max_friction}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Customer friction too high",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 7: Max recovery attempts
        policies_checked.append("MAX_RECOVERY_ATTEMPTS")
        max_attempts = self.policy_set.get_policy_value(PolicyType.MAX_RECOVERY_ATTEMPTS)
        if max_attempts is not None and attempt_count >= max_attempts:
            violations.append(f"Attempt count {attempt_count} meets/exceeds maximum {max_attempts}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Maximum recovery attempts reached",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 8: Max customer contacts
        policies_checked.append("MAX_CUSTOMER_CONTACTS")
        max_contacts = self.policy_set.get_policy_value(PolicyType.MAX_CUSTOMER_CONTACTS)
        contact_actions = {"PAYMENT_LINK", "CUSTOMER_REMINDER", "INVOICE_REMINDER"}
        if action_type in contact_actions:
            if max_contacts is not None and customer_contact_count >= max_contacts:
                violations.append(f"Customer contact count {customer_contact_count} meets/exceeds maximum {max_contacts}")
                return GovernanceEvaluation(
                    decision=GovernanceDecision.BLOCKED,
                    action=action_type,
                    reason=f"Maximum customer contacts reached",
                    policies_checked=policies_checked,
                    violations=violations,
                    warnings=warnings,
                )
        
        # Check 9: Max daily actions per customer
        policies_checked.append("MAX_DAILY_ACTIONS_PER_CUSTOMER")
        max_daily = self.policy_set.get_policy_value(PolicyType.MAX_DAILY_ACTIONS_PER_CUSTOMER)
        if max_daily is not None and daily_actions_for_customer >= max_daily:
            violations.append(f"Daily action count {daily_actions_for_customer} meets/exceeds maximum {max_daily}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Maximum daily actions for customer reached",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 10: Max weekly actions per customer
        policies_checked.append("MAX_WEEKLY_ACTIONS_PER_CUSTOMER")
        max_weekly = self.policy_set.get_policy_value(PolicyType.MAX_WEEKLY_ACTIONS_PER_CUSTOMER)
        if max_weekly is not None and weekly_actions_for_customer >= max_weekly:
            violations.append(f"Weekly action count {weekly_actions_for_customer} meets/exceeds maximum {max_weekly}")
            return GovernanceEvaluation(
                decision=GovernanceDecision.BLOCKED,
                action=action_type,
                reason=f"Maximum weekly actions for customer reached",
                policies_checked=policies_checked,
                violations=violations,
                warnings=warnings,
            )
        
        # Check 11: Execution time window
        policies_checked.append("ALLOWED_EXECUTION_WINDOW_START")
        policies_checked.append("ALLOWED_EXECUTION_WINDOW_END")
        window_start_str = self.policy_set.get_policy_value(PolicyType.ALLOWED_EXECUTION_WINDOW_START)
        window_end_str = self.policy_set.get_policy_value(PolicyType.ALLOWED_EXECUTION_WINDOW_END)
        
        if window_start_str and window_end_str:
            try:
                window_start = datetime.strptime(window_start_str, "%H:%M").time()
                window_end = datetime.strptime(window_end_str, "%H:%M").time()
                current_time = datetime.utcnow().time()
                
                # Check if current time is within window
                if window_start <= window_end:
                    # Normal window (e.g., 09:00-20:00)
                    if not (window_start <= current_time <= window_end):
                        warnings.append(f"Outside execution window {window_start_str}-{window_end_str}")
                        return GovernanceEvaluation(
                            decision=GovernanceDecision.DEFERRED,
                            action=action_type,
                            reason=f"Action deferred until execution window {window_start_str}-{window_end_str}",
                            policies_checked=policies_checked,
                            violations=[],
                            warnings=warnings,
                        )
                else:
                    # Wrapped window (e.g., 20:00-09:00)
                    if not (current_time >= window_start or current_time <= window_end):
                        warnings.append(f"Outside execution window {window_start_str}-{window_end_str}")
                        return GovernanceEvaluation(
                            decision=GovernanceDecision.DEFERRED,
                            action=action_type,
                            reason=f"Action deferred until execution window {window_start_str}-{window_end_str}",
                            policies_checked=policies_checked,
                            violations=[],
                            warnings=warnings,
                        )
            except Exception as e:
                logger.warning(f"Time window validation error: {e}")
        
        # Check 12: Approval threshold
        policies_checked.append("REQUIRE_APPROVAL_ABOVE_AMOUNT")
        approval_threshold = self.policy_set.get_policy_value(PolicyType.REQUIRE_APPROVAL_ABOVE_AMOUNT)
        if approval_threshold is not None and amount > approval_threshold:
            return GovernanceEvaluation(
                decision=GovernanceDecision.REQUIRES_APPROVAL,
                action=action_type,
                reason=f"Amount ₹{amount} exceeds approval threshold ₹{approval_threshold}",
                policies_checked=policies_checked,
                violations=[],
                warnings=[],
                approval_required=True,
            )
        
        # All checks passed
        return GovernanceEvaluation(
            decision=GovernanceDecision.ALLOWED,
            action=action_type,
            reason="All policy checks passed",
            policies_checked=policies_checked,
            violations=[],
            warnings=warnings,
        )


# Global governance engine instance
governance_engine = GovernanceEngine()
