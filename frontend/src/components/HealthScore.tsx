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
  const scoreColor = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-error)'
  const scoreGradient = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  
  return (
    <div 
      className="card p-8 rounded-xl"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-md)',
        borderColor: 'var(--color-border)',
      }}
    >
      <h3 
        className="text-lg font-semibold mb-6"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Revenue Health
      </h3>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold" style={{ color: scoreColor }}>
            {score.toFixed(1)}
          </span>
          <span className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>/100</span>
        </div>

        <div 
          className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(
                ${scoreGradient} 0deg ${(score / 100) * 360}deg,
                var(--color-border) ${(score / 100) * 360}deg 360deg
              )`,
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              <span className="text-lg font-bold" style={{ color: scoreColor }}>
                {score.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Payment Success</p>
          <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {components.payment_success.toFixed(1)}%
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Risk Ratio</p>
          <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {components.risk_ratio.toFixed(1)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Recovery Rate</p>
          <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {components.recovery_rate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Stability</p>
          <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {components.stability.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  )
}
