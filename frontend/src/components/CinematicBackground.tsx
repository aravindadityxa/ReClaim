import React, { useEffect, useRef } from 'react'

/**
 * CinematicBackground
 * Creates a sophisticated layered background with:
 * - Gradient base layer
 * - Atmospheric radial gradient
 * - Subtle grid overlay
 * - Optional particle field
 */
export const CinematicBackground: React.FC<{
  withParticles?: boolean
  intensity?: 'subtle' | 'medium' | 'bold'
  className?: string
}> = ({ withParticles = false, intensity = 'subtle', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!withParticles || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create particles
    const particleCount = intensity === 'subtle' ? 30 : intensity === 'medium' ? 60 : 100
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      opacity: number
    }> = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.5 + 0.1,
      })
    }

    let animationId: number

    const animate = () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.01)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.fillStyle = `rgba(14, 165, 233, ${particle.opacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [withParticles, intensity])

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* Gradient base layer */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      />

      {/* Atmospheric glow layer */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% -50%, rgba(14, 165, 233, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(0deg, rgba(14, 165, 233, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Particle field (optional) */}
      {withParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        />
      )}
    </div>
  )
}

export default CinematicBackground
