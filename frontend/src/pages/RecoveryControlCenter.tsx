import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Zap, PauseCircle, Activity } from 'lucide-react'
import { api, APIError } from '../api'
import { GovernanceStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

interface Workflow {
  workflow_id: string
  state: string
  current_action?: string
  attempt_count: number
  started_at: string
}

interface ControlCenterData {
  active_workflows: number
  completed_workflows: number
  recent_attempts_count: number
  total_attempts: number
  active_summary: Workflow[]
}

export default function RecoveryControlCenter() {
  const [data, setData] = useState<ControlCenterData | null>(null)
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load control center data
        const controlCenterData = await api.getRecoveryControlCenter()
        setData(controlCenterData)

        // Load governance status
        try {
          const govStatus = await api.getGovernanceDashboard()
          setGovernanceStatus(govStatus)
        } catch (err) {
          console.log('Governance status unavailable')
        }
      } catch (err) {
        const message = err instanceof APIError ? err.message : 'Failed to load control center'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'DETECTED':
        return <AlertCircle size={20} />
      case 'PLANNED':
      case 'READY':
        return <Clock size={20} />
      case 'EXECUTING':
        return <Zap size={20} />
      case 'SUCCEEDED':
      case 'RECOVERED':
        return <CheckCircle size={20} />
      case 'FAILED':
        return <AlertCircle size={20} />
      case 'STOPPED':
        return <AlertCircle size={20} />
      default:
        return <Clock size={20} />
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'DETECTED':
        return '#3b82f6'
      case 'PLANNED':
      case 'READY':
        return '#f59e0b'
      case 'EXECUTING':
        return '#f97316'
      case 'SUCCEEDED':
      case 'RECOVERED':
        return '#22c55e'
      case 'FAILED':
        return '#ef4444'
      case 'STOPPED':
        return '#6b7280'
      default:
        return '#9ca3af'
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return <ErrorState message="No control center data available" />

  const statCards = [
    {
      label: 'Active Workflows',
      value: data.active_workflows,
      icon: Activity,
      color: '#3b82f6',
      delay: 0,
    },
    {
      label: 'Completed',
      value: data.completed_workflows,
      icon: CheckCircle,
      color: '#22c55e',
      delay: 100,
    },
    {
      label: 'Total Attempts',
      value: data.total_attempts,
      icon: Zap,
      color: '#f59e0b',
      delay: 200,
    },
    {
      label: 'Recent Actions',
      value: data.recent_attempts_count,
      icon: Clock,
      color: '#8b5cf6',
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
              <div className="relative">
                <div className="absolute inset-0 rounded-lg blur-lg opacity-50 animate-pulse" style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                }} />
                <Activity size={32} style={{ color: 'var(--color-primary-600)', position: 'relative' }} />
              </div>
              <h1 className="text-6xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Control Center
              </h1>
            </div>
            <p className="text-lg max-w-3xl" style={{ color: 'var(--color-text-secondary)' }}>
              Real-time mission control for autonomous recovery workflows with full governance oversight
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* Governance Status Banner */}
        {governanceStatus && (
          <ScrollTriggerAnimation animation="fade-in-up" delay={50}>
            <div 
              className="rounded-2xl p-6 border backdrop-blur transition-all"
              style={{
                backgroundColor: governanceStatus.is_paused 
                  ? 'rgba(239, 68, 68, 0.05)' 
                  : 'rgba(34, 197, 94, 0.05)',
                borderColor: governanceStatus.is_paused 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : 'rgba(34, 197, 94, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                {governanceStatus.is_paused ? (
                  <PauseCircle style={{ color: '#ef4444', marginTop: '4px' }} size={24} className="flex-shrink-0" />
                ) : (
                  <CheckCircle style={{ color: '#22c55e', marginTop: '4px' }} size={24} className="flex-shrink-0 animate-pulse" />
                )}
                <div>
                  <p 
                    className="font-bold text-lg"
                    style={{ color: governanceStatus.is_paused ? '#dc2626' : '#16a34a' }}
                  >
                    {governanceStatus.is_paused ? '⚠ Recovery Execution PAUSED' : '✓ Recovery Execution ACTIVE'}
                  </p>
                  <p 
                    className="text-sm mt-1"
                    style={{ color: governanceStatus.is_paused ? '#dc2626' : '#16a34a' }}
                  >
                    {governanceStatus.pending_approvals > 0 
                      ? `${governanceStatus.pending_approvals} approval${governanceStatus.pending_approvals !== 1 ? 's' : ''} pending` 
                      : 'All systems operational'}
                  </p>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map(({ label, value, icon: Icon, color, delay }) => (
            <ScrollTriggerAnimation key={label} animation="fade-in-up" delay={delay}>
              <div 
                className="rounded-2xl p-6 border backdrop-blur transition-all group"
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
                  <div className="px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider" style={{
                    backgroundColor: `${color}20`,
                    color: color,
                    border: `1px solid ${color}40`,
                  }}>
                    Live
                  </div>
                </div>
                <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium uppercase tracking-wide mb-1">
                  {label}
                </p>
                <p className="text-4xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {value}
                </p>
              </div>
            </ScrollTriggerAnimation>
          ))}
        </div>

        {/* Active Workflows */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={400}>
          <div 
            className="rounded-2xl p-8 border backdrop-blur"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Activity size={24} style={{ color: 'var(--color-primary-600)' }} />
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Active Recovery Workflows
              </h3>
            </div>

            {data.active_summary.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-block p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                  <Clock size={32} style={{ color: 'var(--color-primary-600)' }} />
                </div>
                <p className="mb-2 text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  No active workflows
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  Recovery workflows will appear here when actions are executing
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th className="text-left py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Opportunity ID
                      </th>
                      <th className="text-center py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        State
                      </th>
                      <th className="text-left py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Current Action
                      </th>
                      <th className="text-center py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Attempts
                      </th>
                      <th className="text-left py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Started
                      </th>
                      <th className="text-center py-4 px-4 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.active_summary.map((workflow) => (
                      <tr
                        key={workflow.workflow_id}
                        style={{ 
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'all 0.2s ease',
                        }}
                        className="hover:bg-white/5"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(14, 165, 233, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                        }}
                      >
                        <td className="py-4 px-4 font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          {workflow.workflow_id}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getStateColor(workflow.state) }} />
                            <span className="font-bold" style={{ color: getStateColor(workflow.state) }}>
                              {workflow.state}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {workflow.current_action ? (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold"
                              style={{
                                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                color: 'var(--color-primary-600)',
                              }}
                            >
                              {workflow.current_action.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {workflow.attempt_count}
                        </td>
                        <td className="py-4 px-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          {new Date(workflow.started_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => setSelectedWorkflow(workflow.workflow_id)}
                            className="font-bold transition-all px-3 py-1 rounded-lg hover:bg-white/10"
                            style={{ color: 'var(--color-primary-600)' }}
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ScrollTriggerAnimation>

        {/* Control Information */}
        <ScrollTriggerAnimation animation="fade-in-up" delay={450}>
          <div 
            className="rounded-2xl p-6 border border-l-4"
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              borderColor: 'var(--color-primary-600)',
              borderLeftColor: 'var(--color-primary-600)',
            }}
          >
            <p className="text-sm" style={{ color: 'rgba(14, 165, 233, 0.8)' }}>
              <span className="font-bold">Mission Control:</span> This control center provides real-time visibility into autonomous recovery workflows. Each workflow represents a bounded recovery attempt with strict safety rules, maximum attempts, customer contact limits, and automatic stopping conditions. All workflows execute in TEST MODE ONLY with full governance oversight.
            </p>
          </div>
        </ScrollTriggerAnimation>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
