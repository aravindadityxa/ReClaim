import React, { useEffect, useRef } from 'react'

/**
 * RevenueFlowVisualization
 * Animated visualization of revenue through recovery stages:
 * AT RISK → DETECTED → ANALYZED → RECOVERY → RECOVERED
 */
export const RevenueFlowVisualization: React.FC<{
  atRisk: number
  recovered: number
  height?: number
}> = ({ atRisk, recovered, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current
    const width = svg.clientWidth
    const stages = [
      { label: 'AT RISK', color: '#ef4444', x: width * 0.1 },
      { label: 'DETECTED', color: '#f59e0b', x: width * 0.3 },
      { label: 'ANALYZED', color: '#3b82f6', x: width * 0.5 },
      { label: 'RECOVERY', color: '#8b5cf6', x: width * 0.7 },
      { label: 'RECOVERED', color: '#10b981', x: width * 0.9 },
    ]

    // Animate flow lines
    const paths = svg.querySelectorAll('.flow-line')
    paths.forEach((path, index) => {
      const length = (path as SVGPathElement).getTotalLength()
      path.setAttribute('stroke-dasharray', length.toString())
      path.setAttribute('stroke-dashoffset', length.toString())

      setTimeout(() => {
        ;(path as SVGPathElement).style.animation = `flow-line 2s ease-in-out forwards`
      }, index * 200)
    })
  }, [])

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      viewBox={`0 0 ${600} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
    >
      {/* Flow path */}
      <defs>
        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="20%" stopColor="#f59e0b" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Animated flow line */}
      <path
        className="flow-line"
        d="M 60 150 L 180 150 L 300 150 L 420 150 L 540 150"
        stroke="url(#flowGradient)"
        strokeWidth="3"
        fill="none"
        filter="url(#glow)"
      />

      {/* Stage nodes with pulses */}
      {[
        { stage: 'AT RISK', x: 60, color: '#ef4444' },
        { stage: 'DETECTED', x: 180, color: '#f59e0b' },
        { stage: 'ANALYZED', x: 300, color: '#3b82f6' },
        { stage: 'RECOVERY', x: 420, color: '#8b5cf6' },
        { stage: 'RECOVERED', x: 540, color: '#10b981' },
      ].map(({ stage, x, color }, idx) => (
        <g key={stage}>
          {/* Glow pulse */}
          <circle cx={x} cy={150} r="16" fill={color} opacity="0.2" className="animate-pulse" />

          {/* Main node */}
          <circle
            cx={x}
            cy={150}
            r="8"
            fill={color}
            style={{
              animation: `data-pulse 2s ease-in-out infinite`,
              animationDelay: `${idx * 0.2}s`,
            }}
            filter="url(#glow)"
          />

          {/* Label */}
          <text x={x} y={180} textAnchor="middle" fontSize="12" fill="#6b7280" fontWeight="500">
            {stage}
          </text>
        </g>
      ))}

      {/* Revenue values */}
      <text x={60} y={110} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#ef4444">
        ₹{(atRisk / 1000).toFixed(0)}K
      </text>
      <text x={540} y={110} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981">
        ₹{(recovered / 1000).toFixed(0)}K
      </text>
    </svg>
  )
}

export default RevenueFlowVisualization
