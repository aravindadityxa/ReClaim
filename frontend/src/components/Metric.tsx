interface MetricProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export default function Metric({ label, value, subtext, icon, trend }: MetricProps) {
  return (
    <div className="metric">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-gray-100 rounded-lg text-gray-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
