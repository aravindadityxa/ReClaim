import { useEffect, useState } from 'react'
import { ChevronRight, Filter, Zap } from 'lucide-react'
import { api, APIError } from '../api'
import { RevenueOpportunity } from '../types'
import Badge from '../components/Badge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import RecoveryRecommendationCard from '../components/RecoveryRecommendationCard'
import RecoveryActionComparison from '../components/RecoveryActionComparison'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

type SortBy = 'created_at' | 'amount' | 'risk_level'
type SortOrder = 'asc' | 'desc'

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<RevenueOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [recoverabilityFilter, setRecoverabilityFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)

  const loadOpportunities = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.opportunities.list({
        status: statusFilter || undefined,
        risk_level: riskFilter || undefined,
        type: typeFilter || undefined,
        recoverability: recoverabilityFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setOpportunities(data)
      setFilteredOpportunities(data)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to load opportunities: ${err.message}`)
      } else {
        setError('Failed to load opportunities')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOpportunities()
  }, [statusFilter, riskFilter, typeFilter, recoverabilityFilter, sortBy, sortOrder])

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'critical'
      case 'HIGH':
        return 'danger'
      case 'MEDIUM':
        return 'warning'
      default:
        return 'info'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'RECOVERED':
        return 'success'
      case 'RECOVERABLE':
        return 'warning'
      case 'AT_RISK':
        return 'danger'
      case 'LOST':
        return 'critical'
      default:
        return 'info'
    }
  }

  const getRecoverabilityBadgeVariant = (recoverability: string) => {
    switch (recoverability) {
      case 'HIGH':
        return 'success'
      case 'MEDIUM':
        return 'warning'
      default:
        return 'danger'
    }
  }

  const formatDaysAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays}d ago`
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'from-red-600 to-red-700'
      case 'HIGH': return 'from-orange-600 to-orange-700'
      case 'MEDIUM': return 'from-yellow-600 to-yellow-700'
      default: return 'from-blue-600 to-blue-700'
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadOpportunities} />

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)' }} className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={0}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={32} style={{ color: 'var(--color-primary-600)' }} />
              <h1 className="text-6xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Revenue Opportunities
              </h1>
            </div>
            <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Explore and recover revenue across all channels with intelligent recommendations
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* Filters Card */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={100}>
          <div className="rounded-2xl p-6 border backdrop-blur transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Filter size={20} style={{ color: 'var(--color-text-secondary)' }} />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Filter & Sort
                </h3>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm font-semibold transition-all"
                style={{ color: 'var(--color-primary-600)' }}
              >
                {showFilters ? '− Hide' : '+ Show'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="AT_RISK">At Risk</option>
                    <option value="RECOVERABLE">Recoverable</option>
                    <option value="RECOVERED">Recovered</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Risk Level
                  </label>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="">All Risks</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="PAYMENT_FAILURE">Payment Failure</option>
                    <option value="SUBSCRIPTION_FAILURE">Subscription Failure</option>
                    <option value="CHECKOUT_ABANDONMENT">Checkout Abandonment</option>
                    <option value="INVOICE_DELAY">Invoice Delay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Recoverability
                  </label>
                  <select
                    value={recoverabilityFilter}
                    onChange={(e) => setRecoverabilityFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="">All Levels</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="created_at">Newest</option>
                    <option value="amount">Amount</option>
                    <option value="risk_level">Risk Level</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none border transition-all"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="desc">High → Low</option>
                    <option value="asc">Low → High</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </ScrollTriggerAnimation>

        {/* Opportunities Grid */}
        {opportunities.length === 0 ? (
          <EmptyState message="No opportunities match your filters" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((opp, idx) => (
              <ScrollTriggerAnimation key={opp.id} animation="fade-in-up" delay={idx * 50}>
                <button
                  onClick={() => setSelectedOpportunityId(opp.id)}
                  className="group rounded-2xl p-6 border backdrop-blur transition-all text-left h-full hover:shadow-2xl hover:border-opacity-100 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--color-primary-600)'
                    el.style.backgroundColor = 'rgba(14, 165, 233, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--color-border)'
                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  {/* Risk Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <Badge
                      label={opp.risk_level}
                      variant={getRiskBadgeVariant(opp.risk_level)}
                    />
                    <ChevronRight size={20} style={{
                      color: 'var(--color-text-secondary)',
                      transition: 'all 0.3s ease',
                      transform: 'translateX(0)',
                    }} className="group-hover:translate-x-1 group-hover:text-primary-600" />
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium uppercase tracking-wide">
                      Amount
                    </p>
                    <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                      ₹{opp.amount.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-t border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs font-semibold uppercase tracking-wide mb-1">
                        Status
                      </p>
                      <Badge
                        label={opp.status.replace(/_/g, ' ')}
                        variant={getStatusBadgeVariant(opp.status)}
                      />
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs font-semibold uppercase tracking-wide mb-1">
                        Recoverable
                      </p>
                      <Badge
                        label={opp.recoverability}
                        variant={getRecoverabilityBadgeVariant(opp.recoverability)}
                      />
                    </div>
                  </div>

                  {/* Type & Age */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Type:</span>
                      <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">
                        {opp.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Age:</span>
                      <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">
                        {formatDaysAgo(opp.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              </ScrollTriggerAnimation>
            ))}
          </div>
        )}

        {/* Summary */}
        {opportunities.length > 0 && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={200}>
            <div className="rounded-2xl p-4 border" style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}>
              <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Showing <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{opportunities.length}</span> revenue opportunities
              </p>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Detail Modal */}
        {selectedOpportunityId && (
          <OpportunityDetailModal
            opportunityId={selectedOpportunityId}
            onClose={() => setSelectedOpportunityId(null)}
          />
        )}
      </div>
    </div>
  )
}

function OpportunityDetailModal({
  opportunityId,
  onClose,
}: {
  opportunityId: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<any>(null)
  const [recovery, setRecovery] = useState<any>(null)
  const [recoveryActions, setRecoveryActions] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingRecovery, setLoadingRecovery] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.opportunities.getDetail(opportunityId)
        setDetail(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [opportunityId])

  useEffect(() => {
    const loadRecovery = async () => {
      try {
        setLoadingRecovery(true)
        setRecoveryError(null)
        const [recData, actionsData] = await Promise.all([
          api.getRecoveryRecommendation(opportunityId),
          api.getRecoveryActions(opportunityId),
        ])
        setRecovery(recData)
        setRecoveryActions(actionsData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Recovery data unavailable'
        setRecoveryError(message)
      } finally {
        setLoadingRecovery(false)
      }
    }
    loadRecovery()
  }, [opportunityId])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-blur transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 p-6 flex items-center justify-between border-b backdrop-blur-xl" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'var(--color-border)',
          }}>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Opportunity Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-all opacity-60 hover:opacity-100 hover:bg-white/10"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {detail && (
              <div className="space-y-6">
                {/* Main Info */}
                <div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Amount
                      </p>
                      <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{detail.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Status
                      </p>
                      <Badge label={detail.status} variant="success" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Risk
                      </p>
                      <Badge label={detail.risk_level} variant="danger" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Recoverable
                      </p>
                      <Badge label={detail.recoverability} variant="success" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Type
                      </p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {detail.type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer */}
                <div>
                  <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    Customer
                  </p>
<div
  className="border rounded-lg p-4"
  style={{
    backgroundColor: 'var(--color-bg-secondary)',
    borderColor: 'var(--color-border)',
  }}
>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {detail.customer.name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {detail.customer.email}
                    </p>
                  </div>
                </div>

                {/* Recovery Section */}
                <div className="border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    Recovery Intelligence
                  </h3>
                  
                  {loadingRecovery && (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        Loading recommendations...
                      </p>
                    </div>
                  )}

                  {recoveryError && (
                    <div className="p-4 rounded-lg border" style={{
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      borderColor: 'rgba(251, 191, 36, 0.3)',
                    }}>
                      <p className="text-sm" style={{ color: 'rgba(251, 191, 36, 0.8)' }}>
                        Recovery data unavailable
                      </p>
                    </div>
                  )}

                  {recovery && !loadingRecovery && (
                    <div className="space-y-6">
                      <RecoveryRecommendationCard
                        recommendation={recovery}
                        opportunityAmount={detail.amount}
                      />

                      {recoveryActions && (
                        <RecoveryActionComparison
                          candidates={recoveryActions.candidates}
                          recommendedAction={recovery.recommended_action}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
