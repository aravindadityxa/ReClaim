import { useEffect, useState } from 'react'
import { Zap, Shield, Target, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api, APIError } from '../api'
import { DashboardSummary, DashboardTrend } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { CinematicBackground } from '../components/CinematicBackground'
import { RevenueFlowVisualization } from '../components/RevenueFlowVisualization'
import { AnimatedDataStream } from '../components/AnimatedDataStream'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'
import { ParallaxSection } from '../components/ParallaxSection'
import MetricCard from '../components/MetricCard'
import PremiumCard from '../components/PremiumCard'
import SectionHeader from '../components/SectionHeader'

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Cinematic background */}
      <CinematicBackground withParticles intensity="subtle" />

      {/* Main content */}
      <div className="relative z-10 space-y-8">
        {/* ================================================================
            HERO SECTION
            ================================================================ */}
        <section className="relative py-24 px-8 flex items-center justify-center min-h-[60vh]">
          <ParallaxSection intensity={0.3} className="text-center w-full">
            <div className="max-w-4xl mx-auto">
              <ScrollTriggerAnimation animation="fade-in-down" threshold={0.3}>
                <p
                  className="text-sm font-semibold tracking-widest uppercase mb-6"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Revenue Recovery Intelligence
                </p>
              </ScrollTriggerAnimation>

              <ScrollTriggerAnimation animation="fade-in-up" delay={150} threshold={0.3}>
                <h1
                  className="text-6xl md:text-7xl font-bold tracking-tight mb-6"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  ReClaim
                </h1>
              </ScrollTriggerAnimation>

              <ScrollTriggerAnimation animation="fade-in-up" delay={300} threshold={0.3}>
                <p
                  className="text-2xl md:text-3xl font-light mb-12"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Intelligent detection, analysis, and recovery of revenue leakage
                </p>
              </ScrollTriggerAnimation>

              <ScrollTriggerAnimation animation="scale-in" delay={450} threshold={0.3}>
                <div className="mt-8 max-w-2xl mx-auto">
                  <AnimatedDataStream intensity={3} height={150} />
                </div>
              </ScrollTriggerAnimation>
            </div>
          </ParallaxSection>
        </section>

        {/* ================================================================
            KEY METRICS - COMMAND CENTER
            ================================================================ */}
        <section className="relative py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollTriggerAnimation animation="fade-in-up" threshold={0.2}>
              <SectionHeader
                title="System Status"
                subtitle="Real-time metrics and health indicators"
              />
            </ScrollTriggerAnimation>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'Revenue at Risk',
                  value: `₹${(summary.revenue_at_risk / 1000000).toFixed(1)}M`,
                  icon: <Zap size={20} />,
                  trend:
                    trend.risk_trend === 'INCREASING'
                      ? 'up'
                      : trend.risk_trend === 'DECREASING'
                        ? 'down'
                        : 'stable',
                  trendValue: trend.risk_trend,
                  delay: 0,
                },
                {
                  label: 'Recoverable',
                  value: `₹${(summary.estimated_recoverable / 1000000).toFixed(1)}M`,
                  icon: <Target size={20} />,
                  trend: 'stable',
                  trendValue: 'Stable',
                  delay: 100,
                },
                {
                  label: 'Already Recovered',
                  value: `₹${(summary.recovered_revenue / 1000000).toFixed(1)}M`,
                  icon: <Activity size={20} />,
                  trend: 'up',
                  trendValue: 'Growing',
                  delay: 200,
                },
                {
                  label: 'Health Score',
                  value: `${Math.round(summary.health.score)}/100`,
                  icon: <Shield size={20} />,
                  trend: 'stable',
                  trendValue: 'Optimal',
                  delay: 300,
                },
              ].map((metric, idx) => (
                <ScrollTriggerAnimation
                  key={idx}
                  animation="fade-in-up"
                  delay={metric.delay}
                  threshold={0.2}
                >
                  <MetricCard
                    label={metric.label}
                    value={metric.value}
                    icon={metric.icon}
                    trend={metric.trend as 'up' | 'down' | 'stable'}
                    trendValue={metric.trendValue}
                  />
                </ScrollTriggerAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            REVENUE FLOW VISUALIZATION
            ================================================================ */}
        <section className="relative py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollTriggerAnimation animation="fade-in-up" threshold={0.2}>
              <SectionHeader
                title="Revenue Recovery Lifecycle"
                subtitle="Real-time flow through detection and recovery stages"
              />
            </ScrollTriggerAnimation>

            <ScrollTriggerAnimation animation="scale-in" delay={150} threshold={0.2}>
              <PremiumCard elevated>
                <RevenueFlowVisualization
                  atRisk={summary.revenue_at_risk}
                  recovered={summary.recovered_revenue}
                  height={250}
                />
              </PremiumCard>
            </ScrollTriggerAnimation>
          </div>
        </section>

        {/* ================================================================
            SYSTEM HEALTH COMPONENTS
            ================================================================ */}
        <section className="relative py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollTriggerAnimation animation="fade-in-up" threshold={0.2}>
              <SectionHeader
                title="Health Components"
                subtitle="Detailed breakdown of system performance"
              />
            </ScrollTriggerAnimation>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: 'Payment Success',
                  value: Math.round(summary.health.components.payment_success),
                  color: 'var(--color-success)',
                },
                {
                  name: 'Risk Ratio',
                  value: Math.round(summary.health.components.risk_ratio),
                  color: 'var(--color-warning)',
                },
                {
                  name: 'Recovery Rate',
                  value: Math.round(summary.health.components.recovery_rate),
                  color: 'var(--color-flow-analyzed)',
                },
                {
                  name: 'Stability',
                  value: Math.round(summary.health.components.stability),
                  color: 'var(--color-flow-recovery)',
                },
              ].map((component, idx) => (
                <ScrollTriggerAnimation
                  key={idx}
                  animation="fade-in-up"
                  delay={idx * 100}
                  threshold={0.2}
                >
                  <PremiumCard>
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <svg
                          className="w-full h-full transform -rotate-90"
                          viewBox="0 0 100 100"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="var(--color-border)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={component.color}
                            strokeWidth="2"
                            strokeDasharray={`${(component.value / 100) * 283} 283`}
                            style={{
                              transition: 'stroke-dasharray 0.5s ease-out',
                              filter: `drop-shadow(0 0 8px ${component.color}40)`,
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className="text-lg font-bold"
                            style={{ color: component.color }}
                          >
                            {component.value}%
                          </span>
                        </div>
                      </div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {component.name}
                      </p>
                    </div>
                  </PremiumCard>
                </ScrollTriggerAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            TREND ANALYSIS
            ================================================================ */}
        <section className="relative py-24 px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollTriggerAnimation animation="fade-in-up" threshold={0.2}>
              <SectionHeader
                title="Revenue Trends"
                subtitle="30-day revenue and failure analysis"
              />
            </ScrollTriggerAnimation>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue trend */}
              <ScrollTriggerAnimation animation="fade-in-up" delay={0} threshold={0.2}>
                <PremiumCard elevated>
                  <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                    Revenue Flow
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trend.trend}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" stroke="var(--color-text-secondary)" />
                      <YAxis stroke="var(--color-text-secondary)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="var(--color-accent)"
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </PremiumCard>
              </ScrollTriggerAnimation>

              {/* Failure breakdown */}
              <ScrollTriggerAnimation animation="fade-in-up" delay={100} threshold={0.2}>
                <PremiumCard elevated>
                  <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                    Failure Breakdown
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(trend.risk_breakdown).map(([reason, count]) => {
                      const total = Object.values(trend.risk_breakdown).reduce((a, b) => a + b, 0)
                      const percentage = ((count / total) * 100).toFixed(1)
                      const colors: Record<string, string> = {
                        PAYMENT_FAILURE: 'var(--color-danger)',
                        SUBSCRIPTION_FAILURE: 'var(--color-warning)',
                        CHECKOUT_ABANDONMENT: 'var(--color-flow-recovery)',
                        INVOICE_DELAY: 'var(--color-flow-analyzed)',
                      }

                      return (
                        <div key={reason}>
                          <div className="flex justify-between mb-2">
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {reason.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm font-bold" style={{ color: colors[reason] || 'var(--color-accent)' }}>
                              {percentage}%
                            </p>
                          </div>
                          <div
                            className="w-full h-2 rounded-full"
                            style={{ backgroundColor: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: colors[reason] || 'var(--color-accent)',
                                boxShadow: `0 0 8px ${colors[reason]}80`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </PremiumCard>
              </ScrollTriggerAnimation>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <div className="h-20" />
      </div>
    </div>
  )
}
