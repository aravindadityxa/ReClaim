import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, Shield, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react'
import { authAPI } from '../api'
import { UserInfo, CreateUserRequest } from '../types'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import { CinematicBackground } from '../components/CinematicBackground'
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation'

export default function UserManagement() {
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'VIEWER',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await authAPI.listUsers()
      setUsers(response.users)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCreating(true)

    try {
      const newUser = await authAPI.createUser(formData)
      setUsers([...users, newUser])
      setShowCreateForm(false)
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'VIEWER',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      setFormError(message)
    } finally {
      setCreating(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const updated = await authAPI.updateUserRole(userId, { role: newRole })
      setUsers(users.map((u) => (u.id === userId ? updated : u)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role'
      setError(message)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return

    try {
      const updated = await authAPI.deactivateUser(userId)
      setUsers(users.map((u) => (u.id === userId ? updated : u)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate user'
      setError(message)
    }
  }

  const handleActivateUser = async (userId: string) => {
    try {
      const updated = await authAPI.activateUser(userId)
      setUsers(users.map((u) => (u.id === userId ? updated : u)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate user'
      setError(message)
    }
  }

  if (loading) return <LoadingState />
  if (error && !users.length) return <ErrorState message={error} />

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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'ADMIN': { bg: 'var(--color-error-light)', text: 'var(--color-error-dark)' },
      'OPERATOR': { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)' },
      'ANALYST': { bg: 'var(--color-primary-100)', text: 'var(--color-primary-800)' },
      'VIEWER': { bg: 'var(--color-neutral-100)', text: 'var(--color-neutral-800)' },
    };
    return colors[role] || colors['VIEWER'];
  }

  return (
    <div style={containerStyle} className="p-8 md:p-12 min-h-screen relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-info-light)' }}>
                  <Users size={28} style={{ color: 'var(--color-info)' }} />
                </div>
                <h1 className="text-5xl font-bold" style={headingStyle}>
                  USER MANAGEMENT
                </h1>
              </div>
              <p style={textSecondaryStyle} className="text-lg">Manage users and their role-based access permissions</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
              style={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <Plus size={18} />
              Create User
            </button>
          </div>
        </ScrollTriggerAnimation>

        {/* Error Message */}
        {error && (
          <ScrollTriggerAnimation>
            <div className="p-4 rounded-lg flex items-start gap-3 border" style={{
              backgroundColor: 'var(--color-error-light)',
              borderColor: 'var(--color-error)',
            }}>
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error-dark)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-error-dark)' }}>{error}</p>
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <ScrollTriggerAnimation>
            <div className="rounded-lg p-8 border" style={cardStyle}>
              <h3 className="text-lg font-semibold mb-6" style={headingStyle}>Create New User</h3>
              {formError && (
                <div className="mb-4 p-3 rounded-lg text-sm border" style={{
                  backgroundColor: 'var(--color-error-light)',
                  borderColor: 'var(--color-error)',
                  color: 'var(--color-error-dark)',
                }}>
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={headingStyle}>
                      Username <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={headingStyle}>
                      Email <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={headingStyle}>
                      Password <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={headingStyle}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Full name"
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      disabled={creating}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={headingStyle}>
                      Role <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <select
                      value={formData.role || 'VIEWER'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      disabled={creating}
                    >
                      <option value="VIEWER">Viewer - Read-only access</option>
                      <option value="ANALYST">Analyst - Analytics and reports</option>
                      <option value="OPERATOR">Operator - Manage workflows</option>
                      <option value="ADMIN">Admin - Full system access</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="submit"
                    disabled={creating || !formData.username || !formData.email || !formData.password}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-info)',
                      color: 'var(--color-text-inverse)',
                      opacity: creating || !formData.username || !formData.email || !formData.password ? '0.5' : '1',
                    }}
                  >
                    {creating ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Users Grid Card View */}
        {users.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem' }} />
            <p style={textSecondaryStyle} className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user, idx) => (
              <ScrollTriggerAnimation key={user.id} delay={idx * 100}>
                <div
                  className="card p-6 rounded-lg border hover:shadow-lg transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {/* User Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm" style={headingStyle}>
                        {user.username}
                      </h4>
                      <p className="text-xs mt-1" style={textSecondaryStyle}>
                        {user.full_name || user.email}
                      </p>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: user.is_active ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs" style={textSecondaryStyle}>Email</p>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--color-info)' }}>
                      {user.email}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="mb-4">
                    <p className="text-xs mb-2" style={textSecondaryStyle}>Role</p>
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="w-full px-3 py-1 rounded text-xs font-medium border-0 transition-all"
                      style={{
                        ...getRoleBadgeColor(user.role),
                        backgroundColor: getRoleBadgeColor(user.role).bg,
                        color: getRoleBadgeColor(user.role).text,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="ANALYST">Analyst</option>
                      <option value="OPERATOR">Operator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  {/* Status & Last Login */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div>
                      <p style={textSecondaryStyle} className="mb-1">Status</p>
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100">
                          <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
                          <span style={{ color: 'var(--color-success-dark)' }}>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded" style={{
                          backgroundColor: 'var(--color-neutral-100)',
                        }}>
                          <AlertCircle size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span style={{ color: 'var(--color-neutral-800)' }}>Inactive</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <p style={textSecondaryStyle} className="mb-1">Last Login</p>
                      <p style={{ color: 'var(--color-text-primary)' }}>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
                    {user.is_active ? (
                      <button
                        onClick={() => handleDeactivateUser(user.id)}
                        className="text-xs font-medium px-3 py-1 rounded transition-all"
                        style={{
                          color: 'var(--color-error)',
                          backgroundColor: 'var(--color-error-light)',
                        }}
                        title="Deactivate user"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateUser(user.id)}
                        className="text-xs font-medium px-3 py-1 rounded transition-all"
                        style={{
                          color: 'var(--color-info)',
                          backgroundColor: 'var(--color-info-light)',
                        }}
                        title="Activate user"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </ScrollTriggerAnimation>
            ))}
          </div>
        )}

        {/* Info Box */}
        <ScrollTriggerAnimation>
          <div className="rounded-lg p-6 border" style={{
            backgroundColor: 'var(--color-info-light)',
            borderColor: 'var(--color-info)',
          }}>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-info)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-info-dark)' }}>
                  Role-Based Access Control
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-info-dark)' }}>
                  <strong>Viewer:</strong> Read-only access to all dashboards • <strong>Analyst:</strong> View analytics and reports • <strong>Operator:</strong> Manage recovery workflows and approvals • <strong>Admin:</strong> Full system access and configuration
                </p>
              </div>
            </div>
          </div>
        </ScrollTriggerAnimation>
      </div>
    </div>
  )
}
