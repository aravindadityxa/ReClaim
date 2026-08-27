/**
 * Premium loading fallback for lazy-loaded pages.
 * Shows a skeleton UI while the page component is loading.
 */

import { useEffect, useState } from 'react'

export default function PageLoadingFallback() {
  const [shimmer, setShimmer] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setShimmer(prev => (prev + 1) % 100)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const SkeletonLine = ({ width = '100%', height = '1rem', delay = 0 }) => (
    <div
      className="rounded"
      style={{
        width,
        height,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundImage: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)`,
        backgroundPosition: `${shimmer}% 0`,
        backgroundSize: '200% 100%',
        transition: 'all 0.3s ease',
        animation: `shimmer 2s infinite`,
        animationDelay: `${delay * 0.1}s`,
      }}
    />
  )

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="space-y-4">
          <SkeletonLine width="30%" height="2rem" />
          <SkeletonLine width="60%" height="1rem" delay={1} />
        </div>

        {/* Content skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-6 border" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'var(--color-border)',
            }}>
              <SkeletonLine width="60%" height="0.875rem" delay={i} />
              <SkeletonLine width="80%" height="1.75rem" delay={i + 1} className="mt-4" />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="rounded-2xl p-8 border" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--color-border)',
        }}>
          <SkeletonLine width="25%" height="1.125rem" delay={4} />
          <div className="mt-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <SkeletonLine key={i} width="100%" height="0.75rem" delay={i + 5} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
