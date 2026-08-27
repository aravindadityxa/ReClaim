export default function LoadingState() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div 
          className="relative w-12 h-12 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, var(--color-accent) 0deg, var(--color-accent-hover) 360deg)',
            animation: 'spin 1s linear infinite',
          }}
        >
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div 
            className="absolute inset-1 rounded-full"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    </div>
  )
}
