#!/usr/bin/env python
"""Verify Phase 2 implementation."""

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
from risk_features import RiskFeatureEngine
from risk_model import RiskModel, RiskScorer
from risk_analytics import RiskAnalytics


def test_feature_engineering():
    """Test feature engineering."""
    print("\n" + "=" * 60)
    print("Testing Feature Engineering")
    print("=" * 60)

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Create test data
    customer = Customer(id="cust_001", name="Test", email="test@example.com")
    db.add(customer)
    db.commit()

    txn = Transaction(
        id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        status=TransactionStatus.FAILED,
        payment_method="card",
        failure_reason="Card declined",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    db.add(txn)
    db.commit()

    opp = RevenueOpportunity(
        id="opp_001",
        transaction_id="txn_001",
        customer_id="cust_001",
        amount=1000.0,
        currency="INR",
        type=OpportunityType.PAYMENT_FAILURE,
        status=OpportunityStatus.AT_RISK,
        risk_level=RiskLevel.HIGH,
        recoverability=Recoverability.HIGH,
        failure_reason="Card declined",
        source="test",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    db.add(opp)
    db.commit()

    engine_fe = RiskFeatureEngine()
    df = engine_fe.build_opportunity_features(db)

    print(f"✓ Feature matrix built: {len(df)} opportunities, {len(df.columns)} features")
    print(f"✓ Features: {engine_fe.get_feature_names()[:5]}...")

    db.close()
    return True


def test_risk_model():
    """Test risk model training."""
    print("\n" + "=" * 60)
    print("Testing Risk Model")
    print("=" * 60)

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Create test data with outcomes
    customer = Customer(id="cust_001", name="Test", email="test@example.com")
    db.add(customer)
    db.commit()

    base_date = datetime.utcnow() - timedelta(days=30)

    # Create transactions
    for i in range(20):
        txn = Transaction(
            id=f"txn_{i:03d}",
            customer_id="cust_001",
            amount=1000.0,
            currency="INR",
            status=TransactionStatus.FAILED,
            payment_method="card",
            failure_reason="Card declined",
            created_at=base_date + timedelta(days=i)
        )
        db.add(txn)

    db.commit()

    # Create opportunities with outcomes
    for i in range(20):
        status = OpportunityStatus.LOST if i < 10 else OpportunityStatus.RECOVERED
        opp = RevenueOpportunity(
            id=f"opp_{i:03d}",
            transaction_id=f"txn_{i:03d}",
            customer_id="cust_001",
            amount=1000.0,
            currency="INR",
            type=OpportunityType.PAYMENT_FAILURE,
            status=status,
            risk_level=RiskLevel.HIGH,
            recoverability=Recoverability.HIGH,
            failure_reason="Card declined",
            source="test",
            created_at=base_date + timedelta(days=i),
            recovered_at=base_date + timedelta(days=i+5) if status == OpportunityStatus.RECOVERED else None
        )
        db.add(opp)

    db.commit()

    # Train model
    engine_fe = RiskFeatureEngine()
    df = engine_fe.build_opportunity_features(db)

    model = RiskModel()
    metrics = model.train(df, force_retrain=True)

    print(f"✓ Model trained: {metrics['status']}")
    print(f"  - Train size: {metrics.get('train_size', 0)}")
    print(f"  - Test size: {metrics.get('test_size', 0)}")
    print(f"  - Precision: {metrics.get('precision', 0):.3f}")
    print(f"  - Recall: {metrics.get('recall', 0):.3f}")
    print(f"  - F1: {metrics.get('f1', 0):.3f}")

    db.close()
    return metrics['status'] == 'trained'


def test_risk_scoring():
    """Test risk scoring."""
    print("\n" + "=" * 60)
    print("Testing Risk Scoring")
    print("=" * 60)

    scorer = RiskScorer()

    score = scorer.probability_to_score(0.75)
    level = scorer.score_to_level(score)

    print(f"✓ Probability 0.75 → Score {score}/100 → Level {level}")

    loss = scorer.calculate_expected_loss(1000.0, 0.8)
    print(f"✓ Expected loss: ₹1000 × 0.8 = ₹{loss}")

    priority = scorer.calculate_priority_score(1000.0, 0.8, 75, 10)
    print(f"✓ Priority score: {priority}/100")

    return True


def test_risk_analytics():
    """Test risk analytics."""
    print("\n" + "=" * 60)
    print("Testing Risk Analytics")
    print("=" * 60)

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Create test data
    customer = Customer(id="cust_001", name="Test", email="test@example.com")
    db.add(customer)
    db.commit()

    base_date = datetime.utcnow() - timedelta(days=30)

    for i in range(10):
        txn = Transaction(
            id=f"txn_{i:03d}",
            customer_id="cust_001",
            amount=1000.0 + i * 100,
            currency="INR",
            status=TransactionStatus.FAILED if i < 7 else TransactionStatus.SUCCESS,
            payment_method="card",
            failure_reason="Card declined" if i < 7 else None,
            created_at=base_date + timedelta(days=i)
        )
        db.add(txn)

    db.commit()

    for i in range(7):
        status = OpportunityStatus.LOST if i < 3 else OpportunityStatus.RECOVERABLE
        opp = RevenueOpportunity(
            id=f"opp_{i:03d}",
            transaction_id=f"txn_{i:03d}",
            customer_id="cust_001",
            amount=1000.0 + i * 100,
            currency="INR",
            type=OpportunityType.PAYMENT_FAILURE,
            status=status,
            risk_level=RiskLevel.HIGH if i < 4 else RiskLevel.MEDIUM,
            recoverability=Recoverability.HIGH,
            failure_reason="Card declined",
            source="test",
            created_at=base_date + timedelta(days=i)
        )
        db.add(opp)

    db.commit()

    # Compute analytics
    analytics = RiskAnalytics(db)

    summary = analytics.get_risk_summary()
    print(f"✓ Risk summary:")
    print(f"  - High risk revenue: ₹{summary['high_risk_revenue']}")
    print(f"  - Expected loss: ₹{summary['total_expected_loss']}")
    print(f"  - Average risk score: {summary['average_risk_score']}")

    queue = analytics.get_risk_queue(5)
    print(f"✓ Risk queue: {len(queue)} opportunities")

    drivers = analytics.get_risk_drivers_breakdown()
    print(f"✓ Risk drivers: {len(drivers)} drivers identified")

    trend = analytics.get_risk_trend(30)
    print(f"✓ Risk trend: {len(trend)} data points over 30 days")

    spike = analytics.detect_risk_spikes(7)
    print(f"✓ Risk spike detection: {'SPIKE DETECTED' if spike['spike_detected'] else 'stable'}")

    db.close()
    return True


def main():
    """Run all Phase 2 verification tests."""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + "  ReClaim Phase 2 - Risk Intelligence Verification".ljust(59) + "║")
    print("╚" + "=" * 58 + "╝")

    tests = [
        ("Feature Engineering", test_feature_engineering),
        ("Risk Scoring", test_risk_scoring),
        ("Risk Model", test_risk_model),
        ("Risk Analytics", test_risk_analytics),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                print(f"✗ {test_name} failed")
                failed += 1
        except Exception as e:
            print(f"✗ {test_name} error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    print(f"Phase 2 Verification Results: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
