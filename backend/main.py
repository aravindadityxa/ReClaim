from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import logging

from database import get_db, init_db, SessionLocal
from models import RevenueOpportunity, OpportunityStatus, OpportunityType, RiskLevel, Recoverability, User, UserRole
from business_logic import RevenueAnalytics
from recovery_engine import RecoveryRecommendationEngine
from schemas import (
    DashboardSummary, DashboardTrend, RevenueOpportunityResponse,
    RevenueOpportunityDetail, RiskBreakdown, RevenueTrendPoint,
    RiskSummary, RecoveryRecommendationSchema, RecoveryActionComparisonSchema,
    LoginRequest, TokenResponse, UserResponse, CurrentUserResponse,
    CreateUserRequest, UpdateUserRoleRequest, UserListResponse, SecurityEventResponse
)
from recovery_models import (
    RecoveryPortfolioMetrics, RecoveryOpportunitySummary, RecoveryDashboardMetrics
)
from config import FRONTEND_URL, BACKEND_PORT
from auth_service import (
    authenticate_user, create_user, verify_token, get_user_by_id,
    get_user_permissions, has_permission, log_security_event, create_access_token,
    get_user_by_username
)

logger = logging.getLogger(__name__)

app = FastAPI(title="ReClaim Revenue Command Center")

# Thread pool for parallelizing independent database queries
_query_executor = ThreadPoolExecutor(max_workers=4)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def clear_analytics_cache(request: Request, call_next):
    """Cache management middleware - PRESERVE caches across requests."""
    try:
        response = await call_next(request)
    finally:
        # DO NOT clear cached analytics instances - they are expensive to reinitialize
        # The feature cache is already invalidated when db session changes
        # This preserves process-level model initialization and prevents retraining
        pass
    return response


# ============================================================================
# Analytics Dependency Injection
# ============================================================================

def get_risk_analytics(db: Session = Depends(get_db)):
    """Get RiskAnalytics instance for this request.
    
    Creates a fresh instance for each request to ensure:
    - Each request has its own isolated database session
    - No concurrent session sharing between requests
    - Proper session lifecycle management
    
    Note: ML model loading is handled by RiskAnalytics._ensure_model_trained()
    which caches the trained model, not the database session.
    """
    from risk_analytics import RiskAnalytics
    return RiskAnalytics(db)


def get_recovery_analytics(db: Session = Depends(get_db)):
    """Get RecoveryAnalytics instance for this request.
    
    Creates a fresh instance for each request to ensure:
    - Each request has its own isolated database session
    - No concurrent session sharing between requests
    - Proper session lifecycle management
    """
    from recovery_analytics import RecoveryAnalytics
    return RecoveryAnalytics(db)


