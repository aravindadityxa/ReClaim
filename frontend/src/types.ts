export interface Customer {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Transaction {
  id: string
  customer_id: string
  amount: number
  currency: string
  status: string
  payment_method: string
  failure_reason?: string
  created_at: string
  updated_at: string
}

export interface RevenueOpportunity {
  id: string
  transaction_id: string
  customer_id: string
  amount: number
  currency: string
  type: string
  status: string
  risk_level: string
  recoverability: string
  failure_reason?: string
  source: string
  created_at: string
  due_at?: string
  recovered_at?: string
}

export interface RevenueOpportunityDetail extends RevenueOpportunity {
  transaction: Transaction
  customer: Customer
}

export interface DashboardSummary {
  total_revenue: number
  revenue_at_risk: number
  estimated_recoverable: number
  recovered_revenue: number
  opportunity_count: Record<string, number>
  health: {
    score: number
    components: {
      payment_success: number
      risk_ratio: number
      recovery_rate: number
      stability: number
    }
  }
  payment_success_rate: number
}

export interface RevenueTrendPoint {
  date: string
  total: number
  successful: number
  failed: number
}

export interface RiskBreakdown {
  PAYMENT_FAILURE: number
  SUBSCRIPTION_FAILURE: number
  CHECKOUT_ABANDONMENT: number
  INVOICE_DELAY: number
}

export interface DashboardTrend {
  trend: RevenueTrendPoint[]
  risk_breakdown: RiskBreakdown
  risk_trend: string
}

export interface ActivityEvent {
  id: string
  type: string
  opportunity_id: string
  customer_id: string
  amount?: number
  opportunity_type?: string
  status?: string
  timestamp: string
  description: string
}

// Phase 2: Risk Intelligence

export interface RiskOpportunityInfo {
  opportunity_id: string
  risk_probability: number
  risk_score: number
  risk_level: string
  expected_loss: number
  recoverability_score: number
  priority_score: number
  risk_drivers: string[]
  confidence: number
  model_info: {
    model_type: string
    model_status: string
    training_timestamp?: string
  }
  computed_at: string
}

export interface RiskSummary {
  high_risk_revenue: number
  high_risk_opportunity_count: number
  total_expected_loss: number
  average_risk_score: number
  most_common_risk_driver?: string
  critical_opportunity_count: number
  model_performance_f1: number
}

export interface RiskDriver {
  driver: string
  affected_opportunities: number
  revenue_at_risk: number
  average_risk_score: number
  recoverable_revenue: number
}

export interface CohortRisk {
  cohort: string
  opportunity_count: number
  revenue_at_risk: number
  average_risk_score: number
  average_recoverability: number
}

export interface RiskTrendPoint {
  date: string
  opportunity_count: number
  revenue_at_risk: number
  average_risk_score: number
}

export interface RiskSpike {
  spike_detected: boolean
  magnitude: number
  period_days: number
  recent_opportunities: number
  baseline_opportunities: number
  change_percentage: number
}

export interface ModelPerformance {
  model_type: string
  model_status: string
  training_timestamp?: string
  train_size: number
  test_size: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
  confusion_matrix: number[][]
  dataset_info: {
    total_samples: number
    outcomes_available: number
    target_distribution: {
      LOST: number
      RECOVERED: number
    }
  }
}

// Phase 3: Recovery Intelligence

export interface NextBestTime {
  recommended_date: string
  recommended_time_window_start: string
  recommended_time_window_end: string
  urgency_level: string
  rationale: string
}

export interface RecoveryActionCandidate {
  action_type: string
  recovery_probability: number
  expected_recovered_amount: number
  action_cost: number
  customer_friction_score: number
  confidence: number
  expected_net_value: number
  reason: string
}

export interface RecoveryRecommendation {
  opportunity_id: string
  recommended_action: string
  recovery_probability: number
  expected_recovered_amount: number
  expected_net_value: number
  customer_friction_score: number
  why_this_action: string
  next_best_time: NextBestTime
  stopping_rules: string[]
  confidence: number
}

export interface RecoveryActionComparison {
  opportunity_id: string
  candidates: RecoveryActionCandidate[]
}

export interface RecoveryOpportunitySummary {
  opportunity_id: string
  amount: number
  recommended_action: string
  recovery_probability: number
  expected_recovery: number
  expected_net_value: number
  customer_friction: number
}

export interface RecoveryPortfolioMetrics {
  total_revenue_at_risk: number
  expected_recovery_from_recommended_actions: number
  estimated_recovery_percentage: number
  high_priority_opportunity_count: number
  average_friction_score: number
  total_estimated_contacts: number
  estimated_recovery_effort_hours: number
  action_distribution: Record<string, number>
  recovery_potential_by_type: Record<string, number>
}

// Phase 5: Governance & Safety

export interface GovernancePolicy {
  policy_type: string
  value: string | number | boolean
  enabled: boolean
  description: string
  editable: boolean
}

export interface GovernancePoliciesResponse {
  policies: Record<string, GovernancePolicy>
}

export interface ApprovalRequestResponse {
  id: string
  opportunity_id: string
  action_type: string
  amount: number
  expected_value: number
  recovery_probability: number
  reason: string
  status: string
  requested_at: string
  reviewed_at?: string
  reviewer_note?: string
}

export interface ApprovalsListResponse {
  pending_requests: ApprovalRequestResponse[]
}

export interface GovernanceStatus {
  is_paused: boolean
  autonomous_actions_today: number
  pending_approvals: number
  total_policies: number
  active_policies: number
  approval_summary: {
    pending_count: number
    approved_count: number
    rejected_count: number
  }
}

// Production Reliability & Observability

export interface ServiceHealth {
  name: string
  status: "healthy" | "degraded" | "unhealthy"
  message: string
  details: Record<string, any>
  checked_at: string
}

export interface SystemHealthResponse {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  checks: Record<string, ServiceHealth>
  summary: {
    total_checks: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

export interface OperationalMetrics {
  timestamp: string
  recovery_attempts: {
    total_attempts: number
    successful: number
    failed: number
    success_rate: number
    pending_execution: number
  }
  workflows: {
    total_workflows: number
    active: number
    failed: number
    stopped: number
    completed: number
  }
  governance: {
    pending_approvals: number
    approved: number
    rejected: number
    is_paused: boolean
    active_policies: number
  }
  revenue: {
    revenue_at_risk: number
    revenue_recovered: number
    at_risk_opportunities: number
    average_recovery_time_seconds: number
  }
  executor: {
    by_action_type: Record<string, any>
    total_actions: number
  }
  measurement: {
    total_outcomes: number
    succeeded_outcomes: number
    total_recovered_amount: number
    total_incremental_revenue: number
  }
  errors_24h: {
    period_hours: number
    total_errors: number
    error_codes: Record<string, number>
  }
}

export interface SystemError {
  error_id: string
  timestamp: string
  component: string
  operation: string
  message: string
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  workflow_id?: string
  opportunity_id?: string
  customer_id?: string
  details: Record<string, any>
  resolution_status: "RESOLVED" | "UNRESOLVED"
  resolved_at?: string
}

export interface SystemErrorResponse {
  errors: SystemError[]
  count: number
  timestamp: string
}

export interface SystemStatus {
  system_health: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  summary: {
    services_healthy: number
    services_degraded: number
    services_unhealthy: number
    total_errors: number
    unresolved_errors: number
    critical_errors: number
  }
}


// Production Security & Access Control

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user_id: string
  username: string
  role: string
}

export interface UserInfo {
  id: string
  username: string
  email: string
  full_name?: string
  role: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface CurrentUserResponse {
  user_id: string
  username: string
  email: string
  role: string
  permissions: string[]
  is_active: boolean
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  full_name?: string
  role?: string
}

export interface UpdateUserRoleRequest {
  role: string
}

export interface UserListResponse {
  users: UserInfo[]
  total: number
}

export interface AuthContextType {
  isAuthenticated: boolean
  currentUser: CurrentUserResponse | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  error: string | null
}
