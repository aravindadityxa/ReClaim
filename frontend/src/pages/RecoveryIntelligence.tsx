import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, Clock, Target, Users } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api, APIError } from '../api'
import { RecoveryPortfolioMetrics, RecoveryOpportunitySummary } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export default function RecoveryIntelligence() {
  const [metrics, setMetrics] = useState<RecoveryPortfolioMetrics | null>(null)
  const [queue, setQueue] = useState<RecoveryOpportunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [metricsData, queueData] = await Promise.all([
          api.getRecoveryPortfolioMetrics(),
          api.getRecoveryQueue(),
        ])
        setMetrics(metricsData)
        setQueue(queueData)
        setError(null)
      } catch (err) {
        const message = err instanceof APIError ? err.message : 'Failed to load recovery intelligence'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!metrics) return <ErrorState message="No recovery metrics available" />

  const actionColors: Record<string, string> = {
    PAYMENT_RETRY: '#3b82f6',
    PAYMENT_LINK: '#8b5cf6',
    CUSTOMER_REMINDER: '#ec4899',
    SUBSCRIPTION_RETRY: '#06b6d4',
    INVOICE_REMINDER: '#f59e0b',
    DELAY_AND_RETRY: '#6366f1',
    NO_ACTION: '#9ca3af',
  }

  const actionDistributionData = Object.entries(metrics.action_distribution).map(([action, count]) => ({
    name: action.replace(/_/g, ' '),
    value: count,
    fill: actionColors[action] || '#6b7280',
  }))

  const recoveryPotentialData = Object.entries(metrics.recovery_potential_by_type).map(([type, amount]) => ({
    name: type.replace(/_/g, ' '),
    value: amount,
  }))

  return (
    <div className="space-y-8">
      {/* Recovery Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Revenue at Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(metrics.total_revenue_at_risk / 1000).toFixed(1)}k
              </p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Expected Recovery</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{(metrics.expected_recovery_from_recommended_actions / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.estimated_recovery_percentage.toFixed(1)}% of at-risk
              </p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">High Priority Opportunities</p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.high_priority_opportunity_count}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg friction: {metrics.average_friction_score}/100
              </p>
            </div>
            <Target className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Estimated Contacts</p>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.total_estimated_contacts}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ~{metrics.estimated_recovery_effort_hours.toFixed(1)}h effort
              </p>
            </div>
            <Users className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Action Distribution & Recovery Potential */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recovery Actions Distribution</h3>
          {actionDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={actionDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {actionDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No action data available
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recovery Potential by Type</h3>
          {recoveryPotentialData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recoveryPotentialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No type data available
            </div>
          )}
        </div>
      </div>

      {/* Top Recovery Opportunities */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Recovery Opportunities</h3>
        {queue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Opportunity</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Recommended Action</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Expected Recovery</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Probability</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Expected Value</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Friction</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((opp) => (
                  <tr key={opp.opportunity_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-900 font-medium">{opp.opportunity_id}</td>
                    <td className="py-3 px-3 text-right text-gray-600">₹{opp.amount.toFixed(0)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {opp.recommended_action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-green-600 font-medium">
                      ₹{opp.expected_recovery.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-600">
                      {(opp.recovery_probability * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">
                      ₹{opp.expected_net_value.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${opp.customer_friction}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{opp.customer_friction}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No opportunities available for recovery
          </div>
        )}
      </div>

      {/* Recovery Metrics Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Recovery Intelligence:</span> Phase 3 recommends the Next Best Action
          and Next Best Time for each revenue opportunity based on expected value, customer friction, and
          opportunity characteristics. Actions are ranked by their potential to recover revenue while minimizing
          customer friction.
        </p>
      </div>
    </div>
  )
}
