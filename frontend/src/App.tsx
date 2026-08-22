import { useState } from 'react'
import { BarChart3, TrendingUp, Activity, Settings, Menu, X } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Opportunities from './pages/Opportunities'
import ActivityPage from './pages/Activity'
import SettingsPage from './pages/Settings'

type Page = 'dashboard' | 'opportunities' | 'activity' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3 },
    { id: 'opportunities' as Page, label: 'Revenue Opportunities', icon: TrendingUp },
    { id: 'activity' as Page, label: 'Revenue Activity', icon: Activity },
    { id: 'settings' as Page, label: 'Settings', icon: Settings },
  ]

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

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen && (
            <p className="text-xs text-gray-500">
              Phase 1 - Revenue Command Center
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            {navItems.find((item) => item.id === currentPage)?.label}
          </h2>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'opportunities' && <Opportunities />}
            {currentPage === 'activity' && <ActivityPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </div>
        </div>
      </div>
    </div>
  )
}
