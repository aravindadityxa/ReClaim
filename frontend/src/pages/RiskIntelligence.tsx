import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'
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
} from 'recharts'
import { api, APIError } from '../api'
import {
  RiskSummary,
  RiskOpportunityInfo,
  RiskDriver,
  RiskTrendPoint,
} from '../types'
import RiskCard from '../components/RiskCard'
import RiskQueue from '../components/RiskQueue'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export default function RiskIntelligence() {
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [queue, setQueue] = useState<RiskOpportunityInfo[]>([])
  const [drivers, setDrivers] = useState<RiskDriver[]>([])
  const [trend, setTrend] = useState<RiskTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [summaryData, queueData, driversData, trendData] = await Promise.all(
        [
          api.risk.getSummary(),
          api.risk.getQueue(20),
          api.risk.getDrivers(),
          api.risk.getTrend(30),
        ]
      )

      setSummary(summaryData)
      setQueue(queueData)
      setDrivers(driversData)
      setTrend(trendData)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to load risk intelligence: ${err.message}`)
      } else {
        setError('Failed to load risk intelligence')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadData} />
  if (!summary) return <ErrorState message="No risk data available" />

  return (
    <div className="space-y-8">
      {/* Risk Intelligence Overview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
          Risk Intelligence Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <RiskCard
            label="High Risk Revenue"
            value={`₹${summary.high_risk_revenue.toLocaleString('en-IN')}`}
            riskLevel="HIGH"
            icon={<AlertTriangle size={24} className="text-orange-600" />}
            detail={`${summary.high_risk_opportunity_count} opportunities`}
          />
          <RiskCard
            label="Total Expected Loss"
            value={`₹${summary.total_expected_loss.toLocaleString('en-IN')}`}
            detail={`Average risk: ${summary.average_risk_score}/100`}
            icon={<TrendingUp size={24} className="text-red-600" />}
          />
          <RiskCard
            label="Critical Opportunities"
            value={summary.critical_opportunity_count}
            riskLevel="CRITICAL"
            icon={<AlertTriangle size={24} className="text-red-600" />}
          />
          <RiskCard
            label="Model Performance"
            value={`${(summary.model_performance_f1 * 100).toFixed(1)}%`}
            detail="F1 Score"
            icon={<BarChart3 size={24} className="text-blue-600" />}
          />
        </div>
      </div>

      {/* Most Common Risk Driver */}
      {summary.most_common_risk_driver && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Most Common Risk Driver:</span>
            <br />
            {summary.most_common_risk_driver}
          </p>
        </div>
      )}

      {/* Revenue Risk Queue */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
          Priority Revenue Risk Queue
        </h3>
        <RiskQueue
          opportunities={queue}
          onSelectOpportunity={(id) => {
            setSelectedOppId(id)
            // Could open a detail modal here
          }}
        />
      </div>

      {/* Risk Trend Chart */}
      {trend.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
            Risk Trend (30 days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                label={{ value: 'Opportunities', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                label={{ value: 'Revenue at Risk (₹)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="opportunity_count"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
                name="Opportunities"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue_at_risk"
                stroke="#ef4444"
                dot={false}
                strokeWidth={2}
                name="Revenue at Risk (₹)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Risk Drivers Breakdown */}
      {drivers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Top Risk Drivers by Revenue
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={drivers.slice(0, 5).map((d) => ({
                  ...d,
                  revenue_at_risk_k: d.revenue_at_risk / 1000,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="driver" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}K`}
                />
                <Bar dataKey="revenue_at_risk_k" fill="#ef4444" name="Revenue at Risk (₹K)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              Risk Drivers Details
            </h3>
            <div className="space-y-3">
              {drivers.slice(0, 5).map((driver) => (
                <div
                  key={driver.driver}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {driver.driver}
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      {driver.affected_opportunities}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      Revenue at Risk:{' '}
                      <span className="font-semibold text-gray-900">
                        ₹{driver.revenue_at_risk.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      Avg Risk Score:{' '}
                      <span className="font-semibold text-gray-900">
                        {driver.average_risk_score}
                      </span>
                    </div>
                    <div>
                      Recoverable:{' '}
                      <span className="font-semibold text-green-600">
                        ₹{driver.recoverable_revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
