interface BadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'critical' | 'info'
}

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  critical: 'badge-critical',
  info: 'badge-info',
}

export default function Badge({ label, variant }: BadgeProps) {
  return <span className={variants[variant]}>{label}</span>
}
