import {
  DashboardSummary,
  DashboardTrend,
  RevenueOpportunity,
  RevenueOpportunityDetail,
  ActivityEvent,
  RiskOpportunityInfo,
  RiskSummary,
  RiskDriver,
  CohortRisk,
  RiskTrendPoint,
  RiskSpike,
  ModelPerformance,
  RecoveryPortfolioMetrics,
  RecoveryOpportunitySummary,
  RecoveryRecommendation,
  RecoveryActionComparison,
  GovernanceStatus,
  GovernancePolicy,
  GovernancePoliciesResponse,
  ApprovalsListResponse,
  SystemHealthResponse,
  OperationalMetrics,
  SystemErrorResponse,
  SystemStatus,
  LoginRequest,
  TokenResponse,
  UserInfo,
  CurrentUserResponse,
  CreateUserRequest,
  UpdateUserRoleRequest,
  UserListResponse,
  OllamaExplanationResponse,
  OllamaHealthStatus,
} from './types'

const API_BASE = '/api'

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

// Store token in sessionStorage for the current session
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('auth_token')
  }
  return null
}

const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('auth_token', token)
  }
}

const clearAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token')
  }
}

async function fetchJSON<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add authorization header if token exists
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${url}`, {
      headers,
      ...options,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new APIError(response.status, error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) throw error
    throw new APIError(0, error instanceof Error ? error.message : 'Unknown error')
  }
}

export const api = {
  dashboard: {
    getSummary: () =>
      fetchJSON<DashboardSummary>('/dashboard/revenue-summary'),

    getTrend: (days: number = 30) =>
      fetchJSON<DashboardTrend>(`/dashboard/revenue-trend?days=${days}`),
  },

  opportunities: {
    list: (filters?: {
      status?: string
      risk_level?: string
      type?: string
      recoverability?: string
      sort_by?: string
      sort_order?: string
    }) => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.risk_level) params.append('risk_level', filters.risk_level)
      if (filters?.type) params.append('opp_type', filters.type)
      if (filters?.recoverability) params.append('recoverability', filters.recoverability)
      if (filters?.sort_by) params.append('sort_by', filters.sort_by)
      if (filters?.sort_order) params.append('sort_order', filters.sort_order)

      const query = params.toString() ? `?${params.toString()}` : ''
      return fetchJSON<RevenueOpportunity[]>(`/revenue-opportunities${query}`)
    },

    getDetail: (opportunityId: string) =>
      fetchJSON<RevenueOpportunityDetail>(`/revenue-opportunities/${opportunityId}`),
  },

  activity: {
    getEvents: (limit: number = 50) =>
      fetchJSON<ActivityEvent[]>(`/revenue-activity?limit=${limit}`),
  },

  risk: {
    getSummary: () =>
      fetchJSON<RiskSummary>('/risk/summary'),

    getQueue: (limit: number = 20) =>
      fetchJSON<RiskOpportunityInfo[]>(`/risk/queue?limit=${limit}`),

    getDrivers: () =>
      fetchJSON<RiskDriver[]>('/risk/drivers'),

    getCohortRisk: (dimension: string = 'payment_method') =>
      fetchJSON<CohortRisk[]>(`/risk/cohort?dimension=${dimension}`),

    getTrend: (days: number = 30) =>
      fetchJSON<RiskTrendPoint[]>(`/risk/trend?days=${days}`),

    detectSpikes: (days: number = 7) =>
      fetchJSON<RiskSpike>(`/risk/spike?days=${days}`),

    getOpportunityRisk: (opportunityId: string) =>
      fetchJSON<RiskOpportunityInfo>(`/risk/opportunities/${opportunityId}`),

    getModelPerformance: () =>
      fetchJSON<ModelPerformance>('/risk/model-performance'),
  },

  getRecoveryPortfolioMetrics: () =>
    fetchJSON<RecoveryPortfolioMetrics>('/recovery/portfolio'),

  getRecoveryQueue: (limit: number = 20) =>
    fetchJSON<RecoveryOpportunitySummary[]>(`/recovery/queue?limit=${limit}`),

  getRecoveryRecommendation: (opportunityId: string) =>
    fetchJSON<RecoveryRecommendation>(`/recovery/recommendation/${opportunityId}`),

  getRecoveryActions: (opportunityId: string) =>
    fetchJSON<RecoveryActionComparison>(`/recovery/actions/${opportunityId}`),

  // Phase 4: Agentic Recovery Engine
  createRecoveryWorkflow: (opportunityId: string): Promise<any> =>
    fetchJSON('/recovery/workflows/' + opportunityId, { method: 'POST' }),

  planRecoveryWorkflow: (opportunityId: string): Promise<any> =>
    fetchJSON(`/recovery/workflows/${opportunityId}/plan`, { method: 'POST' }),

  validateRecoveryWorkflow: (opportunityId: string): Promise<any> =>
    fetchJSON(`/recovery/workflows/${opportunityId}/validate`, { method: 'POST' }),

  executeRecoveryAction: (opportunityId: string, isSimulation: boolean = true): Promise<any> =>
    fetchJSON(`/recovery/workflows/${opportunityId}/execute?is_simulation=${isSimulation}`, { method: 'POST' }),

  getRecoveryWorkflow: (opportunityId: string): Promise<any> =>
    fetchJSON(`/recovery/workflows/${opportunityId}`),

  getRecoveryAudit: (opportunityId: string): Promise<any> =>
    fetchJSON(`/recovery/workflows/${opportunityId}/audit`),

  getRecoveryControlCenter: (): Promise<any> =>
    fetchJSON('/recovery/control-center'),

  // Phase 3b: AI Explanation Layer (Ollama)
  getRecoveryExplanation: (opportunityId: string): Promise<OllamaExplanationResponse> =>
    fetchJSON<OllamaExplanationResponse>(`/recovery/explanation/${opportunityId}`),

  getRiskExplanation: (opportunityId: string): Promise<OllamaExplanationResponse> =>
    fetchJSON<OllamaExplanationResponse>(`/risk/explanation/${opportunityId}`),

  // Phase 5: Governance & Safety
  getGovernancePolicies: () =>
    fetchJSON<GovernancePoliciesResponse>('/governance/policies'),

  updateGovernancePolicy: (policyType: string, update: { value: string | number | boolean }) =>
    fetchJSON(`/governance/policies/${policyType}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    }),

  evaluateGovernance: (evaluation: { policies?: Record<string, GovernancePolicy> }): Promise<GovernanceStatus> =>
    fetchJSON('/governance/evaluate', {
      method: 'POST',
      body: JSON.stringify(evaluation),
    }),

  getApprovals: (status?: string) =>
    fetchJSON<ApprovalsListResponse>(`/governance/approvals${status ? `?status=${status}` : ''}`),

  getApproval: (requestId: string) =>
    fetchJSON(`/governance/approvals/${requestId}`),

  approveApproval: (requestId: string, reviewerNote?: string) =>
    fetchJSON(`/governance/approvals/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer_note: reviewerNote }),
    }),

  rejectApproval: (requestId: string, reviewerNote?: string) =>
    fetchJSON(`/governance/approvals/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewer_note: reviewerNote }),
    }),

  pauseRecovery: (reason?: string) =>
    fetchJSON('/governance/pause', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  resumeRecovery: () =>
    fetchJSON('/governance/resume', { method: 'POST' }),

  getGovernanceDashboard: () =>
    fetchJSON<GovernanceStatus>('/governance/dashboard'),

  // Phase 6: Recovery Analytics & Optimization
  getRecoveryFunnel: (days: number = 30): Promise<any> =>
    fetchJSON(`/analytics/recovery/funnel?days=${days}`),

  getStrategyPerformance: (strategy?: string): Promise<any> =>
    fetchJSON(`/analytics/recovery/strategies${strategy ? `?strategy=${strategy}` : ''}`),

  getCohortAnalysis: (cohortType: string): Promise<any> =>
    fetchJSON(`/analytics/recovery/cohorts?cohort_type=${cohortType}`),

  getIncrementalRevenue: (days: number = 30): Promise<any> =>
    fetchJSON(`/analytics/recovery/incremental?days=${days}`),

  getStrategyRecommendations: (opportunityType: string): Promise<any> =>
    fetchJSON(`/analytics/recovery/recommendations?opportunity_type=${opportunityType}`),

  // Production Reliability & Observability
  getSystemHealth: () =>
    fetchJSON<SystemHealthResponse>('/system/health'),

  getSystemMetrics: () =>
    fetchJSON<OperationalMetrics>('/system/metrics'),

  getSystemErrors: (params?: {
    limit?: number
    severity?: string
    component?: string
    workflow_id?: string
    unresolved_only?: boolean
  }) => {
    const q = new URLSearchParams()
    if (params?.limit) q.append('limit', params.limit.toString())
    if (params?.severity) q.append('severity', params.severity)
    if (params?.component) q.append('component', params.component)
    if (params?.workflow_id) q.append('workflow_id', params.workflow_id)
    if (params?.unresolved_only) q.append('unresolved_only', 'true')
    return fetchJSON<SystemErrorResponse>(`/system/errors?${q.toString()}`)
  },

  getSystemStatus: () =>
    fetchJSON<SystemStatus>('/system/status'),

  getOllamaStatus: (): Promise<OllamaHealthStatus> =>
    fetchJSON<OllamaHealthStatus>('/system/ollama-status'),
}


