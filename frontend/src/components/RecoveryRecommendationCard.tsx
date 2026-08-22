import { TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { RecoveryRecommendation } from '../types'

interface RecoveryRecommendationCardProps {
  recommendation: RecoveryRecommendation
  opportunityAmount: number
}

export default function RecoveryRecommendationCard({
  recommendation,
  opportunityAmount,
}: RecoveryRecommendationCardProps) {
  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      PAYMENT_RETRY: 'bg-blue-100 text-blue-800 border-blue-300',
      PAYMENT_LINK: 'bg-purple-100 text-purple-800 border-purple-300',
      CUSTOMER_REMINDER: 'bg-pink-100 text-pink-800 border-pink-300',
      SUBSCRIPTION_RETRY: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      INVOICE_REMINDER: 'bg-amber-100 text-amber-800 border-amber-300',
      DELAY_AND_RETRY: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      NO_ACTION: 'bg-gray-100 text-gray-800 border-gray-300',
    }
    return colors[action] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getUrgencyIcon = (urgency: string) => {
    const sizes = 'h-5 w-5'
    switch (urgency) {
      case 'CRITICAL':
        return <AlertCircle className={`${sizes} text-red-600`} />
      case 'HIGH':
        return <TrendingUp className={`${sizes} text-orange-600`} />
      case 'MEDIUM':
        return <Clock className={`${sizes} text-blue-600`} />
      default:
        return <CheckCircle className={`${sizes} text-green-600`} />
    }
  }

  const recoveryPercentage = (recommendation.expected_recovered_amount / opportunityAmount) * 100

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Next Best Action</h3>
          <div className="flex items-center gap-2">
            {getUrgencyIcon(recommendation.next_best_time.urgency_level)}
            <span className="text-sm font-semibold text-gray-700">
              {recommendation.next_best_time.urgency_level}
            </span>
          </div>
        </div>

        <div
          className={`inline-block px-4 py-2 rounded-lg border font-semibold text-lg ${getActionColor(
            recommendation.recommended_action
          )}`}
        >
          {recommendation.recommended_action.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Recovery Probability</p>
          <p className="text-xl font-bold text-gray-900">
            {(recommendation.recovery_probability * 100).toFixed(0)}%
          </p>
        </div>

        <div className="bg-green-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Expected Recovery</p>
          <p className="text-xl font-bold text-green-600">
            ₹{recommendation.expected_recovered_amount.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{recoveryPercentage.toFixed(0)}% of amount</p>
        </div>

        <div className="bg-blue-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Expected Net Value</p>
          <p className="text-xl font-bold text-blue-600">
            ₹{recommendation.expected_net_value.toFixed(0)}
          </p>
        </div>

        <div className="bg-purple-50 rounded p-3">
          <p className="text-xs text-gray-600 mb-1">Customer Friction</p>
          <p className="text-xl font-bold text-purple-600">
            {recommendation.customer_friction_score}/100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {recommendation.customer_friction_score < 30 ? 'Low' : recommendation.customer_friction_score < 60 ? 'Medium' : 'High'}
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Why this action:</span> {recommendation.why_this_action}
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-900 mb-3">Recommended Timing</p>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Date:</span> {recommendation.next_best_time.recommended_date}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Time Window:</span> {recommendation.next_best_time.recommended_time_window_start} -{' '}
            {recommendation.next_best_time.recommended_time_window_end}
          </p>
          <p className="text-sm text-gray-600 mt-3 italic">
            {recommendation.next_best_time.rationale}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-900 mb-2">Stopping Rules</p>
        <ul className="space-y-1">
          {recommendation.stopping_rules.map((rule, idx) => (
            <li key={idx} className="text-sm text-gray-700 flex gap-2">
              <span className="text-gray-400">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-3">
        <p className="text-xs text-amber-900">
          <span className="font-semibold">Confidence:</span> {(recommendation.confidence * 100).toFixed(0)}% - This
          recommendation is based on opportunity characteristics and historical recovery patterns.
        </p>
      </div>
    </div>
  )
}
