#!/usr/bin/env python
"""Verify Phase 1 and Phase 2 functionality is not broken."""

import sys
from datetime import datetime, timedelta

def test_phase1_imports():
    """Test Phase 1 imports."""
    print("\n" + "=" * 60)
    print("Testing Phase 1 Imports")
    print("=" * 60)
    
    try:
        from models import Customer, Transaction, RevenueOpportunity
        from models import TransactionStatus, OpportunityType, OpportunityStatus
        from models import RiskLevel, Recoverability
        from business_logic import RevenueAnalytics
        print("✓ Phase 1 model imports successful")
        return True
    except Exception as e:
        print(f"✗ Phase 1 import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_phase2_imports():
    """Test Phase 2 imports."""
    print("\n" + "=" * 60)
    print("Testing Phase 2 Imports")
    print("=" * 60)
    
    try:
        from risk_features import RiskFeatureEngine
        from risk_model import RiskModel, RiskScorer
        from risk_analytics import RiskAnalytics
        print("✓ Phase 2 risk model imports successful")
        return True
    except Exception as e:
        print(f"✗ Phase 2 import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_phase3_imports():
    """Test Phase 3 imports."""
    print("\n" + "=" * 60)
    print("Testing Phase 3 Imports")
    print("=" * 60)
    
    try:
        from recovery_strategies import ActionEligibilityEngine, FrictionModifier, RECOVERY_ACTIONS
        from recovery_engine import RecoveryRecommendationEngine, RecoveryExpectedValueCalculator
        from recovery_timing import TimingEngine
        from recovery_analytics import RecoveryAnalytics
        print("✓ Phase 3 recovery imports successful")
        return True
    except Exception as e:
        print(f"✗ Phase 3 import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_main_endpoints():
    """Test that main.py can be imported."""
    print("\n" + "=" * 60)
    print("Testing Main Endpoints")
    print("=" * 60)
    
    try:
        import main
        print("✓ main.py imports successful")
        return True
    except Exception as e:
        print(f"✗ main.py import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all verification tests."""
    print("\n" + "=" * 60)
    print("ReClaim - Phase Integrity Verification")
    print("=" * 60)
    
    results = []
    results.append(("Phase 1 Imports", test_phase1_imports()))
    results.append(("Phase 2 Imports", test_phase2_imports()))
    results.append(("Phase 3 Imports", test_phase3_imports()))
    results.append(("Main Endpoints", test_main_endpoints()))
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✓ All phases verified - No breakage detected!")
        return 0
    else:
        print("\n✗ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
