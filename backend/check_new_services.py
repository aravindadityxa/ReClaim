"""Check new reliability services."""
import sys
from database import SessionLocal

db = SessionLocal()

try:
    from health_service import SystemHealthCheck
    checker = SystemHealthCheck(db)
    print("✓ health_service imports OK")
except Exception as e:
    print(f"✗ health_service: {str(e)[:80]}")
    sys.exit(1)

try:
    from metrics_service import OperationalMetrics
    metrics = OperationalMetrics(db)
    print("✓ metrics_service imports OK")
except Exception as e:
    print(f"✗ metrics_service: {str(e)[:80]}")
    sys.exit(1)

try:
    from error_tracker import ErrorTracker, track_error
    tracker = ErrorTracker()
    print("✓ error_tracker imports OK")
except Exception as e:
    print(f"✗ error_tracker: {str(e)[:80]}")
    sys.exit(1)

print("✓ All new reliability services check OK")
db.close()
