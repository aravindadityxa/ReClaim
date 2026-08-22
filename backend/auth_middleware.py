"""
Authorization middleware for ReClaim API endpoints.
Maps endpoint groups to required permissions and provides helper functions.
"""

from typing import Optional
from models import UserRole
from auth_service import ROLE_PERMISSIONS

# Endpoint permission requirements
ENDPOINT_PERMISSIONS = {
    # Authentication endpoints (no permission required)
    "/api/auth/login": None,
    "/api/auth/logout": "authenticated",  # Just requires auth
    "/api/auth/me": "authenticated",
    
    # Dashboard endpoints
    "/api/dashboard/revenue-summary": "dashboard.read",
    "/api/dashboard/revenue-trend": "dashboard.read",
    
    # Revenue/Opportunities endpoints
    "/api/revenue-opportunities": "opportunities.read",
    "/api/revenue-opportunities/": "opportunities.read",
    "/api/revenue-activity": "opportunities.read",
    
    # Risk Intelligence endpoints
    "/api/risk/summary": "risk.read",
    "/api/risk/queue": "risk.read",
    "/api/risk/drivers": "risk.read",
    "/api/risk/cohort": "risk.read",
    "/api/risk/trend": "risk.read",
    "/api/risk/spike": "risk.read",
    "/api/risk/opportunities/": "risk.read",
    "/api/risk/model-performance": "risk.read",
    
    # Recovery Intelligence endpoints (read-only)
    "/api/recovery/recommendation/": "recovery.read",
    "/api/recovery/actions/": "recovery.read",
    "/api/recovery/portfolio": "recovery.read",
    "/api/recovery/dashboard": "recovery.read",
    "/api/recovery/queue": "recovery.read",
    
    # Recovery execution endpoints (write)
    "/api/recovery/workflows/": "recovery.execute",
    "/api/recovery/control-center": "recovery.read",
    
    # Governance endpoints (read)
    "/api/governance/policies": "governance.read",
    "/api/governance/approvals": "governance.read",
    "/api/governance/dashboard": "governance.read",
    
    # Governance endpoints (write)
    "/api/governance/policies/": "governance.manage",
    "/api/governance/evaluate": "governance.read",
    "/api/governance/approvals/": "governance.approve",
    "/api/governance/pause": "governance.pause_resume",
    "/api/governance/resume": "governance.pause_resume",
    
    # Analytics endpoints
    "/api/analytics/recovery/": "analytics.read",
    
    # System endpoints
    "/api/system/health": "system.health",
    "/api/system/metrics": "system.read",
    "/api/system/errors": "system.errors.read",
    "/api/system/status": "system.health",
    
    # User management endpoints
    "/api/users": "users.read",  # GET
    "/api/users/": "users.manage",  # POST/PATCH/DELETE
}


def get_required_permission(path: str, method: str) -> Optional[str]:
    """
    Determine the required permission for an endpoint based on path and method.
    Returns:
      - None: no permission required (public)
      - "authenticated": requires valid JWT but no specific permission
      - "permission_code": specific permission required
    """
    # Check for exact path match first
    if path in ENDPOINT_PERMISSIONS:
        return ENDPOINT_PERMISSIONS[path]
    
    # Check for prefix matches (for dynamic routes)
    for endpoint_prefix, permission in ENDPOINT_PERMISSIONS.items():
        if path.startswith(endpoint_prefix):
            # POST to /api/users requires users.manage
            if path == "/api/users" and method == "POST":
                return "users.manage"
            # PATCH/POST to /api/users/{id} requires management permission
            if path.startswith("/api/users/") and method in ["PATCH", "POST"]:
                return "users.manage" if "role" in path or "deactivate" in path or "activate" in path else "users.manage"
            return permission
    
    # Default: require authentication
    return "authenticated"


def get_applicable_permissions_for_role(role: UserRole) -> set:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())
