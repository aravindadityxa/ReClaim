import { Settings, Package, Code, Zap, Shield } from 'lucide-react'
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function SettingsPage() {
  const cardStyle = {
    backgroundColor: 'var(--color-bg-elevated)',
    borderColor: 'var(--color-border)',
    boxShadow: 'var(--shadow-md)',
  };

  const headingStyle = {
    color: 'var(--color-text-primary)',
  };

  const textSecondaryStyle = {
    color: 'var(--color-text-secondary)',
  };

  const containerStyle = {
    backgroundColor: 'var(--color-bg-primary)',
  };

  return (
    <div style={containerStyle} className="p-8 md:p-12 min-h-screen relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                <Settings className="w-8 h-8" style={{ color: 'var(--color-primary-600)' }} />
              </div>
              <h1 className="text-5xl font-bold" style={headingStyle}>
                SYSTEM SETTINGS
              </h1>
            </div>
            <p className="text-lg mt-2" style={textSecondaryStyle}>
              Platform configuration and preferences
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* General Settings */}
        <ScrollTriggerAnimation>
          <div className="card p-8 rounded-xl border" style={cardStyle}>
            <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold flex items-center gap-2" style={headingStyle}>
                <Package className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
                General
              </h3>
              <p className="text-sm mt-1" style={textSecondaryStyle}>Basic account and platform configuration</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium block mb-2" style={headingStyle}>Platform Name</label>
                <div className="px-4 py-3 rounded-lg border" style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}>
                  <p className="font-medium">ReClaim</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2" style={headingStyle}>Version</label>
                <div className="px-4 py-3 rounded-lg border" style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}>
                  <p className="font-medium">1.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Account Settings */}
        <ScrollTriggerAnimation>
          <div className="card p-8 rounded-xl border" style={cardStyle}>
            <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold flex items-center gap-2" style={headingStyle}>
                <Shield className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                Account
              </h3>
              <p className="text-sm mt-1" style={textSecondaryStyle}>Manage your account settings and preferences</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium block mb-2" style={headingStyle}>Account Type</label>
                <div className="px-4 py-3 rounded-lg border" style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}>
                  <p className="font-medium">Revenue Recovery Platform</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2" style={headingStyle}>Status</label>
                <div className="px-4 py-3 rounded-lg border" style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}>
                  <p className="inline-flex items-center gap-2 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }}></span>
                    <span>Active</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Features */}
        <ScrollTriggerAnimation>
          <div className="card p-8 rounded-xl border" style={cardStyle}>
            <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold flex items-center gap-2" style={headingStyle}>
                <Zap className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                Features & Modules
              </h3>
              <p className="text-sm mt-1" style={textSecondaryStyle}>Available modules and capabilities</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Recovery Intelligence',
                  desc: 'ML-powered recovery optimization and risk scoring',
                  icon: '🧠'
                },
                {
                  title: 'Revenue Analytics',
                  desc: 'Real-time revenue tracking and opportunity analysis',
                  icon: '📊'
                },
                {
                  title: 'Governance Control',
                  desc: 'Policy management and approval workflows',
                  icon: '🛡️'
                },
                {
                  title: 'System Health',
                  desc: 'Platform performance and operational metrics',
                  icon: '💚'
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-4 rounded-lg border hover:shadow-md transition-all"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h4 className="font-medium mb-1" style={headingStyle}>{feature.title}</h4>
                  <p className="text-sm" style={textSecondaryStyle}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* About */}
        <ScrollTriggerAnimation>
          <div className="card p-8 rounded-xl border" style={cardStyle}>
            <div className="mb-6 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-semibold flex items-center gap-2" style={headingStyle}>
                <Code className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
                Technical Stack
              </h3>
              <p className="text-sm mt-1" style={textSecondaryStyle}>Platform information and architecture details</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-semibold text-lg" style={headingStyle}>ReClaim</p>
                <p className="text-sm" style={textSecondaryStyle}>Revenue Recovery & Intelligence Platform</p>
              </div>
              
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium mb-2" style={textSecondaryStyle}>Backend Architecture</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Python', 'FastAPI', 'PostgreSQL', 'Redis'].map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary-600)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium mb-2" style={textSecondaryStyle}>Frontend Stack</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['React', 'TypeScript', 'Tailwind CSS', 'Lucide Icons'].map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-info-light)',
                        color: 'var(--color-info-dark)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium mb-2" style={textSecondaryStyle}>ML & Analytics</p>
                <div className="flex flex-wrap gap-2">
                  {['scikit-learn', 'pandas', 'numpy'].map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--color-success-light)',
                        color: 'var(--color-success-dark)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>
      </div>
    </div>
  )
}
