"""Policy rules engine - Define, validate, and enforce policies."""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, time
import logging

logger = logging.getLogger(__name__)


class PolicyType(str, Enum):
    """Types of policies that can be enforced."""
    MAX_RECOVERY_ATTEMPTS = "MAX_RECOVERY_ATTEMPTS"
    MAX_CUSTOMER_CONTACTS = "MAX_CUSTOMER_CONTACTS"
    MAX_DAILY_ACTIONS_PER_CUSTOMER = "MAX_DAILY_ACTIONS_PER_CUSTOMER"
    MAX_WEEKLY_ACTIONS_PER_CUSTOMER = "MAX_WEEKLY_ACTIONS_PER_CUSTOMER"
    MIN_EXPECTED_VALUE = "MIN_EXPECTED_VALUE"
    MIN_RECOVERY_PROBABILITY = "MIN_RECOVERY_PROBABILITY"
    MAX_CUSTOMER_FRICTION = "MAX_CUSTOMER_FRICTION"
    MAX_ACTION_AMOUNT = "MAX_ACTION_AMOUNT"
    ALLOWED_ACTIONS = "ALLOWED_ACTIONS"
    BLOCKED_ACTIONS = "BLOCKED_ACTIONS"
    REQUIRE_APPROVAL_ABOVE_AMOUNT = "REQUIRE_APPROVAL_ABOVE_AMOUNT"
    ALLOWED_EXECUTION_WINDOW_START = "ALLOWED_EXECUTION_WINDOW_START"
    ALLOWED_EXECUTION_WINDOW_END = "ALLOWED_EXECUTION_WINDOW_END"
    STOP_AFTER_SUCCESSFUL_RECOVERY = "STOP_AFTER_SUCCESSFUL_RECOVERY"
    STOP_AFTER_REPEATED_FAILURES = "STOP_AFTER_REPEATED_FAILURES"
    MAX_PLAN_DURATION_DAYS = "MAX_PLAN_DURATION_DAYS"


@dataclass
class Policy:
    """A single governance policy."""
    policy_type: PolicyType
    value: Any
    enabled: bool = True
    description: str = ""
    editable: bool = False  # Can merchant modify?
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            "policy_type": self.policy_type.value,
            "value": self.value,
            "enabled": self.enabled,
            "description": self.description,
            "editable": self.editable,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class PolicyValidator:
    """Validate policy values."""
    
    @staticmethod
    def validate(policy_type: PolicyType, value: Any) -> tuple[bool, Optional[str]]:
        """
        Validate a policy value.
        
        Returns:
            (is_valid, error_message)
        """
        
        try:
            if policy_type == PolicyType.MAX_RECOVERY_ATTEMPTS:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 10:
                    return False, "Cannot exceed 10 attempts"
                return True, None
            
            elif policy_type == PolicyType.MAX_CUSTOMER_CONTACTS:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 10:
                    return False, "Cannot exceed 10 contacts"
                return True, None
            
            elif policy_type == PolicyType.MAX_DAILY_ACTIONS_PER_CUSTOMER:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 20:
                    return False, "Cannot exceed 20 actions per day"
                return True, None
            
            elif policy_type == PolicyType.MAX_WEEKLY_ACTIONS_PER_CUSTOMER:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 50:
                    return False, "Cannot exceed 50 actions per week"
                return True, None
            
            elif policy_type == PolicyType.MIN_EXPECTED_VALUE:
                if not isinstance(value, (int, float)) or value < 0:
                    return False, "Must be non-negative number"
                if value > 1000000:
                    return False, "Cannot exceed 10,00,000"
                return True, None
            
            elif policy_type == PolicyType.MIN_RECOVERY_PROBABILITY:
                if not isinstance(value, (int, float)):
                    return False, "Must be a number"
                if not (0 <= value <= 1):
                    return False, "Must be between 0 and 1"
                return True, None
            
            elif policy_type == PolicyType.MAX_CUSTOMER_FRICTION:
                if not isinstance(value, (int, float)):
                    return False, "Must be a number"
                if not (0 <= value <= 100):
                    return False, "Must be between 0 and 100"
                return True, None
            
            elif policy_type == PolicyType.MAX_ACTION_AMOUNT:
                if not isinstance(value, (int, float)) or value <= 0:
                    return False, "Must be positive number"
                if value > 10000000:
                    return False, "Cannot exceed 1,00,00,000"
                return True, None
            
            elif policy_type == PolicyType.ALLOWED_ACTIONS:
                if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
                    return False, "Must be list of action names"
                return True, None
            
            elif policy_type == PolicyType.BLOCKED_ACTIONS:
                if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
                    return False, "Must be list of action names"
                return True, None
            
            elif policy_type == PolicyType.REQUIRE_APPROVAL_ABOVE_AMOUNT:
                if not isinstance(value, (int, float)) or value <= 0:
                    return False, "Must be positive number"
                if value > 10000000:
                    return False, "Cannot exceed 1,00,00,000"
                return True, None
            
            elif policy_type == PolicyType.ALLOWED_EXECUTION_WINDOW_START:
                if not isinstance(value, str):
                    return False, "Must be HH:MM format"
                try:
                    datetime.strptime(value, "%H:%M")
                    return True, None
                except ValueError:
                    return False, "Must be valid HH:MM format"
            
            elif policy_type == PolicyType.ALLOWED_EXECUTION_WINDOW_END:
                if not isinstance(value, str):
                    return False, "Must be HH:MM format"
                try:
                    datetime.strptime(value, "%H:%M")
                    return True, None
                except ValueError:
                    return False, "Must be valid HH:MM format"
            
            elif policy_type == PolicyType.STOP_AFTER_SUCCESSFUL_RECOVERY:
                if not isinstance(value, bool):
                    return False, "Must be boolean"
                return True, None
            
            elif policy_type == PolicyType.STOP_AFTER_REPEATED_FAILURES:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 10:
                    return False, "Cannot exceed 10 failures"
                return True, None
            
            elif policy_type == PolicyType.MAX_PLAN_DURATION_DAYS:
                if not isinstance(value, int) or value <= 0:
                    return False, "Must be positive integer"
                if value > 30:
                    return False, "Cannot exceed 30 days"
                return True, None
            
            return False, f"Unknown policy type: {policy_type}"
        
        except Exception as e:
            return False, f"Validation error: {str(e)}"


