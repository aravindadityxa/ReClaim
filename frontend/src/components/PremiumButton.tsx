import React from 'react'

interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export const PremiumButton = React.forwardRef<
  HTMLButtonElement,
  PremiumButtonProps
>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: {
        bg: 'var(--color-accent)' as const,
        text: 'var(--color-text-inverse)' as const,
        hoverBg: 'var(--color-accent-hover)' as const,
        glow: 'var(--glow-md)' as const,
        border: undefined as string | undefined,
      },
      secondary: {
        bg: 'rgba(255, 255, 255, 0.05)' as const,
        text: 'var(--color-text-primary)' as const,
        hoverBg: 'rgba(255, 255, 255, 0.08)' as const,
        border: 'var(--color-border)' as const,
        glow: undefined as string | undefined,
      },
      danger: {
        bg: 'var(--color-danger-bg)' as const,
        text: 'var(--color-danger-text)' as const,
        hoverBg: 'rgba(255, 92, 108, 0.16)' as const,
        border: 'var(--color-danger-border)' as const,
        glow: 'var(--glow-danger)' as const,
      },
      success: {
        bg: 'var(--color-success-bg)' as const,
        text: 'var(--color-success-text)' as const,
        hoverBg: 'rgba(53, 208, 127, 0.16)' as const,
        border: 'var(--color-success-border)' as const,
        glow: 'var(--glow-success)' as const,
      },
    } as const

    const sizeStyles = {
      sm: {
        padding: 'var(--spacing-2) var(--spacing-4)',
        fontSize: 'var(--font-size-sm)',
      },
      md: {
        padding: 'var(--spacing-3) var(--spacing-6)',
        fontSize: 'var(--font-size-base)',
      },
      lg: {
        padding: 'var(--spacing-4) var(--spacing-8)',
        fontSize: 'var(--font-size-lg)',
      },
    } as const

    const variantStyle = variantStyles[variant as keyof typeof variantStyles]
    const sizeStyle = sizeStyles[size as keyof typeof sizeStyles]

    return (
      <button
        ref={ref}
        className="btn"
        disabled={disabled || loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-2)',
          fontWeight: 'var(--font-weight-semibold)',
          borderRadius: 'var(--radius-md)',
          border: variantStyle.border ? `1px solid ${variantStyle.border}` : 'none',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition-fast)',
          userSelect: 'none',
          outline: 'none',
          whiteSpace: 'nowrap',
          opacity: disabled || loading ? 0.5 : 1,
          backgroundColor: variantStyle.bg,
          color: variantStyle.text,
          ...sizeStyle,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading && variant !== 'secondary') {
            (e.currentTarget as HTMLElement).style.backgroundColor = variantStyle.hoverBg
            if (variantStyle.glow) {
              (e.currentTarget as HTMLElement).style.boxShadow = variantStyle.glow
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            (e.currentTarget as HTMLElement).style.backgroundColor = variantStyle.bg as string
            (e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }
        }}
        {...props}
      >
        {loading ? (
          <>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
            {children}
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </button>
    )
  }
)

PremiumButton.displayName = 'PremiumButton'

export default PremiumButton
