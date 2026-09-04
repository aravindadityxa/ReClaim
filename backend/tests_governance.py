"""Governance and safety tests."""

import pytest
from datetime import datetime, timedelta
from policy_rules import PolicyType, Policy, PolicySet, PolicyValidator, DefaultPolicies
from governance_service import GovernanceEngine, GovernanceDecision
from approval_service import ApprovalQueue, ApprovalStatus, ApprovalRequest


class TestPolicyValidator:
    """Test policy validation."""
    
    def test_validate_max_recovery_attempts_valid(self):
        """Test valid max recovery attempts."""
        valid, error = PolicyValidator.validate(PolicyType.MAX_RECOVERY_ATTEMPTS, 3)
        assert valid
        assert error is None
    
    def test_validate_max_recovery_attempts_invalid_negative(self):
        """Test invalid negative value."""
        valid, error = PolicyValidator.validate(PolicyType.MAX_RECOVERY_ATTEMPTS, -1)
        assert not valid
        assert "positive" in error.lower()
    
    def test_validate_max_recovery_attempts_too_high(self):
        """Test value exceeds maximum."""
        valid, error = PolicyValidator.validate(PolicyType.MAX_RECOVERY_ATTEMPTS, 20)
        assert not valid
        assert "exceed" in error.lower()
    
    def test_validate_min_probability_valid(self):
        """Test valid probability."""
        valid, error = PolicyValidator.validate(PolicyType.MIN_RECOVERY_PROBABILITY, 0.5)
        assert valid
        assert error is None
    
    def test_validate_min_probability_invalid_range(self):
        """Test probability out of range."""
        valid, error = PolicyValidator.validate(PolicyType.MIN_RECOVERY_PROBABILITY, 1.5)
        assert not valid
        assert "between 0 and 1" in error.lower()
    
    def test_validate_friction_score_valid(self):
        """Test valid friction score."""
        valid, error = PolicyValidator.validate(PolicyType.MAX_CUSTOMER_FRICTION, 75)
        assert valid
        assert error is None
    
    def test_validate_friction_score_invalid_range(self):
        """Test friction score out of range."""
        valid, error = PolicyValidator.validate(PolicyType.MAX_CUSTOMER_FRICTION, 150)
        assert not valid
        assert "between 0 and 100" in error.lower()
    
    def test_validate_execution_window_valid(self):
        """Test valid execution window."""
        valid, error = PolicyValidator.validate(PolicyType.ALLOWED_EXECUTION_WINDOW_START, "09:00")
        assert valid
        assert error is None
    
    def test_validate_execution_window_invalid_format(self):
        """Test invalid time format."""
        valid, error = PolicyValidator.validate(PolicyType.ALLOWED_EXECUTION_WINDOW_START, "9:00 AM")
        assert not valid
        assert "HH:MM" in error


class TestPolicySet:
    """Test policy set management."""
    
    def test_get_default_policies(self):
        """Test default policies are created."""
        policies = DefaultPolicies.get_defaults()
        assert len(policies) > 0
        assert PolicyType.MAX_RECOVERY_ATTEMPTS in policies
        assert policies[PolicyType.MAX_RECOVERY_ATTEMPTS].value == 3
    
    def test_update_policy_success(self):
        """Test successful policy update."""
        policy_set = PolicySet()
        success, error = policy_set.update_policy(PolicyType.MAX_RECOVERY_ATTEMPTS, 5)
        assert success
        assert error is None
        assert policy_set.get_policy_value(PolicyType.MAX_RECOVERY_ATTEMPTS) == 5
    
    def test_update_policy_invalid_value(self):
        """Test policy update with invalid value."""
        policy_set = PolicySet()
        success, error = policy_set.update_policy(PolicyType.MAX_RECOVERY_ATTEMPTS, -1)
        assert not success
        assert error is not None
    
    def test_update_non_editable_policy(self):
        """Test cannot update non-editable policy."""
        policy_set = PolicySet()
        success, error = policy_set.update_policy(PolicyType.ALLOWED_ACTIONS, ["NEW_ACTION"])
        assert not success
        assert "not editable" in error.lower()
    
    def test_enable_disable_policy(self):
        """Test enable/disable policy."""
        policy_set = PolicySet()
        policy_set.disable_policy(PolicyType.MAX_RECOVERY_ATTEMPTS)
        assert policy_set.get_policy_value(PolicyType.MAX_RECOVERY_ATTEMPTS) is None
        
        policy_set.enable_policy(PolicyType.MAX_RECOVERY_ATTEMPTS)
        assert policy_set.get_policy_value(PolicyType.MAX_RECOVERY_ATTEMPTS) == 3
    
    def test_policy_set_serialization(self):
        """Test serialize/deserialize policy set."""
        policy_set = PolicySet()
        dict_repr = policy_set.to_dict()
        
        restored = PolicySet.from_dict(dict_repr)
        assert restored.get_policy_value(PolicyType.MAX_RECOVERY_ATTEMPTS) == 3


