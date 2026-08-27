import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-8)',
        paddingBottom: 'var(--spacing-6)',
        borderBottom: `1px solid var(--color-border)`,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: subtitle ? 'var(--spacing-2)' : '0',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export default SectionHeader
