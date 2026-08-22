import { RecoveryActionCandidate } from '../types'

interface RecoveryActionComparisonProps {
  candidates: RecoveryActionCandidate[]
  recommendedAction: string
}

export default function RecoveryActionComparison({
  candidates,
  recommendedAction,
}: RecoveryActionComparisonProps) {
  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      PAYMENT_RETRY: 'bg-blue-50 border-blue-300',
      PAYMENT_LINK: 'bg-purple-50 border-purple-300',
      CUSTOMER_REMINDER: 'bg-pink-50 border-pink-300',
      SUBSCRIPTION_RETRY: 'bg-cyan-50 border-cyan-300',
      INVOICE_REMINDER: 'bg-amber-50 border-amber-300',
      DELAY_AND_RETRY: 'bg-indigo-50 border-indigo-300',
      NO_ACTION: 'bg-gray-50 border-gray-300',
    }
    return colors[action] || 'bg-gray-50 border-gray-300'
  }

  const sortedCandidates = [...candidates].sort((a, b) => b.expected_net_value - a.expected_net_value)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Alternative Actions</h3>

      <div className="space-y-3">
        {sortedCandidates.map((candidate) => {
          const isRecommended = candidate.action_type === recommendedAction
          const recoveryPercentage = candidate.recovery_probability * 100

          return (
            <div
              key={candidate.action_type}
              className={`border-2 rounded-lg p-4 ${
                isRecommended
                  ? `${getActionColor(candidate.action_type)} border-green-400`
                  : `${getActionColor(candidate.action_type)} border-gray-200`
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{candidate.action_type.replace(/_/g, ' ')}</p>
                    {isRecommended && <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">RECOMMENDED</span>}
                  </div>
                  <p className="text-sm text-gray-600">{candidate.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{candidate.expected_net_value.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Expected Value</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Recovery Probability</p>
                  <p className="text-sm font-bold text-gray-900">{recoveryPercentage.toFixed(0)}%</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Expected Recovery</p>
                  <p className="text-sm font-bold text-green-600">₹{candidate.expected_recovered_amount.toFixed(0)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Action Cost</p>
                  <p className="text-sm font-bold text-gray-900">₹{candidate.action_cost.toFixed(0)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Friction Score</p>
                  <p className="text-sm font-bold text-purple-600">{candidate.customer_friction_score}/100</p>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1">Confidence</p>
                  <p className="text-sm font-bold text-blue-600">{(candidate.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>

              {candidate.expected_net_value < 0 && (
                <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-red-700">Negative expected value - action not recommended</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Note:</span> Actions are ranked by expected net value, which considers recovery
          probability, customer friction, and action cost. Actions with negative expected value may still be viable under
          certain circumstances but are not recommended by default.
        </p>
      </div>
    </div>
  )
}
