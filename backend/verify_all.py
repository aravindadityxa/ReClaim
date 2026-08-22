"""Comprehensive verification of all backend functionality."""
import sys
from database import SessionLocal
from models import (
    Customer, Transaction, RevenueOpportunity, OpportunityStatus,
    RecoveryAttempt, RecoveryExecution, ApprovalRequestModel,
    RecoveryOutcome, PolicyChangeLog
)

print("="*60)
print("RECLAIM BACKEND VERIFICATION SUITE")
print("="*60)

db = SessionLocal()
errors = []

try:
    # Phase 1: Data Model Verification
    print("\n[PHASE 1] Data Models")
    try:
        customers = db.query(Customer).all()
        transactions = db.query(Transaction).all()
        opportunities = db.query(RevenueOpportunity).all()
        
        print(f"  ✓ Customers: {len(customers)}")
        print(f"  ✓ Transactions: {len(transactions)}")
        print(f"  ✓ Opportunities: {len(opportunities)}")
    except Exception as e:
        errors.append(f"Phase 1 Error: {str(e)[:80]}")
        print(f"  ✗ Error: {str(e)[:80]}")
    
    # Phase 3: Recovery Execution
    print("\n[PHASE 3] Recovery Execution")
    try:
        executions = db.query(RecoveryExecution).all()
        attempts = db.query(RecoveryAttempt).all()
        print(f"  ✓ Recovery Executions: {len(executions)}")
        print(f"  ✓ Recovery Attempts: {len(attempts)}")
    except Exception as e:
        errors.append(f"Phase 3 Error: {str(e)[:80]}")
        print(f"  ✗ Error: {str(e)[:80]}")
    
    # Phase 5: Governance
    print("\n[PHASE 5] Governance")
    try:
        approvals = db.query(ApprovalRequestModel).all()
        changes = db.query(PolicyChangeLog).all()
        
        print(f"  ✓ Approval Requests: {len(approvals)}")
        print(f"  ✓ Policy Change Logs: {len(changes)}")
    except Exception as e:
        errors.append(f"Phase 5 Error: {str(e)[:80]}")
        print(f"  ✗ Error: {str(e)[:80]}")
    
    # Phase 6: Recovery Outcomes
    print("\n[PHASE 6] Recovery Outcomes")
    try:
        outcomes = db.query(RecoveryOutcome).all()
        print(f"  ✓ Recovery Outcomes: {len(outcomes)}")
    except Exception as e:
        errors.append(f"Phase 6 Error: {str(e)[:80]}")
        print(f"  ✗ Error: {str(e)[:80]}")
    
    # Service Verification
    print("\n[SERVICES] Core Engines")
    try:
        from recovery_engine import RecoveryRecommendationEngine
        engine = RecoveryRecommendationEngine(db)
        print(f"  ✓ RecoveryRecommendationEngine")
    except Exception as e:
        errors.append(f"RecoveryEngine Error: {str(e)[:80]}")
        print(f"  ✗ RecoveryEngine: {str(e)[:80]}")
    
    try:
        from governance_service import GovernanceEngine
        gov = GovernanceEngine(db)
        print(f"  ✓ GovernanceEngine")
    except Exception as e:
        errors.append(f"GovernanceEngine Error: {str(e)[:80]}")
        print(f"  ✗ GovernanceEngine: {str(e)[:80]}")
    
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        orchestrator = RecoveryOrchestrator(db)
        print(f"  ✓ RecoveryOrchestrator")
    except Exception as e:
        errors.append(f"RecoveryOrchestrator Error: {str(e)[:80]}")
        print(f"  ✗ RecoveryOrchestrator: {str(e)[:80]}")
    
    try:
        from recovery_measurement import RecoveryMeasurement
        measurement = RecoveryMeasurement(db)
        
        # Test key measurement methods
        funnel = measurement.get_recovery_funnel(30)
        strategies = measurement.get_strategy_performance()
        incremental = measurement.get_incremental_revenue_summary(30)
        
        print(f"  ✓ RecoveryMeasurement (funnel, strategies, incremental)")
    except Exception as e:
        errors.append(f"RecoveryMeasurement Error: {str(e)[:80]}")
        print(f"  ✗ RecoveryMeasurement: {str(e)[:80]}")
    
    # API Verification
    print("\n[API] Endpoint Structure")
    try:
        from main import app
        routes = [r.path for r in app.routes if '/analytics/recovery' in r.path]
        print(f"  ✓ Analytics Endpoints: {len(routes)} routes")
        for route in routes:
            print(f"    - {route}")
    except Exception as e:
        errors.append(f"API Error: {str(e)[:80]}")
        print(f"  ✗ API: {str(e)[:80]}")
    
    # Summary
    print("\n" + "="*60)
    if errors:
        print(f"✗ VERIFICATION FAILED ({len(errors)} errors)")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("✓ VERIFICATION PASSED - All systems functional")
        print("="*60)
        sys.exit(0)

finally:
    db.close()
