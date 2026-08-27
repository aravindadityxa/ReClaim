import React from 'react'

/**
 * WorkflowStateMachine
 * Visual state machine for recovery workflows
 * Shows progression through workflow states with pulse animations
 */
export const WorkflowStateMachine: React.FC<{
  currentState: string
  states: Array<{ id: string; label: string; icon?: React.ReactNode }>
  vertical?: boolean
}> = ({ currentState, states, vertical = false }) => {
  const currentIndex = states.findIndex((s) => s.id === currentState)

  if (vertical) {
    return (
      <div className="flex flex-col gap-0">
        {states.map((state, idx) => {
          const isActive = idx === currentIndex
          const isCompleted = idx < currentIndex
          const isNext = idx === currentIndex + 1

          return (
            <div key={state.id} className="relative">
              {/* Connector line */}
              {idx < states.length - 1 && (
                <div
                  className="absolute left-6 top-16 w-0.5 h-12 transition-all duration-500"
                  style={{
                    backgroundColor: isCompleted || isActive ? '#10b981' : '#e5e7eb',
                    boxShadow: isCompleted || isActive ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                />
              )}

              {/* State node */}
              <div className="flex items-start gap-4 mb-8">
                <div
                  className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? 'bg-blue-500 text-white animate-pulse-glow'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {state.icon ? (
                    <div className="text-lg">{state.icon}</div>
                  ) : (
                    <span className="font-semibold text-sm">{idx + 1}</span>
                  )}

                  {/* Pulse ring for active state */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full border-2 border-blue-400"
                      style={{
                        animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                  )}
                </div>

                <div className="pt-2">
                  <p
                    className={`font-semibold text-sm transition-colors duration-300 ${
                      isActive ? 'text-gray-900' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {state.label}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal layout
  return (
    <div className="flex items-center justify-between relative">
      {states.map((state, idx) => {
        const isActive = idx === currentIndex
        const isCompleted = idx < currentIndex
        const isNext = idx === currentIndex + 1

        return (
          <div key={state.id} className="flex flex-col items-center relative flex-1">
            {/* Connector line */}
            {idx < states.length - 1 && (
              <div
                className="absolute top-6 left-1/2 w-1/2 h-1 transition-all duration-500"
                style={{
                  backgroundColor: isCompleted || isActive ? '#10b981' : '#e5e7eb',
                  boxShadow: isCompleted || isActive ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              />
            )}

            {/* State node */}
            <div
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                isActive
                  ? 'bg-blue-500 text-white animate-pulse-glow'
                  : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {state.icon ? (
                <div className="text-lg">{state.icon}</div>
              ) : (
                <span className="font-semibold text-sm">{idx + 1}</span>
              )}

              {/* Pulse ring for active state */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-full border-2 border-blue-400"
                  style={{
                    animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <p
              className={`text-xs font-semibold mt-3 text-center transition-colors duration-300 ${
                isActive ? 'text-gray-900' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {state.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default WorkflowStateMachine