# ============================================================================
# Authentication & Authorization Helpers
# ============================================================================

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency that extracts and validates the JWT token from request headers.
    Returns the current authenticated user or raises 401.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]  # Remove "Bearer " prefix
    token_payload = verify_token(token)

    if not token_payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(db, token_payload.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def require_permission(permission: str):
    """
    Dependency factory that checks if the current user has a specific permission.
    Usage: @app.get("/some-endpoint", dependencies=[Depends(require_permission("resource.action"))])
    """
    async def check_permission(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return check_permission


@app.on_event("startup")
def startup():
    """Initialize database on startup and create default users/roles."""
    init_db()
    
    # Create default admin user if it doesn't exist
    db = SessionLocal()
    try:
        admin = get_user_by_username(db, "admin")
        if not admin:
            create_user(
                db,
                username="admin",
                email="admin@reclaim.local",
                password="Admin@123456",  # Demo credential - change immediately in production
                full_name="System Administrator",
                role=UserRole.ADMIN,
            )
    except Exception as e:
        logger.error(f"Error creating default admin user: {e}")
    finally:
        db.close()


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint. Returns JWT token on successful authentication.
    POST /api/auth/login with { "username": "...", "password": "..." }
    """
    user = authenticate_user(db, request.username, request.password)

    if not user:
        # Log failed login attempt
        log_security_event(
            db,
            event_type="LOGIN_FAILURE",
            severity="WARNING",
            action="login",
            result="DENIED",
            details={"username": request.username},
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_security_event(
        db,
        event_type="LOGIN_SUCCESS",
        severity="INFO",
        user_id=user.id,
        resource="authentication",
        action="login",
        result="ALLOWED",
    )

    token = create_access_token(user)
    permissions = get_user_permissions(user)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role.value,
    )


@app.post("/api/auth/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout endpoint. Logs the user out (client removes token).
    """
    log_security_event(
        db,
        event_type="LOGOUT",
        severity="INFO",
        user_id=current_user.id,
        resource="authentication",
        action="logout",
        result="ALLOWED",
    )
    return {"detail": "Logged out successfully"}


@app.get("/api/auth/me", response_model=CurrentUserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information and permissions.
    Requires valid JWT token.
    """
    permissions = list(get_user_permissions(current_user))
    return CurrentUserResponse(
        user_id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value,
        permissions=permissions,
        is_active=bool(current_user.is_active),
    )


# ============================================================================
# User Management Endpoints (Admin only)
# ============================================================================

@app.get("/api/users", response_model=UserListResponse, dependencies=[Depends(require_permission("users.read"))])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    List all users. Requires users.read permission (Admin only).
    """
    users = db.query(User).all()
    user_responses = [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            is_active=bool(u.is_active),
            created_at=u.created_at,
            last_login=u.last_login,
        )
        for u in users
    ]

    log_security_event(
        db,
        event_type="USER_LIST_ACCESSED",
        severity="INFO",
        user_id=current_user.id,
        resource="users",
        action="read",
        result="ALLOWED",
    )

    return UserListResponse(users=user_responses, total=len(users))


@app.post("/api/users", response_model=UserResponse, dependencies=[Depends(require_permission("users.manage"))])
def create_new_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new user. Requires users.manage permission (Admin only).
    """
    # Validate role
    try:
        role = UserRole[request.role.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {request.role}")

    # Check if user already exists
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        log_security_event(
            db,
            event_type="USER_CREATE_FAILED",
            severity="WARNING",
            user_id=current_user.id,
            resource="users",
            action="create",
            result="DENIED",
            details={"reason": "user already exists", "username": request.username},
        )
        raise HTTPException(status_code=400, detail="Username already exists")

    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        log_security_event(
            db,
            event_type="USER_CREATE_FAILED",
            severity="WARNING",
            user_id=current_user.id,
            resource="users",
            action="create",
            result="DENIED",
            details={"reason": "email already exists", "email": request.email},
        )
        raise HTTPException(status_code=400, detail="Email already exists")

    try:
        new_user = create_user(
            db,
            username=request.username,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            role=role,
            created_by_user_id=current_user.id,
        )

        log_security_event(
            db,
            event_type="USER_CREATED",
            severity="INFO",
            user_id=current_user.id,
            resource="users",
            action="create",
            result="ALLOWED",
            details={"created_user_id": new_user.id, "username": new_user.username, "role": role.value},
        )

        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            full_name=new_user.full_name,
            role=new_user.role.value,
            is_active=bool(new_user.is_active),
            created_at=new_user.created_at,
            last_login=new_user.last_login,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/users/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_permission("users.role_change"))])
def change_user_role(
    user_id: str,
    request: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change a user's role. Requires users.role_change permission (Admin only).
    Prevents removing the last Admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate new role
    try:
        new_role = UserRole[request.role.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {request.role}")

    # Prevent removing the last admin
    if user.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == 1).count()
        if admin_count <= 1:
            log_security_event(
                db,
                event_type="USER_ROLE_CHANGE_FAILED",
                severity="WARNING",
                user_id=current_user.id,
                resource="users",
                action="role_change",
                result="DENIED",
                details={"reason": "cannot remove last admin", "target_user_id": user_id},
            )
            raise HTTPException(status_code=400, detail="Cannot remove the last administrator")

    old_role = user.role.value
    user.role = new_role
    db.commit()
    db.refresh(user)

    log_security_event(
        db,
        event_type="USER_ROLE_CHANGED",
        severity="INFO",
        user_id=current_user.id,
        resource="users",
        action="role_change",
        result="ALLOWED",
        details={"target_user_id": user_id, "old_role": old_role, "new_role": new_role},
    )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=bool(user.is_active),
        created_at=user.created_at,
        last_login=user.last_login,
    )


@app.post("/api/users/{user_id}/deactivate", response_model=UserResponse, dependencies=[Depends(require_permission("users.deactivate"))])
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate a user account. Requires users.deactivate permission (Admin only).
    Prevents deactivating the last Admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deactivating the last admin
    if user.role == UserRole.ADMIN and user.is_active:
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == 1).count()
        if admin_count <= 1:
            log_security_event(
                db,
                event_type="USER_DEACTIVATE_FAILED",
                severity="WARNING",
                user_id=current_user.id,
                resource="users",
                action="deactivate",
                result="DENIED",
                details={"reason": "cannot deactivate last admin", "target_user_id": user_id},
            )
            raise HTTPException(status_code=400, detail="Cannot deactivate the last administrator")

    user.is_active = 0
    db.commit()
    db.refresh(user)

    log_security_event(
        db,
        event_type="USER_DEACTIVATED",
        severity="INFO",
        user_id=current_user.id,
        resource="users",
        action="deactivate",
        result="ALLOWED",
        details={"target_user_id": user_id},
    )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=bool(user.is_active),
        created_at=user.created_at,
        last_login=user.last_login,
    )


@app.post("/api/users/{user_id}/activate", response_model=UserResponse, dependencies=[Depends(require_permission("users.deactivate"))])
def activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reactivate a user account. Requires users.deactivate permission (Admin only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = 1
    db.commit()
    db.refresh(user)

    log_security_event(
        db,
        event_type="USER_ACTIVATED",
        severity="INFO",
        user_id=current_user.id,
        resource="users",
        action="activate",
        result="ALLOWED",
        details={"target_user_id": user_id},
    )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=bool(user.is_active),
        created_at=user.created_at,
        last_login=user.last_login,
    )


@app.get("/api/dashboard/revenue-summary", response_model=DashboardSummary)
def get_revenue_summary(db: Session = Depends(get_db)):
    """Get dashboard revenue summary metrics. Queries run in parallel."""
    try:
        # Run independent queries in parallel with independent sessions
        def get_total_revenue_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_total_revenue(db_task)
            finally:
                db_task.close()
        
        def get_revenue_at_risk_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_revenue_at_risk(db_task)
            finally:
                db_task.close()
        
        def get_estimated_recoverable_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_estimated_recoverable(db_task)
            finally:
                db_task.close()
        
        def get_recovered_revenue_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_recovered_revenue(db_task)
            finally:
                db_task.close()
        
        def get_opportunity_count_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_opportunity_count(db_task)
            finally:
                db_task.close()
        
        def get_revenue_health_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_revenue_health(db_task)
            finally:
                db_task.close()
        
        def get_payment_success_rate_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_payment_success_rate(db_task)
            finally:
                db_task.close()
        
        futures = {
            'total': _query_executor.submit(get_total_revenue_task),
            'at_risk': _query_executor.submit(get_revenue_at_risk_task),
            'recoverable': _query_executor.submit(get_estimated_recoverable_task),
            'recovered': _query_executor.submit(get_recovered_revenue_task),
            'counts': _query_executor.submit(get_opportunity_count_task),
            'health': _query_executor.submit(get_revenue_health_task),
            'success_rate': _query_executor.submit(get_payment_success_rate_task),
        }
        
        # Collect results
        results = {key: future.result() for key, future in futures.items()}
        
        return DashboardSummary(
            total_revenue=results['total'],
            revenue_at_risk=results['at_risk'],
            estimated_recoverable=results['recoverable'],
            recovered_revenue=results['recovered'],
            opportunity_count=results['counts'],
            health=results['health'],
            payment_success_rate=results['success_rate']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/revenue-trend", response_model=DashboardTrend)
def get_revenue_trend(days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    """Get revenue trend for dashboard. Queries run in parallel."""
    try:
        # Run independent queries in parallel with independent sessions
        def get_revenue_trend_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_revenue_trend(db_task, days)
            finally:
                db_task.close()
        
        def get_risk_breakdown_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_risk_breakdown(db_task)
            finally:
                db_task.close()
        
        def get_risk_trend_task():
            db_task = SessionLocal()
            try:
                return RevenueAnalytics.get_risk_trend(db_task, days)
            finally:
                db_task.close()
        
        futures = {
            'trend': _query_executor.submit(get_revenue_trend_task),
            'risk_breakdown': _query_executor.submit(get_risk_breakdown_task),
            'risk_trend': _query_executor.submit(get_risk_trend_task),
        }
        
        # Collect results
        trend = futures['trend'].result()
        risk_breakdown = futures['risk_breakdown'].result()
        risk_trend = futures['risk_trend'].result()
        
        trend_points = [RevenueTrendPoint(**point) for point in trend]
        
        return DashboardTrend(
            trend=trend_points,
            risk_breakdown=RiskBreakdown(**risk_breakdown),
            risk_trend=risk_trend
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/revenue-opportunities", response_model=list[RevenueOpportunityResponse])
def get_revenue_opportunities(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    opp_type: Optional[str] = Query(None),
    recoverability: Optional[str] = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|amount|risk_level)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Get revenue opportunities with filtering and sorting."""
    try:
        query = db.query(RevenueOpportunity)
        
        # Apply filters
        if status:
            query = query.filter(RevenueOpportunity.status == status)
        if risk_level:
            query = query.filter(RevenueOpportunity.risk_level == risk_level)
        if opp_type:
            query = query.filter(RevenueOpportunity.type == opp_type)
        if recoverability:
            query = query.filter(RevenueOpportunity.recoverability == recoverability)
        
        # Apply sorting
        sort_column = getattr(RevenueOpportunity, sort_by)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        opportunities = query.all()
        return opportunities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/revenue-opportunities/{opportunity_id}", response_model=RevenueOpportunityDetail)
def get_opportunity_detail(opportunity_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific revenue opportunity."""
    try:
        from sqlalchemy.orm import joinedload
        opp = db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.transaction),
            joinedload(RevenueOpportunity.customer)
        ).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return opp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/revenue-activity")
def get_revenue_activity(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get recent revenue activity timeline."""
    try:
        # Get recent opportunities ordered by creation
        opportunities = db.query(RevenueOpportunity).order_by(
            RevenueOpportunity.created_at.desc()
        ).limit(limit).all()
        
        events = []
        for opp in opportunities:
            events.append({
                "id": opp.id,
                "type": "opportunity_created",
                "opportunity_id": opp.id,
                "customer_id": opp.customer_id,
                "amount": opp.amount,
                "opportunity_type": opp.type.value,
                "status": opp.status.value,
                "timestamp": opp.created_at.isoformat(),
                "description": f"{opp.type.value}: ₹{opp.amount} - {opp.status.value}"
            })
            
            if opp.recovered_at:
                events.append({
                    "id": f"{opp.id}_recovered",
                    "type": "opportunity_recovered",
                    "opportunity_id": opp.id,
                    "customer_id": opp.customer_id,
                    "amount": opp.amount,
                    "timestamp": opp.recovered_at.isoformat(),
                    "description": f"Recovered: ₹{opp.amount}"
                })
        
        # Sort by timestamp
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return events[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Risk Intelligence APIs

@app.get("/api/risk/summary", response_model=RiskSummary)
def get_risk_summary(risk_analytics = Depends(get_risk_analytics)):
    """Get aggregated risk intelligence summary."""
    try:
        summary = risk_analytics.get_risk_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/queue")
def get_risk_queue(limit: int = Query(20, ge=1, le=100), risk_analytics = Depends(get_risk_analytics)):
    """Get prioritized revenue risk queue."""
    try:
        queue = risk_analytics.get_risk_queue(limit)
        return queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/drivers")
def get_risk_drivers(risk_analytics = Depends(get_risk_analytics)):
    """Get risk breakdown by driver."""
    try:
        drivers = risk_analytics.get_risk_drivers_breakdown()
        return drivers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/cohort")
def get_cohort_risk(
    dimension: str = Query("payment_method", pattern="^(payment_method|failure_reason|opportunity_type)$"),
    risk_analytics = Depends(get_risk_analytics)
):
    """Get risk breakdown by cohort."""
    try:
        cohorts = risk_analytics.get_cohort_risk(dimension)
        return cohorts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/trend")
def get_risk_trend(days: int = Query(30, ge=7, le=365), risk_analytics = Depends(get_risk_analytics)):
    """Get risk trend over time."""
    try:
        trend = risk_analytics.get_risk_trend(days)
        return trend
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/spike")
def detect_risk_spike(days: int = Query(7, ge=1, le=30), risk_analytics = Depends(get_risk_analytics)):
    """Detect revenue risk spikes."""
    try:
        spike = risk_analytics.detect_risk_spikes(days)
        return spike
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/opportunities/{opportunity_id}")
def get_opportunity_risk(opportunity_id: str, risk_analytics = Depends(get_risk_analytics)):
    """Get risk analysis for a specific opportunity."""
    try:
        risk = risk_analytics.compute_opportunity_risk(opportunity_id)
        
        if not risk:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return risk
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/model-performance")
def get_model_performance(risk_analytics = Depends(get_risk_analytics)):
    """Get risk model performance metrics."""
    try:
        model = risk_analytics.risk_model
        
        if not model.metadata:
            return {
                "model_type": "LogisticRegression",
                "model_status": "not_trained",
                "training_timestamp": None,
                "train_size": 0,
                "test_size": 0,
                "precision": 0,
                "recall": 0,
                "f1": 0,
                "roc_auc": 0,
                "confusion_matrix": [],
                "dataset_info": {},
            }
        
        return model.metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Recovery Intelligence APIs

@app.get("/api/recovery/recommendation/{opportunity_id}", response_model=RecoveryRecommendationSchema)
def get_recovery_recommendation(opportunity_id: str, db: Session = Depends(get_db)):
    """Get recovery recommendation for an opportunity."""
    try:
        from risk_analytics import RiskAnalytics
        from recovery_engine import RecoveryRecommendationEngine
        from sqlalchemy.orm import joinedload
        
        # Get opportunity with eager loading
        opp = db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.customer),
            joinedload(RevenueOpportunity.transaction)
        ).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get risk intelligence
        risk_analytics = RiskAnalytics(db)
        risk_info = risk_analytics.compute_opportunity_risk(opportunity_id)
        
        # Get customer history
        customer = opp.customer
        customer_opps = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.customer_id == customer.id
        ).all()
        
        recovered_count = len([o for o in customer_opps if o.status == OpportunityStatus.RECOVERED])
        customer_history = {
            "recovery_rate": recovered_count / len(customer_opps) if customer_opps else 0.5,
            "total_value": sum(o.amount for o in customer_opps) if customer_opps else 0,
        }
        
        # Generate recovery recommendation
        engine = RecoveryRecommendationEngine(db)
        recommendation = engine.get_recommendation(opp, risk_info, customer_history)
        
        return recommendation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/actions/{opportunity_id}", response_model=RecoveryActionComparisonSchema)
def get_recovery_action_comparison(opportunity_id: str, db: Session = Depends(get_db)):
    """Get comparison of all eligible recovery actions for an opportunity."""
    try:
        from risk_analytics import RiskAnalytics
        from recovery_engine import RecoveryRecommendationEngine
        from sqlalchemy.orm import joinedload
        
        # Get opportunity with eager loading
        opp = db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.customer),
            joinedload(RevenueOpportunity.transaction)
        ).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get risk intelligence
        risk_analytics = RiskAnalytics(db)
        risk_info = risk_analytics.compute_opportunity_risk(opportunity_id)
        
        # Get customer history
        customer = opp.customer
        customer_opps = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.customer_id == customer.id
        ).all()
        
        recovered_count = len([o for o in customer_opps if o.status == OpportunityStatus.RECOVERED])
        customer_history = {
            "recovery_rate": recovered_count / len(customer_opps) if customer_opps else 0.5,
            "total_value": sum(o.amount for o in customer_opps) if customer_opps else 0,
        }
        
        # Get action comparison
        engine = RecoveryRecommendationEngine(db)
        comparison = engine.get_action_comparison(opp, risk_info, customer_history)
        
        return comparison
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/portfolio", response_model=RecoveryPortfolioMetrics)
def get_recovery_portfolio_metrics(recovery_analytics = Depends(get_recovery_analytics)):
    """Get aggregated recovery metrics for merchant portfolio."""
    try:
        metrics = recovery_analytics.get_portfolio_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/dashboard", response_model=RecoveryDashboardMetrics)
