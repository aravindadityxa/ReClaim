import { useEffect, useState } from 'react'
import { Activity, TrendingUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { api, APIError } from '../api'
import { ActivityEvent } from '../types'
import Badge from '../components/Badge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.activity.getEvents(50)
      setEvents(data)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to load activity: ${err.message}`)
      } else {
        setError('Failed to load activity')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
    
    if (autoRefresh) {
      const interval = setInterval(loadEvents, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'opportunity_recovered':
        return <CheckCircle size={20} className="text-green-600" />
      case 'opportunity_created':
        return <AlertCircle size={20} className="text-yellow-600" />
      default:
        return <Activity size={20} className="text-blue-600" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'opportunity_recovered':
        return { bg: 'var(--color-success-light)', border: 'var(--color-success)', dot: 'var(--color-success)' }
      case 'opportunity_created':
        return { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', dot: 'var(--color-warning)' }
      default:
        return { bg: 'var(--color-info-light)', border: 'var(--color-info)', dot: 'var(--color-info)' }
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-IN')
  }

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'RECOVERED':
        return 'success'
      case 'RECOVERABLE':
        return 'warning'
      case 'AT_RISK':
        return 'danger'
      case 'LOST':
        return 'critical'
      default:
        return 'info'
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={loadEvents} />

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)' }} className="p-8 min-h-screen relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-info-light)' }}>
                  <Activity className="w-8 h-8" style={{ color: 'var(--color-info)' }} />
                </div>
                <h1 className="text-5xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  SYSTEM ACTIVITY
                </h1>
              </div>
              <p className="text-lg mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Real-time activity stream and event log
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
              <button
                onClick={loadEvents}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
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

        {events.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <div className="space-y-2">
            {/* Timeline visualization */}
            <div className="relative pl-8">
              {/* Vertical line */}
              <div
                className="absolute left-3 top-0 bottom-0 w-0.5"
                style={{
                  background: 'linear-gradient(to bottom, var(--color-info), transparent)',
                }}
              />
              
              {events.map((event, idx) => {
                const colors = getEventColor(event.type)
                return (
                  <ScrollTriggerAnimation key={event.id} delay={idx * 50}>
                    <div className="relative mb-4 last:mb-0">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-5 top-2 w-4 h-4 rounded-full border-2 bg-white transition-all"
                        style={{ borderColor: colors.dot }}
                      />

                      {/* Event Card */}
                      <div
                        className="card p-6 rounded-lg border hover:shadow-lg transition-all duration-300 group"
                        style={{
                          backgroundColor: 'var(--color-bg-elevated)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 pt-1">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: colors.bg }}
                            >
                              {getEventIcon(event.type)}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                  {event.description}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                  {event.customer_id}
                                </p>
                              </div>
                              <p className="text-xs flex-shrink-0 whitespace-nowrap font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                                {formatTimestamp(event.timestamp)}
                              </p>
                            </div>

                            {/* Details */}
                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                              {event.amount && (
                                <div className="flex items-center gap-2">
                                  <span style={{ color: 'var(--color-text-secondary)' }}>Amount:</span>
                                  <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    ₹{event.amount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}

                              {event.opportunity_type && (
                                <div className="flex items-center gap-2">
                                  <span style={{ color: 'var(--color-text-secondary)' }}>Type:</span>
                                  <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">
                                    {event.opportunity_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}

                              {event.status && (
                                <div>
                                  <Badge
                                    label={event.status.replace(/_/g, ' ')}
                                    variant={getStatusBadgeVariant(event.status)}
                                  />
                                </div>
                              )}

                              <div className="ml-auto">
                                <a
                                  href={`#opportunity/${event.opportunity_id}`}
                                  className="font-medium transition-colors hover:underline"
                                  style={{ color: 'var(--color-primary-500)' }}
                                >
                                  View →
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollTriggerAnimation>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
