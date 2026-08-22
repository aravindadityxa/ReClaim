from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db, init_db
from models import RevenueOpportunity, OpportunityStatus, OpportunityType, RiskLevel, Recoverability
from business_logic import RevenueAnalytics
from schemas import (
    DashboardSummary, DashboardTrend, RevenueOpportunityResponse,
    RevenueOpportunityDetail, RiskBreakdown, RevenueTrendPoint,
    RiskSummary, RecoveryRecommendationSchema, RecoveryActionComparisonSchema,
    RecoveryPortfolioMetricsSchema, RecoveryDashboardMetricsSchema
)
from config import FRONTEND_URL, BACKEND_PORT

app = FastAPI(title="ReClaim Revenue Command Center")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Initialize database on startup."""
    init_db()


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/dashboard/revenue-summary", response_model=DashboardSummary)
def get_revenue_summary(db: Session = Depends(get_db)):
    """Get dashboard revenue summary metrics."""
    try:
        total = RevenueAnalytics.get_total_revenue(db)
        at_risk = RevenueAnalytics.get_revenue_at_risk(db)
        recoverable = RevenueAnalytics.get_estimated_recoverable(db)
        recovered = RevenueAnalytics.get_recovered_revenue(db)
        counts = RevenueAnalytics.get_opportunity_count(db)
        health = RevenueAnalytics.get_revenue_health(db)
        success_rate = RevenueAnalytics.get_payment_success_rate(db)
        
        return DashboardSummary(
            total_revenue=total,
            revenue_at_risk=at_risk,
            estimated_recoverable=recoverable,
            recovered_revenue=recovered,
            opportunity_count=counts,
            health=health,
            payment_success_rate=success_rate
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/revenue-trend", response_model=DashboardTrend)
def get_revenue_trend(days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    """Get revenue trend for dashboard."""
    try:
        trend = RevenueAnalytics.get_revenue_trend(db, days)
        risk_breakdown = RevenueAnalytics.get_risk_breakdown(db)
        risk_trend = RevenueAnalytics.get_risk_trend(db, days)
        
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
    sort_by: str = Query("created_at", regex="^(created_at|amount|risk_level)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
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
        opp = db.query(RevenueOpportunity).filter(
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
                "description": f"{opp.type.value}: ${opp.amount} - {opp.status.value}"
            })
            
            if opp.recovered_at:
                events.append({
                    "id": f"{opp.id}_recovered",
                    "type": "opportunity_recovered",
                    "opportunity_id": opp.id,
                    "customer_id": opp.customer_id,
                    "amount": opp.amount,
                    "timestamp": opp.recovered_at.isoformat(),
                    "description": f"Recovered: ${opp.amount}"
                })
        
        # Sort by timestamp
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return events[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Phase 2: Risk Intelligence APIs

@app.get("/api/risk/summary", response_model=RiskSummary)
def get_risk_summary(db: Session = Depends(get_db)):
    """Get aggregated risk intelligence summary."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        summary = risk_analytics.get_risk_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/queue")
def get_risk_queue(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Get prioritized revenue risk queue."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        queue = risk_analytics.get_risk_queue(limit)
        return queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/drivers")
def get_risk_drivers(db: Session = Depends(get_db)):
    """Get risk breakdown by driver."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        drivers = risk_analytics.get_risk_drivers_breakdown()
        return drivers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/cohort")
def get_cohort_risk(
    dimension: str = Query("payment_method", regex="^(payment_method|failure_reason|opportunity_type)$"),
    db: Session = Depends(get_db)
):
    """Get risk breakdown by cohort."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        cohorts = risk_analytics.get_cohort_risk(dimension)
        return cohorts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/trend")
def get_risk_trend(days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    """Get risk trend over time."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        trend = risk_analytics.get_risk_trend(days)
        return trend
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/spike")
def detect_risk_spike(days: int = Query(7, ge=1, le=30), db: Session = Depends(get_db)):
    """Detect revenue risk spikes."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        spike = risk_analytics.detect_risk_spikes(days)
        return spike
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/opportunities/{opportunity_id}")
def get_opportunity_risk(opportunity_id: str, db: Session = Depends(get_db)):
    """Get risk analysis for a specific opportunity."""
    try:
        from risk_analytics import RiskAnalytics
        risk_analytics = RiskAnalytics(db)
        risk = risk_analytics.compute_opportunity_risk(opportunity_id)
        
        if not risk:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        return risk
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/risk/model-performance")
def get_model_performance(db: Session = Depends(get_db)):
    """Get risk model performance metrics."""
    try:
        from risk_analytics import RiskAnalytics
        from risk_model import RiskModel
        
        risk_analytics = RiskAnalytics(db)
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


# Phase 3: Recovery Intelligence APIs

@app.get("/api/recovery/recommendation/{opportunity_id}", response_model=RecoveryRecommendationSchema)
def get_recovery_recommendation(opportunity_id: str, db: Session = Depends(get_db)):
    """Get recovery recommendation for an opportunity."""
    try:
        from risk_analytics import RiskAnalytics
        from recovery_engine import RecoveryRecommendationEngine
        
        # Get opportunity
        opp = db.query(RevenueOpportunity).filter(
            RevenueOpportunity.id == opportunity_id
        ).first()
        
        if not opp:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Get risk intelligence from Phase 2
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
        
        # Get opportunity
        opp = db.query(RevenueOpportunity).filter(
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


@app.get("/api/recovery/portfolio", response_model=RecoveryPortfolioMetricsSchema)
def get_recovery_portfolio_metrics(db: Session = Depends(get_db)):
    """Get aggregated recovery metrics for merchant portfolio."""
    try:
        from recovery_analytics import RecoveryAnalytics as RecoveryAnalyticsEngine
        
        analytics = RecoveryAnalyticsEngine(db)
        metrics = analytics.get_portfolio_metrics()
        
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/dashboard", response_model=RecoveryDashboardMetricsSchema)
def get_recovery_dashboard_metrics(db: Session = Depends(get_db)):
    """Get comprehensive recovery dashboard metrics."""
    try:
        from recovery_analytics import RecoveryAnalytics as RecoveryAnalyticsEngine
        
        analytics = RecoveryAnalyticsEngine(db)
        metrics = analytics.get_dashboard_metrics()
        
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recovery/queue")
def get_recovery_queue(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Get top recovery opportunities ranked by expected value."""
    try:
        from recovery_analytics import RecoveryAnalytics as RecoveryAnalyticsEngine
        
        analytics = RecoveryAnalyticsEngine(db)
        queue = analytics.get_recovery_queue(limit)
        
        return queue
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Phase 4: Agentic Recovery Engine Endpoints

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
