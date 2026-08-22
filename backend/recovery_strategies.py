"""Recovery action strategies and eligibility rules."""

from enum import Enum
from typing import Dict, List
from dataclasses import dataclass


class RecoveryActionType(str, Enum):
    """Available recovery actions."""
    PAYMENT_RETRY = "PAYMENT_RETRY"
    PAYMENT_LINK = "PAYMENT_LINK"
    CUSTOMER_REMINDER = "CUSTOMER_REMINDER"
    SUBSCRIPTION_RETRY = "SUBSCRIPTION_RETRY"
    INVOICE_REMINDER = "INVOICE_REMINDER"
    DELAY_AND_RETRY = "DELAY_AND_RETRY"
    NO_ACTION = "NO_ACTION"


@dataclass
class RecoveryActionCharacteristics:
    """Characteristics of a recovery action."""
    action_type: RecoveryActionType
    base_recovery_probability: float
    expected_time_to_recovery_hours: float
    customer_friction_score: int  # 0-100
    action_cost: float  # In currency units
    max_allowed_attempts: int
    description: str


# Action definitions with synthetic but realistic characteristics
RECOVERY_ACTIONS: Dict[RecoveryActionType, RecoveryActionCharacteristics] = {
    RecoveryActionType.PAYMENT_RETRY: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.PAYMENT_RETRY,
        base_recovery_probability=0.31,
        expected_time_to_recovery_hours=2,
        customer_friction_score=12,
        action_cost=0.0,
        max_allowed_attempts=3,
        description="Automatically retry the failed payment"
    ),
    RecoveryActionType.PAYMENT_LINK: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.PAYMENT_LINK,
        base_recovery_probability=0.58,
        expected_time_to_recovery_hours=24,
        customer_friction_score=32,
        action_cost=2.0,
        max_allowed_attempts=1,
        description="Send customer a secure payment link to retry"
    ),
    RecoveryActionType.CUSTOMER_REMINDER: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.CUSTOMER_REMINDER,
        base_recovery_probability=0.44,
        expected_time_to_recovery_hours=48,
        customer_friction_score=28,
        action_cost=1.0,
        max_allowed_attempts=2,
        description="Send customer a reminder about pending payment"
    ),
    RecoveryActionType.SUBSCRIPTION_RETRY: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.SUBSCRIPTION_RETRY,
        base_recovery_probability=0.37,
        expected_time_to_recovery_hours=24,
        customer_friction_score=8,
        action_cost=0.0,
        max_allowed_attempts=4,
        description="Retry subscription renewal"
    ),
    RecoveryActionType.INVOICE_REMINDER: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.INVOICE_REMINDER,
        base_recovery_probability=0.35,
        expected_time_to_recovery_hours=72,
        customer_friction_score=20,
        action_cost=0.5,
        max_allowed_attempts=2,
        description="Send invoice reminder for overdue payment"
    ),
    RecoveryActionType.DELAY_AND_RETRY: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.DELAY_AND_RETRY,
        base_recovery_probability=0.28,
        expected_time_to_recovery_hours=72,
        customer_friction_score=5,
        action_cost=0.0,
        max_allowed_attempts=2,
        description="Wait and automatically retry later"
    ),
    RecoveryActionType.NO_ACTION: RecoveryActionCharacteristics(
        action_type=RecoveryActionType.NO_ACTION,
        base_recovery_probability=0.0,
        expected_time_to_recovery_hours=0,
        customer_friction_score=0,
        action_cost=0.0,
        max_allowed_attempts=999,
        description="No recovery action"
    ),
}


class ActionEligibilityEngine:
    """Determine which recovery actions are eligible for an opportunity."""

    @staticmethod
    def get_eligible_actions(opp: 'RevenueOpportunity', opp_type: str, failure_reason: str, previous_attempts: int = 0) -> List[RecoveryActionType]:
        """
        Determine eligible actions for an opportunity.
        
        Args:
            opp: RevenueOpportunity object
            opp_type: Opportunity type (PAYMENT_FAILURE, etc.)
            failure_reason: Failure reason string
            previous_attempts: Number of previous recovery attempts
            
        Returns:
            List of eligible RecoveryActionType
        """
        eligible = []
        
        # NO_ACTION is always eligible
        eligible.append(RecoveryActionType.NO_ACTION)
        
        # PAYMENT_RETRY is eligible for most payment failures
        if opp_type == "PAYMENT_FAILURE":
            # Exclude permanently declined, expired methods
            if not any(x in str(failure_reason).lower() for x in ["expired", "permanently", "declined", "invalid"]):
                if previous_attempts < 2:
                    eligible.append(RecoveryActionType.PAYMENT_RETRY)
        
        # PAYMENT_LINK when retry has failed
        if opp_type == "PAYMENT_FAILURE" and previous_attempts > 0:
            if not any(x in str(failure_reason).lower() for x in ["expired", "permanent", "invalid"]):
                eligible.append(RecoveryActionType.PAYMENT_LINK)
        
        # CUSTOMER_REMINDER for checkout abandonment or general payment issues
        if opp_type in ["CHECKOUT_ABANDONMENT", "PAYMENT_FAILURE"]:
            eligible.append(RecoveryActionType.CUSTOMER_REMINDER)
        
        # SUBSCRIPTION_RETRY for subscription failures
        if opp_type == "SUBSCRIPTION_FAILURE":
            if previous_attempts < 3:
                eligible.append(RecoveryActionType.SUBSCRIPTION_RETRY)
        
        # INVOICE_REMINDER for invoices/overdue
        if opp_type == "INVOICE_DELAY":
            eligible.append(RecoveryActionType.INVOICE_REMINDER)
        
        # DELAY_AND_RETRY for most types when recent
        if opp_type in ["PAYMENT_FAILURE", "SUBSCRIPTION_FAILURE"]:
            eligible.append(RecoveryActionType.DELAY_AND_RETRY)
        
        return eligible

    @staticmethod
    def is_action_eligible(action: RecoveryActionType, opp: 'RevenueOpportunity', opp_type: str, failure_reason: str, previous_attempts: int = 0) -> bool:
        """Check if a specific action is eligible."""
        eligible = ActionEligibilityEngine.get_eligible_actions(opp, opp_type, failure_reason, previous_attempts)
        return action in eligible


class FrictionModifier:
    """Calculate friction modifiers based on customer and attempt history."""
    
    @staticmethod
    def get_friction_modifier(previous_attempts: int, customer_recovery_rate: float, action_type: RecoveryActionType) -> float:
        """
        Get friction multiplier (1.0 = baseline, >1.0 = increased friction).
        
        Args:
            previous_attempts: Number of previous attempts
            customer_recovery_rate: Customer's historical recovery rate (0-1)
            action_type: The action being evaluated
            
        Returns:
            Friction multiplier
        """
        multiplier = 1.0
        
        # Repeated attempts increase friction
        multiplier += previous_attempts * 0.15
        
        # Low recovery rate history increases friction
        if customer_recovery_rate < 0.2:
            multiplier += 0.3
        elif customer_recovery_rate < 0.5:
            multiplier += 0.1
        
        # Some actions inherently pile on friction more
        if action_type == RecoveryActionType.CUSTOMER_REMINDER:
            multiplier += 0.1 * previous_attempts
        
        return max(1.0, multiplier)
