import React, { useMemo, useCallback } from 'react'

interface PremiumCardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  interactive?: boolean
  hover?: boolean
}

const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  className = '',
  elevated = false,
  interactive = false,
  hover = true,
}) => {
  const cardStyle = useMemo(() => ({
    backgroundColor: 'var(--color-surface-elevated)',
    border: `1px solid var(--color-border)`,
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-6)',
    transition: 'all var(--transition-base)',
    boxShadow: elevated ? 'var(--shadow-lg)' : 'var(--shadow-md)',
    cursor: interactive ? 'pointer' : 'default',
  }), [elevated, interactive])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (hover) {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)'
      if (interactive) {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'
      }
    }
  }, [hover, interactive])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (hover) {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
      if (interactive) {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
      }
    }
  }, [hover, interactive])

  return (
    <div
      className={`card ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

export default React.memo(PremiumCard)
