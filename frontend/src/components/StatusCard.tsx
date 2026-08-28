import React, { useMemo } from 'react'
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'

export type StatusType = 'success' | 'warning' | 'critical' | 'info' | 'neutral'

interface StatusCardProps {
  status: StatusType
  label: string
  value: string | number
  detail?: string
  icon?: React.ReactNode
  showIndicator?: boolean
  compact?: boolean
}

const StatusCard: React.FC<StatusCardProps> = ({
  status,
  label,
  value,
  detail,
  icon,
  showIndicator = true,
  compact = false,
}) => {
  // Determine colors based on status
  const getStatusColors = (stat: StatusType) => {
    switch (stat) {
      case 'success':
        return {
          bg: 'rgba(53, 208, 127, 0.08)',
          border: 'rgba(53, 208, 127, 0.25)',
          indicator: '#35D07F',
          text: '#72E3A5',
        }
      case 'warning':
        return {
          bg: 'rgba(245, 184, 75, 0.08)',
          border: 'rgba(245, 184, 75, 0.25)',
          indicator: '#F5B84B',
          text: '#FFD27A',
        }
      case 'critical':
        return {
          bg: 'rgba(255, 92, 108, 0.08)',
          border: 'rgba(255, 92, 108, 0.25)',
          indicator: '#FF5C6C',
          text: '#FF8D99',
        }
      case 'info':
        return {
          bg: 'rgba(88, 184, 255, 0.08)',
          border: 'rgba(88, 184, 255, 0.25)',
          indicator: '#58B8FF',
          text: '#83CCFF',
        }
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.09)',
          indicator: '#A7B1C2',
          text: '#B8C1D1',
        }
    }
  }

  const colors = getStatusColors(status)

  const containerStyle = useMemo(() => ({
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 'var(--radius-lg)',
    padding: compact ? 'var(--spacing-4)' : 'var(--spacing-6)',
    transition: 'all var(--transition-base)',
  }), [colors, compact])

  const labelStyle = useMemo(() => ({
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: 'var(--letter-spacing-wide)',
    marginBottom: 'var(--spacing-2)',
  }), [])

  const valueStyle = useMemo(() => ({
    fontSize: compact ? 'var(--font-size-2xl)' : 'var(--font-size-4xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: colors.text,
    lineHeight: '1',
    marginBottom: detail ? 'var(--spacing-2)' : '0',
  }), [compact, colors.text, detail])

  const detailStyle = useMemo(() => ({
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--spacing-2)',
  }), [])

  const indicatorStyle = useMemo(() => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: colors.indicator,
    marginRight: 'var(--spacing-2)',
    boxShadow: `0 0 12px ${colors.indicator}40`,
  }), [colors.indicator])

  const iconContainerStyle = useMemo(() => ({
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: colors.indicator,
  }), [colors.bg, colors.border, colors.indicator])

  return (
    <div style={containerStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {showIndicator && (
            <div style={{ display: 'inline-block', marginBottom: 'var(--spacing-2)' }}>
              <span style={indicatorStyle} />
            </div>
          )}
          <p style={labelStyle}>{label}</p>
          <p style={valueStyle}>{value}</p>
          {detail && <p style={detailStyle}>{detail}</p>}
        </div>
        {icon && <div style={iconContainerStyle}>{icon}</div>}
      </div>
    </div>
  )
}

export default React.memo(StatusCard)
