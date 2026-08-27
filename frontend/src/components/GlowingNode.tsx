import React from 'react'

/**
 * GlowingNode
 * Individual node with glow effect for risk/network visualizations
 */
export const GlowingNode: React.FC<{
  label: string
  value?: number | string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  intensity?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}> = ({ label, value, color = 'primary', intensity = 'md', onClick }) => {
  const colorMap = {
    primary: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }

  const intensityMap = {
    sm: '0 0 8px',
    md: '0 0 16px',
    lg: '0 0 32px',
  }

  const glowColor = colorMap[color]
  const glowSize = intensityMap[intensity]

  return (
    <div
      className={`relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 ${
        onClick ? 'hover:opacity-80' : ''
      }`}
      onClick={onClick}
      style={{
        backgroundColor: glowColor,
        boxShadow: `${glowSize} ${glowColor}80`,
      }}
    >
      {/* Inner pulse */}
      <div
        className="absolute inset-2 rounded-full"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center">
        {value && (
          <p className="text-xs font-bold text-white">{value}</p>
        )}
        <p className="text-xs text-white font-semibold opacity-90">{label}</p>
      </div>
    </div>
  )
}

export default GlowingNode
