import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, AlertCircle, CheckCircle, AlertTriangle, RefreshCw,
  Database, Zap, Shield, Gauge, TrendingUp, Clock, XCircle
} from 'lucide-react'
import { api } from '../api'
import { SystemHealthResponse, OperationalMetrics, SystemStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export const SystemHealth: React.FC = () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">System Health & Reliability</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`border rounded-lg p-6 ${getStatusBgColor(status.system_health)}`}>
        <div className="flex items-center gap-3 mb-4">
          {getStatusIcon(status.system_health)}
          <h2 className={`text-2xl font-bold ${getStatusColor(status.system_health)}`}>
            System {status.system_health.charAt(0).toUpperCase() + status.system_health.slice(1)}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Healthy Services</p>
            <p className="text-2xl font-bold text-green-600">{status.summary.services_healthy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Degraded Services</p>
            <p className="text-2xl font-bold text-yellow-600">{status.summary.services_degraded}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unhealthy Services</p>
            <p className="text-2xl font-bold text-red-600">{status.summary.services_unhealthy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Critical Errors</p>
            <p className="text-2xl font-bold text-red-600">{status.summary.critical_errors}</p>
          </div>
        </div>
      </div>

      {/* Service Health Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health.checks).map(([name, check]) => (
            <div key={name} className={`border rounded-lg p-4 ${getStatusBgColor(check.status)}`}>
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 capitalize">{check.name}</h4>
                {getStatusIcon(check.status)}
              </div>
              <p className="text-sm text-gray-600 mb-2">{check.message}</p>
              {Object.keys(check.details).length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(check.details).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recovery Operations
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Attempts</span>
              <span className="font-semibold">{metrics.recovery_attempts.total_attempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Success Rate</span>
              <span className="font-semibold text-green-600">{metrics.recovery_attempts.success_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Workflows</span>
              <span className="font-semibold">{metrics.workflows.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Recovery Time</span>
              <span className="font-semibold">{metrics.revenue.average_recovery_time_seconds}s</span>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Revenue Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">At Risk</span>
              <span className="font-semibold">${metrics.revenue.revenue_at_risk.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recovered</span>
              <span className="font-semibold text-green-600">${metrics.revenue.revenue_recovered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">At-Risk Count</span>
              <span className="font-semibold">{metrics.revenue.at_risk_opportunities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Outcomes Recorded</span>
              <span className="font-semibold">{metrics.measurement.total_outcomes}</span>
            </div>
          </div>
        </div>

        {/* Governance Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Governance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Approvals</span>
              <span className="font-semibold text-yellow-600">{metrics.governance.pending_approvals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved</span>
              <span className="font-semibold text-green-600">{metrics.governance.approved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-semibold ${metrics.governance.is_paused ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.governance.is_paused ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Policies</span>
              <span className="font-semibold">{metrics.governance.active_policies}</span>
            </div>
          </div>
        </div>

        {/* Error Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error Summary (24h)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Errors</span>
              <span className="font-semibold">{status.summary.total_errors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unresolved</span>
              <span className="font-semibold text-red-600">{status.summary.unresolved_errors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Errors</span>
              <span className="font-semibold">{metrics.errors_24h.total_errors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      {Object.keys(metrics.errors_24h.error_codes).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Error Codes (24h)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.errors_24h.error_codes).map(([code, count]) => (
              <div key={code} className="bg-gray-50 rounded p-3">
                <p className="text-sm font-mono text-gray-600">{code}</p>
                <p className="text-lg font-bold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(status.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default SystemHealth
