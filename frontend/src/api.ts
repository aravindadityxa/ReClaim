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
} from './types'

const API_BASE = '/api'

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

async function fetchJSON<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
}

export { APIError }
