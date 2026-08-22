import { AlertCircle, TrendingUp, Zap } from 'lucide-react'

interface RiskCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  detail?: string
}

const riskColors = {
  LOW: 'text-green-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
}

const riskBgColors = {
  LOW: 'bg-green-50',
  MEDIUM: 'bg-yellow-50',
  HIGH: 'bg-orange-50',
  CRITICAL: 'bg-red-50',
}

export default function RiskCard({
  label,
  value,
  icon,
  riskLevel,
  detail,
}: RiskCardProps) {
  const bgColor = riskLevel ? riskBgColors[riskLevel] : 'bg-white'
  const textColor = riskLevel ? riskColors[riskLevel] : 'text-gray-900'

  return (
    <div className={`card p-6 ${bgColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
            {label}
          </p>
          <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          {detail && <p className="text-xs text-gray-600 mt-2">{detail}</p>}
        </div>
        {icon && <div className="ml-4 p-3 bg-white rounded-lg">{icon}</div>}
      </div>
    </div>
  )
}
