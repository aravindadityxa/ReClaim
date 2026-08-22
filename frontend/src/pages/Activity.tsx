import { useEffect, useState } from 'react'
import { Activity, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { api, APIError } from '../api'
import { ActivityEvent } from '../types'
import Badge from '../components/Badge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [])

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
    <div className="space-y-4">
      {events.length === 0 ? (
        <EmptyState message="No activity recorded yet." />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 pt-1">
                  {getEventIcon(event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {event.description}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.customer_id}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    {event.amount && (
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          ₹{event.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {event.opportunity_type && (
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 text-gray-900">
                          {event.opportunity_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {event.status && (
                      <div>
                        <span className="text-gray-600 mr-2">Status:</span>
                        <Badge
                          label={event.status.replace(/_/g, ' ')}
                          variant={getStatusBadgeVariant(event.status)}
                        />
                      </div>
                    )}

                    <div className="ml-auto">
                      <a
                        href={`#opportunity/${event.opportunity_id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
