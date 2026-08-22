"""Core recovery recommendation engine."""

from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import math

from models import RevenueOpportunity, Customer, Transaction, OpportunityType
from recovery_strategies import (
    RecoveryActionType, RECOVERY_ACTIONS, ActionEligibilityEngine, FrictionModifier
)
from recovery_models import (
    RecoveryActionCandidate, NextBestTime, RecoveryRecommendation,
    RecoveryActionComparison, RecoveryPlan
)


class RecoveryExpectedValueCalculator:
    """Calculate expected value for recovery actions."""
    
    @staticmethod
    def calculate_recovery_probability_adjustment(
        base_probability: float,
        previous_attempts: int,
        customer_recovery_rate: float,
        opportunity_age_days: int
    ) -> float:
        """
        Adjust base recovery probability based on context.
        
        Args:
            base_probability: Base probability from action characteristics
            previous_attempts: Number of previous recovery attempts
            customer_recovery_rate: Customer's historical recovery rate (0-1)
            opportunity_age_days: Days since opportunity creation
            
        Returns:
            Adjusted recovery probability (0-1)
        """
        adjusted = base_probability
        
        # Previous attempts reduce probability (fatigue)
        adjustment_factor = 1.0 - (previous_attempts * 0.15)
        adjusted *= adjustment_factor
        
        # Customer history helps or hurts
        if customer_recovery_rate > 0.7:
            adjusted *= 1.1
        elif customer_recovery_rate < 0.2:
            adjusted *= 0.8
        
        # Aging reduces probability
        aging_factor = 1.0 - (min(opportunity_age_days, 60) / 120)  # Cap at 60 days
        adjusted *= aging_factor
        
        return max(0.0, min(1.0, adjusted))
    
    @staticmethod
    def calculate_expected_net_value(
        amount: float,
        recovery_probability: float,
        action_cost: float,
        customer_friction_score: int,
        urgency_factor: float,
        recoverability_score: int
    ) -> float:
        """
        Calculate net expected value of recovery action.
        
        Formula:
        Net EV = (Amount × Recovery Probability) - Action Cost - Friction Penalty
        
        Args:
            amount: Opportunity amount
            recovery_probability: Probability of recovery (0-1)
            action_cost: Cost to execute action
            customer_friction_score: Friction score (0-100)
            urgency_factor: Urgency multiplier (0-1)
            recoverability_score: Recoverability score (0-100)
            
        Returns:
            Net expected value
        """
        expected_recovery = amount * recovery_probability
        
        # Friction penalty (higher friction = more penalty)
        friction_penalty = amount * (customer_friction_score / 100.0) * 0.2
        
        # Urgency improves value (more urgent = act sooner = higher value)
        urgency_multiplier = 1.0 + (urgency_factor * 0.15)
        
        # Recoverability bonus
        recoverability_multiplier = 1.0 + (recoverability_score / 100.0) * 0.1
        
        net_value = (expected_recovery - action_cost - friction_penalty)
        net_value *= urgency_multiplier * recoverability_multiplier
        
        return max(0.0, net_value)


