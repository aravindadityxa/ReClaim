import { useEffect, useState, useRef, useMemo } from 'react'
import { AlertTriangle, TrendingUp, BarChart3, Activity, Zap } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function RiskIntelligence() {
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [queue, setQueue] = useState<RiskOpportunityInfo[]>([])
  const [drivers, setDrivers] = useState<RiskDriver[]>([])
  const [trend, setTrend] = useState<RiskTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasInViewRef = useRef<boolean>(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load critical data first (3 endpoints)
      const [summaryData, queueData, driversData] = await Promise.all([
        api.risk.getSummary(),
        api.risk.getQueue(20),
        api.risk.getDrivers(),
      ])

      setSummary(summaryData)
      setQueue(queueData)
      setDrivers(driversData)
      setLoading(false)

      // Load secondary trend data after page renders (non-blocking)
      try {
        const trendData = await api.risk.getTrend(30)
        setTrend(trendData)
      } catch (trendErr) {
        // Trend is optional, continue without it
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to load risk intelligence: ${err.message}`)
      } else {
        setError('Failed to load risk intelligence')
      }
      setLoading(false)
    }
  }

  // Only animate canvas when in view (Intersection Observer)
  useEffect(() => {
    if (!canvasRef.current) return

    const observer = new IntersectionObserver(([entry]) => {
      canvasInViewRef.current = entry.isIntersecting
    })

    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [])

  // Animated signal pulses - only runs when in view
  useEffect(() => {
    if (!canvasInViewRef.current || !canvasRef.current || !summary) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    let animationId: number
    let time = 0

    const animate = () => {
      if (!canvasInViewRef.current) {
        animationId = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const pulseCount = Math.min(3, summary.critical_opportunity_count)
      
      for (let i = 0; i < pulseCount; i++) {
        const pulse = (time + i * 500) % 2000
        const progress = pulse / 2000
        const radius = progress * 150
        const opacity = (1 - progress) * 0.8

        ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`
        ctx.beginPath()
        ctx.arc(
          (canvas.width / (pulseCount + 1)) * (i + 1),
          canvas.height / 2,
          radius,
          0,
          Math.PI * 2
        )
        ctx.fill()
      }

      time += 30
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [summary])

  // Memoize risk distribution to avoid recalculating
  const riskDistribution = useMemo(() => {
    if (!summary || !queue) return []
    return [
      { level: 'Critical', count: summary.critical_opportunity_count, color: '#ef4444' },
      { level: 'High', count: Math.max(0, summary.high_risk_opportunity_count - summary.critical_opportunity_count), color: '#f97316' },
      { level: 'Medium', count: Math.max(0, queue.length - summary.high_risk_opportunity_count), color: '#eab308' },
      { level: 'Low', count: Math.max(0, 0), color: '#10b981' },
    ].filter(d => d.count > 0)
  }, [summary, queue.length])

  // Memoize risk breakdown
  const riskBreakdown = useMemo(() => {
    return drivers.slice(0, 5).map(d => ({
      name: d.driver.substring(0, 20),
      value: d.affected_opportunities,
      color: '#0ea5e9',
    }))
  }, [drivers])

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadData} />
  if (!summary) return <ErrorState message="No risk data available" />

  return (
    <div className="relative min-h-screen">
      <CinematicBackground withParticles={true} intensity="medium" />
      
      <div className="relative z-10 space-y-12 p-8 max-w-7xl mx-auto">
        
        {/* HERO SECTION */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={0}>
          <div className="relative overflow-hidden rounded-2xl p-12 backdrop-blur-sm border border-cyan-500/20"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backgroundImage: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            }}
          >
            <div className="flex items-center gap-6 mb-6">
              <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                RISK INTELLIGENCE ANALYSIS
              </h1>
            </div>
            
            <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
              Real-time ML-powered risk analysis environment. Monitor customer revenue risks, detect patterns, 
              and take strategic action across your portfolio with precision analytics.
            </p>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-cyan-500/20">
              <div>
                <p className="text-sm text-gray-400">Risk Score</p>
                <p className="text-2xl font-bold text-cyan-400">{summary.average_risk_score.toFixed(1)}/100</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">At-Risk Revenue</p>
                <p className="text-2xl font-bold text-orange-400">₹{(summary.high_risk_revenue / 1000000).toFixed(1)}M</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Critical Cases</p>
                <p className="text-2xl font-bold text-red-400">{summary.critical_opportunity_count}</p>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* RISK HEATMAP & KEY METRICS */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={200}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Risk Level Distribution */}
            <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-6">Risk Level Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ level, count }) => `${level} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Key Metrics Overview */}
            <div className="space-y-4">
              <ScrollTriggerAnimation animation="scale-in" delay={250}>
                <div className="rounded-xl p-6 border border-cyan-500/20 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backgroundImage: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-400 mb-2">High Risk Revenue</p>
                      <p className="text-3xl font-bold text-red-400">₹{(summary.high_risk_revenue / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-gray-500 mt-2">{summary.high_risk_opportunity_count} opportunities</p>
                    </div>
                    <AlertTriangle className="w-12 h-12 text-red-500/30" />
                  </div>
                </div>
              </ScrollTriggerAnimation>

              <ScrollTriggerAnimation animation="scale-in" delay={300}>
                <div className="rounded-xl p-6 border border-cyan-500/20 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backgroundImage: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, transparent 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-400 mb-2">Total Expected Loss</p>
                      <p className="text-3xl font-bold text-orange-400">₹{(summary.total_expected_loss / 1000000).toFixed(2)}M</p>
                      <p className="text-xs text-gray-500 mt-2">Model F1: {(summary.model_performance_f1 * 100).toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-orange-500/30" />
                  </div>
                </div>
              </ScrollTriggerAnimation>

              <ScrollTriggerAnimation animation="scale-in" delay={350}>
                <div className="rounded-xl p-6 border border-cyan-500/20 backdrop-blur-sm"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backgroundImage: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, transparent 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-400 mb-2">Critical Cases</p>
                      <p className="text-3xl font-bold text-cyan-400">{summary.critical_opportunity_count}</p>
                      <p className="text-xs text-gray-500 mt-2">Requiring immediate attention</p>
                    </div>
                    <BarChart3 className="w-12 h-12 text-cyan-500/30" />
                  </div>
                </div>
              </ScrollTriggerAnimation>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* SIGNAL PULSES */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={250}>
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded bg-red-500/20">
                <Activity className="w-5 h-5 text-red-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white">High-Risk Signal Activity</h2>
            </div>

            <div className="relative bg-black/30 rounded-xl p-8 border border-cyan-500/10 overflow-hidden" style={{ height: '200px' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
              />
              <div className="relative z-10 flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Signal pulses from critical risk zones</p>
                  <p className="text-xs text-gray-500 mt-2">Monitoring {summary.critical_opportunity_count} critical cases</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* PRIORITY REVENUE RISK QUEUE */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={300}>
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Priority Risk Queue</h2>
            <RiskQueue opportunities={queue} />
          </div>
        </ScrollTriggerAnimation>

        {/* RISK TREND ANALYSIS - Loads asynchronously after page renders */}
        {trend && trend.length > 0 && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={350}>
            <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
              }}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Risk Trend Analysis (30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Opportunities', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Revenue at Risk (₹)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="opportunity_count"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={3}
                    name="Opportunities"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue_at_risk"
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={3}
                    name="Revenue at Risk"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ScrollTriggerAnimation>
        )}
      </div>
    </div>
  )
}
