interface MetricProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export default function Metric({ label, value, subtext, icon, trend }: MetricProps) {
  return (
    <div 
      className="card p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-sm)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p 
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {label}
          </p>
          <p 
            className="text-3xl font-bold mt-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
          {subtext && (
            <p 
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {subtext}
            </p>
          )}
        </div>
        {icon && (
          <div 
            className="ml-4 p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-primary-600)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
