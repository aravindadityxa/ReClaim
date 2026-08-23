import { useState, useRef, useEffect } from 'react'
import { BarChart3, TrendingUp, Activity, Settings, AlertTriangle, Menu, X, Zap, Gauge, Shield, LineChart, Cpu, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuthContext } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Opportunities from './pages/Opportunities'
import RiskIntelligence from './pages/RiskIntelligence'
import RecoveryIntelligence from './pages/RecoveryIntelligence'
import RecoveryControlCenter from './pages/RecoveryControlCenter'
import { GovernancePage } from './pages/GovernancePage'
import { RecoveryAnalyticsPage } from './pages/RecoveryAnalyticsPage'
import { SystemHealth } from './pages/SystemHealth'
import ActivityPage from './pages/Activity'
import SettingsPage from './pages/Settings'
import UserManagement from './pages/UserManagement'

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
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show Login page
  if (!currentUser) {
    return <Login />
  }

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3 },
    { id: 'risk' as Page, label: 'Risk Intelligence', icon: AlertTriangle },
    { id: 'recovery' as Page, label: 'Recovery Intelligence', icon: Zap },
    { id: 'control-center' as Page, label: 'Recovery Control Center', icon: Gauge },
    { id: 'analytics' as Page, label: 'Recovery Analytics', icon: LineChart },
    { id: 'governance' as Page, label: 'Governance & Safety', icon: Shield },
    { id: 'health' as Page, label: 'System Health', icon: Cpu },
    { id: 'opportunities' as Page, label: 'Revenue Opportunities', icon: TrendingUp },
    { id: 'activity' as Page, label: 'Revenue Activity', icon: Activity },
    ...(currentUser.role === 'ADMIN' ? [{ id: 'users' as Page, label: 'User Management', icon: User }] : []),
    { id: 'settings' as Page, label: 'Settings', icon: Settings },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      // Redirect to login after logout
      window.location.href = '/'
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const currentPageLabel = navItems.find((item) => item.id === currentPage)?.label || 'Dashboard'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 flex flex-col border-r border-slate-700`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 size={18} />
            </div>
            {sidebarOpen && <h1 className="text-lg font-bold truncate">ReClaim</h1>}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 hover:bg-slate-800 rounded-lg transition"
              title="Collapse sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id)
                    setShowUserMenu(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3">
          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg transition w-full flex justify-center"
              title="Collapse sidebar"
            >
              <Menu size={18} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 hover:bg-slate-800 rounded-lg transition w-full flex justify-center"
              title="Expand sidebar"
            >
              <Menu size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">{currentPageLabel}</h2>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
              </div>
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {currentUser.username.substring(0, 1).toUpperCase()}
              </div>
              <ChevronDown size={18} className="text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Profile Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                  <p className="text-xs text-gray-500 mt-1">{currentUser.role}</p>
                  {currentUser.permissions && currentUser.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentUser.permissions.slice(0, 3).map((perm) => (
                        <span
                          key={perm}
                          className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {perm}
                        </span>
                      ))}
                      {currentUser.permissions.length > 3 && (
                        <span className="inline-block text-xs text-gray-500">
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
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 transition flex items-center gap-2"
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
        <div className="flex-1 overflow-auto">
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
        </div>
      </div>
    </div>
  )
}
