"""Tests for production reliability and observability features."""

import pytest
from datetime import datetime
from database import SessionLocal
from models import Customer, Transaction, RevenueOpportunity, RecoveryAttempt
from models import TransactionStatus, OpportunityType, OpportunityStatus, RiskLevel, Recoverability
from health_service import SystemHealthCheck, HealthStatus
from metrics_service import OperationalMetrics
from error_tracker import ErrorTracker, ErrorSeverity, track_error, get_error_summary


@pytest.fixture
def db():
    """Create a test database session."""
    db = SessionLocal()
    yield db
    db.close()


class TestHealthService:
    """Test system health monitoring."""

    def test_database_health_check(self, db):
        """Test database health check."""
        checker = SystemHealthCheck(db)
        health = checker.check_database()
        
        assert health.status == HealthStatus.HEALTHY
        assert "database" in health.name.lower()

    def test_recovery_engine_health_check(self, db):
        """Test recovery engine health check."""
        checker = SystemHealthCheck(db)
        health = checker.check_recovery_engine()
        
        assert health.status in [HealthStatus.HEALTHY, HealthStatus.UNHEALTHY]

    def test_governance_health_check(self, db):
        """Test governance engine health check."""
        checker = SystemHealthCheck(db)
        health = checker.check_governance()
        
        assert health.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]

    def test_full_system_check(self, db):
        """Test full system health check."""
        checker = SystemHealthCheck(db)
        result = checker.perform_full_check()
        
        assert "status" in result
        assert "checks" in result
        assert "summary" in result
        assert result["status"] in ["healthy", "degraded", "unhealthy"]
        assert result["summary"]["total_checks"] > 0


class TestMetricsService:
    """Test operational metrics collection."""

    def test_recovery_attempts_metrics(self, db):
        """Test recovery attempt metrics."""
        metrics = OperationalMetrics(db)
        result = metrics.get_recovery_attempts_metrics()
        
        assert "total_attempts" in result
        assert "successful" in result
        assert "failed" in result
        assert "success_rate" in result

    def test_workflow_metrics(self, db):
        """Test workflow metrics."""
        metrics = OperationalMetrics(db)
        result = metrics.get_recovery_workflows_metrics()
        
        assert "total_workflows" in result
        assert "active" in result
        assert "failed" in result

    def test_governance_metrics(self, db):
        """Test governance metrics."""
        metrics = OperationalMetrics(db)
        result = metrics.get_governance_metrics()
        
        assert "pending_approvals" in result
        assert "approved" in result
        assert "is_paused" in result

    def test_revenue_metrics(self, db):
        """Test revenue metrics."""
        metrics = OperationalMetrics(db)
        result = metrics.get_revenue_metrics()
        
        assert "revenue_at_risk" in result
        assert "revenue_recovered" in result

    def test_all_metrics(self, db):
        """Test comprehensive metrics collection."""
        metrics = OperationalMetrics(db)
        result = metrics.get_all_metrics()
        
        assert "timestamp" in result
        assert "recovery_attempts" in result
        assert "workflows" in result
        assert "governance" in result
        assert "revenue" in result


class TestErrorTracker:
    """Test error tracking system."""

    def test_track_error(self):
        """Test tracking an error."""
        tracker = ErrorTracker()
        error_id = tracker.track_error(
            component="test",
            operation="test_op",
            message="Test error",
            severity=ErrorSeverity.ERROR,
        )
        
        assert error_id is not None
        error = tracker.get_error(error_id)
        assert error is not None
        assert error.message == "Test error"

    def test_error_severity_levels(self):
        """Test error severity levels."""
        tracker = ErrorTracker()
        
        severities = [
            ErrorSeverity.INFO,
            ErrorSeverity.WARNING,
            ErrorSeverity.ERROR,
            ErrorSeverity.CRITICAL,
        ]
        
        for severity in severities:
            error_id = tracker.track_error(
                component="test",
                operation="test_op",
                message=f"Test {severity.value}",
                severity=severity,
            )
            assert error_id is not None

    def test_get_recent_errors(self):
        """Test getting recent errors."""
        tracker = ErrorTracker()
        
        for i in range(5):
            tracker.track_error(
                component="test",
                operation="test_op",
                message=f"Error {i}",
            )
        
        recent = tracker.get_recent_errors(3)
        assert len(recent) == 3

    def test_get_errors_by_severity(self):
        """Test filtering errors by severity."""
        tracker = ErrorTracker()
        
        tracker.track_error(
            component="test",
            operation="op1",
            message="Critical issue",
            severity=ErrorSeverity.CRITICAL,
        )
        tracker.track_error(
            component="test",
            operation="op2",
            message="Warning issue",
            severity=ErrorSeverity.WARNING,
        )
        
        critical = tracker.get_errors_by_severity(ErrorSeverity.CRITICAL)
        assert any(e["severity"] == "CRITICAL" for e in critical)

    def test_get_errors_by_component(self):
        """Test filtering errors by component."""
        tracker = ErrorTracker()
        
        tracker.track_error(
            component="database",
            operation="query",
            message="DB error",
        )
        tracker.track_error(
            component="api",
            operation="request",
            message="API error",
        )
        
        db_errors = tracker.get_errors_by_component("database")
        assert all(e["component"] == "database" for e in db_errors)

    def test_mark_error_resolved(self):
        """Test marking errors as resolved."""
        tracker = ErrorTracker()
        
        error_id = tracker.track_error(
            component="test",
            operation="test_op",
            message="Test error",
        )
        
        assert tracker.mark_error_resolved(error_id)
        error = tracker.get_error(error_id)
        assert error.resolution_status == "RESOLVED"

    def test_error_summary(self):
        """Test error summary."""
        tracker = ErrorTracker()
        
        tracker.track_error(
            component="test",
            operation="op1",
            message="Error 1",
            severity=ErrorSeverity.ERROR,
        )
        tracker.track_error(
            component="test",
            operation="op2",
            message="Error 2",
            severity=ErrorSeverity.WARNING,
        )
        
        summary = tracker.get_summary()
        assert summary["total_errors"] == 2
        assert summary["unresolved"] == 2

    def test_global_error_tracking(self):
        """Test global error tracking functions."""
        error_id = track_error(
            component="test",
            operation="test_op",
            message="Test error",
        )
        
        assert error_id is not None
        error = get_error(error_id)
        assert error is not None

    def test_error_with_context(self):
        """Test tracking errors with workflow/opportunity context."""
        tracker = ErrorTracker()
        
        error_id = tracker.track_error(
            component="recovery",
            operation="execute",
            message="Recovery failed",
            severity=ErrorSeverity.ERROR,
            workflow_id="wf_123",
            opportunity_id="opp_456",
            customer_id="cust_789",
            details={"reason": "Payment provider unavailable"},
        )
        
        error = tracker.get_error(error_id)
        assert error.workflow_id == "wf_123"
        assert error.opportunity_id == "opp_456"
        assert error.customer_id == "cust_789"

    def test_max_errors_limit(self):
        """Test that error tracker respects max error limit."""
        tracker = ErrorTracker(max_errors=100)
        
        # Add more than max
        for i in range(150):
            tracker.track_error(
                component="test",
                operation="test_op",
                message=f"Error {i}",
            )
        
        # Should only keep last 100
        assert len(tracker.errors) <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
