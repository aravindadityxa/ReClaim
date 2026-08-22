"""Phase 2 risk intelligence tests."""

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
from risk_features import RiskFeatureEngine
from risk_model import RiskModel, RiskScorer
from risk_analytics import RiskAnalytics


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
def sample_opportunities(test_db):
    """Create sample test data."""
    customer = Customer(id="cust_001", name="Test Co", email="test@example.com")
    test_db.add(customer)
    test_db.commit()

    base_date = datetime.utcnow() - timedelta(days=30)

    # Successful transactions
    txn_success = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        status=TransactionStatus.SUCCESS,
        payment_method="credit_card",
        created_at=base_date
    )
    test_db.add(txn_success)

    # Failed transactions
    txn_fail_1 = Transaction(
        id="txn_002",
        customer_id="cust_001",
        amount=500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="credit_card",
        failure_reason="Card declined",
        created_at=base_date + timedelta(days=10)
    )
    test_db.add(txn_fail_1)

    txn_fail_2 = Transaction(
        id="txn_003",
        customer_id="cust_001",
        amount=1500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="upi",
        failure_reason="Insufficient funds",
        created_at=base_date + timedelta(days=5)
    )
    test_db.add(txn_fail_2)

    test_db.commit()

    # Opportunities
    opp_recovered = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_002",
        customer_id="cust_001",
        amount=500.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.RECOVERED,
        risk_level=RiskLevel.HIGH,
        recoverability=Recoverability.HIGH,
        failure_reason="Card declined",
        source="transaction_failure",
        created_at=base_date + timedelta(days=10),
        recovered_at=base_date + timedelta(days=20)
    )
    test_db.add(opp_recovered)

    opp_lost = RevenueOpportunity(
        id="opp_002",
        transaction_id="txn_003",
        customer_id="cust_001",
        amount=1500.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.LOST,
        risk_level=RiskLevel.CRITICAL,
        recoverability=Recoverability.LOW,
        failure_reason="Insufficient funds",
        source="transaction_failure",
        created_at=base_date + timedelta(days=5)
    )
    test_db.add(opp_lost)

    test_db.commit()

    return test_db


class TestFeatureEngineering:
    """Test feature engineering layer."""

    def test_build_opportunity_features(self, sample_opportunities):
        """Test feature matrix building."""
        engine = RiskFeatureEngine()
        df = engine.build_opportunity_features(sample_opportunities)

        assert len(df) == 2
        assert "opportunity_id" in df.columns
        assert "amount" in df.columns
        assert "customer_fail_rate" in df.columns

    def test_feature_names(self):
        """Test feature name retrieval."""
        engine = RiskFeatureEngine()
        names = engine.get_feature_names()

        assert len(names) > 20
        assert "amount" in names
        assert "customer_fail_rate" in names

    def test_feature_descriptions(self):
        """Test feature descriptions."""
        engine = RiskFeatureEngine()
        descriptions = engine.get_feature_descriptions()

        assert len(descriptions) > 20
        assert "amount" in descriptions
        assert len(descriptions["amount"]) > 0


class TestRiskModel:
    """Test risk modeling."""

    def test_model_training(self, sample_opportunities):
        """Test model training."""
        engine = RiskFeatureEngine()
        df = engine.build_opportunity_features(sample_opportunities)

        model = RiskModel()
        metrics = model.train(df)

        assert metrics["status"] == "trained"
        assert metrics["train_size"] > 0
        assert "precision" in metrics
        assert "recall" in metrics
        assert "f1" in metrics

    def test_model_insufficient_data(self, test_db):
        """Test model with insufficient data."""
        # Create only one opportunity
        customer = Customer(id="cust_001", name="Test", email="test@example.com")
        test_db.add(customer)
        test_db.commit()

        txn = Transaction(
            id="txn_001",
            customer_id="cust_001",
            amount=500.0,
            currency="INR",
            status=TransactionStatus.FAILED,
            payment_method="card",
            failure_reason="declined",
            created_at=datetime.utcnow()
        )
        test_db.add(txn)
        test_db.commit()

        engine = RiskFeatureEngine()
        df = engine.build_opportunity_features(test_db)

        model = RiskModel()
        metrics = model.train(df)

        assert metrics["status"] == "insufficient_data"

    def test_model_persistence(self, sample_opportunities):
        """Test model save and load."""
        engine = RiskFeatureEngine()
        df = engine.build_opportunity_features(sample_opportunities)

        model1 = RiskModel()
        model1.train(df)

        model2 = RiskModel()
        model2.load()

        assert model2.model is not None
        assert model2.scaler is not None


class TestRiskScoring:
    """Test risk scoring utilities."""

    def test_probability_to_score(self):
        """Test probability to score conversion."""
        scorer = RiskScorer()

        assert scorer.probability_to_score(0.0) == 0
        assert scorer.probability_to_score(0.5) == 50
        assert scorer.probability_to_score(1.0) == 100
        assert scorer.probability_to_score(1.5) == 100  # Clamped

    def test_score_to_level(self):
        """Test score to level mapping."""
        scorer = RiskScorer()

        assert scorer.score_to_level(10) == "LOW"
        assert scorer.score_to_level(30) == "MEDIUM"
        assert scorer.score_to_level(60) == "HIGH"
        assert scorer.score_to_level(90) == "CRITICAL"

    def test_expected_loss(self):
        """Test expected loss calculation."""
        scorer = RiskScorer()

        loss = scorer.calculate_expected_loss(1000.0, 0.5)
        assert loss == 500.0

    def test_priority_score(self):
        """Test priority score calculation."""
        scorer = RiskScorer()

        priority = scorer.calculate_priority_score(
            amount=1000.0,
            probability=0.8,
            recoverability_score=75,
            age_days=10
        )

        assert 0 <= priority <= 100