def get_recovery_dashboard_metrics(db: Session = Depends(get_db)):
    """Get comprehensive recovery dashboard metrics."""
    try:
        from recovery_analytics import RecoveryAnalytics as RecoveryAnalyticsEngine
        
        analytics = RecoveryAnalyticsEngine(db)
        metrics = analytics.get_dashboard_metrics()
        
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/queue", response_model=list[RecoveryOpportunitySummary])
def get_recovery_queue(limit: int = Query(20, ge=1, le=100), recovery_analytics = Depends(get_recovery_analytics)):
    """Get top recovery opportunities ranked by expected value."""
    try:
        queue = recovery_analytics.get_recovery_queue(limit)
        return queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AI Explanation Layer (Ollama LLM)
# ============================================================================

@app.get("/api/recovery/explanation/{opportunity_id}")
def get_recovery_explanation(opportunity_id: str, db: Session = Depends(get_db)):
    """
    Get AI-generated explanation for recovery recommendation.
    
    This is an EXPLANATION layer ONLY.
    The actual recommendation comes from deterministic engines.
    The LLM explains why the recommendation was made, not what it should be.
    Gracefully handles Ollama unavailability - returns 200 OK with ai_available=false.
    """
    from ollama_service import get_ollama_service
    from risk_analytics import RiskAnalytics
    
    try:
        # Get opportunity with eager loading
        from sqlalchemy.orm import joinedload
        opportunity = db.query(RevenueOpportunity).options(
            joinedload(RevenueOpportunity.customer),
            joinedload(RevenueOpportunity.transaction)
        ).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get risk info
        risk_analytics = RiskAnalytics(db)
        risk_info = risk_analytics.compute_opportunity_risk(opportunity_id)
        
        # Get customer history for recovery recommendation
        recovery_analytics = get_recovery_analytics(db)
        queue = recovery_analytics.get_recovery_queue(limit=100)
        opp_data = next((o for o in queue if o["opportunity_id"] == opportunity_id), None)
        
        if not opp_data:
            # Build recommendation manually if not in queue
            customer_id = opportunity.customer_id
            customer_opps = db.query(RevenueOpportunity).filter(
                RevenueOpportunity.customer_id == customer_id
            ).all()
            recovered_count = len([o for o in customer_opps if o.status == OpportunityStatus.RECOVERED])
            customer_history = {
                "recovery_rate": recovered_count / len(customer_opps) if customer_opps else 0.5,
                "total_value": sum(o.amount for o in customer_opps) if customer_opps else 0,
            }
            
            recovery_engine = RecoveryRecommendationEngine(db)
            rec = recovery_engine.get_recommendation(opportunity, risk_info, customer_history)
            opp_data = {
                "opportunity_id": opportunity_id,
                "amount": opportunity.amount,
                "recommended_action": rec.recommended_action,
                "expected_recovery": rec.expected_recovered_amount,
                "recovery_probability": rec.recovery_probability,
                "expected_net_value": rec.expected_net_value,
                "customer_friction": rec.customer_friction_score,
            }
        
        # Prepare context for LLM (deterministic data only)
        context = {
            "opportunity_id": opportunity_id,
            "revenue_amount": opportunity.amount,
            "recommended_action": opp_data.get("recommended_action", "UNKNOWN"),
            "recovery_probability": opp_data.get("recovery_probability", 0),
            "expected_net_value": opp_data.get("expected_net_value", 0),
            "recoverability_score": opp_data.get("expected_recovery", 0),
            "risk_level": risk_info.get("risk_level", "UNKNOWN"),
            "customer_friction_score": opp_data.get("customer_friction", 0),
            "failure_reason": opportunity.failure_reason or "Unknown"
        }
        
        # Generate explanation using Ollama (graceful fallback if unavailable)
        ollama_service = get_ollama_service()
        response = ollama_service.generate_recovery_explanation(context)
        
        # Always return 200 OK, include ai_available flag
        return {
            "opportunity_id": opportunity_id,
            "ai_explanation": response.text if response.success else None,
            "ai_available": response.success,
            "error": response.error if not response.success else None,
            "model": response.model,
            "latency_ms": response.latency_ms
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recovery explanation: {e}")
        # Return 200 with ai_available=false instead of 500
        return {
            "opportunity_id": opportunity_id,
            "ai_explanation": None,
            "ai_available": False,
            "error": str(e),
            "model": None,
            "latency_ms": None
        }


@app.get("/api/risk/explanation/{opportunity_id}")
def get_risk_explanation(opportunity_id: str, db: Session = Depends(get_db)):
    """
    Get AI-generated explanation for risk assessment.
    
    This is an EXPLANATION layer ONLY.
    The actual risk score comes from the ML model.
    The LLM explains why the risk level was assigned, not what it should be.
    Gracefully handles Ollama unavailability - returns 200 OK with ai_available=false.
    """
    from ollama_service import get_ollama_service
    from risk_analytics import RiskAnalytics
    
    try:
        # Get opportunity
        opportunity = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get risk assessment
        risk_analytics = RiskAnalytics(db)
        risk_info = risk_analytics.calculate_risk_for_opportunity(opportunity)
        
        # Prepare context for LLM (deterministic data only)
        context = {
            "opportunity_id": opportunity_id,
            "revenue_amount": opportunity.amount,
            "risk_score": risk_info.get("risk_score", 0),
            "risk_level": risk_info.get("risk_level", "UNKNOWN"),
            "risk_drivers": risk_info.get("risk_drivers", []),
            "failure_reason": opportunity.failure_reason or "Unknown"
        }
        
        # Generate explanation using Ollama (graceful fallback if unavailable)
        ollama_service = get_ollama_service()
        response = ollama_service.generate_risk_explanation(context)
        
        # Always return 200 OK, include ai_available flag
        return {
            "opportunity_id": opportunity_id,
            "ai_explanation": response.text if response.success else None,
            "ai_available": response.success,
            "error": response.error if not response.success else None,
            "model": response.model,
            "latency_ms": response.latency_ms
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting risk explanation: {e}")
        # Return 200 with ai_available=false instead of 500
        return {
            "opportunity_id": opportunity_id,
            "ai_explanation": None,
            "ai_available": False,
            "error": str(e),
            "model": None,
            "latency_ms": None
        }


@app.get("/api/system/ollama-status")
def get_ollama_status():
    """
    Get Ollama service health status.
    Used by System Health page to display LLM availability.
    """
    from ollama_service import get_ollama_service
    
    try:
        ollama_service = get_ollama_service()
        status = ollama_service.get_health_status()
        return status
    except Exception as e:
        return {
            "enabled": False,
            "connected": False,
            "reason": str(e)
        }

# Recovery Engine Endpoints

@app.post("/api/recovery/workflows/{opportunity_id}")
def create_recovery_workflow(
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Create a new recovery workflow for an opportunity."""
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        
        orchestrator = RecoveryOrchestrator(db)
        workflow, error = orchestrator.create_workflow(opportunity_id)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "workflow_id": workflow.opportunity_id,
            "state": workflow.current_state.value,
            "created_at": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recovery/workflows/{opportunity_id}/plan")
def plan_recovery_workflow(
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Create recovery plan for workflow."""
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        from audit_service import AuditTrail
        
        orchestrator = RecoveryOrchestrator(db)
        audit = AuditTrail()
        
        workflow, error = orchestrator.plan_recovery(opportunity_id, audit=audit)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "workflow_id": workflow.opportunity_id,
            "state": workflow.current_state.value,
            "plan": workflow.plan,
            "audit_events": len(audit.get_audit_trail()),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recovery/workflows/{opportunity_id}/validate")
def validate_recovery_workflow(
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Validate and ready workflow for execution."""
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        from audit_service import AuditTrail
        
        orchestrator = RecoveryOrchestrator(db)
        audit = AuditTrail()
        
        workflow, error = orchestrator.validate_and_ready(opportunity_id, audit=audit)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "workflow_id": workflow.opportunity_id,
            "state": workflow.current_state.value,
            "ready_for_execution": workflow.current_state.value == "READY",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recovery/workflows/{opportunity_id}/execute")
def execute_recovery_action(
    opportunity_id: str,
    is_simulation: bool = Query(True, description="Simulate execution without provider call"),
    db: Session = Depends(get_db)
):
    """Execute next recovery action in workflow."""
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        from audit_service import AuditTrail
        
        orchestrator = RecoveryOrchestrator(db)
        audit = AuditTrail()
        
        workflow, error = orchestrator.execute_next_action(
            opportunity_id,
            is_simulation=is_simulation,
            audit=audit
        )
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "workflow_id": workflow.opportunity_id,
            "state": workflow.current_state.value,
            "current_action": workflow.current_action,
            "attempt_number": workflow.attempt_count,
            "last_execution": workflow.executions[-1].to_dict() if workflow.executions else None,
            "should_continue": workflow.current_state.value not in ["STOPPED", "RECOVERED"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/workflows/{opportunity_id}")
def get_recovery_workflow(
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Get recovery workflow state."""
    try:
        from recovery_orchestrator import RecoveryOrchestrator
        
        orchestrator = RecoveryOrchestrator(db)
        workflow = orchestrator.get_workflow(opportunity_id)
        
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow not found: {opportunity_id}")
        
        return workflow.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/workflows/{opportunity_id}/audit")
def get_workflow_audit_trail(
    opportunity_id: str,
    db: Session = Depends(get_db)
):
    """Get audit trail for recovery workflow."""
    try:
        from audit_service import audit_store
        
        trail = audit_store.get_trail(opportunity_id)
        
        return {
            "opportunity_id": opportunity_id,
            "event_count": len(trail),
            "events": trail,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/control-center")
def get_recovery_control_center(db: Session = Depends(get_db)):
    """Get recovery control center with active/completed workflows."""
    try:
        from models import RecoveryExecution, RecoveryAttempt
        
        # Get active workflows (not in terminal state)
        active_workflows = db.query(RecoveryExecution).filter(
            ~RecoveryExecution.current_state.in_(["STOPPED", "RECOVERED"])
        ).all()
        
        # Get completed workflows
        completed_workflows = db.query(RecoveryExecution).filter(
            RecoveryExecution.current_state.in_(["STOPPED", "RECOVERED"])
        ).all()
        
        # Get recent attempts
        recent_attempts = db.query(RecoveryAttempt).order_by(
            RecoveryAttempt.created_at.desc()
        ).limit(50).all()
        
        return {
            "active_workflows": len(active_workflows),
            "completed_workflows": len(completed_workflows),
            "recent_attempts_count": len(recent_attempts),
            "total_attempts": db.query(RecoveryAttempt).count(),
            "active_summary": [
                {
                    "opportunity_id": w.opportunity_id,
                    "state": w.current_state.value if hasattr(w.current_state, 'value') else str(w.current_state),
                    "current_action": w.current_action,
                    "attempt_count": w.attempt_count,
                    "started_at": w.started_at.isoformat() if w.started_at else None,
                }
                for w in active_workflows
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Governance & Safety

@app.get("/api/governance/policies")
def get_policies():
    """Get current governance policies."""
    try:
        from governance_service import governance_engine
        return {
            "policies": governance_engine.policy_set.to_dict(),
            "is_paused": governance_engine.is_paused,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/governance/policies/{policy_type}")
def update_policy(policy_type: str, update: dict):
    """Update a governance policy."""
    try:
        from governance_service import governance_engine
        from policy_rules import PolicyType
        
        # Validate policy type
        try:
            p_type = PolicyType(policy_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown policy: {policy_type}")
        
        # Update
        success, error = governance_engine.policy_set.update_policy(p_type, update.get("value"))
        if not success:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "success": True,
            "policy": governance_engine.policy_set.get_policy(p_type).to_dict(),
            "message": f"Policy {policy_type} updated successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/governance/evaluate")
def evaluate_governance(evaluation_request: dict):
    """Evaluate if an action is allowed."""
    try:
        from governance_service import governance_engine
        
        evaluation = governance_engine.evaluate(
            action_type=evaluation_request.get("action_type", ""),
            amount=float(evaluation_request.get("amount", 0)),
            expected_value=float(evaluation_request.get("expected_value", 0)),
            recovery_probability=float(evaluation_request.get("recovery_probability", 0)),
            friction_score=float(evaluation_request.get("friction_score", 50)),
            customer_id=evaluation_request.get("customer_id", ""),
            attempt_count=int(evaluation_request.get("attempt_count", 0)),
            customer_contact_count=int(evaluation_request.get("customer_contact_count", 0)),
            daily_actions_for_customer=int(evaluation_request.get("daily_actions_for_customer", 0)),
            weekly_actions_for_customer=int(evaluation_request.get("weekly_actions_for_customer", 0)),
        )
        
        return evaluation.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/governance/approvals")
def get_approvals(status: Optional[str] = None):
    """Get approval requests."""
    try:
        from approval_service import approval_queue
        
        summary = approval_queue.get_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/governance/approvals/{request_id}")
def get_approval(request_id: str):
    """Get a specific approval request."""
    try:
        from approval_service import approval_queue
        
        request = approval_queue.get_request(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        return request.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/governance/approvals/{request_id}/approve")
def approve_request(request_id: str, reviewer_note: Optional[str] = None):
    """Approve an approval request."""
    try:
        from approval_service import approval_queue
        
        success, error = approval_queue.approve(request_id, reviewer_note)
        if not success:
            raise HTTPException(status_code=400, detail=error)
        
        request = approval_queue.get_request(request_id)
        return {
            "success": True,
            "approval": request.to_dict(),
            "message": "Approval granted",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/governance/approvals/{request_id}/reject")
def reject_request(request_id: str, reviewer_note: Optional[str] = None):
    """Reject an approval request."""
    try:
        from approval_service import approval_queue
        
        success, error = approval_queue.reject(request_id, reviewer_note)
        if not success:
            raise HTTPException(status_code=400, detail=error)
        
        request = approval_queue.get_request(request_id)
        return {
            "success": True,
            "approval": request.to_dict(),
            "message": "Approval rejected",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/governance/pause")
def pause_recovery(reason: Optional[str] = None):
    """Pause all recovery execution."""
    try:
        from governance_service import governance_engine
        governance_engine.pause()
        return {
            "success": True,
            "is_paused": True,
            "reason": reason,
            "message": "Recovery execution paused",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/governance/resume")
def resume_recovery():
    """Resume recovery execution."""
    try:
        from governance_service import governance_engine
        governance_engine.resume()
        return {
            "success": True,
            "is_paused": False,
            "message": "Recovery execution resumed - pending workflows will be re-evaluated",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/governance/dashboard")
def get_governance_dashboard(db: Session = Depends(get_db)):
    """Get governance dashboard summary."""
    try:
        from governance_service import governance_engine
        from approval_service import approval_queue
        from models import RecoveryAttempt
        from datetime import datetime, timedelta
        
        # Count actions by type
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_attempts = db.query(RecoveryAttempt).filter(
            RecoveryAttempt.created_at >= today_start,
            RecoveryAttempt.created_at <= today_end,
        ).all()
        
        return {
            "is_paused": governance_engine.is_paused,
            "autonomous_actions_today": len(today_attempts),
            "pending_approvals": approval_queue.get_summary()["pending_count"],
            "total_policies": len(governance_engine.policy_set.policies),
            "active_policies": sum(1 for p in governance_engine.policy_set.policies.values() if p.enabled),
            "approval_summary": approval_queue.get_summary(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Recovery Measurement & Analytics

@app.get("/api/analytics/recovery/funnel")
def get_recovery_funnel(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Get recovery funnel metrics."""
    try:
        from recovery_measurement import RecoveryMeasurement
        measurement = RecoveryMeasurement(db)
        return measurement.get_recovery_funnel(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/recovery/strategies")
def get_strategy_performance(strategy: Optional[str] = None, db: Session = Depends(get_db)):
    """Get recovery strategy performance metrics."""
    try:
        from recovery_measurement import RecoveryMeasurement
        measurement = RecoveryMeasurement(db)
        if strategy:
            return [measurement.get_strategy_performance(strategy)]
        else:
            # Get all strategies
            from recovery_strategies import RecoveryActionType
            results = []
            for action in RecoveryActionType:
                results.append(measurement.get_strategy_performance(action.value))
            return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/recovery/cohorts")
def get_cohort_analysis(
    cohort_type: str = Query(..., description="payment_method|failure_reason|opportunity_type|customer_segment|risk_level"),
    db: Session = Depends(get_db)
):
    """Get recovery performance by cohort."""
    try:
        from recovery_measurement import RecoveryMeasurement
        from models import RecoveryOutcome
        
        measurement = RecoveryMeasurement(db)
        
        # Get unique cohort values
        field_map = {
            "payment_method": RecoveryOutcome.payment_method,
            "failure_reason": RecoveryOutcome.failure_reason,
            "opportunity_type": RecoveryOutcome.opportunity_type,
            "customer_segment": RecoveryOutcome.customer_segment,
            "risk_level": RecoveryOutcome.risk_level,
        }
        
        field = field_map.get(cohort_type)
        if not field:
            raise HTTPException(status_code=400, detail=f"Unknown cohort type: {cohort_type}")
        
        values = db.query(field).distinct().filter(field != None).all()
        
        results = []
        for (value,) in values:
            results.append(measurement.get_cohort_performance(cohort_type, value))
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/recovery/incremental")
def get_incremental_revenue(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    """Get incremental revenue attribution."""
    try:
        from recovery_measurement import RecoveryMeasurement
        measurement = RecoveryMeasurement(db)
        return measurement.get_incremental_revenue_summary(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/recovery/recommendations")
def get_strategy_recommendations(
    opportunity_type: str = Query(...),
    db: Session = Depends(get_db)
):
    """Get recommended strategies based on historical performance."""
    try:
        from recovery_measurement import RecoveryMeasurement
        measurement = RecoveryMeasurement(db)
        return measurement.get_strategy_recommendations(opportunity_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Production Reliability & Observability Endpoints

@app.get("/api/system/health")
def get_system_health(db: Session = Depends(get_db)):
    """Get comprehensive system health status."""
    try:
        from health_service import get_health_checker
        
        # Get fresh health checker instance for this request
        checker = get_health_checker(db)
        return checker.perform_full_check()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system/metrics")
def get_system_metrics(db: Session = Depends(get_db)):
    """Get operational metrics."""
    try:
        from metrics_service import OperationalMetrics
        metrics = OperationalMetrics(db)
        return metrics.get_all_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system/errors")
def get_system_errors(
    limit: int = Query(50, ge=1, le=500),
    severity: Optional[str] = None,
    component: Optional[str] = None,
    workflow_id: Optional[str] = None,
    unresolved_only: bool = False,
):
    """Get tracked system errors."""
    try:
        from error_tracker import error_tracker, ErrorSeverity
        
        if unresolved_only:
            errors = error_tracker.get_unresolved_errors(limit)
        elif severity:
            try:
                sev = ErrorSeverity[severity.upper()]
                errors = error_tracker.get_errors_by_severity(sev, limit)
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
        elif component:
            errors = error_tracker.get_errors_by_component(component, limit)
        elif workflow_id:
            errors = error_tracker.get_errors_for_workflow(workflow_id)
        else:
            errors = error_tracker.get_recent_errors(limit)
        
        return {
            "errors": errors,
            "count": len(errors),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    """Get quick system status."""
    try:
        from health_service import get_health_checker
        from error_tracker import error_tracker
        
        # Get fresh health checker instance for this request
        health = get_health_checker(db).perform_full_check()
        errors = error_tracker.get_summary()
        
        return {
            "system_health": health["status"],
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "services_healthy": health["summary"]["healthy"],
                "services_degraded": health["summary"]["degraded"],
                "services_unhealthy": health["summary"]["unhealthy"],
                "total_errors": errors["total_errors"],
                "unresolved_errors": errors["unresolved"],
                "critical_errors": errors["by_severity"].get("CRITICAL", 0),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)


