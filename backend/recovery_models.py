"""Pydantic models for recovery intelligence."""

from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from recovery_strategies import RecoveryActionType


class RecoveryActionCandidate(BaseModel):
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


class NextBestTime(BaseModel):
    """Recommended timing for recovery action."""
    recommended_date: str
    recommended_time_window_start: str
    recommended_time_window_end: str
    urgency_level: str
    rationale: str
    
    class Config:
        from_attributes = True


class RecoveryRecommendation(BaseModel):
    """Main recovery recommendation for an opportunity."""
    opportunity_id: str
    recommended_action: str
    expected_recovered_amount: float
    recovery_probability: float
    expected_net_value: float
    customer_friction_score: int
    next_best_time: NextBestTime
    why_this_action: str
    why_not_others: Dict[str, str]  # Other action type -> reason not chosen
    stopping_rules: List[str]
    confidence: float
    computed_at: str
    
    class Config:
        from_attributes = True


class RecoveryActionComparison(BaseModel):
    """Comparison of multiple recovery actions."""
    opportunity_id: str
    candidates: List[RecoveryActionCandidate]
    recommended_action: str
    summary: str
    
    class Config:
        from_attributes = True


class RecoveryPlan(BaseModel):
    """A multi-step recovery plan."""
    opportunity_id: str
    primary_action: str
    primary_timing: NextBestTime
    fallback_actions: List[Dict]  # List of {action, timing, condition}
    stopping_rules: List[str]
    estimated_total_attempts: int
    max_contact_count: int
    plan_duration_days: int
    success_probability_estimate: float
    total_expected_value: float
    created_at: str
    
    class Config:
        from_attributes = True


class RecoveryPortfolioMetrics(BaseModel):
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
    action_distribution: Dict[str, int]
    
    class Config:
        from_attributes = True


class RecoveryOpportunitySummary(BaseModel):
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


class RecoveryIntelligenceDetail(BaseModel):
    """Comprehensive recovery intelligence for an opportunity."""
    opportunity_id: str
    amount: float
    currency: str
    opportunity_type: str
    failure_reason: Optional[str]
    created_at: str
    opportunity_age_days: int
    
    # Risk metrics from Phase 2
    risk_score: int
    risk_level: str
    recoverability_score: int
    risk_drivers: List[str]
    
    # Recovery metrics
    recommendation: RecoveryRecommendation
    alternatives: List[RecoveryActionCandidate]
    recovery_plan: RecoveryPlan
    previous_attempts: int
    previous_attempt_actions: List[str]
    
    # Customer context
    customer_id: str
    customer_recovery_rate: float
    customer_total_value: float
    
    class Config:
        from_attributes = True


class RecoveryDashboardMetrics(BaseModel):
    """Dashboard-level recovery metrics."""
    portfolio_metrics: RecoveryPortfolioMetrics
    top_opportunities: List[RecoveryOpportunitySummary]
    action_distribution: Dict[str, int]
    recovery_potential_by_type: Dict[str, float]
    expected_recovery_timeline: List[Dict]  # {date, expected_recovery}
    customer_contact_projection: Dict[str, int]  # {day, estimated_contacts}
    
    class Config:
        from_attributes = True
