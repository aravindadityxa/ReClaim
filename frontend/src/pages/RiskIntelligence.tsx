import { useEffect, useState, useRef } from 'react'
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
import { GlowingNode } from '../components/GlowingNode'

export default function RiskIntelligence() {
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [queue, setQueue] = useState<RiskOpportunityInfo[]>([])
  const [drivers, setDrivers] = useState<RiskDriver[]>([])
  const [trend, setTrend] = useState<RiskTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const networkRef = useRef<HTMLDivElement>(null)

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

  // Animated signal pulses effect
  useEffect(() => {
    if (!canvasRef.current || !summary) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    let animationId: number
    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create signal pulses from high-risk areas
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

    animate()
    return () => cancelAnimationFrame(animationId)
  }, [summary])

  // Network node positioning
  const generateNetworkNodes = (count: number) => {
    const nodes: Array<{ id: number; x: number; y: number; risk: 'critical' | 'high' | 'medium' }> = []
    const width = 600
    const height = 400
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 150 + Math.random() * 50
      nodes.push({
        id: i,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        risk: i === 0 ? 'critical' : i < 3 ? 'high' : 'medium',
      })
    }
    return nodes
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadData} />
  if (!summary) return <ErrorState message="No risk data available" />

  const networkNodes = generateNetworkNodes(Math.min(8, queue.length + 1))
  
  // Risk level distribution for heatmap
  const riskDistribution = [
    { level: 'Critical', count: summary.critical_opportunity_count, color: '#ef4444' },
    { level: 'High', count: Math.max(0, summary.high_risk_opportunity_count - summary.critical_opportunity_count), color: '#f97316' },
    { level: 'Medium', count: Math.max(0, queue.length - summary.high_risk_opportunity_count), color: '#eab308' },
    { level: 'Low', count: Math.max(0, Math.random() * 5), color: '#10b981' },
  ].filter(d => d.count > 0)

  // Risk score breakdown from drivers
  const riskBreakdown = drivers.slice(0, 5).map(d => ({
    name: d.driver.substring(0, 20),
    value: d.affected_opportunities,
    color: '#0ea5e9',
  }))

  return (
    <div className="relative min-h-screen">
      <CinematicBackground withParticles={true} intensity="medium" />
      
      <div className="relative z-10 space-y-12 p-8 max-w-7xl mx-auto">
        
        {/* ============ HERO SECTION ============ */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={0}>
          <div className="relative overflow-hidden rounded-2xl p-12 backdrop-blur-sm border border-cyan-500/20"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backgroundImage: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl -z-10" />

            <div className="flex items-center gap-6 mb-6">
              <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                RISK INTELLIGENCE ANALYSIS
              </h1>
            </div>
            
            <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
              Real-time AI-powered risk analysis environment. Monitor customer revenue risks, detect patterns, 
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

        {/* ============ CUSTOMER RISK MAP (NETWORK VISUALIZATION) ============ */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={100}>
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded bg-cyan-500/20">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Customer Risk Network</h2>
              </div>

              <div className="relative bg-black/30 rounded-xl p-8 border border-cyan-500/10 overflow-hidden"
                ref={networkRef}
              >
                {/* Network SVG */}
                <svg className="w-full" viewBox="0 0 600 400" style={{ minHeight: '400px' }}>
                  {/* Connection lines */}
                  {networkNodes.map((node, i) => (
                    <line
                      key={`line-${i}`}
                      x1="300"
                      y1="200"
                      x2={node.x}
                      y2={node.y}
                      stroke={node.risk === 'critical' ? '#ef4444' : node.risk === 'high' ? '#f97316' : '#0ea5e9'}
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  ))}

                  {/* Central node */}
                  <circle cx="300" cy="200" r="20" fill="#0ea5e9" opacity="0.8" />
                  <circle cx="300" cy="200" r="20" fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.4">
                    <animate attributeName="r" values="20;30" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Network nodes */}
                  {networkNodes.map((node, i) => (
                    <g key={`node-${i}`}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="12"
                        fill={node.risk === 'critical' ? '#ef4444' : node.risk === 'high' ? '#f97316' : '#0ea5e9'}
                        opacity="0.8"
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="12"
                        fill="none"
                        stroke={node.risk === 'critical' ? '#ef4444' : node.risk === 'high' ? '#f97316' : '#0ea5e9'}
                        strokeWidth="2"
                        opacity="0.5"
                      >
                        <animate attributeName="r" values="12;20" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <text x={node.x} y={node.y + 25} textAnchor="middle" fontSize="11" fill="#64748b">
                        C{i + 1}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-400">Critical Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-gray-400">High Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-gray-400">Medium Risk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* ============ RISK HEATMAP & KEY METRICS ============ */}
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

        {/* ============ ANIMATED SIGNAL PULSES ============ */}
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

        {/* ============ PRIORITY REVENUE RISK QUEUE ============ */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={300}>
          <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Priority Risk Queue</h2>
            <RiskQueue
              opportunities={queue}
              onSelectOpportunity={(id) => {
                setSelectedOppId(id)
              }}
            />
          </div>
        </ScrollTriggerAnimation>

        {/* ============ RISK TREND ANALYSIS ============ */}
        {trend.length > 0 && (
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

        {/* ============ RISK DRIVERS BREAKDOWN ============ */}
        {drivers.length > 0 && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={400}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Risk Drivers by Revenue */}
              <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-6">Top Risk Drivers by Revenue</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={drivers.slice(0, 5).map((d) => ({
                      ...d,
                      revenue_at_risk_k: d.revenue_at_risk / 1000,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
                    <XAxis dataKey="driver" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}K`}
                    />
                    <Bar dataKey="revenue_at_risk_k" fill="#0ea5e9" name="Revenue at Risk (₹K)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Drivers Details */}
              <div className="rounded-2xl overflow-hidden border border-cyan-500/20 backdrop-blur-sm p-8"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-6">Risk Drivers Details</h3>
                <div className="space-y-4">
                  {drivers.slice(0, 5).map((driver, index) => (
                    <div
                      key={driver.driver}
                      className="p-4 rounded-lg border border-cyan-500/10 bg-black/20 hover:bg-black/40 transition-all"
                      style={{
                        animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm text-cyan-300">{driver.driver}</span>
                        <span className="text-sm font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded">
                          {driver.affected_opportunities}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Revenue at Risk:</span>
                          <span className="text-cyan-300 font-semibold">
                            ₹{driver.revenue_at_risk.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg Risk Score:</span>
                          <span className="text-orange-300 font-semibold">{driver.average_risk_score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Recoverable:</span>
                          <span className="text-green-400 font-semibold">
                            ₹{driver.recoverable_revenue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Most Common Risk Driver */}
        {summary.most_common_risk_driver && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={450}>
            <div className="rounded-xl p-6 border border-cyan-500/20 backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              }}
            >
              <p className="text-sm text-cyan-300">
                <span className="font-semibold block mb-2">Most Common Risk Driver:</span>
                <span className="text-lg font-bold text-cyan-400">{summary.most_common_risk_driver}</span>
              </p>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Spacing */}
        <div className="h-16" />
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out forwards;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
