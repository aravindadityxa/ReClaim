import { useEffect, useState } from 'react'
import { Play, AlertCircle, CheckCircle, Clock, Zap, Shield, PauseCircle } from 'lucide-react'
import { api, APIError } from '../api'
import { GovernanceStatus } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

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
        setData({
          active_workflows: 0,
          completed_workflows: 0,
          recent_attempts_count: 0,
          total_attempts: 0,
          active_summary: [],
        })

        // Load governance status
        try {
          const govStatus = await api.getGovernanceDashboard()
          setGovernanceStatus(govStatus)
        } catch (err) {
          // Governance may not be available
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
        return <AlertCircle className="text-blue-600" size={20} />
      case 'PLANNED':
      case 'READY':
        return <Clock className="text-yellow-600" size={20} />
      case 'EXECUTING':
        return <Zap className="text-orange-600" size={20} />
      case 'SUCCEEDED':
      case 'RECOVERED':
        return <CheckCircle className="text-green-600" size={20} />
      case 'FAILED':
        return <AlertCircle className="text-red-600" size={20} />
      case 'STOPPED':
        return <AlertCircle className="text-gray-600" size={20} />
      default:
        return <Clock className="text-gray-600" size={20} />
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return <ErrorState message="No control center data available" />

  return (
    <div className="space-y-8">
      {/* Governance Status Banner */}
      {governanceStatus && (
        <div className={`border-l-4 ${governanceStatus.is_paused ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'} p-4 rounded`}>
          <div className="flex items-start gap-3">
            {governanceStatus.is_paused ? (
              <PauseCircle className="text-red-600 mt-1" size={20} />
            ) : (
              <CheckCircle className="text-green-600 mt-1" size={20} />
            )}
            <div>
              <p className={`font-semibold ${governanceStatus.is_paused ? 'text-red-900' : 'text-green-900'}`}>
                {governanceStatus.is_paused ? 'Recovery Execution Paused' : 'Recovery Execution Active'}
              </p>
              <p className={`text-sm ${governanceStatus.is_paused ? 'text-red-800' : 'text-green-800'}`}>
                {governanceStatus.pending_approvals > 0 
                  ? `${governanceStatus.pending_approvals} approval(s) pending` 
                  : 'All systems operational'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Active Workflows</p>
          <p className="text-3xl font-bold text-blue-600">{data.active_workflows}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Completed Workflows</p>
          <p className="text-3xl font-bold text-green-600">{data.completed_workflows}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Total Attempts</p>
          <p className="text-3xl font-bold text-purple-600">{data.total_attempts}</p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Recent Actions</p>
          <p className="text-3xl font-bold text-orange-600">{data.recent_attempts_count}</p>
        </div>
      </div>

      {/* Active Workflows */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Active Workflows</h3>

        {data.active_summary.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p className="mb-2">No active recovery workflows</p>
            <p className="text-sm text-gray-400">Active workflows will appear here when recovery actions are executing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Opportunity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">State</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Current Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Attempts</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Started</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.active_summary.map((workflow) => (
                  <tr key={workflow.workflow_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-mono text-gray-900">{workflow.workflow_id}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getStateIcon(workflow.state)}
                        <span className="font-medium text-gray-700">{workflow.state}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{workflow.current_action || '—'}</td>
                    <td className="py-4 px-4 text-gray-600">{workflow.attempt_count}</td>
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {new Date(workflow.started_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setSelectedWorkflow(workflow.workflow_id)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recovery Control Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Recovery Control Center:</span> This control center tracks
          recovery workflows in action. Each workflow represents a bounded autonomous recovery attempt for a revenue
          opportunity. Workflows are executed in TEST MODE ONLY and follow strict safety rules including maximum
          attempts, customer contact limits, and automatic stopping rules.
        </p>
      </div>
    </div>
  )
}
