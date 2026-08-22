"""Centralized error tracking and reporting."""

from typing import Dict, Optional, Any, List
from datetime import datetime
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)


class ErrorSeverity(str, Enum):
    """Error severity levels."""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class SystemError:
    """Represents a tracked system error."""

    def __init__(
        self,
        component: str,
        operation: str,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        workflow_id: Optional[str] = None,
        opportunity_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.error_id = str(uuid.uuid4())
        self.timestamp = datetime.utcnow()
        self.component = component
        self.operation = operation
        self.message = message
        self.severity = severity
        self.workflow_id = workflow_id
        self.opportunity_id = opportunity_id
        self.customer_id = customer_id
        self.details = details or {}
        self.resolution_status = "UNRESOLVED"
        self.resolved_at: Optional[datetime] = None

    def mark_resolved(self) -> None:
        """Mark error as resolved."""
        self.resolution_status = "RESOLVED"
        self.resolved_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict."""
        return {
            "error_id": self.error_id,
            "timestamp": self.timestamp.isoformat(),
            "component": self.component,
            "operation": self.operation,
            "message": self.message,
            "severity": self.severity.value,
            "workflow_id": self.workflow_id,
            "opportunity_id": self.opportunity_id,
            "customer_id": self.customer_id,
            "details": self.details,
            "resolution_status": self.resolution_status,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


class ErrorTracker:
    """Centralized error tracking system."""

    def __init__(self, max_errors: int = 1000):
        """Initialize error tracker."""
        self.errors: List[SystemError] = []
        self.max_errors = max_errors

    def track_error(
        self,
        component: str,
        operation: str,
        message: str,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        workflow_id: Optional[str] = None,
        opportunity_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Track a system error.
        
        Returns the error_id.
        """
        error = SystemError(
            component=component,
            operation=operation,
            message=message,
            severity=severity,
            workflow_id=workflow_id,
            opportunity_id=opportunity_id,
            customer_id=customer_id,
            details=details,
        )

        self.errors.append(error)

        # Keep only recent errors
        if len(self.errors) > self.max_errors:
            self.errors = self.errors[-self.max_errors:]

        # Log based on severity
        log_level = {
            ErrorSeverity.INFO: logging.INFO,
            ErrorSeverity.WARNING: logging.WARNING,
            ErrorSeverity.ERROR: logging.ERROR,
            ErrorSeverity.CRITICAL: logging.CRITICAL,
        }.get(severity, logging.ERROR)

        logger.log(
            log_level,
            f"[{error.error_id}] {component}.{operation}: {message}"
        )

        return error.error_id

    def get_error(self, error_id: str) -> Optional[SystemError]:
        """Get error by ID."""
        for error in self.errors:
            if error.error_id == error_id:
                return error
        return None

    def get_recent_errors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent errors."""
        return [e.to_dict() for e in self.errors[-limit:]]

    def get_errors_by_severity(
        self,
        severity: ErrorSeverity,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get errors by severity level."""
        matching = [e for e in self.errors if e.severity == severity]
        return [e.to_dict() for e in matching[-limit:]]

    def get_errors_by_component(
        self,
        component: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get errors for specific component."""
        matching = [e for e in self.errors if e.component == component]
        return [e.to_dict() for e in matching[-limit:]]

    def get_unresolved_errors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get unresolved errors."""
        unresolved = [
            e for e in self.errors
            if e.resolution_status == "UNRESOLVED"
        ]
        return [e.to_dict() for e in unresolved[-limit:]]

    def get_errors_for_opportunity(
        self,
        opportunity_id: str
    ) -> List[Dict[str, Any]]:
        """Get all errors related to an opportunity."""
        matching = [
            e for e in self.errors
            if e.opportunity_id == opportunity_id
        ]
        return [e.to_dict() for e in matching]

    def get_errors_for_workflow(
        self,
        workflow_id: str
    ) -> List[Dict[str, Any]]:
        """Get all errors related to a workflow."""
        matching = [
            e for e in self.errors
            if e.workflow_id == workflow_id
        ]
        return [e.to_dict() for e in matching]

    def mark_error_resolved(self, error_id: str) -> bool:
        """Mark an error as resolved."""
        error = self.get_error(error_id)
        if error:
            error.mark_resolved()
            return True
        return False

    def get_summary(self) -> Dict[str, Any]:
        """Get error summary."""
        total_errors = len(self.errors)
        unresolved = sum(1 for e in self.errors if e.resolution_status == "UNRESOLVED")
        resolved = total_errors - unresolved

        by_severity = {
            severity.value: sum(1 for e in self.errors if e.severity == severity)
            for severity in ErrorSeverity
        }

        by_component = {}
        for error in self.errors:
            by_component[error.component] = by_component.get(error.component, 0) + 1

        return {
            "total_errors": total_errors,
            "unresolved": unresolved,
            "resolved": resolved,
            "by_severity": by_severity,
            "by_component": by_component,
            "most_recent": self.errors[-1].to_dict() if self.errors else None,
        }


# Global error tracker instance
error_tracker = ErrorTracker()


def track_error(
    component: str,
    operation: str,
    message: str,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    workflow_id: Optional[str] = None,
    opportunity_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> str:
    """Global error tracking function."""
    return error_tracker.track_error(
        component=component,
        operation=operation,
        message=message,
        severity=severity,
        workflow_id=workflow_id,
        opportunity_id=opportunity_id,
        customer_id=customer_id,
        details=details,
    )


def get_error(error_id: str) -> Optional[SystemError]:
    """Get error globally."""
    return error_tracker.get_error(error_id)


def get_error_summary() -> Dict[str, Any]:
    """Get global error summary."""
    return error_tracker.get_summary()
