import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
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
import {
  DashboardSummary,
  DashboardTrend,
} from '../types'
import Metric from '../components/Metric'
import HealthScore from '../components/HealthScore'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [trend, setTrend] = useState<DashboardTrend | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [summaryData, trendData] = await Promise.all([
        api.dashboard.getSummary(),
        api.dashboard.getTrend(30),
      ])
      setSummary(summaryData)
      setTrend(trendData)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to load dashboard: ${err.message}`)
      } else {
        setError('Failed to load dashboard data')
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
  if (!summary || !trend) return <ErrorState message="No data available" />

  const riskTrendIcon =
    trend.risk_trend === 'INCREASING' ? (
      <TrendingUp className="text-red-600" size={20} />
    ) : trend.risk_trend === 'DECREASING' ? (
      <TrendingDown className="text-green-600" size={20} />
    ) : null

  const riskTrendColor =
    trend.risk_trend === 'INCREASING'
      ? 'text-red-600'
      : trend.risk_trend === 'DECREASING'
        ? 'text-green-600'
        : 'text-gray-600'

  const chartColors = {
    successful: '#10b981',
    failed: '#ef4444',
    payment: '#3b82f6',
    subscription: '#f59e0b',
    checkout: '#8b5cf6',
    invoice: '#ec4899',
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
          Key Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Metric
            label="Total Revenue"
            value={`₹${summary.total_revenue.toLocaleString('en-IN')}`}
            subtext={`${summary.payment_success_rate.toFixed(1)}% success rate`}
            icon={<TrendingUp size={24} />}
          />
          <Metric
            label="Revenue at Risk"
            value={`₹${summary.revenue_at_risk.toLocaleString('en-IN')}`}
            subtext={`${summary.opportunity_count.AT_RISK + summary.opportunity_count.RECOVERABLE} opportunities`}
            icon={<TrendingDown size={24} className="text-red-600" />}
          />
          <Metric
            label="Estimated Recoverable"
            value={`₹${summary.estimated_recoverable.toLocaleString('en-IN')}`}
            subtext="Based on current data"
            icon={<TrendingUp size={24} className="text-green-600" />}
          />
          <Metric
            label="Recovered Revenue"
            value={`₹${summary.recovered_revenue.toLocaleString('en-IN')}`}
            subtext={`${summary.opportunity_count.RECOVERED} recovered`}
            icon={<TrendingUp size={24} className="text-blue-600" />}
          />
        </div>
      </div>

      {/* Health Score and Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HealthScore score={summary.health.score} components={summary.health.components} />
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
            Risk Trend
          </h3>
          <div className="flex items-center gap-4 py-6">
            {riskTrendIcon && <div>{riskTrendIcon}</div>}
            <div>
              <p className={`text-3xl font-bold ${riskTrendColor}`}>
                {trend.risk_trend}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Risk is {trend.risk_trend.toLowerCase()} over past 30 days
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Opportunity Status
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Recoverable</span>
                <span className="font-semibold">{summary.opportunity_count.RECOVERABLE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">At Risk</span>
                <span className="font-semibold">{summary.opportunity_count.AT_RISK}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recovered</span>
                <span className="font-semibold">{summary.opportunity_count.RECOVERED}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lost</span>
                <span className="font-semibold">{summary.opportunity_count.LOST}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
          Revenue Trend (30 days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="successful"
              stroke={chartColors.successful}
              dot={false}
              strokeWidth={2}
              name="Successful"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke={chartColors.failed}
              dot={false}
              strokeWidth={2}
              name="Failed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
            Risk Breakdown by Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: 'Payment Failure',
                    value: trend.risk_breakdown.PAYMENT_FAILURE,
                  },
                  {
                    name: 'Subscription Failure',
                    value: trend.risk_breakdown.SUBSCRIPTION_FAILURE,
                  },
                  {
                    name: 'Checkout Abandonment',
                    value: trend.risk_breakdown.CHECKOUT_ABANDONMENT,
                  },
                  {
                    name: 'Invoice Delay',
                    value: trend.risk_breakdown.INVOICE_DELAY,
                  },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  value > 0 ? `${name}: ₹${value.toLocaleString('en-IN')}` : ''
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill={chartColors.payment} />
                <Cell fill={chartColors.subscription} />
                <Cell fill={chartColors.checkout} />
                <Cell fill={chartColors.invoice} />
              </Pie>
              <Tooltip
                formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
            Risk Breakdown Details
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Payment Failure</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{trend.risk_breakdown.PAYMENT_FAILURE.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (trend.risk_breakdown.PAYMENT_FAILURE / Math.max(1, trend.risk_breakdown.PAYMENT_FAILURE)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Subscription Failure</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{trend.risk_breakdown.SUBSCRIPTION_FAILURE.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (trend.risk_breakdown.SUBSCRIPTION_FAILURE / Math.max(1, trend.risk_breakdown.PAYMENT_FAILURE)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Checkout Abandonment</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{trend.risk_breakdown.CHECKOUT_ABANDONMENT.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (trend.risk_breakdown.CHECKOUT_ABANDONMENT / Math.max(1, trend.risk_breakdown.PAYMENT_FAILURE)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Invoice Delay</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{trend.risk_breakdown.INVOICE_DELAY.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (trend.risk_breakdown.INVOICE_DELAY / Math.max(1, trend.risk_breakdown.PAYMENT_FAILURE)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
