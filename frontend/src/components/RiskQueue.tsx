import { ChevronRight } from 'lucide-react'
import { RiskOpportunityInfo } from '../types'
import Badge from './Badge'

interface RiskQueueProps {
  opportunities: RiskOpportunityInfo[]
  onSelectOpportunity?: (id: string) => void
}

function getRiskBadgeVariant(
  level: string
): 'success' | 'warning' | 'danger' | 'critical' | 'info' {
  switch (level) {
    case 'CRITICAL':
      return 'critical'
    case 'HIGH':
      return 'danger'
    case 'MEDIUM':
      return 'warning'
    default:
      return 'info'
  }
}

export default function RiskQueue({
  opportunities,
  onSelectOpportunity,
}: RiskQueueProps) {
  if (opportunities.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-600">No high-risk opportunities</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opp) => (
        <div
          key={opp.opportunity_id}
          className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelectOpportunity?.(opp.opportunity_id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  label={opp.risk_level}
                  variant={getRiskBadgeVariant(opp.risk_level)}
                />
                <span className="text-sm font-bold text-gray-900">
                  ₹{opp.expected_loss.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Risk Score: {opp.risk_score}/100 | Priority: {opp.priority_score}
                /100
              </p>
              <div className="flex flex-wrap gap-1">
                {opp.risk_drivers.slice(0, 2).map((driver, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {driver}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