class RecoveryRecommendationEngine:
    """Main engine for generating recovery recommendations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self.calc = RecoveryExpectedValueCalculator()
    
    def get_recommendation(
        self,
        opportunity: RevenueOpportunity,
        risk_info: Dict,
        customer_history: Dict
    ) -> RecoveryRecommendation:
        """
        Generate recovery recommendation for an opportunity.
        
        Args:
            opportunity: RevenueOpportunity object
            risk_info: Risk intelligence from Phase 2
            customer_history: Customer history metrics
            
        Returns:
            RecoveryRecommendation with next best action and timing
        """
        # Get eligible actions
        opp_type = opportunity.type.value if opportunity.type else "PAYMENT_FAILURE"
        failure_reason = opportunity.failure_reason or ""
        previous_attempts = self._count_previous_attempts(opportunity.id)
        
        eligible_actions = ActionEligibilityEngine.get_eligible_actions(
            opportunity, opp_type, failure_reason, previous_attempts
        )
        
        # Evaluate each eligible action
        candidates = []
        for action_type in eligible_actions:
            candidate = self._evaluate_action(
                action_type, opportunity, risk_info, customer_history, previous_attempts
            )
            if candidate:
                candidates.append(candidate)
        
        # Rank by expected net value
        candidates.sort(key=lambda x: x.expected_net_value, reverse=True)
        
        # Select best action (or NO_ACTION if all have negative value)
        best_action = candidates[0] if candidates else None
        
        if not best_action or best_action.expected_net_value <= 0:
            best_action = self._create_no_action_candidate(opportunity)
            candidates = [best_action]
        
        # Generate timing
        next_best_time = self._calculate_next_best_time(
            best_action.action_type, opportunity, previous_attempts
        )
        
        # Generate explanations
        why_this = self._explain_action_choice(best_action, opportunity, risk_info)
        why_not_others = self._explain_alternatives(candidates[1:] if len(candidates) > 1 else [], best_action)
        
        # Generate stopping rules
        stopping_rules = self._generate_stopping_rules(opportunity, best_action.action_type)
        
        # Build recommendation
        return RecoveryRecommendation(
            opportunity_id=opportunity.id,
            recommended_action=best_action.action_type,
            expected_recovered_amount=round(best_action.expected_recovered_amount, 2),
            recovery_probability=round(best_action.recovery_probability, 3),
            expected_net_value=round(best_action.expected_net_value, 2),
            customer_friction_score=best_action.customer_friction_score,
            next_best_time=next_best_time,
            why_this_action=why_this,
            why_not_others=why_not_others,
            stopping_rules=stopping_rules,
            confidence=round(best_action.confidence, 2),
            computed_at=datetime.utcnow().isoformat()
        )
    
    def _evaluate_action(
        self,
        action_type: RecoveryActionType,
        opportunity: RevenueOpportunity,
        risk_info: Dict,
        customer_history: Dict,
        previous_attempts: int
    ) -> Optional[RecoveryActionCandidate]:
        """Evaluate a single action."""
        if action_type == RecoveryActionType.NO_ACTION:
            return self._create_no_action_candidate(opportunity)
        
        action_def = RECOVERY_ACTIONS.get(action_type)
        if not action_def:
            return None
        
        # Calculate adjusted probability
        opp_age = (datetime.utcnow() - opportunity.created_at).days
        customer_recovery_rate = customer_history.get("recovery_rate", 0.5)
        
        adjusted_prob = self.calc.calculate_recovery_probability_adjustment(
            action_def.base_recovery_probability,
            previous_attempts,
            customer_recovery_rate,
            opp_age
        )
        
        # Calculate friction with modifier
        friction_multiplier = FrictionModifier.get_friction_modifier(
            previous_attempts, customer_recovery_rate, action_type
        )
        adjusted_friction = int(action_def.customer_friction_score * friction_multiplier)
        
        # Urgency factor based on opportunity age
        urgency_factor = min(1.0, opp_age / 30.0)
        
        # Recoverability score from risk_info
        recoverability_score = risk_info.get("recoverability_score", 50)
        
        # Calculate expected value
        expected_recovered = opportunity.amount * adjusted_prob
        net_expected_value = self.calc.calculate_expected_net_value(
            opportunity.amount,
            adjusted_prob,
            action_def.action_cost,
            adjusted_friction,
            urgency_factor,
            recoverability_score
        )
        
        # Confidence based on data availability and action type
        confidence = 0.7 + (customer_recovery_rate * 0.2)
        if action_type == RecoveryActionType.NO_ACTION:
            confidence = 1.0
        
        return RecoveryActionCandidate(
            action_type=action_type.value,
            recovery_probability=round(adjusted_prob, 3),
            expected_recovered_amount=round(expected_recovered, 2),
            action_cost=round(action_def.action_cost, 2),
            customer_friction_score=min(100, adjusted_friction),
            urgency_factor=round(urgency_factor, 2),
            expected_net_value=round(net_expected_value, 2),
            confidence=round(confidence, 2),
            reason=action_def.description
        )
    
    def _create_no_action_candidate(self, opportunity: RevenueOpportunity) -> RecoveryActionCandidate:
        """Create NO_ACTION candidate."""
        return RecoveryActionCandidate(
            action_type="NO_ACTION",
            recovery_probability=0.0,
            expected_recovered_amount=0.0,
            action_cost=0.0,
            customer_friction_score=0,
            urgency_factor=0.0,
            expected_net_value=0.0,
            confidence=1.0,
            reason="No recovery action"
        )
    
    def _calculate_next_best_time(
        self,
        action_type: str,
        opportunity: RevenueOpportunity,
        previous_attempts: int
    ) -> NextBestTime:
        """Calculate recommended timing for action."""
        from recovery_timing import TimingEngine
        
        timing_engine = TimingEngine()
        return timing_engine.calculate_timing(
            action_type, opportunity, previous_attempts
        )
    
    def _count_previous_attempts(self, opportunity_id: str) -> int:
        """Count previous recovery attempts for this opportunity."""
        # In a full system this would query attempt history
        # For now, return 0 (synthetic data has no history)
        return 0
    
    def _explain_action_choice(
        self,
        action: RecoveryActionCandidate,
        opportunity: RevenueOpportunity,
        risk_info: Dict
    ) -> str:
        """Generate explanation for why this action was chosen."""
        if action.action_type == "NO_ACTION":
            return "No recovery action recommended based on opportunity characteristics and expected value analysis."
        
        reasons = [
            f"Expected recovery value of ₹{action.expected_recovered_amount:,.0f}",
            f"Recovery probability of {action.recovery_probability * 100:.0f}%",
            f"Estimated net value of ₹{action.expected_net_value:,.0f}"
        ]
        
        # Add context
        if risk_info.get("risk_level") == "CRITICAL":
            reasons.append("Opportunity shows critical risk level requiring immediate action")
        
        if opportunity.type == OpportunityType.PAYMENT_FAILURE:
            if action.action_type == "PAYMENT_LINK":
                reasons.append("Payment link strategy performs better for this customer segment")
            elif action.action_type == "PAYMENT_RETRY":
                reasons.append("Automated retry is appropriate for this failure type")
        
        return " • ".join(reasons)
    
    def _explain_alternatives(
        self,
        alternatives: List[RecoveryActionCandidate],
        selected: RecoveryActionCandidate
    ) -> Dict[str, str]:
        """Generate explanations for why alternatives weren't chosen."""
        explanations = {}
        
        for alt in alternatives:
            if alt.expected_net_value <= 0:
                explanations[alt.action_type] = f"Negative expected value (₹{alt.expected_net_value:,.0f})"
            else:
                value_diff = selected.expected_net_value - alt.expected_net_value
                explanations[alt.action_type] = f"Lower expected value by ₹{value_diff:,.0f}"
        
        return explanations
    
    def _generate_stopping_rules(
        self,
        opportunity: RevenueOpportunity,
        action_type: str
    ) -> List[str]:
        """Generate stopping rules for recovery plan."""
        rules = [
            "Stop immediately after successful recovery",
            "Stop if customer requests opt-out",
            "Stop if expected value becomes negative"
        ]
        
        action_def = RECOVERY_ACTIONS.get(RecoveryActionType(action_type))
        if action_def:
            rules.append(f"Stop after {action_def.max_allowed_attempts} attempts")
        
        if opportunity.type == OpportunityType.SUBSCRIPTION_FAILURE:
            rules.append("Stop after 2 consecutive failed retries")
        
        rules.append("Stop if customer friction exceeds 80/100")
        
        return rules
    
    def get_action_comparison(
        self,
        opportunity: RevenueOpportunity,
        risk_info: Dict,
        customer_history: Dict
    ) -> RecoveryActionComparison:
        """Get comparison of all eligible actions."""
        opp_type = opportunity.type.value if opportunity.type else "PAYMENT_FAILURE"
        failure_reason = opportunity.failure_reason or ""
        previous_attempts = self._count_previous_attempts(opportunity.id)
        
        eligible_actions = ActionEligibilityEngine.get_eligible_actions(
            opportunity, opp_type, failure_reason, previous_attempts
        )
        
        candidates = []
        for action_type in eligible_actions:
            candidate = self._evaluate_action(
                action_type, opportunity, risk_info, customer_history, previous_attempts
            )
            if candidate:
                candidates.append(candidate)
        
        candidates.sort(key=lambda x: x.expected_net_value, reverse=True)
        
        recommended = candidates[0].action_type if candidates else "NO_ACTION"
        
        return RecoveryActionComparison(
            opportunity_id=opportunity.id,
            candidates=candidates,
            recommended_action=recommended,
            summary=f"{len(candidates)} eligible actions evaluated"
        )
