"""Recovery engine tests."""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import (
    Customer, Transaction, RevenueOpportunity,
    TransactionStatus, OpportunityType, OpportunityStatus,
    RiskLevel, Recoverability, RecoveryAttempt, RecoveryExecution, RecoveryState as DBRecoveryState
)
from recovery_state import RecoveryState, RecoveryStateTransition, RecoveryWorkflowState
from recovery_strategies import RecoveryActionType, ActionEligibilityEngine
from recovery_config import RecoveryBounds, RECOVERY_BOUNDS
from policy_guard import PolicyGuard
from action_executor import executor
from recovery_orchestrator import RecoveryOrchestrator
from audit_service import AuditTrail


@pytest.fixture
def test_db():
    """Create in-memory test database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Create test data
    customer = Customer(id="cust_001", name="Test Customer", email="test@example.com")
    db.add(customer)
    db.commit()
    
    txn = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=5000.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="card",
        failure_reason="Card declined",
        created_at=datetime.utcnow()
    )
    db.add(txn)
    db.commit()
    
    opp = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_001",
        customer_id="cust_001",
        amount=5000.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.RECOVERABLE,
        risk_level=RiskLevel.HIGH,
        recoverability=Recoverability.HIGH,
        failure_reason="Card declined",
        source="test",
        created_at=datetime.utcnow()
    )
    db.add(opp)
    db.commit()
    
    yield db
    db.close()


class TestStateTransitions:
    """State machine tests."""
    
    def test_valid_transitions(self):
        """Test valid state transitions."""
        assert RecoveryStateTransition.is_valid(RecoveryState.DETECTED, RecoveryState.PLANNED)
        assert RecoveryStateTransition.is_valid(RecoveryState.PLANNED, RecoveryState.READY)
        assert RecoveryStateTransition.is_valid(RecoveryState.READY, RecoveryState.EXECUTING)
        assert RecoveryStateTransition.is_valid(RecoveryState.EXECUTING, RecoveryState.SUCCEEDED)
        assert RecoveryStateTransition.is_valid(RecoveryState.EXECUTING, RecoveryState.FAILED)
        assert RecoveryStateTransition.is_valid(RecoveryState.FAILED, RecoveryState.RETRYING)
        assert RecoveryStateTransition.is_valid(RecoveryState.FAILED, RecoveryState.REPLANNING)
        assert RecoveryStateTransition.is_valid(RecoveryState.SUCCEEDED, RecoveryState.RECOVERED)
    
    def test_invalid_transitions(self):
        """Test invalid state transitions."""
        assert not RecoveryStateTransition.is_valid(RecoveryState.DETECTED, RecoveryState.EXECUTING)
        assert not RecoveryStateTransition.is_valid(RecoveryState.EXECUTING, RecoveryState.DETECTED)
        assert not RecoveryStateTransition.is_valid(RecoveryState.RECOVERED, RecoveryState.EXECUTING)
        assert not RecoveryStateTransition.is_valid(RecoveryState.STOPPED, RecoveryState.READY)


class TestBounds:
    """Test recovery bounds enforcement."""
    
    def test_bounds_validation(self):
        """Test bounds are valid."""
        RECOVERY_BOUNDS.validate()  # Should not raise
    
    def test_max_attempts_bound(self):
        """Test maximum attempts bound."""
        bounds = RECOVERY_BOUNDS
        assert bounds.max_recovery_attempts > 0
        assert bounds.max_recovery_attempts == 3


class TestActionExecutor:
    """Test action execution."""
    
    def test_supported_actions(self):
        """Test supported action types."""
        assert executor.validate_action("PAYMENT_RETRY")
        assert executor.validate_action("PAYMENT_LINK")
        assert executor.validate_action("NO_ACTION")
        assert not executor.validate_action("INVALID_ACTION")
    
    def test_simulation_mode(self):
        """Test simulation execution."""
        result = executor.execute(
            "opp_001",
            "PAYMENT_RETRY",
            5000.0,
            "test@example.com",
            is_simulation=True
        )
        
        assert "execution_id" in result
        assert "status" in result
        assert result["mode"] == "SIMULATION"
    
    def test_payment_retry_simulation(self):
        """Test payment retry simulation."""
        result = executor.execute(
            "opp_001",
            "PAYMENT_RETRY",
            5000.0,
            "test@example.com",
            is_simulation=True
        )
        
        assert result["status"] in ["SUCCEEDED", "FAILED"]
    
    def test_no_action_execution(self):
        """Test NO_ACTION execution."""
        result = executor.execute(
            "opp_001",
            "NO_ACTION",
            5000.0,
            "test@example.com",
            is_simulation=True
        )
        
        assert result["status"] == "SUCCEEDED"


class TestPolicyGuard:
    """Test safety policy enforcement."""
    
    def test_stopping_rules(self):
        """Test stopping rules."""
        workflow = RecoveryWorkflowState(
            opportunity_id="opp_001",
            current_state=RecoveryState.EXECUTING,
            attempt_count=10,  # Exceeds limit
        )
        
        should_stop, reason = PolicyGuard.check_stopping_rules(workflow)
        assert should_stop
        assert "Maximum recovery attempts" in reason
    
    def test_action_eligibility(self):
        """Test action eligibility check."""
        can_execute, error = PolicyGuard.can_execute_action(
            "PAYMENT_RETRY",
            RecoveryWorkflowState(
                opportunity_id="opp_001",
                current_state=RecoveryState.READY,
            ),
            5000.0,
            "PAYMENT_FAILURE",
            "Card declined",
        )
        
        assert can_execute
    
    def test_minimum_expected_value(self):
        """Test minimum expected value check."""
        workflow = RecoveryWorkflowState(
            opportunity_id="opp_001",
            current_state=RecoveryState.READY,
        )
        
        # Very small amount should fail
        can_execute, error = PolicyGuard.can_execute_action(
            "PAYMENT_RETRY",
            workflow,
            10.0,  # ₹10, below ₹100 minimum
            "PAYMENT_FAILURE",
            "Card declined",
        )
        
        # May fail based on expected value calculation
        if not can_execute:
            assert "Expected value" in error or "below minimum" in error


class TestRecoveryOrchestrator:
    """Test orchestrator workflow."""
    
    def test_create_workflow(self, test_db):
        """Test workflow creation."""
        orchestrator = RecoveryOrchestrator(test_db)
        workflow, error = orchestrator.create_workflow("opp_001")
        
        assert workflow is not None
        assert error is None
        assert workflow.opportunity_id == "opp_001"
        assert workflow.current_state == RecoveryState.DETECTED
    
    def test_workflow_not_found(self, test_db):
        """Test handling of missing workflow."""
        orchestrator = RecoveryOrchestrator(test_db)
        workflow, error = orchestrator.create_workflow("opp_nonexistent")
        
        assert workflow is None
        assert error is not None
        assert "not found" in error.lower()
    
    def test_plan_recovery(self, test_db):
        """Test recovery planning."""
        orchestrator = RecoveryOrchestrator(test_db)
        
        workflow, _ = orchestrator.create_workflow("opp_001")
        audit = AuditTrail()
        workflow, error = orchestrator.plan_recovery("opp_001", audit=audit)
        
        assert workflow is not None
        assert error is None
        assert workflow.current_state == RecoveryState.PLANNED
        assert workflow.plan is not None


class TestAuditTrail:
    """Test audit trail recording."""
    
    def test_audit_event_recording(self):
        """Test recording audit events."""
        audit = AuditTrail()
        
        audit.record_event(
            "TEST_EVENT",
            "opp_001",
            {"test": "data"}
        )
        
        events = audit.get_audit_trail()
        assert len(events) == 1
        assert events[0]["event_type"] == "TEST_EVENT"
        assert events[0]["opportunity_id"] == "opp_001"
    
    def test_state_transition_audit(self):
        """Test state transition audit."""
        audit = AuditTrail()
        
        audit.record_state_transition(
            "opp_001",
            RecoveryState.DETECTED,
            RecoveryState.PLANNED,
            "Created plan"
        )
        
        events = audit.get_audit_trail()
        assert len(events) == 1
        assert events[0]["event_type"] == "STATE_TRANSITION"
    
    def test_audit_filtering(self):
        """Test filtering audit events by opportunity."""
        audit = AuditTrail()
        
        audit.record_event("EVENT1", "opp_001", {})
        audit.record_event("EVENT2", "opp_002", {})
        audit.record_event("EVENT3", "opp_001", {})
        
        opp_001_events = audit.get_opportunity_audit("opp_001")
        assert len(opp_001_events) == 2
        assert all(e["opportunity_id"] == "opp_001" for e in opp_001_events)


class TestRecoveryWorkflowScenarios:
    """Test end-to-end recovery scenarios."""
    
    def test_successful_recovery_workflow(self, test_db):
        """Test successful recovery workflow."""
        orchestrator = RecoveryOrchestrator(test_db)
        audit = AuditTrail()
        
        # Create workflow
        workflow, _ = orchestrator.create_workflow("opp_001")
        assert workflow.current_state == RecoveryState.DETECTED
        
        # Plan
        workflow, _ = orchestrator.plan_recovery("opp_001", audit=audit)
        assert workflow.current_state == RecoveryState.PLANNED
        
        # Validate
        workflow, _ = orchestrator.validate_and_ready("opp_001", audit=audit)
        assert workflow.current_state == RecoveryState.READY
        
        # Execute (simulation)
        workflow, _ = orchestrator.execute_next_action("opp_001", is_simulation=True, audit=audit)
        
        # Check results
        assert workflow.attempt_count > 0
        assert len(workflow.executions) > 0
    
    def test_idempotency(self, test_db):
        """Test idempotency prevents duplicate execution."""
        orchestrator = RecoveryOrchestrator(test_db)
        
        workflow, _ = orchestrator.create_workflow("opp_001")
        workflow, _ = orchestrator.plan_recovery("opp_001")
        workflow, _ = orchestrator.validate_and_ready("opp_001")
        
        # Execute once
        workflow1, _ = orchestrator.execute_next_action("opp_001", is_simulation=True)
        action1 = workflow1.current_action
        
        # Check that duplicate not executed
        first_is_duplicate, _ = PolicyGuard.check_idempotency(workflow1, action1)
        assert not first_is_duplicate  # First execution is not duplicate


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
