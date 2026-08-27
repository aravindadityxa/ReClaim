import React, { useMemo } from 'react'

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const statusConfig = useMemo(() => ({
    success: {
      bg: 'var(--color-success-bg)',
      text: 'var(--color-success-text)',
      border: 'var(--color-success-border)',
      dot: 'var(--color-success)',
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      text: 'var(--color-warning-text)',
      border: 'var(--color-warning-border)',
      dot: 'var(--color-warning)',
    },
    danger: {
      bg: 'var(--color-danger-bg)',
      text: 'var(--color-danger-text)',
      border: 'var(--color-danger-border)',
      dot: 'var(--color-danger)',
    },
    info: {
      bg: 'var(--color-info-bg)',
      text: 'var(--color-info-text)',
      border: 'var(--color-info-border)',
      dot: 'var(--color-info)',
    },
    neutral: {
      bg: 'rgba(255, 255, 255, 0.05)',
      text: 'var(--color-text-secondary)',
      border: 'var(--color-border)',
      dot: 'var(--color-text-muted)',
    },
  }), [])

  const config = useMemo(() => statusConfig[status], [status, statusConfig])

  const sizeConfig = useMemo(() => ({
    sm: {
      padding: 'var(--spacing-2) var(--spacing-3)',
      fontSize: 'var(--font-size-xs)',
      dotSize: '4px',
    },
    md: {
      padding: 'var(--spacing-2) var(--spacing-4)',
      fontSize: 'var(--font-size-sm)',
      dotSize: '6px',
    },
    lg: {
      padding: 'var(--spacing-3) var(--spacing-6)',
      fontSize: 'var(--font-size-base)',
      dotSize: '8px',
    },
  }), [])

  const sizeValue = useMemo(() => sizeConfig[size], [size, sizeConfig])

  const badgeStyle = useMemo(() => ({
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 'var(--spacing-2)',
    padding: sizeValue.padding,
    backgroundColor: config.bg,
    color: config.text,
    border: `1px solid ${config.border}`,
    borderRadius: 'var(--radius-md)',
    fontSize: sizeValue.fontSize,
    fontWeight: 'var(--font-weight-medium)',
  }), [config, sizeValue])

  const dotStyle = useMemo(() => ({
    width: sizeValue.dotSize,
    height: sizeValue.dotSize,
    borderRadius: '50%',
    backgroundColor: config.dot,
    flexShrink: 0,
  }), [config, sizeValue])

  return (
    <div className="badge" style={badgeStyle}>
      <div style={dotStyle} />
      {label}
    </div>
  )
}

export default React.memo(StatusBadge)
