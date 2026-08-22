import { useEffect, useState } from 'react'
import { ChevronRight, Filter } from 'lucide-react'
import { api, APIError } from '../api'
import { RevenueOpportunity } from '../types'
import Badge from '../components/Badge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import RecoveryRecommendationCard from '../components/RecoveryRecommendationCard'
import RecoveryActionComparison from '../components/RecoveryActionComparison'

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDaysAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays}d ago`
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadOpportunities} />

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Filters & Sorting
            </h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>

        {showFilters && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="AT_RISK">At Risk</option>
                <option value="RECOVERABLE">Recoverable</option>
                <option value="RECOVERED">Recovered</option>
                <option value="LOST">Lost</option>
                <option value="MONITORING">Monitoring</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Risk Level
              </label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="PAYMENT_FAILURE">Payment Failure</option>
                <option value="SUBSCRIPTION_FAILURE">Subscription Failure</option>
                <option value="CHECKOUT_ABANDONMENT">Checkout Abandonment</option>
                <option value="INVOICE_DELAY">Invoice Delay</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Recoverability
              </label>
              <select
                value={recoverabilityFilter}
                onChange={(e) => setRecoverabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">Newest</option>
                <option value="amount">Amount</option>
                <option value="risk_level">Risk Level</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Opportunities Table */}
      {opportunities.length === 0 ? (
        <EmptyState message="No revenue opportunities match your filters. Try adjusting your criteria." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Recoverability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{opp.customer_id}</p>
                        <p className="text-xs text-gray-600">{opp.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₹{opp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {opp.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge
                        label={opp.status.replace(/_/g, ' ')}
                        variant={getStatusBadgeVariant(opp.status)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge
                        label={opp.risk_level}
                        variant={getRiskBadgeVariant(opp.risk_level)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge
                        label={opp.recoverability}
                        variant={getRecoverabilityBadgeVariant(opp.recoverability)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDaysAgo(opp.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setSelectedOpportunityId(opp.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        View
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Showing {opportunities.length} revenue opportunities
          </div>
        </div>
      )}

      {/* Detail Modal (shown as overlay) */}
      {selectedOpportunityId && (
        <OpportunityDetailModal
          opportunityId={selectedOpportunityId}
          onClose={() => setSelectedOpportunityId(null)}
        />
      )}
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
        // Recovery data is optional, don't fail the modal if it's not available
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
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Opportunity Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {detail && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Amount
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{detail.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Status
                    </p>
                    <Badge
                      label={detail.status}
                      variant={
                        detail.status === 'RECOVERED'
                          ? 'success'
                          : detail.status === 'LOST'
                            ? 'critical'
                            : 'warning'
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Risk Level
                    </p>
                    <Badge label={detail.risk_level} variant="danger" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Recoverability
                    </p>
                    <Badge label={detail.recoverability} variant="success" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Type
                    </p>
                    <p className="text-sm text-gray-900">
                      {detail.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Customer
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {detail.customer.name}
                  </p>
                  <p className="text-xs text-gray-600">{detail.customer.email}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Transaction
                  </p>
                  <p className="text-sm text-gray-900">{detail.transaction_id}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(detail.transaction.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                {detail.failure_reason && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Failure Reason
                    </p>
                    <p className="text-sm text-gray-900">{detail.failure_reason}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Created
                    </p>
                    <p className="text-gray-900">
                      {new Date(detail.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {detail.recovered_at && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                        Recovered
                      </p>
                      <p className="text-gray-900">
                        {new Date(detail.recovered_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Recovery Intelligence Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Phase 3: Recovery Intelligence</h3>
                  
                  {loadingRecovery && (
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">Loading recovery recommendations...</p>
                    </div>
                  )}

                  {recoveryError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-amber-900">
                        <span className="font-semibold">Recovery data not available:</span> {recoveryError}
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
    </>
  )
}
