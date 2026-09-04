import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { BarChart3, TrendingUp, Activity, Settings, AlertTriangle, Menu, X, Zap, Gauge, Shield, LineChart, Cpu, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuthContext } from './context/AuthContext'
import PageLoadingFallback from './components/PageLoadingFallback'
import Login from './pages/Login'

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Opportunities = lazy(() => import('./pages/Opportunities'))
const RiskIntelligence = lazy(() => import('./pages/RiskIntelligence'))
const RecoveryIntelligence = lazy(() => import('./pages/RecoveryIntelligence'))
const RecoveryControlCenter = lazy(() => import('./pages/RecoveryControlCenter'))
const GovernancePage = lazy(() => import('./pages/GovernancePage').then(m => ({ default: m.GovernancePage })))
const RecoveryAnalyticsPage = lazy(() => import('./pages/RecoveryAnalyticsPage').then(m => ({ default: m.RecoveryAnalyticsPage })))
const SystemHealth = lazy(() => import('./pages/SystemHealth'))
const ActivityPage = lazy(() => import('./pages/Activity'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const UserManagement = lazy(() => import('./pages/UserManagement'))

type Page = 'dashboard' | 'opportunities' | 'risk' | 'recovery' | 'control-center' | 'governance' | 'analytics' | 'health' | 'activity' | 'settings' | 'users'

export default function App() {
  const { currentUser, logout, loading } = useAuthContext()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner w-12 h-12"></div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show Login page
  if (!currentUser) {
    return <Login />
  }

  const navSections = [
    {
      title: 'COMMAND',
      items: [
        { id: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3, description: 'Revenue overview' },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'risk' as Page, label: 'Risk Intelligence', icon: AlertTriangle, description: 'Risk analysis' },
        { id: 'recovery' as Page, label: 'Recovery Intelligence', icon: Zap, description: 'Recovery strategy' },
        { id: 'opportunities' as Page, label: 'Revenue Opportunities', icon: TrendingUp, description: 'Opportunity list' },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'control-center' as Page, label: 'Recovery Control Center', icon: Gauge, description: 'Execution' },
        { id: 'analytics' as Page, label: 'Recovery Analytics', icon: LineChart, description: 'Measurement' },
        { id: 'activity' as Page, label: 'Revenue Activity', icon: Activity, description: 'Event log' },
      ]
    },
    {
      title: 'TRUST',
      items: [
        { id: 'governance' as Page, label: 'Governance & Safety', icon: Shield, description: 'Policy control' },
        { id: 'health' as Page, label: 'System Health', icon: Cpu, description: 'System status' },
      ]
    },
    ...(currentUser.role === 'ADMIN' ? [{
      title: 'ADMINISTRATION',
      items: [
        { id: 'users' as Page, label: 'User Management', icon: User, description: 'Access control' },
      ]
    }] : []),
    {
      title: 'SETTINGS',
      items: [
        { id: 'settings' as Page, label: 'Settings', icon: Settings, description: 'Configuration' },
      ]
    }
  ]

  const flatNavItems = navSections.flatMap(section => section.items)

  const handleLogout = async () => {
    try {
      await logout()
      // Redirect to login after logout
      window.location.href = '/'
    } catch (err) {
      // Logout failed - user will remain logged in
    }
  }

  const currentPageLabel = flatNavItems.find((item) => item.id === currentPage)?.label || 'Dashboard'

  return (
    <div className="flex h-screen bg-primary">
      {/* Premium Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col border-r transition-all duration-300`}
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Logo Area */}
        <div 
          className="h-16 flex items-center px-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3 w-full">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
              }}
            >
              <BarChart3 size={20} style={{ color: 'var(--color-text-inverse)' }} />
            </div>
            {sidebarOpen && (
              <h1 className="font-bold truncate" style={{ 
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)'
              }}>
                ReClaim
              </h1>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded transition-smooth hover:bg-surface-hover"
              style={{
                color: 'var(--color-text-secondary)',
              }}
              title="Collapse sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                {sidebarOpen && (
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider" 
                    style={{ color: 'var(--color-text-muted)' }}>
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = currentPage === item.id

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentPage(item.id)
                          setShowUserMenu(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-smooth text-sm font-medium relative group`}
                        style={{
                          backgroundColor: isActive ? 'rgba(124, 140, 255, 0.12)' : 'transparent',
                          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        }}
                        title={!sidebarOpen ? item.label : undefined}
                      >
                        {isActive && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                            style={{
                              backgroundColor: 'var(--color-accent)',
                            }}
                          />
                        )}
                        <Icon size={18} className="flex-shrink-0" />
                        {sidebarOpen && <span className="truncate">{item.label}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div 
          className="border-t p-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md transition-smooth w-full flex justify-center hover:bg-surface-hover"
            style={{
              color: 'var(--color-text-secondary)',
            }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-primary">
        {/* Premium Header */}
        <div 
          className="border-b px-8 py-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div>
            <h2 className="page-title" style={{ marginBottom: 0, color: 'var(--color-text-primary)' }}>
              {currentPageLabel}
            </h2>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg transition-smooth"
              style={{
                color: 'var(--color-text-primary)',
              }}
            >
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.username}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{currentUser.role}</p>
              </div>
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                {currentUser.username.substring(0, 1).toUpperCase()}
              </div>
              <ChevronDown 
                size={18} 
                style={{ color: 'var(--color-text-secondary)' }}
              />
            </button>

            {/* Dropdown Menu - Premium */}
            {showUserMenu && (
              <div 
                className="card absolute right-0 mt-2 w-56 z-50"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Profile Info */}
                <div 
                  className="px-4 py-3 border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-sm font-medium">{currentUser.username}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{currentUser.role}</p>
                  {currentUser.permissions && currentUser.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentUser.permissions.slice(0, 3).map((perm) => (
                        <span
                          key={perm}
                          className="badge badge-info text-xs"
                        >
                          {perm}
                        </span>
                      ))}
                      {currentUser.permissions.length > 3 && (
                        <span className="inline-block text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          +{currentUser.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setCurrentPage('settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-smooth flex items-center gap-2 hover:bg-surface-hover"
                    style={{
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div 
                  className="border-t py-1"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-smooth flex items-center gap-2 hover:bg-surface-hover"
                    style={{
                      color: 'var(--color-danger)',
                    }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <Suspense fallback={<PageLoadingFallback />}>
            <div className={currentPage === 'governance' ? '' : 'p-8'}>
              {currentPage === 'dashboard' && <Dashboard />}
              {currentPage === 'risk' && <RiskIntelligence />}
              {currentPage === 'recovery' && <RecoveryIntelligence />}
              {currentPage === 'control-center' && <RecoveryControlCenter />}
              {currentPage === 'analytics' && <RecoveryAnalyticsPage />}
              {currentPage === 'governance' && <GovernancePage />}
              {currentPage === 'health' && <SystemHealth />}
              {currentPage === 'opportunities' && <Opportunities />}
              {currentPage === 'activity' && <ActivityPage />}
              {currentPage === 'users' && currentUser.role === 'ADMIN' && <UserManagement />}
              {currentPage === 'settings' && <SettingsPage />}
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  )
}