class DefaultPolicies:
    """Default safe policy set."""
    
    @staticmethod
    def get_defaults() -> Dict[PolicyType, Policy]:
        """Get default policies."""
        return {
            PolicyType.MAX_RECOVERY_ATTEMPTS: Policy(
                policy_type=PolicyType.MAX_RECOVERY_ATTEMPTS,
                value=3,
                enabled=True,
                description="Maximum recovery attempts per opportunity",
                editable=True,
            ),
            PolicyType.MAX_CUSTOMER_CONTACTS: Policy(
                policy_type=PolicyType.MAX_CUSTOMER_CONTACTS,
                value=2,
                enabled=True,
                description="Maximum customer contacts per opportunity",
                editable=True,
            ),
            PolicyType.MAX_DAILY_ACTIONS_PER_CUSTOMER: Policy(
                policy_type=PolicyType.MAX_DAILY_ACTIONS_PER_CUSTOMER,
                value=1,
                enabled=True,
                description="Maximum actions per customer per day",
                editable=True,
            ),
            PolicyType.MAX_WEEKLY_ACTIONS_PER_CUSTOMER: Policy(
                policy_type=PolicyType.MAX_WEEKLY_ACTIONS_PER_CUSTOMER,
                value=3,
                enabled=True,
                description="Maximum actions per customer per week",
                editable=True,
            ),
            PolicyType.MIN_EXPECTED_VALUE: Policy(
                policy_type=PolicyType.MIN_EXPECTED_VALUE,
                value=100,
                enabled=True,
                description="Minimum expected recovery value in INR",
                editable=True,
            ),
            PolicyType.MIN_RECOVERY_PROBABILITY: Policy(
                policy_type=PolicyType.MIN_RECOVERY_PROBABILITY,
                value=0.2,
                enabled=True,
                description="Minimum recovery probability (0-1)",
                editable=True,
            ),
            PolicyType.MAX_CUSTOMER_FRICTION: Policy(
                policy_type=PolicyType.MAX_CUSTOMER_FRICTION,
                value=70,
                enabled=True,
                description="Maximum customer friction score (0-100)",
                editable=True,
            ),
            PolicyType.MAX_ACTION_AMOUNT: Policy(
                policy_type=PolicyType.MAX_ACTION_AMOUNT,
                value=100000,
                enabled=False,
                description="Maximum single action amount (disabled - no limit)",
                editable=False,
            ),
            PolicyType.ALLOWED_ACTIONS: Policy(
                policy_type=PolicyType.ALLOWED_ACTIONS,
                value=[
                    "PAYMENT_RETRY",
                    "PAYMENT_LINK",
                    "CUSTOMER_REMINDER",
                    "SUBSCRIPTION_RETRY",
                    "INVOICE_REMINDER",
                    "DELAY_AND_RETRY",
                ],
                enabled=True,
                description="Actions allowed by merchant",
                editable=False,
            ),
            PolicyType.BLOCKED_ACTIONS: Policy(
                policy_type=PolicyType.BLOCKED_ACTIONS,
                value=[],
                enabled=True,
                description="Actions blocked by merchant",
                editable=False,
            ),
            PolicyType.REQUIRE_APPROVAL_ABOVE_AMOUNT: Policy(
                policy_type=PolicyType.REQUIRE_APPROVAL_ABOVE_AMOUNT,
                value=10000,
                enabled=True,
                description="Require approval for amounts above this threshold",
                editable=True,
            ),
            PolicyType.ALLOWED_EXECUTION_WINDOW_START: Policy(
                policy_type=PolicyType.ALLOWED_EXECUTION_WINDOW_START,
                value="09:00",
                enabled=True,
                description="Start of allowed execution window (HH:MM)",
                editable=True,
            ),
            PolicyType.ALLOWED_EXECUTION_WINDOW_END: Policy(
                policy_type=PolicyType.ALLOWED_EXECUTION_WINDOW_END,
                value="20:00",
                enabled=True,
                description="End of allowed execution window (HH:MM)",
                editable=True,
            ),
            PolicyType.STOP_AFTER_SUCCESSFUL_RECOVERY: Policy(
                policy_type=PolicyType.STOP_AFTER_SUCCESSFUL_RECOVERY,
                value=True,
                enabled=True,
                description="Stop recovery workflow after successful recovery",
                editable=False,
            ),
            PolicyType.STOP_AFTER_REPEATED_FAILURES: Policy(
                policy_type=PolicyType.STOP_AFTER_REPEATED_FAILURES,
                value=3,
                enabled=True,
                description="Stop recovery workflow after N repeated failures",
                editable=True,
            ),
            PolicyType.MAX_PLAN_DURATION_DAYS: Policy(
                policy_type=PolicyType.MAX_PLAN_DURATION_DAYS,
                value=7,
                enabled=True,
                description="Maximum recovery plan duration in days",
                editable=True,
            ),
        }


