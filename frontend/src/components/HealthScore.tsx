interface HealthScoreProps {
  score: number
  components: {
    payment_success: number
    risk_ratio: number
    recovery_rate: number
    stability: number
  }
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getHealthBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50'
  if (score >= 60) return 'bg-yellow-50'
  if (score >= 40) return 'bg-orange-50'
  return 'bg-red-50'
}

export default function HealthScore({ score, components }: HealthScoreProps) {
  return (
    <div className={`card p-6 ${getHealthBgColor(score)}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-4">Revenue Health</h3>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${getHealthColor(score)}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-lg text-gray-600">/100</span>
        </div>

        <div className="w-24 h-24 rounded-full border-4 border-gray-300 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(
                ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'} 0deg ${
                (score / 100) * 360
              }deg,
                #e5e7eb ${(score / 100) * 360}deg 360deg
              )`,
            }}
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className={`text-lg font-bold ${getHealthColor(score)}`}>
                {score.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Payment Success</p>
          <p className="font-semibold text-gray-900">
            {components.payment_success.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-gray-600">Risk Ratio</p>
          <p className="font-semibold text-gray-900">
            {components.risk_ratio.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Recovery Rate</p>
          <p className="font-semibold text-gray-900">
            {components.recovery_rate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-gray-600">Stability</p>
          <p className="font-semibold text-gray-900">
            {components.stability.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  )
}
