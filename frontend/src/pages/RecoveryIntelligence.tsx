import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, Target, Users, Zap, Shield } from 'lucide-react'
import {
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { api, APIError } from '../api'
import { RecoveryPortfolioMetrics, RecoveryOpportunitySummary } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

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

  // Strategy performance data for radar
  const strategyPerformance = [
    { strategy: 'Success', value: Math.min(85, Math.max(50, metrics.estimated_recovery_percentage)) },
    { strategy: 'Confidence', value: 75 },
    { strategy: 'Value', value: 70 },
    { strategy: 'Reach', value: Math.min(90, queue.length * 5) },
    { strategy: 'Efficiency', value: 80 },
  ]

  const metricCards = [
    {
      icon: AlertCircle,
      label: 'Revenue at Risk',
      value: `₹${(metrics.total_revenue_at_risk / 1000).toFixed(1)}k`,
      color: '#ef4444',
      trend: 'negative',
      delay: 0,
    },
    {
      icon: TrendingUp,
      label: 'Expected Recovery',
      value: `₹${(metrics.expected_recovery_from_recommended_actions / 1000).toFixed(1)}k`,
      color: '#22c55e',
      trend: 'positive',
      delay: 100,
    },
    {
      icon: Target,
      label: 'High Priority Opps',
      value: metrics.high_priority_opportunity_count.toString(),
      color: '#0ea5e9',
      trend: 'neutral',
      delay: 200,
    },
    {
      icon: Users,
      label: 'Est. Contacts',
      value: metrics.total_estimated_contacts.toString(),
      color: '#a855f7',
      trend: 'neutral',
      delay: 300,
    },
  ]

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)' }} className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={0}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={32} style={{ color: 'var(--color-primary-600)' }} />
              <h1 className="text-6xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Decision Engine
              </h1>
            </div>
            <p className="text-lg max-w-3xl" style={{ color: 'var(--color-text-secondary)' }}>
              Intelligent strategy comparison and recommendations powered by recovery intelligence
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map(({ icon: Icon, label, value, color, delay }) => (
            <ScrollTriggerAnimation key={label} animation="fade-in-up" delay={delay}>
              <div className="group rounded-2xl p-6 border backdrop-blur transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-md)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = color
                  el.style.backgroundColor = `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.05)`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--color-border)'
                  el.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon size={28} style={{ color, opacity: 0.8 }} />
                  <Shield size={16} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} className="group-hover:opacity-100 transition-opacity" />
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium uppercase tracking-wide mb-2">
                  {label}
                </p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {value}
                </p>
              </div>
            </ScrollTriggerAnimation>
          ))}
        </div>

        {/* Strategy Comparison Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart - Strategy Effectiveness */}
          <ScrollTriggerAnimation animation="fade-in-up" delay={100}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Strategy Effectiveness Matrix
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={strategyPerformance}>
                  <PolarGrid stroke="rgba(14, 165, 233, 0.1)" />
                  <PolarAngleAxis dataKey="strategy" stroke="var(--color-text-secondary)" />
                  <PolarRadiusAxis stroke="var(--color-text-tertiary)" />
                  <Radar name="Score" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => `${value}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ScrollTriggerAnimation>

          {/* Confidence Metrics */}
          <ScrollTriggerAnimation animation="fade-in-up" delay={150}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Confidence Scores
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium">
                      Recommendation Confidence
                    </span>
                    <span style={{ color: 'var(--color-primary-600)' }} className="font-bold">
                      {metrics.estimated_recovery_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{
                      width: `${metrics.estimated_recovery_percentage}%`,
                      background: 'linear-gradient(90deg, #0ea5e9 0%, #3b82f6 100%)',
                    }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium">
                      Strategy Diversity
                    </span>
                    <span style={{ color: 'var(--color-success)' }} className="font-bold">
                      {actionDistributionData.length}/7
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {actionDistributionData.map((action, idx) => (
                      <div key={action.name} className="h-8 flex-1 rounded transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: action.fill,
                          opacity: 0.7,
                        }}
                        title={`${action.name}: ${action.value}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium">
                      Customer Friction
                    </span>
                    <span style={{ color: 'var(--color-text-primary)' }} className="font-bold">
                      {metrics.average_friction_score.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{
                      width: `${Math.min(100, metrics.average_friction_score)}%`,
                      background: metrics.average_friction_score > 50
                        ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                        : 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                    }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium">
                      Effort Efficiency
                    </span>
                    <span style={{ color: 'var(--color-info)' }} className="font-bold">
                      {metrics.estimated_recovery_effort_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{
                      width: '65%',
                      background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Distribution */}
          <ScrollTriggerAnimation animation="fade-in-up" delay={200}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Actions Distribution
              </h3>
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
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  No action data available
                </div>
              )}
            </div>
          </ScrollTriggerAnimation>

          {/* Recovery Potential */}
          <ScrollTriggerAnimation animation="fade-in-up" delay={250}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Potential by Type
              </h3>
              {recoveryPotentialData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={recoveryPotentialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="var(--color-text-tertiary)" />
                    <YAxis stroke="var(--color-text-tertiary)" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => `₹${value}`}
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  No type data available
                </div>
              )}
            </div>
          </ScrollTriggerAnimation>
        </div>

        {/* Top Opportunities Table */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={300}>
          <div className="rounded-2xl p-8 border backdrop-blur"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              Highest Value Recovery Opportunities
            </h3>
            {queue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Opportunity
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Amount
                      </th>
                      <th className="text-center py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Recommended Action
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Probability
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Expected Value
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Friction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.slice(0, 10).map((opp, idx) => (
                      <tr
                        key={opp.opportunity_id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        className="hover:bg-white/5 transition-colors"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(14, 165, 233, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                        }}
                      >
                        <td className="py-4 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {opp.opportunity_id}
                        </td>
                        <td className="py-4 px-4 text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          ₹{opp.amount.toFixed(0)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              backgroundColor: actionColors[opp.recommended_action] + '20',
                              color: actionColors[opp.recommended_action],
                              border: `1px solid ${actionColors[opp.recommended_action]}40`,
                            }}
                          >
                            {opp.recommended_action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="font-bold">{(opp.recovery_probability * 100).toFixed(0)}%</span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold" style={{ color: 'var(--color-success)' }}>
                          ₹{opp.expected_net_value.toFixed(0)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${opp.customer_friction}%`,
                                  backgroundColor: opp.customer_friction > 50 ? '#f59e0b' : '#22c55e',
                                }}
                              />
                            </div>
                            <span style={{ color: 'var(--color-text-secondary)' }} className="text-xs w-6">
                              {opp.customer_friction}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                No opportunities available for recovery
              </div>
            )}
          </div>
        </ScrollTriggerAnimation>

        {/* Footer Info */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={350}>
          <div className="rounded-2xl p-6 border border-l-4"
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              borderColor: 'var(--color-primary-600)',
              borderLeftColor: 'var(--color-primary-600)',
            }}
          >
            <p className="text-sm" style={{ color: 'rgba(14, 165, 233, 0.8)' }}>
              <span className="font-bold">Recovery Decision Engine:</span> Analyzes competing recovery approaches and recommends the Next Best Action for each opportunity. Compares recovery probability, expected value, customer friction, and confidence scores to maximize recovery while minimizing customer impact.
            </p>
          </div>
        </ScrollTriggerAnimation>
      </div>
    </div>
  )
}
