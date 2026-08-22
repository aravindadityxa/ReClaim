import { useState } from 'react'
import { BarChart3, TrendingUp, Activity, Settings, AlertTriangle, Menu, X, Zap, Gauge, Shield, LineChart, Cpu, LogOut, User } from 'lucide-react'
import { useAuthContext } from './context/AuthContext'
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

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If not authenticated, show message (this should be handled by routing in a real app)
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access ReClaim</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
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
      // In a real app with React Router, this would navigate to /login
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-primary text-white transition-all duration-300 flex flex-col border-r border-gray-800`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <h1 className="text-xl font-bold">ReClaim</h1>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-800 rounded"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-1 hover:bg-gray-700 rounded transition"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 hover:bg-gray-800 rounded transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {navItems.find((item) => item.id === currentPage)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
              <p className="text-xs text-gray-500">{currentUser.role}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {currentUser.username.substring(0, 1).toUpperCase()}
            </div>
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
