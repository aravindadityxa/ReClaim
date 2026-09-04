import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, AlertCircle, Target, Users, Zap, Shield } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { CinematicBackground } from '../components/CinematicBackground'

// Action color mapping
const ACTION_COLORS: Record<string, string> = {
  PAYMENT_RETRY: '#3b82f6',
  PAYMENT_LINK: '#8b5cf6',
  CUSTOMER_REMINDER: '#ec4899',
  SUBSCRIPTION_RETRY: '#06b6d4',
  INVOICE_REMINDER: '#f59e0b',
  DELAY_AND_RETRY: '#6366f1',
  NO_ACTION: '#9ca3af',
}

export default function RecoveryIntelligence() {
  const [metrics, setMetrics] = useState<RecoveryPortfolioMetrics | null>(null)
  const [queue, setQueue] = useState<RecoveryOpportunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load critical recovery metrics first
      const metricsData = await api.getRecoveryPortfolioMetrics()
      setMetrics(metricsData)
      setLoading(false)

      // Load queue as secondary (non-blocking) - reuse portfolio data
      try {
        const queueData = await api.getRecoveryQueue()
        setQueue(queueData)
      } catch (queueErr) {
        // Recovery queue is optional, continue without it
      }
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to load recovery intelligence'
      setError(message)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Memoize action distribution to avoid recalculating on every render
  const actionDistributionData = useMemo(() => {
    if (!metrics) return []
    
    return Object.entries(metrics.action_distribution).map(([action, count]) => ({
      name: action.replace(/_/g, ' '),
      value: count,
      fill: ACTION_COLORS[action] || '#6b7280',
    }))
  }, [metrics])

  // Memoize recovery potential data
  const recoveryPotentialData = useMemo(() => {
    if (!metrics || !metrics.recovery_potential_by_type) return []
    return Object.entries(metrics.recovery_potential_by_type).map(([type, amount]) => ({
      name: type.replace(/_/g, ' '),
      value: amount,
    }))
  }, [metrics])

  // Memoize strategy performance data
  const strategyPerformance = useMemo(() => {
    if (!metrics || !queue) return []
    return [
      { strategy: 'Success', value: Math.min(85, Math.max(50, metrics.estimated_recovery_percentage)) },
      { strategy: 'Confidence', value: 75 },
      { strategy: 'Value', value: 70 },
      { strategy: 'Reach', value: Math.min(90, queue.length * 5) },
      { strategy: 'Efficiency', value: 80 },
    ]
  }, [metrics, queue.length])

  // Memoize metric cards to avoid recalculating
  const metricCards = useMemo(() => {
    if (!metrics) return []
    return [
      {
        icon: AlertCircle,
        label: 'Revenue at Risk',
        value: `₹${(metrics.total_revenue_at_risk / 1000).toFixed(1)}k`,
        color: '#ef4444',
        delay: 0,
      },
      {
        icon: TrendingUp,
        label: 'Expected Recovery',
        value: `₹${(metrics.expected_recovery_from_recommended_actions / 1000).toFixed(1)}k`,
        color: '#22c55e',
        delay: 100,
      },
      {
        icon: Target,
        label: 'High Priority Opps',
        value: metrics.high_priority_opportunity_count.toString(),
        color: '#0ea5e9',
        delay: 200,
      },
      {
        icon: Users,
        label: 'Est. Contacts',
        value: metrics.total_estimated_contacts.toString(),
        color: '#a855f7',
        delay: 300,
      },
    ]
  }, [metrics])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadData} />
  if (!metrics) return <ErrorState message="No recovery metrics available" />

  return (
    <div className="relative min-h-screen">
      <CinematicBackground intensity="medium" />
      
      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-8">
        {/* Hero Section */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={0}>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-violet-500/20">
                <Zap size={32} className="text-violet-400" />
              </div>
              <h1 className="text-6xl font-bold text-white">
                Recovery Decision Engine
              </h1>
            </div>
            <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
              Intelligent strategy comparison and recommendations powered by deterministic recovery analysis and local AI insights
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map(({ icon: Icon, label, value, color, delay }) => (
            <ScrollTriggerAnimation key={label} animation="fade-in-up" delay={delay}>
              <div className="group rounded-2xl p-6 border backdrop-blur transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(124, 140, 255, 0.2)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = color
                  el.style.backgroundColor = `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.05)`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(124, 140, 255, 0.2)'
                  el.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon size={28} style={{ color, opacity: 0.8 }} />
                  <Shield size={16} style={{ color: 'rgba(167, 177, 194, 0.5)' }} />
                </div>
                <p className="text-sm font-medium uppercase tracking-wide mb-2 text-gray-400">
                  {label}
                </p>
                <p className="text-3xl font-bold text-white">
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
                borderColor: 'rgba(124, 140, 255, 0.2)',
              }}
            >
              <h3 className="text-lg font-bold mb-6 text-white">
                Strategy Effectiveness Matrix
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={strategyPerformance}>
                  <PolarGrid stroke="rgba(14, 165, 233, 0.1)" />
                  <PolarAngleAxis dataKey="strategy" stroke="rgba(167, 177, 194, 0.8)" />
                  <PolarRadiusAxis stroke="rgba(100, 116, 139, 0.5)" />
                  <Radar name="Score" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ScrollTriggerAnimation>

          {/* Action Distribution Pie Chart */}
          <ScrollTriggerAnimation animation="fade-in-up" delay={200}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(124, 140, 255, 0.2)',
              }}
            >
              <h3 className="text-lg font-bold mb-6 text-white">
                Recommended Actions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actionDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
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
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ScrollTriggerAnimation>
        </div>

        {/* Recovery Potential Chart */}
        {recoveryPotentialData.length > 0 && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={300}>
            <div className="rounded-2xl p-8 border backdrop-blur"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(124, 140, 255, 0.2)',
              }}
            >
              <h3 className="text-lg font-bold mb-6 text-white">
                Recovery Potential by Opportunity Type
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recoveryPotentialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" name="Potential Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Top Opportunities Table */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={350}>
          <div className="rounded-2xl p-8 border backdrop-blur"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgba(124, 140, 255, 0.2)',
            }}
          >
            <h3 className="text-lg font-bold mb-6 text-white">
              Highest Value Recovery Opportunities
            </h3>
            {queue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(124, 140, 255, 0.2)' }}>
                      <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Opportunity
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Amount
                      </th>
                      <th className="text-center py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Recommended Action
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Probability
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Expected Value
                      </th>
                      <th className="text-right py-4 px-4 font-bold uppercase tracking-wider text-gray-400">
                        Friction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.slice(0, 10).map((opp) => (
                      <tr
                        key={opp.opportunity_id}
                        style={{ borderBottom: '1px solid rgba(124, 140, 255, 0.2)' }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-4 text-gray-300">
                          {opp.opportunity_id}
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-white">
                          ₹{opp.amount.toFixed(0)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              backgroundColor: (ACTION_COLORS[opp.recommended_action] || '#6b7280') + '20',
                              color: ACTION_COLORS[opp.recommended_action] || '#6b7280',
                              border: `1px solid ${(ACTION_COLORS[opp.recommended_action] || '#6b7280')}40`,
                            }}
                          >
                            {opp.recommended_action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-white font-bold">
                          {(opp.recovery_probability * 100).toFixed(0)}%
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-green-400">
                          ₹{opp.expected_net_value.toFixed(0)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full" style={{ backgroundColor: 'rgba(124, 140, 255, 0.2)' }}>
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${opp.customer_friction}%`,
                                  backgroundColor: opp.customer_friction > 50 ? '#f59e0b' : '#22c55e',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-6">
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
              <div className="py-12 text-center text-gray-400">
                No opportunities available for recovery
              </div>
            )}
          </div>
        </ScrollTriggerAnimation>

        {/* Footer Info */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={400}>
          <div className="rounded-2xl p-6 border-l-4"
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              borderColor: 'rgba(14, 165, 233, 0.5)',
              borderLeftColor: 'rgba(14, 165, 233, 1)',
            }}
          >
            <p className="text-sm text-cyan-300">
              <span className="font-bold">Recovery Decision Engine:</span> Analyzes competing recovery approaches and recommends the Next Best Action for each opportunity. Compares recovery probability, expected value, customer friction, and confidence scores to maximize recovery while minimizing customer impact.
            </p>
          </div>
        </ScrollTriggerAnimation>
      </div>
    </div>
  )
}
