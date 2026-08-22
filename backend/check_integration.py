#!/usr/bin/env python
"""Simple integration check - verify all components exist and import."""

import sys
import os

def check_files_exist():
    """Check that all Phase 1, 2, 3 files exist."""
    print("\n" + "=" * 60)
    print("Checking File Structure")
    print("=" * 60)
    
    required_files = {
        "Phase 1": [
            "models.py",
            "business_logic.py",
            "database.py",
        ],
        "Phase 2": [
            "risk_features.py",
            "risk_model.py",
            "risk_analytics.py",
        ],
        "Phase 3": [
            "recovery_strategies.py",
            "recovery_models.py",
            "recovery_engine.py",
            "recovery_timing.py",
            "recovery_analytics.py",
        ],
    }
    
    all_exist = True
    for phase, files in required_files.items():
        print(f"\n{phase}:")
        for file in files:
            exists = os.path.exists(file)
            status = "✓" if exists else "✗"
            print(f"  {status} {file}")
            if not exists:
                all_exist = False
    
    return all_exist


def check_schema_files():
    """Check schemas and main.py."""
    print("\n" + "=" * 60)
    print("Checking Backend Infrastructure")
    print("=" * 60)
    
    files_to_check = {
        "schemas.py": "Pydantic schemas",
        "main.py": "FastAPI endpoints",
    }
    
    all_exist = True
    for file, desc in files_to_check.items():
        exists = os.path.exists(file)
        status = "✓" if exists else "✗"
        print(f"{status} {file} ({desc})")
        if not exists:
            all_exist = False
    
    return all_exist


def check_frontend_files():
    """Check frontend component files."""
    print("\n" + "=" * 60)
    print("Checking Frontend Components")
    print("=" * 60)
    
    frontend_path = "../frontend/src"
    
    required_components = {
        "Phase 1": ["pages/Opportunities.tsx"],
        "Phase 2": ["pages/RiskIntelligence.tsx"],
        "Phase 3": [
            "pages/RecoveryIntelligence.tsx",
            "components/RecoveryRecommendationCard.tsx",
            "components/RecoveryActionComparison.tsx",
        ],
    }
    
    all_exist = True
    for phase, files in required_components.items():
        print(f"\n{phase}:")
        for file in files:
            full_path = os.path.join(frontend_path, file)
            exists = os.path.exists(full_path)
            status = "✓" if exists else "✗"
            print(f"  {status} {file}")
            if not exists:
                all_exist = False
    
    return all_exist


def check_imports():
    """Try importing all main modules."""
    print("\n" + "=" * 60)
    print("Checking Imports")
    print("=" * 60)
    
    imports_to_check = [
        ("Phase 1", "from models import Customer, Transaction, RevenueOpportunity"),
        ("Phase 1", "from business_logic import RevenueAnalytics"),
        ("Phase 2", "from risk_analytics import RiskAnalytics"),
        ("Phase 3", "from recovery_strategies import ActionEligibilityEngine"),
        ("Phase 3", "from recovery_engine import RecoveryRecommendationEngine"),
        ("Phase 3", "from recovery_analytics import RecoveryAnalytics"),
    ]
    
    all_ok = True
    for phase, import_stmt in imports_to_check:
        try:
            exec(import_stmt)
            print(f"✓ {phase}: {import_stmt.split('import')[1].strip()}")
        except Exception as e:
            print(f"✗ {phase}: {import_stmt.split('import')[1].strip()} - {str(e)[:50]}")
            all_ok = False
    
    return all_ok


def check_endpoints():
    """Check that all endpoints are defined."""
    print("\n" + "=" * 60)
    print("Checking API Endpoints")
    print("=" * 60)
    
    with open("main.py", "r") as f:
        main_content = f.read()
    
    endpoints_to_check = {
        "Phase 1": [
            "/api/dashboard/revenue-summary",
            "/api/dashboard/revenue-trend",
            "/api/revenue-opportunities",
        ],
        "Phase 2": [
            "/api/risk/summary",
            "/api/risk/queue",
            "/api/risk/drivers",
            "/api/risk/trend",
        ],
        "Phase 3": [
            "/api/recovery/recommendation",
            "/api/recovery/actions",
            "/api/recovery/portfolio",
            "/api/recovery/queue",
        ],
    }
    
    all_found = True
    for phase, endpoints in endpoints_to_check.items():
        print(f"\n{phase}:")
        for endpoint in endpoints:
            found = endpoint in main_content
            status = "✓" if found else "✗"
            print(f"  {status} {endpoint}")
            if not found:
                all_found = False
    
    return all_found


def main():
    """Run all checks."""
    print("\n" + "=" * 60)
    print("ReClaim System Integration Check")
    print("=" * 60)
    
    results = []
    results.append(("Backend Files", check_files_exist()))
    results.append(("Backend Infrastructure", check_schema_files()))
    results.append(("Frontend Components", check_frontend_files()))
    results.append(("Module Imports", check_imports()))
    results.append(("API Endpoints", check_endpoints()))
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✓ System integration check passed!")
        print("All components present and importable.")
        return 0
    else:
        print("\n✗ Some checks failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
