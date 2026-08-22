"""
Security tests for authentication, RBAC, and authorization.
Tests login, user management, permissions, and protected endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from main import app
from database import SessionLocal
from models import User, UserRole, SecurityEvent
from auth_service import (
    hash_password,
    verify_password,
    authenticate_user,
    create_user,
    get_user_permissions,
    has_permission,
)


@pytest.fixture
def db():
    """Database session for tests."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    """Test client."""
    return TestClient(app)


@pytest.fixture
def admin_token(client, db):
    """Get admin user token for tests."""
    # Create admin user
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = create_user(
            db,
            username="admin",
            email="admin@test.local",
            password="Admin@123456",
            full_name="Test Admin",
            role=UserRole.ADMIN,
        )

    # Login and get token
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123456"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def operator_token(client, db):
    """Get operator user token for tests."""
    # Create operator user
    operator = db.query(User).filter(User.username == "operator").first()
    if not operator:
        operator = create_user(
            db,
            username="operator",
            email="operator@test.local",
            password="Operator@123456",
            full_name="Test Operator",
            role=UserRole.OPERATOR,
        )

    # Login and get token
    response = client.post(
        "/api/auth/login",
        json={"username": "operator", "password": "Operator@123456"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture
def viewer_token(client, db):
    """Get viewer user token for tests."""
    # Create viewer user
    viewer = db.query(User).filter(User.username == "viewer").first()
    if not viewer:
        viewer = create_user(
            db,
            username="viewer",
            email="viewer@test.local",
            password="Viewer@123456",
            full_name="Test Viewer",
            role=UserRole.VIEWER,
        )

    # Login and get token
    response = client.post(
        "/api/auth/login",
        json={"username": "viewer", "password": "Viewer@123456"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# ============================================================================
# Authentication Tests
# ============================================================================


def test_password_hashing():
    """Test password hashing and verification."""
    password = "SecurePassword123!"
    hash_val = hash_password(password)
    
    # Hash should not be plaintext
    assert hash_val != password
    
    # Verify correct password
    assert verify_password(password, hash_val)
    
    # Verify wrong password fails
    assert not verify_password("WrongPassword", hash_val)


def test_login_success(client, db):
    """Test successful login."""
    # Create test user
    create_user(
        db,
        username="testuser",
        email="test@example.com",
        password="Test@123456",
        role=UserRole.VIEWER,
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "Test@123456"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == "testuser"
    assert data["role"] == "VIEWER"


def test_login_invalid_username(client):
    """Test login with invalid username."""
    response = client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "password"},
    )

    assert response.status_code == 401
    assert "Invalid username or password" in response.text


def test_login_invalid_password(client, db):
    """Test login with invalid password."""
    create_user(
        db,
        username="testuser",
        email="test@example.com",
        password="CorrectPassword123",
        role=UserRole.VIEWER,
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "WrongPassword"},
    )

    assert response.status_code == 401


def test_logout(client, admin_token):
    """Test logout endpoint."""
    response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200


def test_get_current_user(client, admin_token):
    """Test getting current user info."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "ADMIN"
    assert "permissions" in data
    assert len(data["permissions"]) > 0


def test_missing_authorization_header(client):
    """Test request without authorization header."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_invalid_token(client):
    """Test request with invalid token."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token_here"},
    )
    assert response.status_code == 401


# ============================================================================
# User Management Tests
# ============================================================================


def test_create_user(client, admin_token, db):
    """Test creating a new user."""
    response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "NewUser@123456",
            "full_name": "New User",
            "role": "OPERATOR",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"
    assert data["role"] == "OPERATOR"
    assert data["is_active"] is True


def test_create_user_duplicate_username(client, admin_token, db):
    """Test creating user with duplicate username."""
    create_user(
        db,
        username="duplicate",
        email="first@example.com",
        password="Password@123456",
        role=UserRole.VIEWER,
    )

    response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "duplicate",
            "email": "second@example.com",
            "password": "Password@123456",
            "role": "VIEWER",
        },
    )

    assert response.status_code == 400


def test_list_users(client, admin_token):
    """Test listing all users."""
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data
    assert len(data["users"]) > 0


