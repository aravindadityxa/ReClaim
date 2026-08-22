#!/usr/bin/env python
"""Simple test runner for business logic validation."""

import sys
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
from seed import generate_customers, generate_transactions, generate_opportunities

def test_data_generation():
    """Test that seed data generates correctly."""
    print("Testing data generation...")
    
    customers = generate_customers()
    assert len(customers) == 15, f"Expected 15 customers, got {len(customers)}"
    print(f"  ✓ Generated {len(customers)} customers")
    
    transactions = generate_transactions(customers)
    assert len(transactions) > 100, f"Expected >100 transactions, got {len(transactions)}"
    print(f"  ✓ Generated {len(transactions)} transactions")
    
    opportunities = generate_opportunities(transactions, {c.id: c for c in customers})
    assert len(opportunities) > 0, "Expected opportunities"
    print(f"  ✓ Generated {len(opportunities)} opportunities")

def test_revenue_calculations():
    """Test revenue calculation logic."""
    print("\nTesting revenue calculations...")
    
    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Create test data
    customer = Customer(id="cust_001", name="Test Co", email="test@example.com")
    db.add(customer)
    db.commit()
    
    # Add successful transaction
    txn_success = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        status=TransactionStatus.SUCCESS,
        payment_method="credit_card",
        created_at=datetime.utcnow()
    )
    db.add(txn_success)
    db.commit()
    
    # Test total revenue
    total = RevenueAnalytics.get_total_revenue(db)
    assert total == 1000.0, f"Expected 1000.0, got {total}"
    print("  ✓ Total revenue calculation")
    
    # Add failed transaction
    txn_failed = Transaction(
        id="txn_002",
        customer_id="cust_001",
        amount=500.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="credit_card",
        failure_reason="Card declined",
        created_at=datetime.utcnow()
    )
    db.add(txn_failed)
    db.commit()
    
    # Test success rate
    success_rate = RevenueAnalytics.get_payment_success_rate(db)
    assert success_rate == 50.0, f"Expected 50.0%, got {success_rate}%"
    print("  ✓ Payment success rate calculation")
    
    # Add opportunity
    opp = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_002",
        customer_id="cust_001",
        amount=500.0,
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
    
    # Test at-risk revenue
    at_risk = RevenueAnalytics.get_revenue_at_risk(db)
    assert at_risk == 500.0, f"Expected 500.0, got {at_risk}"
    print("  ✓ Revenue at risk calculation")
    
    # Test recoverable revenue
    recoverable = RevenueAnalytics.get_estimated_recoverable(db)
    assert recoverable > 0, f"Expected >0, got {recoverable}"
    print("  ✓ Estimated recoverable calculation")
    
    # Test health score
    health = RevenueAnalytics.get_revenue_health(db)
    assert "score" in health, "Health score missing"
    assert 0 <= health["score"] <= 100, f"Invalid health score: {health['score']}"
    print(f"  ✓ Health score calculation (score: {health['score']})")
    
    # Test trends
    trend = RevenueAnalytics.get_revenue_trend(db, days=7)
    assert len(trend) > 0, "No trend data"
    print("  ✓ Revenue trend calculation")
    
    # Test risk breakdown
    breakdown = RevenueAnalytics.get_risk_breakdown(db)
    assert "PAYMENT_FAILURE" in breakdown, "Risk breakdown missing type"
    print("  ✓ Risk breakdown calculation")
    
    # Test risk trend
    risk_trend = RevenueAnalytics.get_risk_trend(db, days=30)
    assert risk_trend in ["INCREASING", "DECREASING", "STABLE"], f"Invalid risk trend: {risk_trend}"
    print("  ✓ Risk trend determination")
    
    db.close()

def main():
    """Run all tests."""
    print("=" * 60)
    print("ReClaim Phase 1 - Business Logic Validation")
    print("=" * 60)
    
    try:
        test_data_generation()
        test_revenue_calculations()
        
        print("\n" + "=" * 60)
        print("✓ All validation tests passed!")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
