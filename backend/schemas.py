from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CustomerBase(BaseModel):
    name: str
    email: str


class CustomerResponse(CustomerBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    amount: float
    currency: str
    status: str
    payment_method: str
    failure_reason: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: str
    customer_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RevenueOpportunityBase(BaseModel):
    amount: float
    currency: str
    type: str
    status: str
    risk_level: str
    recoverability: str
    failure_reason: Optional[str] = None
    source: str


class RevenueOpportunityResponse(RevenueOpportunityBase):
    id: str
    transaction_id: str
    customer_id: str
    created_at: datetime
    due_at: Optional[datetime] = None
    recovered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RevenueOpportunityDetail(RevenueOpportunityResponse):
    transaction: TransactionResponse
    customer: CustomerResponse


class DashboardSummary(BaseModel):
    total_revenue: float
    revenue_at_risk: float
    estimated_recoverable: float
    recovered_revenue: float
    opportunity_count: dict
    health: dict
    payment_success_rate: float


class RevenueTrendPoint(BaseModel):
    date: str
    total: float
    successful: float
    failed: float


class RiskBreakdown(BaseModel):
    PAYMENT_FAILURE: float
    SUBSCRIPTION_FAILURE: float
    CHECKOUT_ABANDONMENT: float
    INVOICE_DELAY: float


class DashboardTrend(BaseModel):
    trend: list[RevenueTrendPoint]
    risk_breakdown: RiskBreakdown
    risk_trend: str


# Phase 2: Risk Intelligence

class RiskOpportunityInfo(BaseModel):
    opportunity_id: str
    risk_probability: float
    risk_score: int
    risk_level: str
    expected_loss: float
    recoverability_score: int
    priority_score: int
    risk_drivers: list[str]
    confidence: float
    model_info: dict
    computed_at: str

    class Config:
        from_attributes = True


class RiskSummary(BaseModel):
    high_risk_revenue: float
    high_risk_opportunity_count: int
    total_expected_loss: float
    average_risk_score: int
    most_common_risk_driver: Optional[str] = None
    critical_opportunity_count: int
    model_performance_f1: float


class RiskDriverBreakdown(BaseModel):
    driver: str
    affected_opportunities: int
    revenue_at_risk: float
    average_risk_score: int
    recoverable_revenue: float


class CohortRiskBreakdown(BaseModel):
    cohort: str
    opportunity_count: int
    revenue_at_risk: float
    average_risk_score: int
    average_recoverability: int


class RiskTrendPoint(BaseModel):
    date: str
    opportunity_count: int
    revenue_at_risk: float
    average_risk_score: int


class RiskSpike(BaseModel):
    spike_detected: bool
    magnitude: float
    period_days: int
    recent_opportunities: int
    baseline_opportunities: int
    change_percentage: float


class ModelPerformance(BaseModel):
    model_type: str
    model_status: str
    training_timestamp: Optional[str]
    train_size: int
    test_size: int
    precision: float
    recall: float
    f1: float
    roc_auc: float
    confusion_matrix: list
    dataset_info: dict


# Phase 3: Recovery Intelligence

class NextBestTimeSchema(BaseModel):
    """Recommended timing for recovery action."""
    recommended_date: str
    recommended_time_window_start: str
    recommended_time_window_end: str
    urgency_level: str
    rationale: str
    
    class Config:
        from_attributes = True


class RecoveryActionCandidateSchema(BaseModel):
    """A candidate recovery action with its evaluation metrics."""
    action_type: str
    recovery_probability: float
    expected_recovered_amount: float
    action_cost: float
    customer_friction_score: int
    urgency_factor: float
    expected_net_value: float
    confidence: float
    reason: str
    
    class Config:
        from_attributes = True


class RecoveryRecommendationSchema(BaseModel):
    """Main recovery recommendation for an opportunity."""
    opportunity_id: str
    recommended_action: str
    expected_recovered_amount: float
    recovery_probability: float
    expected_net_value: float
    customer_friction_score: int
    next_best_time: NextBestTimeSchema
    why_this_action: str
    why_not_others: dict
    stopping_rules: list[str]
    confidence: float
    computed_at: str
    
    class Config:
        from_attributes = True


class RecoveryActionComparisonSchema(BaseModel):
    """Comparison of multiple recovery actions."""
    opportunity_id: str
    candidates: list[RecoveryActionCandidateSchema]
    recommended_action: str
    summary: str
    
    class Config:
        from_attributes = True


class RecoveryPlanSchema(BaseModel):
    """A multi-step recovery plan."""
    opportunity_id: str
    primary_action: str
    primary_timing: NextBestTimeSchema
    fallback_actions: list
    stopping_rules: list[str]
    estimated_total_attempts: int
    max_contact_count: int
    plan_duration_days: int
    success_probability_estimate: float
    total_expected_value: float
    created_at: str
    
    class Config:
        from_attributes = True


class RecoveryPortfolioMetricsSchema(BaseModel):
    """Aggregated recovery metrics for merchant portfolio."""
    total_revenue_at_risk: float
    total_expected_recoverable_revenue: float
    expected_recovery_from_recommended_actions: float
    estimated_recovery_percentage: float
    high_priority_opportunity_count: int
    total_estimated_contacts: int
    estimated_recovery_effort_hours: float
    average_recovery_probability: float
    average_friction_score: int
    action_distribution: dict
    
    class Config:
        from_attributes = True


class RecoveryOpportunitySummarySchema(BaseModel):
    """Summary of recovery status for an opportunity."""
    opportunity_id: str
    amount: float
    risk_score: int
    recoverability_score: int
    recommended_action: str
    expected_recovery: float
    recovery_probability: float
    expected_net_value: float
    customer_friction: int
    recommended_time: str
    status: str
    
    class Config:
        from_attributes = True


class RecoveryIntelligenceDetailSchema(BaseModel):
    """Comprehensive recovery intelligence for an opportunity."""
    opportunity_id: str
    amount: float
    currency: str
    opportunity_type: str
    failure_reason: Optional[str]
    created_at: str
    opportunity_age_days: int
    risk_score: int
    risk_level: str
    recoverability_score: int
    risk_drivers: list[str]
    recommendation: RecoveryRecommendationSchema
    alternatives: list[RecoveryActionCandidateSchema]
    previous_attempts: int
    previous_attempt_actions: list[str]
    customer_id: str
    customer_recovery_rate: float
    customer_total_value: float
    
    class Config:
        from_attributes = True


class RecoveryDashboardMetricsSchema(BaseModel):
    """Dashboard-level recovery metrics."""
    portfolio_metrics: RecoveryPortfolioMetricsSchema
    top_opportunities: list[RecoveryOpportunitySummarySchema]
    action_distribution: dict
    recovery_potential_by_type: dict
    expected_recovery_timeline: list
    customer_contact_projection: dict
    
    class Config:
        from_attributes = True


# Phase 5: Governance & Safety

class PolicySchema(BaseModel):
    """A single governance policy."""
    policy_type: str
    value: any
    enabled: bool
    description: str
    editable: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PolicySetSchema(BaseModel):
    """Complete set of policies."""
    policies: dict[str, PolicySchema]
    
    class Config:
        from_attributes = True


class GovernanceEvaluationSchema(BaseModel):
    """Result of governance evaluation."""
    decision: str  # ALLOWED, BLOCKED, REQUIRES_APPROVAL, DEFERRED
    action: str
    reason: str
    policies_checked: list[str]
    violations: list[str]
    warnings: list[str]
    approval_required: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ApprovalRequestSchema(BaseModel):
    """Approval request details."""
    id: str
    opportunity_id: str
    customer_id: str
    action_type: str
    amount: float
    expected_value: Optional[float] = None
    recovery_probability: Optional[float] = None
    reason: str
    status: str  # PENDING, APPROVED, REJECTED, EXPIRED
    requested_at: datetime
    expires_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_note: Optional[str] = None
    is_expired: bool = False
    
    class Config:
        from_attributes = True


class ApprovalQueueSummarySchema(BaseModel):
    """Approval queue summary."""
    pending_count: int
    approved_count: int
    rejected_count: int
    expired_count: int
    total_requests: int
    pending_requests: list[ApprovalRequestSchema]
    recently_approved: list[ApprovalRequestSchema]
    recently_rejected: list[ApprovalRequestSchema]
    
    class Config:
        from_attributes = True


class PolicyChangeLogSchema(BaseModel):
    """Policy change audit entry."""
    id: str
    policy_type: str
    change_type: str  # CREATED, UPDATED, DELETED
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class GovernanceDashboardSchema(BaseModel):
    """Governance dashboard summary."""
    is_paused: bool
    autonomous_actions_today: int
    blocked_actions_today: int
    pending_approvals_count: int
    deferred_actions_count: int
    policy_violations_today: int
    customer_contact_tracking: dict
    recent_policy_changes: list[PolicyChangeLogSchema]
    execution_window_info: dict
    
    class Config:
        from_attributes = True


class PauseResumeSchema(BaseModel):
    """Request to pause or resume recovery."""
    action: str  # pause or resume
    reason: Optional[str] = None


class PolicyUpdateSchema(BaseModel):
    """Request to update a policy."""
    policy_type: str
    value: any
    reason: Optional[str] = None
