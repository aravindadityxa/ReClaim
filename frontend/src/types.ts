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
