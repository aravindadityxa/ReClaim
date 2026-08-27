import { AlertCircle, TrendingUp, Zap } from 'lucide-react'

interface RiskCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  detail?: string
}

const riskColorTokens = {
  LOW: 'var(--color-success)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-warning)',
  CRITICAL: 'var(--color-error)',
}

const riskBgColorTokens = {
  LOW: 'var(--color-success-light)',
  MEDIUM: 'var(--color-warning-light)',
  HIGH: 'var(--color-warning-light)',
  CRITICAL: 'var(--color-error-light)',
}

export default function RiskCard({
  label,
  value,
  icon,
  riskLevel,
  detail,
}: RiskCardProps) {
  const bgColor = riskLevel ? riskBgColorTokens[riskLevel] : 'var(--color-bg-elevated)'
  const textColor = riskLevel ? riskColorTokens[riskLevel] : 'var(--color-text-primary)'

  return (
    <div 
      className="card p-6 rounded-xl"
      style={{
        backgroundColor: bgColor,
        boxShadow: 'var(--shadow-sm)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p 
            className="text-xs font-semibold uppercase mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {label}
          </p>
          <p 
            className="text-3xl font-bold"
            style={{ color: textColor }}
          >
            {value}
          </p>
          {detail && (
            <p 
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {detail}
            </p>
          )}
        </div>
        {icon && (
          <div 
            className="ml-4 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
