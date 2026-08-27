import React, { useEffect, useRef, useState } from 'react'

/**
 * ParallaxSection
 * Creates subtle parallax effect on scroll
 * Respects prefers-reduced-motion
 */
export const ParallaxSection: React.FC<{
  children: React.ReactNode
  offset?: number
  intensity?: number
  className?: string
}> = ({ children, offset = 50, intensity = 1, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [y, setY] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleMotionPreference = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleMotionPreference)

    if (prefersReducedMotion) {
      return () => {
        mediaQuery.removeEventListener('change', handleMotionPreference)
      }
    }

    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const elementOffset = window.innerHeight - rect.top
        setY(elementOffset * 0.5 * intensity)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      mediaQuery.removeEventListener('change', handleMotionPreference)
    }
  }, [prefersReducedMotion, intensity])

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translateY(${y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {children}
    </div>
  )
}

export default ParallaxSection
