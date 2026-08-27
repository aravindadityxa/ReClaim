import { useState } from 'react'
import { LogIn, AlertCircle, Loader, Zap } from 'lucide-react'
import { authAPI, setAuthToken } from '../api'
import { LoginRequest } from '../types'
import { CinematicBackground } from '../components/CinematicBackground'
import { AnimatedDataStream } from '../components/AnimatedDataStream'
import PremiumButton from '../components/PremiumButton'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState<'username' | 'password' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const credentials: LoginRequest = { username, password }
      const response = await authAPI.login(credentials)
      setAuthToken(response.access_token)
      window.location.href = '/dashboard'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Animated cinematic background */}
      <div className="absolute inset-0 -z-20">
        <CinematicBackground withParticles={true} intensity="subtle" />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 15% 10%, rgba(124, 140, 255, 0.12), transparent 32%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 85% 25%, rgba(53, 208, 127, 0.08), transparent 28%)',
          }}
        />
      </div>

      {/* Animated data stream */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <AnimatedDataStream intensity={2} />
      </div>

      {/* Premium content container */}
      <div className="w-full max-w-md px-4 z-10 animate-fade-in-up">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          {/* Icon with glow */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Ambient glow */}
              <div
                className="absolute inset-0 rounded-2xl blur-3xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(124, 140, 255, 0.8), rgba(53, 208, 127, 0.4))',
                  opacity: 0.4,
                  animation: 'pulse 4s ease-in-out infinite',
                }}
              />
              {/* Icon container */}
              <div
                className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl backdrop-blur-xl"
                style={{
                  background: 'var(--color-accent-soft)',
                  border: `1px solid var(--color-accent-glow)`,
                  boxShadow: 'var(--glow-md)',
                }}
              >
                <Zap
                  size={40}
                  style={{ color: 'var(--color-accent)' }}
                  className="animate-float"
                />
              </div>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1
              className="text-5xl md:text-6xl font-bold mb-4 tracking-tight"
              style={{
                color: 'var(--color-text-primary)',
                letterSpacing: 'var(--letter-spacing-tight)',
              }}
            >
              ReClaim
            </h1>
            <p
              className="text-xl font-light tracking-normal"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Recover what your business is losing
            </p>
          </div>

          {/* Subtitle */}
          <p
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            Intelligence • Recovery • Control
          </p>
        </div>

        {/* Login Card */}
        <div
          className="card animate-scale-in"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: `1px solid var(--color-border)`,
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-8)',
            boxShadow: 'var(--shadow-xl)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'var(--color-accent-glow)'
            el.style.boxShadow = `var(--shadow-2xl), var(--glow-sm)`
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'var(--color-border)'
            el.style.boxShadow = 'var(--shadow-xl)'
          }}
        >
          <h2
            className="text-2xl font-semibold mb-8"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sign In
          </h2>

          {/* Error Message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg flex items-start gap-3 backdrop-blur border animate-slide-in-down"
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                borderColor: 'var(--color-danger-border)',
              }}
            >
              <AlertCircle
                size={20}
                style={{
                  color: 'var(--color-danger)',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              />
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-danger-text)' }}
                >
                  Authentication failed
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--color-danger-text)' }}
                >
                  {error}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label
                className="block text-sm font-semibold mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsFocused('username')}
                  onBlur={() => setIsFocused(null)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all backdrop-blur border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor:
                      isFocused === 'username'
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    boxShadow:
                      isFocused === 'username'
                        ? '0 0 0 3px var(--color-accent-soft)'
                        : 'none',
                  }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-semibold mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsFocused('password')}
                  onBlur={() => setIsFocused(null)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all backdrop-blur border"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor:
                      isFocused === 'password'
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    boxShadow:
                      isFocused === 'password'
                        ? '0 0 0 3px var(--color-accent-soft)'
                        : 'none',
                  }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <PremiumButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !username || !password}
                loading={loading}
                icon={loading ? undefined : <LogIn size={18} />}
                style={{
                  width: '100%',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </PremiumButton>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 space-y-2 animate-fade-in">
          <p
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Demo Credentials
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-disabled)' }}
          >
            admin / Admin@123456
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }

        input::placeholder {
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}

