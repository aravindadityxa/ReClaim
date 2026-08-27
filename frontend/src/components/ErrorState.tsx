import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center justify-center max-w-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <AlertCircle size={32} style={{ color: 'var(--color-danger)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-center" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-accent-hover)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-accent)'
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
