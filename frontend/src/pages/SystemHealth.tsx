import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw,
  Database, Zap, Shield, Gauge, TrendingUp, Clock, XCircle, Cpu
} from 'lucide-react'
import { api } from '../api'
import { SystemHealthResponse, OperationalMetrics, SystemStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [healthRes, metricsRes, statusRes] = await Promise.all([
        api.getSystemHealth(),
        api.getSystemMetrics(),
        api.getSystemStatus(),
      ])

      setHealth(healthRes)
      setMetrics(metricsRes)
      setStatus(statusRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health')
    } finally {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'unhealthy':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Activity className="w-5 h-5 text-gray-600" />
    }
  }

  if (loading && !health) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!health || !metrics || !status) return <ErrorState message="Failed to load system health" />

  const containerStyle = {
    backgroundColor: 'var(--color-bg-primary)',
  };

  const cardStyle = {
    backgroundColor: 'var(--color-bg-elevated)',
    borderColor: 'var(--color-border)',
  };

  const headingStyle = {
    color: 'var(--color-text-primary)',
  };

  const textSecondaryStyle = {
    color: 'var(--color-text-secondary)',
  };

  return (
    <div style={containerStyle} className="p-8 md:p-12 min-h-screen relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)' }}>
                  <Cpu className="w-8 h-8" style={{ color: 'var(--color-success)' }} />
                </div>
                <h1 className="text-5xl font-bold" style={headingStyle}>
                  SYSTEM HEALTH MONITOR
                </h1>
              </div>
              <p className="text-lg mt-2" style={textSecondaryStyle}>Real-time system status and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm" style={textSecondaryStyle}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--color-info)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Overall Status */}
        <ScrollTriggerAnimation>
          <div className="border rounded-lg p-8" style={{
            ...cardStyle,
            backgroundColor: status.system_health === 'healthy' ? 'var(--color-success-light)' : 
                            status.system_health === 'degraded' ? 'var(--color-warning-light)' :
                            'var(--color-error-light)',
            borderColor: status.system_health === 'healthy' ? 'var(--color-success)' :
                        status.system_health === 'degraded' ? 'var(--color-warning)' :
                        'var(--color-error)',
          }}>
            <div className="flex items-center gap-4 mb-6">
              {getStatusIcon(status.system_health)}
              <h2 className="text-3xl font-bold" style={{
                color: status.system_health === 'healthy' ? 'var(--color-success)' :
                      status.system_health === 'degraded' ? 'var(--color-warning)' :
                      'var(--color-error)',
              }}>
                System {status.system_health.charAt(0).toUpperCase() + status.system_health.slice(1)}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/50 p-4 rounded-lg">
                <p className="text-sm font-medium" style={textSecondaryStyle}>Healthy Services</p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-success)' }}>
                  {status.summary.services_healthy}
                </p>
              </div>
              <div className="bg-white/50 p-4 rounded-lg">
                <p className="text-sm font-medium" style={textSecondaryStyle}>Degraded Services</p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-warning)' }}>
                  {status.summary.services_degraded}
                </p>
              </div>
              <div className="bg-white/50 p-4 rounded-lg">
                <p className="text-sm font-medium" style={textSecondaryStyle}>Unhealthy Services</p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-error)' }}>
                  {status.summary.services_unhealthy}
                </p>
              </div>
              <div className="bg-white/50 p-4 rounded-lg">
                <p className="text-sm font-medium" style={textSecondaryStyle}>Critical Errors</p>
                <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-error)' }}>
                  {status.summary.critical_errors}
                </p>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Service Health Grid */}
        <div>
          <h3 className="text-lg font-semibold mb-6" style={headingStyle}>Service Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(health.checks).map(([name, check], idx) => (
              <ScrollTriggerAnimation key={name} delay={idx * 100}>
                <div className="border rounded-lg p-6 overflow-hidden group" style={{
                  ...cardStyle,
                  backgroundColor: check.status === 'healthy' ? 'var(--color-success-light)' :
                                  check.status === 'degraded' ? 'var(--color-warning-light)' :
                                  'var(--color-error-light)',
                  borderColor: check.status === 'healthy' ? 'var(--color-success)' :
                              check.status === 'degraded' ? 'var(--color-warning)' :
                              'var(--color-error)',
                }}>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold capitalize text-sm" style={headingStyle}>
                      {check.name}
                    </h4>
                    {getStatusIcon(check.status)}
                  </div>
                  <p className="text-sm mb-3" style={textSecondaryStyle}>{check.message}</p>
                  {Object.keys(check.details).length > 0 && (
                    <div className="text-xs space-y-1 pt-3 border-t" style={{
                      color: 'var(--color-text-tertiary)',
                      borderColor: check.status === 'healthy' ? 'var(--color-success)' :
                                  check.status === 'degraded' ? 'var(--color-warning)' :
                                  'var(--color-error)',
                    }}>
                      {Object.entries(check.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium" style={headingStyle}>{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollTriggerAnimation>
            ))}
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recovery Metrics */}
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-6 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
                Recovery Operations
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Total Attempts</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.recovery_attempts.total_attempts}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Success Rate</span>
                  <span className="font-semibold text-lg" style={{ color: 'var(--color-success)' }}>
                    {metrics.recovery_attempts.success_rate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Active Workflows</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.workflows.active}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={textSecondaryStyle} className="text-sm font-medium">Avg Recovery Time</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.revenue.average_recovery_time_seconds}s
                  </span>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>

          {/* Revenue Metrics */}
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-6 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                <Zap className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
                Revenue Status
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">At Risk</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    ${metrics.revenue.revenue_at_risk.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Recovered</span>
                  <span className="font-semibold text-lg" style={{ color: 'var(--color-success)' }}>
                    ${metrics.revenue.revenue_recovered.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">At-Risk Count</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.revenue.at_risk_opportunities}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={textSecondaryStyle} className="text-sm font-medium">Outcomes Recorded</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.measurement.total_outcomes}
                  </span>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>

          {/* Governance Metrics */}
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-6 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                <Shield className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
                Governance
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Pending Approvals</span>
                  <span className="font-semibold text-lg" style={{ color: 'var(--color-warning)' }}>
                    {metrics.governance.pending_approvals}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Approved</span>
                  <span className="font-semibold text-lg" style={{ color: 'var(--color-success)' }}>
                    {metrics.governance.approved}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Status</span>
                  <span className="font-semibold text-lg" style={{
                    color: metrics.governance.is_paused ? 'var(--color-error)' : 'var(--color-success)',
                  }}>
                    {metrics.governance.is_paused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span style={textSecondaryStyle} className="text-sm font-medium">Active Policies</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.governance.active_policies}
                  </span>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>

          {/* Error Metrics */}
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-6 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
                Error Summary (24h)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Total Errors</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {status.summary.total_errors}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">Unresolved</span>
                  <span className="font-semibold text-lg" style={{ color: 'var(--color-error)' }}>
                    {status.summary.unresolved_errors}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={textSecondaryStyle} className="text-sm font-medium">24h Errors</span>
                  <span className="font-semibold text-lg" style={headingStyle}>
                    {metrics.errors_24h.total_errors}
                  </span>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        </div>

        {/* Error Codes */}
        {Object.keys(metrics.errors_24h.error_codes).length > 0 && (
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-6 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-4" style={headingStyle}>Recent Error Codes (24h)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(metrics.errors_24h.error_codes).map(([code, count]) => (
                  <div key={code} className="rounded p-3 text-center" style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                  }}>
                    <p className="text-xs font-mono font-semibold" style={headingStyle}>{code}</p>
                    <p className="text-lg font-bold mt-1" style={textSecondaryStyle}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Last Updated */}
        <div className="text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
