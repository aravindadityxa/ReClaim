import React, { useMemo } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  detail?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  detail,
  icon,
  trend,
  trendValue,
}) => {
  // Memoize style objects to prevent unnecessary recalculations
  const containerStyle = useMemo(() => ({
    background: 'linear-gradient(135deg, var(--color-surface-elevated) 0%, rgba(21, 28, 41, 0.5) 100%)',
    border: `1px solid var(--color-border)`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-6)',
    transition: 'all var(--transition-base)',
  }), [])

  const labelStyle = useMemo(() => ({
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: 'var(--letter-spacing-wide)',
    marginBottom: 'var(--spacing-2)',
  }), [])

  const valueStyle = useMemo(() => ({
    fontSize: 'var(--font-size-4xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text-primary)',
    lineHeight: '1',
    marginBottom: 'var(--spacing-3)',
  }), [])

  const detailStyle = useMemo(() => ({
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-disabled)',
  }), [])

  const iconContainerStyle = useMemo(() => ({
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-accent-soft)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'var(--color-accent)',
  }), [])

  const trendStyle = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 'var(--spacing-1)',
    fontSize: 'var(--font-size-xs)',
    marginTop: 'var(--spacing-3)',
    color: trend === 'up'
      ? 'var(--color-danger)'
      : trend === 'down'
        ? 'var(--color-success)'
        : 'var(--color-text-secondary)',
  }), [trend])

  const trendTextStyle = useMemo(() => ({
    fontWeight: 'var(--font-weight-medium)',
  }), [])

  return (
    <div className="metric-card" style={containerStyle}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label" style={labelStyle}>
            {label}
          </p>
          <p className="metric-value" style={valueStyle}>
            {value}
          </p>
          {detail && (
            <p className="metric-detail" style={detailStyle}>
              {detail}
            </p>
          )}
        </div>
        {icon && (
          <div style={iconContainerStyle}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div style={trendStyle}>
          <span style={trendTextStyle}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue || 'Stable'}
          </span>
        </div>
      )}
    </div>
  )
}

export default React.memo(MetricCard)
