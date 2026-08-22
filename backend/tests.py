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
from business_logic import RevenueAnalytics


# Use in-memory SQLite for testing
@pytest.fixture
def test_db():
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
    base_date = datetime.utcnow() - timedelta(days=30)

    # Successful transactions
    txn_success_1 = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        status=TransactionStatus.SUCCESS,
        payment_method="credit_card",
        created_at=base_date
    )
    
    txn_success_2 = Transaction(
        id="txn_002",
        customer_id="cust_002",
        amount=2000.0,
        currency="INR",
        status=TransactionStatus.SUCCESS,
        payment_method="upi",
        created_at=base_date + timedelta(days=5)
    )

    # Failed transactions
    txn_failed_1 = Transaction(
        id="txn_003",
        customer_id="cust_001",
        amount=500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="credit_card",
        failure_reason="Insufficient funds",
        created_at=base_date + timedelta(days=10)
    )

    txn_failed_2 = Transaction(
        id="txn_004",
        customer_id="cust_002",
        amount=1500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="debit_card",
        failure_reason="Card declined",
        created_at=base_date + timedelta(days=15)
    )

    test_db.add_all([txn_success_1, txn_success_2, txn_failed_1, txn_failed_2])
    test_db.commit()

    # Create opportunities
    opp_recoverable_high = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_003",
        customer_id="cust_001",
        amount=500.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.RECOVERABLE,
        risk_level=RiskLevel.HIGH,
        recoverability=Recoverability.HIGH,
        failure_reason="Insufficient funds",
        source="transaction_failure",
        created_at=base_date + timedelta(days=10)
    )

    opp_at_risk_medium = RevenueOpportunity(
        id="opp_002",
        transaction_id="txn_004",
        customer_id="cust_002",
        amount=1500.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.AT_RISK,
        risk_level=RiskLevel.MEDIUM,
        recoverability=Recoverability.MEDIUM,
        failure_reason="Card declined",
        source="transaction_failure",
        created_at=base_date + timedelta(days=15)
    )

    opp_recovered = RevenueOpportunity(
        id="opp_003",
        transaction_id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        type=OpportunityType.SUBSCRIPTION_FAILURE,
        status=OpportunityStatus.RECOVERED,
        risk_level=RiskLevel.LOW,
        recoverability=Recoverability.HIGH,
        source="transaction_failure",
        created_at=base_date + timedelta(days=5),
        recovered_at=base_date + timedelta(days=20)
    )

    test_db.add_all([opp_recoverable_high, opp_at_risk_medium, opp_recovered])
    test_db.commit()

    return {
        "customers": [customer1, customer2],
        "transactions": [txn_success_1, txn_success_2, txn_failed_1, txn_failed_2],
        "opportunities": [opp_recoverable_high, opp_at_risk_medium, opp_recovered]
    }


