"""
Authentication and authorization service.
Handles JWT token generation/validation, password hashing, and permission checking.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
from pydantic import BaseModel
from models import User, UserRole, SecurityEvent
from database import SessionLocal
from sqlalchemy.orm import Session
import json
import uuid

# Configuration from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "1440"))

# Permission matrix: maps roles to permissions
ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        # Dashboard
        "dashboard.read",
        # Revenue & Opportunities
        "opportunities.read",
        # Risk
        "risk.read",
        "risk.summary",
        # Recovery
        "recovery.read",
        "recovery.execute",
        "recovery.workflow_manage",
        # Governance
        "governance.read",
        "governance.manage",
        "governance.approve",
        "governance.pause_resume",
        # Analytics
        "analytics.read",
        # System
        "system.read",
        "system.health",
        "system.errors.read",
        # Users
        "users.read",
        "users.manage",
        "users.deactivate",
        "users.role_change",
        # Settings
        "settings.read",
        "settings.manage",
    },
    UserRole.OPERATOR: {
        # Dashboard
        "dashboard.read",
        # Revenue & Opportunities
        "opportunities.read",
        # Risk
        "risk.read",
        # Recovery
        "recovery.read",
        "recovery.execute",
        "recovery.workflow_manage",
        # Governance
        "governance.read",
        "governance.approve",
        # System
        "system.read",
        "system.health",
        "system.errors.read",
    },
    UserRole.ANALYST: {
        # Dashboard
        "dashboard.read",
        # Revenue & Opportunities
        "opportunities.read",
        # Risk
        "risk.read",
        "risk.summary",
        # Recovery
        "recovery.read",
        # Governance
        "governance.read",
        # Analytics
        "analytics.read",
        # System
        "system.read",
        "system.health",
    },
    UserRole.VIEWER: {
        # Dashboard
        "dashboard.read",
        # Revenue & Opportunities
        "opportunities.read",
        # Risk
        "risk.summary",
        # System
        "system.health",
    },
}


class TokenPayload(BaseModel):
    """JWT token payload."""
    user_id: str
    username: str
    role: str
    exp: datetime
    iat: datetime


class TokenResponse(BaseModel):
    """Token response for login."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str


class CurrentUser(BaseModel):
    """Current user context."""
    user_id: str
    username: str
    email: str
    role: str
    permissions: set
    is_active: bool


# ============================================================================
# Password Hashing
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


# ============================================================================
# JWT Token Management
# ============================================================================

def create_access_token(user: User) -> str:
    """
    Create a JWT access token for the user.
    Token includes user_id, username, role, and expiration.
    """
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(hours=JWT_EXPIRATION_HOURS)

    payload = {
        "user_id": user.id,
        "username": user.username,
        "role": user.role.value,
        "exp": int(expiration.timestamp()),
        "iat": int(now.timestamp()),
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token: str) -> Optional[TokenPayload]:
    """
    Verify and decode a JWT token.
    Returns TokenPayload if valid, None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return TokenPayload(
            user_id=payload["user_id"],
            username=payload["username"],
            role=payload["role"],
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            iat=datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ============================================================================
# User Queries & Management
# ============================================================================

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get a user by username."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate user with username and password.
    Returns User if authentication succeeds, None otherwise.
    """
    user = get_user_by_username(db, username)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    role: UserRole = UserRole.VIEWER,
    created_by_user_id: Optional[str] = None,
) -> User:
    """Create a new user."""
    user_id = str(uuid.uuid4())
    password_hash = hash_password(password)

    user = User(
        id=user_id,
        username=username,
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        role=role,
        is_active=1,
        created_by=created_by_user_id,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_permissions(user: User) -> set:
    """Get all permissions for a user based on their role."""
    return ROLE_PERMISSIONS.get(user.role, set())


def has_permission(user: User, permission: str) -> bool:
    """Check if a user has a specific permission."""
    permissions = get_user_permissions(user)
    return permission in permissions


# ============================================================================
# Security Events
# ============================================================================

def log_security_event(
    db: Session,
    event_type: str,
    severity: str,
    user_id: Optional[str] = None,
    resource: Optional[str] = None,
    action: Optional[str] = None,
    result: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None,
) -> SecurityEvent:
    """Log a security event to the database."""
    event_id = str(uuid.uuid4())

    event = SecurityEvent(
        id=event_id,
        user_id=user_id,
        event_type=event_type,
        severity=severity,
        resource=resource,
        action=action,
        result=result,
        ip_address=ip_address,
        user_agent=user_agent,
        details=json.dumps(details) if details else None,
    )

    db.add(event)
    db.commit()
    return event


def get_recent_security_events(db: Session, limit: int = 100) -> list:
    """Get recent security events."""
    return db.query(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(limit).all()


def get_user_security_events(db: Session, user_id: str, limit: int = 50) -> list:
    """Get security events for a specific user."""
    return (
        db.query(SecurityEvent)
        .filter(SecurityEvent.user_id == user_id)
        .order_by(SecurityEvent.created_at.desc())
        .limit(limit)
        .all()
    )
