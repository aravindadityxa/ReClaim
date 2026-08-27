import { Database } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message: string
  icon?: React.ReactNode
}

export default function EmptyState({
  title = 'No data available',
  message,
  icon,
}: EmptyStateProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center justify-center max-w-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(124, 140, 255, 0.1)' }}>
          {icon || <Database size={32} style={{ color: 'var(--color-accent)' }} />}
        </div>
        <h3 className="text-lg font-semibold mb-2 text-center" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      </div>
    </div>
  )
}
