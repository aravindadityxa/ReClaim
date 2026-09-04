"""System health and reliability monitoring service."""

from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ServiceHealth:
    """Health status of a single service component."""

    def __init__(
        self,
        name: str,
        status: HealthStatus = HealthStatus.HEALTHY,
        message: str = "",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.status = status
        self.message = message
        self.details = details or {}
        self.checked_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "details": self.details,
            "checked_at": self.checked_at,
        }


class SystemHealthCheck:
    """System-wide health monitoring."""

    def __init__(self, db):
        """Initialize health check."""
        self.db = db
        self.services: Dict[str, ServiceHealth] = {}

    def check_database(self) -> ServiceHealth:
        """Check database connectivity and health."""
        try:
            # Try a simple query
            from models import Customer
            count = self.db.query(Customer).count()
            
            return ServiceHealth(
                name="database",
                status=HealthStatus.HEALTHY,
                message="Database connected and responsive",
                details={"customer_count": count}
            )
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return ServiceHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                message=f"Database error: {str(e)[:100]}",
            )

    def check_recovery_engine(self) -> ServiceHealth:
        """Check recovery engine availability."""
        try:
            from recovery_engine import RecoveryRecommendationEngine
            engine = RecoveryRecommendationEngine(self.db)
            
            # Just verify it initializes (no special methods to call)
            return ServiceHealth(
                name="recovery_engine",
                status=HealthStatus.HEALTHY,
                message="Recovery engine operational",
            )
        except Exception as e:
            logger.error(f"Recovery engine health check failed: {str(e)}")
            return ServiceHealth(
                name="recovery_engine",
                status=HealthStatus.UNHEALTHY,
                message=f"Recovery engine error: {str(e)[:100]}",
            )

    def check_orchestrator(self) -> ServiceHealth:
        """Check recovery orchestrator availability."""
        try:
            from recovery_orchestrator import RecoveryOrchestrator
            orchestrator = RecoveryOrchestrator(self.db)
            
            # Verify it initializes
            return ServiceHealth(
                name="orchestrator",
                status=HealthStatus.HEALTHY,
                message="Recovery orchestrator operational",
            )
        except Exception as e:
            logger.error(f"Orchestrator health check failed: {str(e)}")
            return ServiceHealth(
                name="orchestrator",
                status=HealthStatus.UNHEALTHY,
                message=f"Orchestrator error: {str(e)[:100]}",
            )

    def check_governance(self) -> ServiceHealth:
        """Check governance engine availability."""
        try:
            from governance_service import governance_engine
            
            # Verify it's initialized
            if governance_engine and governance_engine.policy_set:
                return ServiceHealth(
                    name="governance",
                    status=HealthStatus.HEALTHY,
                    message="Governance engine operational",
                    details={
                        "is_paused": governance_engine.is_paused,
                        "active_policies": sum(
                            1 for p in governance_engine.policy_set.policies.values()
                            if p.enabled
                        )
                    }
                )
            else:
                return ServiceHealth(
                    name="governance",
                    status=HealthStatus.DEGRADED,
                    message="Governance engine partially initialized",
                )
        except Exception as e:
            logger.error(f"Governance health check failed: {str(e)}")
            return ServiceHealth(
                name="governance",
                status=HealthStatus.UNHEALTHY,
                message=f"Governance error: {str(e)[:100]}",
            )

    def check_action_executor(self) -> ServiceHealth:
        """Check action executor availability."""
        try:
            from action_executor import ActionExecutor
            executor = ActionExecutor()  # No parameters needed
            
            # Verify it initializes
            return ServiceHealth(
                name="executor",
                status=HealthStatus.HEALTHY,
                message="Action executor operational",
            )
        except Exception as e:
            logger.error(f"Action executor health check failed: {str(e)}")
            return ServiceHealth(
                name="executor",
                status=HealthStatus.UNHEALTHY,
                message=f"Executor error: {str(e)[:100]}",
            )

    def check_measurement(self) -> ServiceHealth:
        """Check recovery measurement service availability."""
        try:
            from recovery_measurement import RecoveryMeasurement
            measurement = RecoveryMeasurement(self.db)
            
            # Try a basic measurement
            funnel = measurement.get_recovery_funnel(7)
            
            return ServiceHealth(
                name="measurement",
                status=HealthStatus.HEALTHY,
                message="Measurement service operational",
                details={
                    "at_risk_count": funnel.get("at_risk", {}).get("count", 0) if funnel else 0
                }
            )
        except Exception as e:
            logger.error(f"Measurement service health check failed: {str(e)}")
            return ServiceHealth(
                name="measurement",
                status=HealthStatus.UNHEALTHY,
                message=f"Measurement error: {str(e)[:100]}",
            )

    def check_audit(self) -> ServiceHealth:
        """Check audit system availability."""
        try:
            from audit_service import audit_store
            
            # Verify it's accessible
            trails = audit_store.get_all_trails()
            
            return ServiceHealth(
                name="audit",
                status=HealthStatus.HEALTHY,
                message="Audit system operational",
                details={"recorded_trails": len(trails)}
            )
        except Exception as e:
            logger.error(f"Audit system health check failed: {str(e)}")
            return ServiceHealth(
                name="audit",
                status=HealthStatus.UNHEALTHY,
                message=f"Audit error: {str(e)[:100]}",
            )

    def perform_full_check(self) -> Dict[str, Any]:
        """Perform comprehensive system health check."""
        checks = [
            self.check_database(),
            self.check_recovery_engine(),
            self.check_orchestrator(),
            self.check_governance(),
            self.check_action_executor(),
            self.check_measurement(),
            self.check_audit(),
        ]

        # Determine overall status
        unhealthy_count = sum(1 for c in checks if c.status == HealthStatus.UNHEALTHY)
        degraded_count = sum(1 for c in checks if c.status == HealthStatus.DEGRADED)

        if unhealthy_count > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif degraded_count > 0:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY

        return {
            "status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {c.name: c.to_dict() for c in checks},
            "summary": {
                "total_checks": len(checks),
                "healthy": sum(1 for c in checks if c.status == HealthStatus.HEALTHY),
                "degraded": degraded_count,
                "unhealthy": unhealthy_count,
            }
        }


def get_health_checker(db) -> SystemHealthCheck:
    """
    Get a fresh health checker instance for this request.
    
    Each request gets its own instance to ensure:
    - Fresh database session for health checks
    - No concurrent session sharing
    - Proper cleanup after request completes
    """
    return SystemHealthCheck(db)


def initialize_health_checker(db) -> SystemHealthCheck:
    """
    Alias for get_health_checker - provided for backward compatibility.
    
    Use get_health_checker() instead.
    """
    return get_health_checker(db)