class TestRevenueCalculations:
    """Test revenue calculation logic."""

    def test_total_revenue(self, test_db, sample_data):
        """Test total revenue calculation from successful transactions."""
        total = RevenueAnalytics.get_total_revenue(test_db)
        # Should be 1000 + 2000 = 3000
        assert total == 3000.0

    def test_revenue_at_risk(self, test_db, sample_data):
        """Test revenue at risk calculation."""
        at_risk = RevenueAnalytics.get_revenue_at_risk(test_db)
        # Should be 500 (recoverable) + 1500 (at_risk) = 2000
        assert at_risk == 2000.0

    def test_estimated_recoverable(self, test_db, sample_data):
        """Test estimated recoverable revenue calculation."""
        recoverable = RevenueAnalytics.get_estimated_recoverable(test_db)
        # HIGH: 500 * 0.75 = 375
        # MEDIUM: 1500 * 0.40 = 600
        # Total: 975
        assert recoverable == 975.0

    def test_recovered_revenue(self, test_db, sample_data):
        """Test recovered revenue calculation."""
        recovered = RevenueAnalytics.get_recovered_revenue(test_db)
        # Should be 1000 (one recovered opportunity)
        assert recovered == 1000.0

    def test_payment_success_rate(self, test_db, sample_data):
        """Test payment success rate calculation."""
        rate = RevenueAnalytics.get_payment_success_rate(test_db)
        # 2 successful out of 4 = 50%
        assert rate == 50.0

    def test_payment_success_rate_all_success(self, test_db):
        """Test success rate when all transactions succeed."""
        customer = Customer(id="cust_001", name="Test", email="test@example.com")
        test_db.add(customer)
        test_db.commit()

        for i in range(5):
            txn = Transaction(
                id=f"txn_{i:03d}",
                customer_id="cust_001",
                amount=100.0,
                currency="INR",
                status=TransactionStatus.SUCCESS,
                payment_method="credit_card",
                created_at=datetime.utcnow()
            )
            test_db.add(txn)
        test_db.commit()

        rate = RevenueAnalytics.get_payment_success_rate(test_db)
        assert rate == 100.0

    def test_revenue_health_score(self, test_db, sample_data):
        """Test revenue health score calculation."""
        health = RevenueAnalytics.get_revenue_health(test_db)
        
        assert "score" in health
        assert "components" in health
        assert 0 <= health["score"] <= 100
        assert "payment_success" in health["components"]
        assert "risk_ratio" in health["components"]
        assert "recovery_rate" in health["components"]
        assert "stability" in health["components"]

    def test_revenue_trend(self, test_db, sample_data):
        """Test revenue trend calculation."""
        trend = RevenueAnalytics.get_revenue_trend(test_db, days=30)
        
        assert len(trend) > 0
        assert all("date" in entry for entry in trend)
        assert all("total" in entry for entry in trend)
        assert all("successful" in entry for entry in trend)
        assert all("failed" in entry for entry in trend)
        
        # Check chronological order
        dates = [entry["date"] for entry in trend]
        assert dates == sorted(dates)

    def test_risk_breakdown(self, test_db, sample_data):
        """Test risk breakdown by opportunity type."""
        breakdown = RevenueAnalytics.get_risk_breakdown(test_db)
        
        assert "PAYMENT_FAILURE" in breakdown
        assert "SUBSCRIPTION_FAILURE" in breakdown
        assert "CHECKOUT_ABANDONMENT" in breakdown
        assert "INVOICE_DELAY" in breakdown
        
        # Sample data has 2 PAYMENT_FAILURE at risk (500 + 1500)
        assert breakdown["PAYMENT_FAILURE"] == 2000.0

    def test_risk_trend_increasing(self, test_db):
        """Test risk trend detection when increasing."""
        customer = Customer(id="cust_001", name="Test", email="test@example.com")
        test_db.add(customer)
        test_db.commit()

        base_date = datetime.utcnow() - timedelta(days=30)

        # Few opportunities in first third
        for i in range(2):
            opp = RevenueOpportunity(
                id=f"opp_{i:03d}",
                transaction_id=f"txn_{i:03d}",
                customer_id="cust_001",
                amount=100.0,
                currency="INR",
                type=OpportunityType.PAYMENT_FAILURE,
                status=OpportunityStatus.AT_RISK,
                risk_level=RiskLevel.HIGH,
                recoverability=Recoverability.HIGH,
                source="test",
                created_at=base_date + timedelta(days=1)
            )
            test_db.add(opp)

        test_db.commit()

        # Many opportunities in last third
        for i in range(2, 10):
            opp = RevenueOpportunity(
                id=f"opp_{i:03d}",
                transaction_id=f"txn_{i:03d}",
                customer_id="cust_001",
                amount=100.0,
                currency="INR",
                type=OpportunityType.PAYMENT_FAILURE,
                status=OpportunityStatus.AT_RISK,
                risk_level=RiskLevel.HIGH,
                recoverability=Recoverability.HIGH,
                source="test",
                created_at=base_date + timedelta(days=25)
            )
            test_db.add(opp)

        test_db.commit()

        trend = RevenueAnalytics.get_risk_trend(test_db, days=30)
        assert trend == "INCREASING"

    def test_opportunity_count(self, test_db, sample_data):
        """Test opportunity count by status."""
        counts = RevenueAnalytics.get_opportunity_count(test_db)
        
        assert counts["RECOVERABLE"] == 1
        assert counts["AT_RISK"] == 1
        assert counts["RECOVERED"] == 1
        assert counts["LOST"] == 0
        assert counts["MONITORING"] == 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_database(self, test_db):
        """Test calculations with empty database."""
        assert RevenueAnalytics.get_total_revenue(test_db) == 0.0
        assert RevenueAnalytics.get_revenue_at_risk(test_db) == 0.0
        assert RevenueAnalytics.get_estimated_recoverable(test_db) == 0.0
        assert RevenueAnalytics.get_recovered_revenue(test_db) == 0.0

    def test_payment_success_rate_empty(self, test_db):
        """Test success rate with no transactions."""
        rate = RevenueAnalytics.get_payment_success_rate(test_db)
        assert rate == 100.0

    def test_revenue_health_empty(self, test_db):
        """Test health score with no data."""
        health = RevenueAnalytics.get_revenue_health(test_db)
        assert health["score"] >= 0
        assert health["score"] <= 100

    def test_revenue_trend_empty(self, test_db):
        """Test trend with no transactions."""
        trend = RevenueAnalytics.get_revenue_trend(test_db, days=7)
        # Should still return 7 days of data
        assert len(trend) == 8  # 7 days + today


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
