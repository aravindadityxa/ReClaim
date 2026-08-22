#!/usr/bin/env python
"""Comprehensive system integration verification for ReClaim Phase 3."""

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
from risk_analytics import RiskAnalytics
from recovery_engine import RecoveryRecommendationEngine, RecoveryExpectedValueCalculator
from recovery_strategies import ActionEligibilityEngine, RECOVERY_ACTIONS
from recovery_analytics import RecoveryAnalytics as RecoveryAnalyticsEngine


def setup_test_database():
    """Create in-memory test database with sample data."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Create customers
    customers = [
        Customer(id="cust_001", name="Test Co 1", email="test1@example.com"),
        Customer(id="cust_002", name="Test Co 2", email="test2@example.com"),
        Customer(id="cust_003", name="Test Co 3", email="test3@example.com"),
    ]
    db.add_all(customers)
    db.commit()
    
    # Create transactions
    base_date = datetime.utcnow() - timedelta(days=30)
    transactions = [
        Transaction(
            id="txn_001", customer_id="cust_001", amount=1000.0, currency="INR",
            status=TransactionStatus.SUCCESS, payment_method="credit_card",
            created_at=base_date
        ),
        Transaction(
            id="txn_002", customer_id="cust_002", amount=2000.0, currency="INR",
            status=TransactionStatus.SUCCESS, payment_method="upi",
            created_at=base_date + timedelta(days=5)
        ),
        Transaction(
            id="txn_003", customer_id="cust_001", amount=500.0, currency="INR",
            status=TransactionStatus.FAILED, payment_method="credit_card",
            failure_reason="Card declined", created_at=base_date + timedelta(days=10)
        ),
        Transaction(
            id="txn_004", customer_id="cust_002", amount=1500.0, currency="INR",
            status=TransactionStatus.FAILED, payment_method="debit_card",
            failure_reason="Insufficient funds", created_at=base_date + timedelta(days=15)
        ),
        Transaction(
            id="txn_005", customer_id="cust_003", amount=3000.0, currency="INR",
            status=TransactionStatus.FAILED, payment_method="credit_card",
            failure_reason="Card expired", created_at=base_date + timedelta(days=20)
        ),
    ]
    db.add_all(transactions)
    db.commit()
    
    # Create opportunities
    opportunities = [
        RevenueOpportunity(
            id="opp_001", transaction_id="txn_003", customer_id="cust_001",
            amount=500.0, currency="INR", type=OpportunityType.PAYMENT_FAILURE,
            status=OpportunityStatus.RECOVERABLE, risk_level=RiskLevel.HIGH,
            recoverability=Recoverability.HIGH, failure_reason="Card declined",
            source="transaction_failure", created_at=base_date + timedelta(days=10)
        ),
        RevenueOpportunity(
            id="opp_002", transaction_id="txn_004", customer_id="cust_002",
            amount=1500.0, currency="INR", type=OpportunityType.PAYMENT_FAILURE,
            status=OpportunityStatus.RECOVERABLE, risk_level=RiskLevel.MEDIUM,
            recoverability=Recoverability.MEDIUM, failure_reason="Insufficient funds",
            source="transaction_failure", created_at=base_date + timedelta(days=15)
        ),
        RevenueOpportunity(
            id="opp_003", transaction_id="txn_005", customer_id="cust_003",
            amount=3000.0, currency="INR", type=OpportunityType.PAYMENT_FAILURE,
            status=OpportunityStatus.RECOVERABLE, risk_level=RiskLevel.CRITICAL,
            recoverability=Recoverability.HIGH, failure_reason="Card expired",
            source="transaction_failure", created_at=base_date + timedelta(days=20)
        ),
    ]
    db.add_all(opportunities)
    db.commit()
    
    return db


def test_phase1_integration(db):
    """Test Phase 1 revenue analytics."""
    print("\n" + "=" * 60)
    print("Testing Phase 1: Revenue Analytics Integration")
    print("=" * 60)
    
    try:
        total_revenue = RevenueAnalytics.get_total_revenue(db)
        success_rate = RevenueAnalytics.get_payment_success_rate(db)
        at_risk = RevenueAnalytics.get_revenue_at_risk(db)
        recoverable = RevenueAnalytics.get_estimated_recoverable(db)
        health = RevenueAnalytics.get_revenue_health(db)
        
        print(f"✓ Total Revenue: ₹{total_revenue:.2f}")
        print(f"✓ Success Rate: {success_rate:.1f}%")
        print(f"✓ Revenue at Risk: ₹{at_risk:.2f}")
        print(f"✓ Estimated Recoverable: ₹{recoverable:.2f}")
        print(f"✓ Health Score: {health['score']}/100")
        
        assert total_revenue > 0, "Revenue should be positive"
        assert success_rate >= 0 and success_rate <= 100, "Success rate should be 0-100%"
        assert at_risk > 0, "Should have at-risk revenue"
        assert recoverable > 0, "Should have recoverable revenue"
        
        return True
    except Exception as e:
        print(f"✗ Phase 1 integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_phase2_integration(db):
    """Test Phase 2 risk analytics."""
    print("\n" + "=" * 60)
    print("Testing Phase 2: Risk Intelligence Integration")
    print("=" * 60)
    
    try:
        risk_analytics = RiskAnalytics(db)
        
        summary = risk_analytics.get_risk_summary()
        queue = risk_analytics.get_risk_queue(limit=10)
        drivers = risk_analytics.get_risk_drivers_breakdown()
        trend = risk_analytics.get_risk_trend(days=30)
        
        print(f"✓ Risk Summary: {summary['high_risk_revenue']:.2f} high-risk revenue")
        print(f"✓ Risk Queue: {len(queue)} opportunities prioritized")
        print(f"✓ Risk Drivers: {len(drivers)} drivers identified")
        print(f"✓ Risk Trend: {len(trend)} trend points")
        
        assert summary is not None, "Risk summary should exist"
        assert isinstance(queue, list), "Risk queue should be a list"
        assert len(drivers) > 0, "Should have risk drivers"
        
        return True
    except Exception as e:
        print(f"✗ Phase 2 integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_phase3_integration(db):
    """Test Phase 3 recovery intelligence."""
    print("\n" + "=" * 60)
    print("Testing Phase 3: Recovery Intelligence Integration")
    print("=" * 60)
    
    try:
        # Test eligibility engine
        opportunities = db.query(RevenueOpportunity).all()
        eligibility_engine = ActionEligibilityEngine()
        
        eligible_actions_count = 0
        for opp in opportunities:
            eligible_actions = eligibility_engine.get_eligible_actions(
                opp, opp.customer, opp.transaction
            )
            eligible_actions_count += len(eligible_actions)
        
        print(f"✓ Eligibility Engine: {eligible_actions_count} actions across {len(opportunities)} opportunities")
        
        # Test recovery recommendation engine
        rec_engine = RecoveryRecommendationEngine(db)
        
        recommendations = []
        for opp in opportunities:
            try:
                rec = rec_engine.generate_recommendation(opp.id)
                if rec:
                    recommendations.append(rec)
            except Exception as e:
                print(f"  Warning: Could not generate recommendation for {opp.id}: {e}")
        
        print(f"✓ Recommendation Engine: {len(recommendations)} recommendations generated")
        
        # Test recovery analytics
        recovery_analytics = RecoveryAnalyticsEngine(db)
        portfolio_metrics = recovery_analytics.get_portfolio_metrics()
        queue = recovery_analytics.get_recovery_queue(limit=10)
        
        print(f"✓ Portfolio Metrics: ₹{portfolio_metrics['total_revenue_at_risk']:.2f} at risk")
        print(f"✓ Expected Recovery: ₹{portfolio_metrics['expected_recovery_from_recommended_actions']:.2f}")
        print(f"✓ Recovery Queue: {len(queue)} opportunities prioritized")
        print(f"✓ High Priority Count: {portfolio_metrics['high_priority_opportunity_count']}")
        
        assert len(recommendations) > 0, "Should generate some recommendations"
        assert portfolio_metrics['total_revenue_at_risk'] > 0, "Should have at-risk revenue"
        
        return True
    except Exception as e:
        print(f"✗ Phase 3 integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cross_phase_consistency(db):
    """Test that phases work together consistently."""
    print("\n" + "=" * 60)
    print("Testing Cross-Phase Consistency")
    print("=" * 60)
    
    try:
        # Phase 1: Get total at-risk revenue
        at_risk_phase1 = RevenueAnalytics.get_revenue_at_risk(db)
        
        # Phase 2: Get high-risk revenue
        risk_analytics = RiskAnalytics(db)
        risk_summary = risk_analytics.get_risk_summary()
        high_risk_phase2 = risk_summary['high_risk_revenue']
        
        # Phase 3: Get portfolio metrics
        recovery_analytics = RecoveryAnalyticsEngine(db)
        portfolio = recovery_analytics.get_portfolio_metrics()
        at_risk_phase3 = portfolio['total_revenue_at_risk']
        
        print(f"✓ Phase 1 At-Risk: ₹{at_risk_phase1:.2f}")
        print(f"✓ Phase 2 High-Risk: ₹{high_risk_phase2:.2f}")
        print(f"✓ Phase 3 At-Risk: ₹{at_risk_phase3:.2f}")
        
        # All should be consistent
        assert at_risk_phase1 > 0, "Phase 1 should have at-risk revenue"
        assert high_risk_phase2 <= at_risk_phase1, "Phase 2 high-risk should be subset of Phase 1 at-risk"
        assert at_risk_phase3 > 0, "Phase 3 should have at-risk revenue"
        
        print("✓ Cross-phase consistency verified")
        return True
    except Exception as e:
        print(f"✗ Cross-phase consistency check failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all integration tests."""
    print("\n" + "=" * 60)
    print("ReClaim - Complete System Integration Verification")
    print("=" * 60)
    
    try:
        # Setup test database
        print("\nSetting up test database...")
        db = setup_test_database()
        print("✓ Test database created with sample data")
        
        # Run tests
        results = []
        results.append(("Phase 1 Integration", test_phase1_integration(db)))
        results.append(("Phase 2 Integration", test_phase2_integration(db)))
        results.append(("Phase 3 Integration", test_phase3_integration(db)))
        results.append(("Cross-Phase Consistency", test_cross_phase_consistency(db)))
        
        db.close()
        
        # Summary
        print("\n" + "=" * 60)
        print("Integration Test Summary")
        print("=" * 60)
        
        for name, passed in results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"{status}: {name}")
        
        all_passed = all(passed for _, passed in results)
        
        if all_passed:
            print("\n✓ Complete system integration verified!")
            print("All phases working together correctly.")
            return 0
        else:
            print("\n✗ Some integration tests failed")
            return 1
            
    except Exception as e:
        print(f"\n✗ Integration verification failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
