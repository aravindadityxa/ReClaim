"""Test that all backend modules can import."""
import sys

modules = [
    'models',
    'schemas',
    'database',
    'governance_service',
    'recovery_orchestrator',
    'action_executor',
    'audit_service',
    'recovery_engine',
    'recovery_measurement',
]

print("Testing backend module imports...")
all_ok = True
for mod in modules:
    try:
        __import__(mod)
        print(f'✓ {mod}')
    except Exception as e:
        print(f'✗ {mod}: {str(e)[:60]}')
        all_ok = False

if all_ok:
    print("\n✓ All modules import successfully")
    sys.exit(0)
else:
    print("\n✗ Some modules failed")
    sys.exit(1)
