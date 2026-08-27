import React, { useEffect, useRef } from 'react'

/**
 * ScrollTriggerAnimation
 * Wrapper component that triggers animations when element enters viewport
 * Uses IntersectionObserver for performance
 */
export const ScrollTriggerAnimation: React.FC<{
  children: React.ReactNode
  animation?: 'fade-in-up' | 'fade-in-down' | 'scale-in' | 'slide-in-right'
  delay?: number
  threshold?: number
  className?: string
}> = ({ children, animation = 'fade-in-up', delay = 0, threshold = 0.1, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])

  const animationClass =
    isVisible && animation ? `animate-${animation}` : 'opacity-0'

  return (
    <div
      ref={ref}
      className={`${animationClass} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default ScrollTriggerAnimation