class PolicySet:
    """Complete set of policies for a merchant."""
    
    def __init__(self, policies: Optional[Dict[PolicyType, Policy]] = None):
        """Initialize policy set."""
        if policies is None:
            policies = DefaultPolicies.get_defaults()
        self.policies = policies
    
    def get_policy(self, policy_type: PolicyType) -> Optional[Policy]:
        """Get a specific policy."""
        return self.policies.get(policy_type)
    
    def get_policy_value(self, policy_type: PolicyType) -> Any:
        """Get policy value (or None if disabled)."""
        policy = self.get_policy(policy_type)
        if policy and policy.enabled:
            return policy.value
        return None
    
    def update_policy(self, policy_type: PolicyType, value: Any) -> tuple[bool, Optional[str]]:
        """
        Update a policy value.
        
        Returns:
            (success, error_message)
        """
        policy = self.policies.get(policy_type)
        if not policy:
            return False, f"Unknown policy: {policy_type}"
        
        if not policy.editable:
            return False, f"Policy is not editable: {policy_type}"
        
        # Validate new value
        is_valid, error = PolicyValidator.validate(policy_type, value)
        if not is_valid:
            return False, error
        
        # Update
        policy.value = value
        policy.updated_at = datetime.utcnow()
        return True, None
    
    def enable_policy(self, policy_type: PolicyType) -> tuple[bool, Optional[str]]:
        """Enable a policy."""
        policy = self.policies.get(policy_type)
        if not policy:
            return False, f"Unknown policy: {policy_type}"
        policy.enabled = True
        policy.updated_at = datetime.utcnow()
        return True, None
    
    def disable_policy(self, policy_type: PolicyType) -> tuple[bool, Optional[str]]:
        """Disable a policy."""
        policy = self.policies.get(policy_type)
        if not policy:
            return False, f"Unknown policy: {policy_type}"
        policy.enabled = False
        policy.updated_at = datetime.utcnow()
        return True, None
    
    def to_dict(self) -> Dict[str, Any]:
        """Export all policies as dict."""
        return {
            key.value: policy.to_dict()
            for key, policy in self.policies.items()
        }
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'PolicySet':
        """Import policies from dict."""
        policies = {}
        for policy_type in PolicyType:
            if policy_type.value in data:
                p_dict = data[policy_type.value]
                policies[policy_type] = Policy(
                    policy_type=policy_type,
                    value=p_dict.get("value"),
                    enabled=p_dict.get("enabled", True),
                    description=p_dict.get("description", ""),
                    editable=p_dict.get("editable", False),
                )
        return PolicySet(policies)
