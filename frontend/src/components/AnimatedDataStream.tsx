import React, { useEffect, useRef } from 'react'

/**
 * AnimatedDataStream
 * Flowing data visualization component with animated particles
 * representing data movement through the system
 */
export const AnimatedDataStream: React.FC<{
  intensity?: number
  height?: number
  className?: string
}> = ({ intensity = 5, height = 200, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = height

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
    }> = []

    const createParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 1 + Math.random() * 2,
        vy: (Math.random() - 0.5) * 1,
        life: 0,
        maxLife: 3000,
        size: Math.random() * 2 + 1,
      })
    }

    let animationId: number
    let lastParticleTime = 0

    const animate = (timestamp: number) => {
      // Clear with fade trail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Create new particles
      if (timestamp - lastParticleTime > 100 / intensity && particles.length < 50) {
        createParticle()
        lastParticleTime = timestamp
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life += 16

        const lifeRatio = particle.life / particle.maxLife
        const opacity = Math.max(0, 1 - lifeRatio)

        // Draw glow
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3)
        gradient.addColorStop(0, `rgba(14, 165, 233, ${opacity * 0.3})`)
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(
          particle.x - particle.size * 3,
          particle.y - particle.size * 3,
          particle.size * 6,
          particle.size * 6
        )

        // Draw core
        ctx.fillStyle = `rgba(14, 165, 233, ${opacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Remove dead particles
        if (lifeRatio >= 1) {
          particles.splice(i, 1)
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleResize = () => {
      canvas.width = canvas.offsetWidth
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [height, intensity])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-lg ${className}`}
      style={{
        height: `${height}px`,
        backgroundColor: 'rgba(249, 250, 251, 0.5)',
        border: '1px solid rgba(14, 165, 233, 0.1)',
      }}
    />
  )
}

export default AnimatedDataStream