// ============================================================================
// Authentication & User Management
// ============================================================================

export const authAPI = {
  login: (credentials: LoginRequest): Promise<TokenResponse> => {
    return fetchJSON<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  logout: (): Promise<{ detail: string }> => {
    return fetchJSON<{ detail: string }>('/auth/logout', {
      method: 'POST',
    })
  },

  getCurrentUser: (): Promise<CurrentUserResponse> => {
    return fetchJSON<CurrentUserResponse>('/auth/me')
  },

  // User management (admin only)
  listUsers: (): Promise<UserListResponse> => {
    return fetchJSON<UserListResponse>('/users')
  },

  createUser: (userData: CreateUserRequest): Promise<UserInfo> => {
    return fetchJSON<UserInfo>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  updateUserRole: (userId: string, roleUpdate: UpdateUserRoleRequest): Promise<UserInfo> => {
    return fetchJSON<UserInfo>(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(roleUpdate),
    })
  },

  deactivateUser: (userId: string): Promise<UserInfo> => {
    return fetchJSON<UserInfo>(`/users/${userId}/deactivate`, {
      method: 'POST',
    })
  },

  activateUser: (userId: string): Promise<UserInfo> => {
    return fetchJSON<UserInfo>(`/users/${userId}/activate`, {
      method: 'POST',
    })
  },
}

// Export token management for use in auth context
export { getAuthToken, setAuthToken, clearAuthToken }
