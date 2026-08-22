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