class TestRiskAnalytics:
    """Test risk analytics engine."""

    def test_opportunity_risk_computation(self, sample_opportunities):
        """Test individual opportunity risk."""
        analytics = RiskAnalytics(sample_opportunities)
        risk = analytics.compute_opportunity_risk("opp_001")

        assert risk is not None
        assert "risk_probability" in risk
        assert "risk_score" in risk
        assert "risk_level" in risk
        assert "expected_loss" in risk
        assert "recoverability_score" in risk
        assert "priority_score" in risk
        assert "risk_drivers" in risk

    def test_risk_summary(self, sample_opportunities):
        """Test aggregated risk summary."""
        analytics = RiskAnalytics(sample_opportunities)
        summary = analytics.get_risk_summary()

        assert summary["high_risk_revenue"] >= 0
        assert summary["high_risk_opportunity_count"] >= 0
        assert summary["total_expected_loss"] >= 0
        assert summary["average_risk_score"] >= 0

    def test_risk_queue(self, sample_opportunities):
        """Test risk queue prioritization."""
        analytics = RiskAnalytics(sample_opportunities)
        queue = analytics.get_risk_queue(limit=10)

        assert len(queue) > 0
        # Should be sorted by priority
        if len(queue) > 1:
            assert queue[0]["priority_score"] >= queue[1]["priority_score"]

    def test_risk_drivers_breakdown(self, sample_opportunities):
        """Test risk drivers breakdown."""
        analytics = RiskAnalytics(sample_opportunities)
        drivers = analytics.get_risk_drivers_breakdown()

        assert len(drivers) > 0
        for driver in drivers:
            assert "driver" in driver
            assert "affected_opportunities" in driver
            assert "revenue_at_risk" in driver

    def test_cohort_risk(self, sample_opportunities):
        """Test cohort-level risk analysis."""
        analytics = RiskAnalytics(sample_opportunities)
        
        cohorts = analytics.get_cohort_risk("payment_method")
        assert len(cohorts) > 0
        
        for cohort in cohorts:
            assert "cohort" in cohort
            assert "opportunity_count" in cohort
            assert "revenue_at_risk" in cohort

    def test_risk_trend(self, sample_opportunities):
        """Test risk trend over time."""
        analytics = RiskAnalytics(sample_opportunities)
        trend = analytics.get_risk_trend(days=30)

        assert len(trend) > 0
        for entry in trend:
            assert "date" in entry
            assert "opportunity_count" in entry
            assert "revenue_at_risk" in entry

    def test_spike_detection(self, sample_opportunities):
        """Test spike detection."""
        analytics = RiskAnalytics(sample_opportunities)
        spike = analytics.detect_risk_spikes(days=7)

        assert "spike_detected" in spike
        assert "magnitude" in spike
        assert "period_days" in spike

    def test_baseline_risk_probability(self, sample_opportunities):
        """Test baseline risk fallback."""
        customer = Customer(id="cust_001", name="Test", email="test@example.com")
        test_db = sample_opportunities
        
        txn = Transaction(
            id="txn_test",
            customer_id="cust_001",
            amount=500.0,
            currency="INR",
            status=TransactionStatus.FAILED,
            payment_method="card",
            failure_reason="declined",
            created_at=datetime.utcnow()
        )
        test_db.add(txn)
        test_db.commit()

        opp = RevenueOpportunity(
            id="opp_test",
            transaction_id="txn_test",
            customer_id="cust_001",
            amount=500.0,
            currency="INR",
            type=OpportunityType.PAYMENT_FAILURE,
            status=OpportunityStatus.AT_RISK,
            risk_level=RiskLevel.HIGH,
            recoverability=Recoverability.HIGH,
            failure_reason="declined",
            source="test",
            created_at=datetime.utcnow()
        )
        test_db.add(opp)
        test_db.commit()

        analytics = RiskAnalytics(test_db)
        prob = analytics._baseline_risk_probability(opp)

        assert 0 <= prob <= 1


class TestRecoverabilityScoring:
    """Test recoverability scoring."""

    def test_recoverability_score_low(self, sample_opportunities):
        """Test LOW recoverability classification."""
        customer = Customer(id="cust_002", name="Test2", email="test2@example.com")
        sample_opportunities.add(customer)
        sample_opportunities.commit()

        txn = Transaction(
            id="txn_low_recov",
            customer_id="cust_002",
            amount=500.0,
            currency="INR",
            status=TransactionStatus.FAILED,
            payment_method="card",
            failure_reason="chargeback",
            created_at=datetime.utcnow()
        )
        sample_opportunities.add(txn)
        sample_opportunities.commit()

        opp = RevenueOpportunity(
            id="opp_low_recov",
            transaction_id="txn_low_recov",
            customer_id="cust_002",
            amount=500.0,
            currency="INR",
            type=OpportunityType.PAYMENT_FAILURE,
            status=OpportunityStatus.AT_RISK,
            risk_level=RiskLevel.LOW,
            recoverability=Recoverability.LOW,
            failure_reason="chargeback",
            source="test",
            created_at=datetime.utcnow()
        )
        sample_opportunities.add(opp)
        sample_opportunities.commit()

        analytics = RiskAnalytics(sample_opportunities)
        score = analytics._compute_recoverability_score(opp)

        assert score == 25
