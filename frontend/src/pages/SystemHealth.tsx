import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw,
  Database, Zap, Shield, Gauge, TrendingUp, Clock, XCircle, Cpu, Server, Radio
} from 'lucide-react'
import { api } from '../api'
import { SystemHealthResponse, OperationalMetrics, SystemStatus, OllamaHealthStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaHealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setError(null)

      const [healthRes, metricsRes, statusRes, ollamaRes] = await Promise.all([
        api.getSystemHealth(),
        api.getSystemMetrics(),
        api.getSystemStatus(),
        api.getOllamaStatus().catch(() => null),
      ])

      setHealth(healthRes)
      setMetrics(metricsRes)
      setStatus(statusRes)
      setOllamaStatus(ollamaRes)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    
    if (autoRefresh) {
      const interval = setInterval(loadData, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, loadData])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
      case 'unhealthy':
        return <XCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
      default:
        return <Activity className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
    }
  }

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'var(--color-success)'
      case 'degraded':
        return 'var(--color-warning)'
      case 'unhealthy':
        return 'var(--color-danger)'
      default:
        return 'var(--color-text-muted)'
    }
  }

  const ServiceCard = ({ name, status: svcStatus, message, details, icon: Icon }: { 
    name: string; 
    status: 'healthy' | 'degraded' | 'unhealthy'; 
    message: string; 
    details?: Record<string, unknown>; 
    icon: React.ComponentType<{ size: number; style?: React.CSSProperties }> 
  }) => {
    const bgColor = svcStatus === 'healthy' ? 'rgba(53, 208, 127, 0.08)' :
                    svcStatus === 'degraded' ? 'rgba(245, 184, 75, 0.08)' :
                    'rgba(255, 92, 108, 0.08)'
    const borderColor = getStatusIndicatorColor(svcStatus)

    return (
      <div
        className="border rounded-lg p-5 transition-all duration-300 hover:shadow-md"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: '1px',
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded flex-shrink-0" style={{
            backgroundColor: `${borderColor}15`,
          }}>
            <Icon size={18} style={{ color: borderColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm capitalize truncate" style={{ color: 'var(--color-text-primary)' }}>
              {name.replace(/_/g, ' ')}
            </h4>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
          </div>
          {getStatusIcon(svcStatus)}
        </div>

        {Object.keys(details || {}).length > 0 && (
          <div className="text-xs space-y-1.5 pt-3 border-t" style={{
            color: 'var(--color-text-secondary)',
            borderColor: `${borderColor}20`,
          }}>
            {Object.entries(details || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span style={{ color: 'var(--color-text-muted)' }}>{key}:</span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading && !health) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!health || !metrics || !status) return <ErrorState message="Failed to load system health" />

  const isHealthy = status.system_health === 'healthy'
  const isDegraded = status.system_health === 'degraded'

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)' }} className="min-h-screen relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:px-8 md:py-12">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div className="mb-12">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                    }}
                  >
                    <Server size={24} style={{ color: 'var(--color-text-inverse)' }} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      System Health
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      Monitor ReClaim services, infrastructure and AI availability
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-smooth" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Auto-refresh
                </label>
                <button
                  onClick={loadData}
                  className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-text-inverse)',
                  }}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {/* System Status Overview */}
            <div
              className="rounded-lg p-6 border"
              style={{
                backgroundColor: isHealthy ? 'rgba(53, 208, 127, 0.06)' :
                                 isDegraded ? 'rgba(245, 184, 75, 0.06)' :
                                 'rgba(255, 92, 108, 0.06)',
                borderColor: isHealthy ? 'var(--color-success)' :
                            isDegraded ? 'var(--color-warning)' :
                            'var(--color-danger)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-3 h-3 rounded-full animate-pulse-glow"
                  style={{
                    backgroundColor: isHealthy ? 'var(--color-success)' :
                                     isDegraded ? 'var(--color-warning)' :
                                     'var(--color-danger)',
                  }}
                />
                <h2 className="text-lg font-semibold" style={{
                  color: isHealthy ? 'var(--color-success)' :
                         isDegraded ? 'var(--color-warning)' :
                         'var(--color-danger)',
                }}>
                  SYSTEM STATUS: {status.system_health.toUpperCase()}
                </h2>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {isHealthy && 'All critical services are responding normally.'}
                {isDegraded && 'Some services are degraded but operational. Monitor closely.'}
                {!isHealthy && !isDegraded && 'Critical issues detected. Immediate action required.'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Operational', value: status.summary.services_healthy, color: 'var(--color-success)' },
                  { label: 'Degraded', value: status.summary.services_degraded, color: 'var(--color-warning)' },
                  { label: 'Failed', value: status.summary.services_unhealthy, color: 'var(--color-danger)' },
                  { label: 'Errors (24h)', value: status.summary.total_errors, color: 'var(--color-danger)' },
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Service Cards Grid */}
        <ScrollTriggerAnimation>
          <div className="mb-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Service Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(health.checks).map(([name, check], idx) => (
                <ScrollTriggerAnimation key={name} delay={idx * 50}>
                  <ServiceCard
                    name={name}
                    status={check.status}
                    message={check.message}
                    details={check.details}
                    icon={name === 'database' ? Database :
                          name === 'recovery_engine' ? Zap :
                          name === 'orchestrator' ? Radio :
                          name === 'governance' ? Shield :
                          name === 'executor' ? Gauge :
                          name === 'measurement' ? TrendingUp :
                          name === 'audit' ? Activity :
                          Server}
                  />
                </ScrollTriggerAnimation>
              ))}

              {/* Ollama LLM Service */}
              {ollamaStatus && (
                <ScrollTriggerAnimation delay={Object.keys(health.checks).length * 50}>
                  <ServiceCard
                    name="Ollama AI Model"
                    status={ollamaStatus.connected ? 'healthy' : 'unhealthy'}
                    message={ollamaStatus.connected ? `Model: ${ollamaStatus.model}` : 'AI service unavailable'}
                    details={{
                      ...((ollamaStatus.connected && ollamaStatus.latency_ms) ? { 'Latency': `${ollamaStatus.latency_ms}ms` } : {}),
                      ...(ollamaStatus.reason ? { 'Error': ollamaStatus.reason } : {}),
                    }}
                    icon={Cpu}
                  />
                </ScrollTriggerAnimation>
              )}
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <ScrollTriggerAnimation delay={0}>
            <div
              className="rounded-lg p-5 border"
              style={{
                backgroundColor: 'rgba(124, 140, 255, 0.04)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Recovery Success Rate
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-accent)' }}>
                {metrics.recovery_attempts.success_rate}%
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {metrics.recovery_attempts.successful} / {metrics.recovery_attempts.total_attempts} attempts
              </p>
            </div>
          </ScrollTriggerAnimation>

          <ScrollTriggerAnimation delay={50}>
            <div
              className="rounded-lg p-5 border"
              style={{
                backgroundColor: 'rgba(53, 208, 127, 0.04)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Revenue Recovered
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-success)' }}>
                ₹{(metrics.revenue.revenue_recovered / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                From {metrics.revenue.at_risk_opportunities} at-risk opportunities
              </p>
            </div>
          </ScrollTriggerAnimation>

          <ScrollTriggerAnimation delay={100}>
            <div
              className="rounded-lg p-5 border"
              style={{
                backgroundColor: 'rgba(245, 184, 75, 0.04)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Active Workflows
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-warning)' }}>
                {metrics.workflows.active}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {metrics.workflows.completed} completed
              </p>
            </div>
          </ScrollTriggerAnimation>

          <ScrollTriggerAnimation delay={150}>
            <div
              className="rounded-lg p-5 border"
              style={{
                backgroundColor: 'rgba(88, 184, 255, 0.04)',
                borderColor: 'var(--color-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Governance Status
              </p>
              <p className="text-3xl font-bold mt-2" style={{
                color: metrics.governance.is_paused ? 'var(--color-danger)' : 'var(--color-success)',
              }}>
                {metrics.governance.is_paused ? 'PAUSED' : 'ACTIVE'}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {metrics.governance.active_policies} active policies
              </p>
            </div>
          </ScrollTriggerAnimation>
        </div>

        {/* Error Codes Grid */}
        {Object.keys(metrics.errors_24h.error_codes).length > 0 && (
          <ScrollTriggerAnimation>
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Recent Error Codes (24h)
              </h3>
              <div
                className="rounded-lg p-5 border"
                style={{
                  backgroundColor: 'rgba(255, 92, 108, 0.04)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {Object.entries(metrics.errors_24h.error_codes).slice(0, 12).map(([code, count]) => (
                    <div
                      key={code}
                      className="rounded p-3 text-center border"
                      style={{
                        backgroundColor: 'rgba(255, 92, 108, 0.08)',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <p className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {code}
                      </p>
                      <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-danger)' }}>
                        {count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Footer */}
        <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Last updated: {new Date(status.timestamp).toLocaleTimeString()} • Data refreshes {autoRefresh ? 'every 10s' : 'manually'}
        </div>
      </div>
    </div>
  )
}
