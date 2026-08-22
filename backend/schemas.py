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
