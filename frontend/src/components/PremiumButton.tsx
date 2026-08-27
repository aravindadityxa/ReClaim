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
        bg: 'var(--color-accent)',
        text: 'var(--color-text-inverse)',
        hoverBg: 'var(--color-accent-hover)',
        glow: 'var(--glow-md)',
      },
      secondary: {
        bg: 'rgba(255, 255, 255, 0.05)',
        text: 'var(--color-text-primary)',
        hoverBg: 'rgba(255, 255, 255, 0.08)',
        border: 'var(--color-border)',
      },
      danger: {
        bg: 'var(--color-danger-bg)',
        text: 'var(--color-danger-text)',
        hoverBg: 'rgba(255, 92, 108, 0.16)',
        border: 'var(--color-danger-border)',
        glow: 'var(--glow-danger)',
      },
      success: {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success-text)',
        hoverBg: 'rgba(53, 208, 127, 0.16)',
        border: 'var(--color-success-border)',
        glow: 'var(--glow-success)',
      },
    }

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
    }

    const variantStyle = variantStyles[variant]
    const sizeStyle = sizeStyles[size]

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
            (e.currentTarget as HTMLElement).style.backgroundColor = variantStyle.bg
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