class TestGovernanceEngine:
    """Test governance evaluation."""
    
    def test_pause_resume(self):
        """Test pause and resume."""
        engine = GovernanceEngine()
        assert not engine.is_paused
        
        engine.pause()
        assert engine.is_paused
        
        engine.resume()
        assert not engine.is_paused
    
    def test_evaluation_allowed_basic(self):
        """Test basic allowed evaluation."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.ALLOWED
    
    def test_evaluation_blocked_paused(self):
        """Test blocked when system is paused."""
        engine = GovernanceEngine()
        engine.pause()
        
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "paused" in eval.reason.lower()
    
    def test_evaluation_blocked_action_not_allowed(self):
        """Test blocked when action not in allowlist."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="UNKNOWN_ACTION",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "not in allowlist" in eval.reason.lower() or "not allowed" in eval.reason.lower()
    
    def test_evaluation_blocked_low_expected_value(self):
        """Test blocked when expected value too low."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=50,  # Low amount
            expected_value=30,  # Below default minimum of 100
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "expected" in eval.reason.lower() and "below" in eval.reason.lower()
    
    def test_evaluation_blocked_low_probability(self):
        """Test blocked when recovery probability too low."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.1,  # Below default minimum of 0.2
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "probability" in eval.reason.lower() and "low" in eval.reason.lower()
    
    def test_evaluation_blocked_high_friction(self):
        """Test blocked when friction too high."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="CUSTOMER_REMINDER",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=85,  # Above default maximum of 70
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "friction" in eval.reason.lower() and "high" in eval.reason.lower()
    
    def test_evaluation_blocked_max_attempts(self):
        """Test blocked when max attempts reached."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=3,  # Default max is 3
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "attempt" in eval.reason.lower()
    
    def test_evaluation_blocked_max_contacts(self):
        """Test blocked when max customer contacts reached."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_LINK",  # Contact action
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=2,  # Default max is 2
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "contact" in eval.reason.lower()
    
    def test_evaluation_blocked_max_daily_actions(self):
        """Test blocked when max daily actions reached."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=1,  # Default max is 1
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.BLOCKED
        assert "daily" in eval.reason.lower()
    
    def test_evaluation_requires_approval_high_amount(self):
        """Test requires approval for high amount."""
        engine = GovernanceEngine()
        eval = engine.evaluate(
            action_type="PAYMENT_LINK",
            amount=50000,  # Above default approval threshold of 10000
            expected_value=25000,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        assert eval.decision == GovernanceDecision.REQUIRES_APPROVAL
        assert "approval" in eval.reason.lower() or "threshold" in eval.reason.lower()
    
    def test_evaluation_deferred_outside_window(self):
        """Test deferred when outside execution window."""
        engine = GovernanceEngine()
        
        # Set window to morning (6 AM - 8 AM)
        engine.policy_set.update_policy(PolicyType.ALLOWED_EXECUTION_WINDOW_START, "06:00")
        engine.policy_set.update_policy(PolicyType.ALLOWED_EXECUTION_WINDOW_END, "08:00")
        
        eval = engine.evaluate(
            action_type="PAYMENT_RETRY",
            amount=1000,
            expected_value=500,
            recovery_probability=0.5,
            friction_score=40,
            customer_id="cust_123",
            attempt_count=0,
            customer_contact_count=0,
            daily_actions_for_customer=0,
            weekly_actions_for_customer=0,
        )
        
        # Since current time is likely outside 6-8 AM, should be deferred
        # (This test is time-dependent, so check logic)
        current_time = datetime.utcnow().time()
        if not (datetime.strptime("06:00", "%H:%M").time() <= current_time <= datetime.strptime("08:00", "%H:%M").time()):
            assert eval.decision == GovernanceDecision.DEFERRED


class TestApprovalQueue:
    """Test approval queue."""
    
    def test_create_approval_request(self):
        """Test creating approval request."""
        queue = ApprovalQueue()
        req = queue.create_request(
            opportunity_id="opp_123",
            customer_id="cust_123",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="Amount exceeds threshold",
        )
        assert req.opportunity_id == "opp_123"
        assert req.status == ApprovalStatus.PENDING
    
    def test_approve_request(self):
        """Test approving request."""
        queue = ApprovalQueue()
        req = queue.create_request(
            opportunity_id="opp_123",
            customer_id="cust_123",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="Amount exceeds threshold",
        )
        
        success, error = queue.approve(req.id, "Approved by merchant")
        assert success
        assert queue.get_request(req.id).status == ApprovalStatus.APPROVED
    
    def test_reject_request(self):
        """Test rejecting request."""
        queue = ApprovalQueue()
        req = queue.create_request(
            opportunity_id="opp_123",
            customer_id="cust_123",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="Amount exceeds threshold",
        )
        
        success, error = queue.reject(req.id, "Too risky")
        assert success
        assert queue.get_request(req.id).status == ApprovalStatus.REJECTED
    
    def test_approval_expiration(self):
        """Test approval expiration."""
        queue = ApprovalQueue()
        req = queue.create_request(
            opportunity_id="opp_123",
            customer_id="cust_123",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="Amount exceeds threshold",
        )
        
        # Set expiration to past
        req.expires_at = datetime.utcnow() - timedelta(hours=1)
        
        assert req.is_expired()
        
        # Try to approve expired request
        success, error = queue.approve(req.id)
        assert not success
    
    def test_get_pending(self):
        """Test get pending requests."""
        queue = ApprovalQueue()
        req1 = queue.create_request(
            opportunity_id="opp_1",
            customer_id="cust_1",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="High amount",
        )
        req2 = queue.create_request(
            opportunity_id="opp_2",
            customer_id="cust_2",
            action_type="PAYMENT_LINK",
            amount=60000,
            expected_value=30000,
            recovery_probability=0.6,
            reason="High amount",
        )
        
        pending = queue.get_pending()
        assert len(pending) == 2
        
        queue.approve(req1.id)
        pending = queue.get_pending()
        assert len(pending) == 1
    
    def test_get_by_opportunity(self):
        """Test get requests by opportunity."""
        queue = ApprovalQueue()
        req = queue.create_request(
            opportunity_id="opp_123",
            customer_id="cust_123",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="High amount",
        )
        
        reqs = queue.get_by_opportunity("opp_123")
        assert len(reqs) == 1
        assert reqs[0].id == req.id
    
    def test_approval_queue_summary(self):
        """Test approval queue summary."""
        queue = ApprovalQueue()
        req1 = queue.create_request(
            opportunity_id="opp_1",
            customer_id="cust_1",
            action_type="PAYMENT_LINK",
            amount=50000,
            expected_value=25000,
            recovery_probability=0.5,
            reason="High amount",
        )
        req2 = queue.create_request(
            opportunity_id="opp_2",
            customer_id="cust_2",
            action_type="PAYMENT_LINK",
            amount=60000,
            expected_value=30000,
            recovery_probability=0.6,
            reason="High amount",
        )
        
        queue.approve(req1.id, "Approved")
        
        summary = queue.get_summary()
        assert summary["pending_count"] == 1
        assert summary["approved_count"] == 1
        assert summary["total_requests"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