def test_change_user_role(client, admin_token, db):
    """Test changing user role."""
    user = create_user(
        db,
        username="roletest",
        email="roletest@example.com",
        password="Role@123456",
        role=UserRole.VIEWER,
    )

    response = client.patch(
        f"/api/users/{user.id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "OPERATOR"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "OPERATOR"


def test_deactivate_user(client, admin_token, db):
    """Test deactivating a user."""
    user = create_user(
        db,
        username="deactivatetest",
        email="deactivate@example.com",
        password="Deactivate@123456",
        role=UserRole.VIEWER,
    )

    response = client.post(
        f"/api/users/{user.id}/deactivate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False


def test_activate_user(client, admin_token, db):
    """Test activating a deactivated user."""
    user = create_user(
        db,
        username="activatetest",
        email="activate@example.com",
        password="Activate@123456",
        role=UserRole.VIEWER,
    )
    # Deactivate first
    user.is_active = 0
    db.commit()

    response = client.post(
        f"/api/users/{user.id}/activate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is True


def test_prevent_deactivate_last_admin(client, admin_token, db):
    """Test that last admin cannot be deactivated."""
    admin = db.query(User).filter(User.username == "admin").first()

    response = client.post(
        f"/api/users/{admin.id}/deactivate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Should fail if admin is the only admin
    if db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == 1).count() == 1:
        assert response.status_code == 400


# ============================================================================
# RBAC & Permissions Tests
# ============================================================================


def test_admin_has_all_permissions(db):
    """Test that admin role has all permissions."""
    admin = create_user(
        db,
        username="admin_perms",
        email="admin_perms@example.com",
        password="AdminPerms@123456",
        role=UserRole.ADMIN,
    )

    permissions = get_user_permissions(admin)
    
    # Admin should have many permissions
    assert len(permissions) > 0
    assert "users.manage" in permissions
    assert "governance.manage" in permissions
    assert "recovery.execute" in permissions


def test_operator_permissions(db):
    """Test operator role permissions."""
    operator = create_user(
        db,
        username="operator_perms",
        email="operator_perms@example.com",
        password="OperatorPerms@123456",
        role=UserRole.OPERATOR,
    )

    permissions = get_user_permissions(operator)
    
    # Operator should have recovery and governance permissions
    assert "recovery.execute" in permissions
    assert "governance.approve" in permissions
    
    # Operator should NOT have user management
    assert "users.manage" not in permissions


def test_analyst_permissions(db):
    """Test analyst role permissions."""
    analyst = create_user(
        db,
        username="analyst_perms",
        email="analyst_perms@example.com",
        password="AnalystPerms@123456",
        role=UserRole.ANALYST,
    )

    permissions = get_user_permissions(analyst)
    
    # Analyst should have analytics and read permissions
    assert "analytics.read" in permissions
    assert "risk.read" in permissions
    
    # Analyst should NOT have execution permissions
    assert "recovery.execute" not in permissions


def test_viewer_permissions(db):
    """Test viewer role permissions."""
    viewer = create_user(
        db,
        username="viewer_perms",
        email="viewer_perms@example.com",
        password="ViewerPerms@123456",
        role=UserRole.VIEWER,
    )

    permissions = get_user_permissions(viewer)
    
    # Viewer should have limited read permissions
    assert "dashboard.read" in permissions
    assert "system.health" in permissions
    
    # Viewer should NOT have most permissions
    assert "recovery.execute" not in permissions
    assert "users.manage" not in permissions


def test_has_permission_check(db):
    """Test permission checking."""
    admin = create_user(
        db,
        username="admin_check",
        email="admin_check@example.com",
        password="AdminCheck@123456",
        role=UserRole.ADMIN,
    )
    
    viewer = create_user(
        db,
        username="viewer_check",
        email="viewer_check@example.com",
        password="ViewerCheck@123456",
        role=UserRole.VIEWER,
    )

    # Admin should have user management
    assert has_permission(admin, "users.manage")
    
    # Viewer should NOT have user management
    assert not has_permission(viewer, "users.manage")


# ============================================================================
# Authorization Tests
# ============================================================================


def test_user_list_requires_permission(client, viewer_token):
    """Test that user list requires permission."""
    # Viewer doesn't have users.read permission
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )

    # Should return 403 Forbidden
    assert response.status_code == 403


def test_user_create_requires_permission(client, operator_token):
    """Test that user creation requires permission."""
    # Operator doesn't have users.manage permission
    response = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "NewUser@123456",
            "role": "VIEWER",
        },
    )

    # Should return 403 Forbidden
    assert response.status_code == 403


# ============================================================================
# Deactivated User Tests
# ============================================================================


def test_deactivated_user_cannot_login(client, db):
    """Test that deactivated users cannot log in."""
    user = create_user(
        db,
        username="deactivated",
        email="deactivated@example.com",
        password="Deactivated@123456",
        role=UserRole.VIEWER,
    )
    
    # Deactivate user
    user.is_active = 0
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "deactivated", "password": "Deactivated@123456"},
    )

    assert response.status_code == 401


# ============================================================================
# Security Event Logging Tests
# ============================================================================


def test_login_success_logged(client, db):
    """Test that successful login is logged."""
    create_user(
        db,
        username="logtest",
        email="logtest@example.com",
        password="LogTest@123456",
        role=UserRole.VIEWER,
    )

    # Clear existing events
    db.query(SecurityEvent).delete()
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "logtest", "password": "LogTest@123456"},
    )

    assert response.status_code == 200

    # Check security event was logged
    event = db.query(SecurityEvent).filter(
        SecurityEvent.event_type == "LOGIN_SUCCESS"
    ).first()
    
    assert event is not None
    assert event.severity == "INFO"


def test_login_failure_logged(client, db):
    """Test that failed login is logged."""
    create_user(
        db,
        username="logtest2",
        email="logtest2@example.com",
        password="LogTest@123456",
        role=UserRole.VIEWER,
    )

    # Clear existing events
    db.query(SecurityEvent).delete()
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "logtest2", "password": "WrongPassword"},
    )

    assert response.status_code == 401

    # Check security event was logged
    event = db.query(SecurityEvent).filter(
        SecurityEvent.event_type == "LOGIN_FAILURE"
    ).first()
    
    assert event is not None
    assert event.severity == "WARNING"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
