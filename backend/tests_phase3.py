"""Recovery intelligence tests."""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import (
    Customer, Transaction, RevenueOpportunity,
    TransactionStatus, OpportunityType, OpportunityStatus,
    RiskLevel, Recoverability
)
from recovery_strategies import (
    RecoveryActionType, ActionEligibilityEngine, FrictionModifier
)
from recovery_engine import RecoveryRecommendationEngine, RecoveryExpectedValueCalculator
from recovery_timing import TimingEngine
from recovery_analytics import RecoveryAnalytics


@pytest.fixture
def test_db():
    """Create in-memory test database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()


@pytest.fixture
def sample_data(test_db):
    """Create sample test data."""
    # Create customers
    customer1 = Customer(id="cust_001", name="Test Co 1", email="test1@example.com")
    customer2 = Customer(id="cust_002", name="Test Co 2", email="test2@example.com")
    test_db.add_all([customer1, customer2])
    test_db.commit()
    
    # Create transactions
    txn1 = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="credit_card",
        failure_reason="Insufficient funds",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    txn2 = Transaction(
        id="txn_002",
        customer_id="cust_001",
        amount=5000.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="debit_card",
        failure_reason="Card declined",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    txn3 = Transaction(
        id="txn_003",
        customer_id="cust_002",
        amount=2500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="upi",
        failure_reason="Subscription renewal failed",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    test_db.add_all([txn1, txn2, txn3])
    test_db.commit()
    
    # Create opportunities
    opp1 = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.AT_RISK,
        risk_level=RiskLevel.HIGH,
        recoverability=Recoverability.HIGH,
        failure_reason="Insufficient funds",
        source="transaction_failure",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    opp2 = RevenueOpportunity(
        id="opp_002",
        transaction_id="txn_002",
        customer_id="cust_001",
        amount=5000.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.RECOVERABLE,
        risk_level=RiskLevel.MEDIUM,
        recoverability=Recoverability.MEDIUM,
        failure_reason="Card declined",
        source="transaction_failure",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    opp3 = RevenueOpportunity(
        id="opp_003",
        transaction_id="txn_003",
        customer_id="cust_002",
        amount=2500.0,
        currency="INR",
        type=OpportunityType.SUBSCRIPTION_FAILURE,
        status=OpportunityStatus.AT_RISK,
        risk_level=RiskLevel.CRITICAL,
        recoverability=Recoverability.HIGH,
        failure_reason="Subscription renewal failed",
        source="transaction_failure",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    test_db.add_all([opp1, opp2, opp3])
    test_db.commit()
    
    return {
        "customers": [customer1, customer2],
        "transactions": [txn1, txn2, txn3],
        "opportunities": [opp1, opp2, opp3]
    }


class TestActionEligibility:
    """Test action eligibility engine."""
    
    def test_payment_retry_eligible_for_payment_failure(self, sample_data):
        """PAYMENT_RETRY should be eligible for payment failures."""
        opp = sample_data["opportunities"][0]
        eligible = ActionEligibilityEngine.get_eligible_actions(
            opp, "PAYMENT_FAILURE", "Insufficient funds", 0
        )
        
        assert RecoveryActionType.PAYMENT_RETRY in eligible
        assert RecoveryActionType.NO_ACTION in eligible
    
    def test_payment_link_eligible_after_retry_failed(self, sample_data):
        """PAYMENT_LINK should be eligible after retry has failed."""
        opp = sample_data["opportunities"][0]
        eligible = ActionEligibilityEngine.get_eligible_actions(
            opp, "PAYMENT_FAILURE", "Card declined", 1
        )
        
        assert RecoveryActionType.PAYMENT_LINK in eligible
    
    def test_subscription_retry_for_subscription_failure(self, sample_data):
        """SUBSCRIPTION_RETRY should be eligible for subscription failures."""
        opp = sample_data["opportunities"][2]
        eligible = ActionEligibilityEngine.get_eligible_actions(
            opp, "SUBSCRIPTION_FAILURE", "Subscription renewal failed", 0
        )
        
        assert RecoveryActionType.SUBSCRIPTION_RETRY in eligible
    
    def test_no_action_always_eligible(self, sample_data):
        """NO_ACTION should always be eligible."""
        opp = sample_data["opportunities"][0]
        eligible = ActionEligibilityEngine.get_eligible_actions(
            opp, "PAYMENT_FAILURE", "Any reason", 0
        )
        
        assert RecoveryActionType.NO_ACTION in eligible


class TestFrictionModifier:
    """Test friction modifier calculation."""
    
    def test_friction_increases_with_attempts(self):
        """Friction should increase with more attempts."""
        base_friction = 30
        
        friction_0 = FrictionModifier.get_friction_modifier(0, 0.5, RecoveryActionType.CUSTOMER_REMINDER)
        friction_2 = FrictionModifier.get_friction_modifier(2, 0.5, RecoveryActionType.CUSTOMER_REMINDER)
        
        assert friction_2 > friction_0
    
    def test_friction_affected_by_customer_history(self):
        """Friction should be affected by customer recovery rate."""
        high_recovery = FrictionModifier.get_friction_modifier(0, 0.8, RecoveryActionType.PAYMENT_RETRY)
        low_recovery = FrictionModifier.get_friction_modifier(0, 0.1, RecoveryActionType.PAYMENT_RETRY)
        
        assert low_recovery > high_recovery


class TestExpectedValueCalculation:
    """Test expected value calculation."""
    
    def test_recovery_probability_adjustment_with_attempts(self):
        """Recovery probability should decrease with more attempts."""
        prob_0 = RecoveryExpectedValueCalculator.calculate_recovery_probability_adjustment(
            0.5, 0, 0.5, 5
        )
        prob_2 = RecoveryExpectedValueCalculator.calculate_recovery_probability_adjustment(
            0.5, 2, 0.5, 5
        )
        
        assert prob_2 < prob_0
    
    def test_expected_value_calculation(self):
        """Net expected value should be calculated correctly."""
        net_value = RecoveryExpectedValueCalculator.calculate_expected_net_value(
            amount=1000.0,
            recovery_probability=0.6,
            action_cost=10.0,
            customer_friction_score=30,
            urgency_factor=0.5,
            recoverability_score=70
        )
        
        # Should be positive (600 recovery - 10 cost - friction - etc.)
        assert net_value > 0
    
    def test_negative_value_when_cost_too_high(self):
        """Net value should be negative if action cost is too high."""
        net_value = RecoveryExpectedValueCalculator.calculate_expected_net_value(
            amount=100.0,
            recovery_probability=0.3,
            action_cost=100.0,  # Cost equals amount
            customer_friction_score=50,
            urgency_factor=0.5,
            recoverability_score=50
        )
        
        # Should be negative or very low
        assert net_value <= 0


class TestRecoveryTiming:
    """Test Next Best Time calculation."""
    
    def test_payment_retry_timing_is_soon(self, sample_data, test_db):
        """PAYMENT_RETRY should be recommended soon."""
        opp = sample_data["opportunities"][0]
        timing_engine = TimingEngine()
        timing = timing_engine.calculate_timing("PAYMENT_RETRY", opp, 0)
        
        assert "HIGH" in timing.urgency_level or "MEDIUM" in timing.urgency_level
        assert timing.recommended_date != "N/A"
    
    def test_payment_link_timing_allows_day(self, sample_data, test_db):
        """PAYMENT_LINK should allow a day for customer review."""
        opp = sample_data["opportunities"][0]
        timing_engine = TimingEngine()
        timing = timing_engine.calculate_timing("PAYMENT_LINK", opp, 0)
        
        assert timing.urgency_level == "MEDIUM"
        assert timing.recommended_date != "N/A"
    
    def test_no_action_timing_is_none(self, sample_data, test_db):
        """NO_ACTION timing should show N/A."""
        opp = sample_data["opportunities"][0]
        timing_engine = TimingEngine()
        timing = timing_engine.calculate_timing("NO_ACTION", opp, 0)
        
        assert timing.urgency_level == "NONE"
        assert timing.recommended_date == "N/A"
    
    def test_urgency_level_calculation(self):
        """Urgency level should scale with opportunity age and risk."""
        critical = TimingEngine.get_urgency_level(30, 90, 40)
        low = TimingEngine.get_urgency_level(1, 10, 80)
        
        assert critical in ["CRITICAL", "HIGH"]
        assert low in ["LOW", "VERY_LOW"]


class TestRecoveryRecommendationEngine:
    """Test recovery recommendation engine."""
    
    def test_get_recommendation_returns_best_action(self, sample_data, test_db):
        """Should return a recommendation with best action."""
        opp = sample_data["opportunities"][0]
        risk_info = {
            "risk_score": 75,
            "risk_level": "HIGH",
            "recoverability_score": 70,
            "priority_score": 80
        }
        customer_history = {
            "recovery_rate": 0.5,
            "total_value": 10000
        }
        
        engine = RecoveryRecommendationEngine(test_db)
        rec = engine.get_recommendation(opp, risk_info, customer_history)
        
        assert rec.opportunity_id == "opp_001"
        assert rec.recommended_action in ["PAYMENT_RETRY", "PAYMENT_LINK", "CUSTOMER_REMINDER", "DELAY_AND_RETRY", "NO_ACTION"]
        assert rec.recovery_probability >= 0
        assert rec.recovery_probability <= 1
        assert len(rec.stopping_rules) > 0
    
    def test_action_comparison_returns_candidates(self, sample_data, test_db):
        """Should return multiple action candidates."""
        opp = sample_data["opportunities"][0]
        risk_info = {
            "risk_score": 75,
            "risk_level": "HIGH",
            "recoverability_score": 70,
        }
        customer_history = {
            "recovery_rate": 0.5,
            "total_value": 10000
        }
        
        engine = RecoveryRecommendationEngine(test_db)
        comparison = engine.get_action_comparison(opp, risk_info, customer_history)
        
        assert len(comparison.candidates) > 0
        assert comparison.recommended_action in [c.action_type for c in comparison.candidates]


class TestRecoveryAnalytics:
    """Test recovery analytics and portfolio metrics."""
    
    def test_portfolio_metrics(self, sample_data, test_db):
        """Should calculate portfolio metrics."""
        analytics = RecoveryAnalytics(test_db)
        metrics = analytics.get_portfolio_metrics()
        
        assert metrics.total_revenue_at_risk > 0
        assert metrics.high_priority_opportunity_count >= 0
        assert metrics.average_recovery_probability >= 0
        assert metrics.average_recovery_probability <= 1
    
    def test_recovery_queue(self, sample_data, test_db):
        """Should return recovery queue ranked by value."""
        analytics = RecoveryAnalytics(test_db)
        queue = analytics.get_recovery_queue(limit=10)
        
        assert len(queue) > 0
        assert all("opportunity_id" in item for item in queue)
        assert all("expected_net_value" in item for item in queue)
        
        # Should be sorted by expected value descending
        values = [item["expected_net_value"] for item in queue]
        assert values == sorted(values, reverse=True)
    
    def test_dashboard_metrics(self, sample_data, test_db):
        """Should return comprehensive dashboard metrics."""
        analytics = RecoveryAnalytics(test_db)
        metrics = analytics.get_dashboard_metrics()
        
        assert metrics.portfolio_metrics.total_revenue_at_risk > 0
        assert len(metrics.top_opportunities) >= 0
        assert len(metrics.action_distribution) >= 0
        assert len(metrics.recovery_potential_by_type) >= 0


class TestPhase3Integration:
    """Integration tests."""
    
    def test_end_to_end_recovery_recommendation(self, sample_data, test_db):
        """Test complete flow from opportunity to recommendation."""
        opp = sample_data["opportunities"][0]
        
        # Get risk info
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(test_db)
        risk_info = risk_analytics.compute_opportunity_risk(opp.id)
        
        # Get customer history
        customer_opps = test_db.query(RevenueOpportunity).filter(
            RevenueOpportunity.customer_id == opp.customer_id
        ).all()
        recovered_count = len([o for o in customer_opps if o.status == OpportunityStatus.RECOVERED])
        customer_history = {
            "recovery_rate": recovered_count / len(customer_opps) if customer_opps else 0.5,
            "total_value": sum(o.amount for o in customer_opps) if customer_opps else 0,
        }
        
        # Get recommendation
        engine = RecoveryRecommendationEngine(test_db)
        rec = engine.get_recommendation(opp, risk_info, customer_history)
        
        # Verify complete recommendation
        assert rec.opportunity_id == opp.id
        assert rec.recommended_action is not None
        assert rec.expected_recovered_amount >= 0
        assert rec.next_best_time.recommended_date is not None
        assert len(rec.stopping_rules) > 0
