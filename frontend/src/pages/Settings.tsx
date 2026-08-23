export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* General Settings */}
      <div className="card p-8">
        <div className="mb-6 border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900">General</h3>
          <p className="text-sm text-gray-500 mt-1">Basic account and platform configuration</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Platform Name</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-900">ReClaim</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Version</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-900">1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="card p-8">
        <div className="mb-6 border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900">Account</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Account Type</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-900">Revenue Recovery Platform</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                <span className="text-gray-900">Active</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="card p-8">
        <div className="mb-6 border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900">Features</h3>
          <p className="text-sm text-gray-500 mt-1">Available modules and capabilities</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recovery Intelligence</h4>
            <p className="text-sm text-gray-600">ML-powered recovery optimization and risk scoring</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Revenue Analytics</h4>
            <p className="text-sm text-gray-600">Real-time revenue tracking and opportunity analysis</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Governance Control</h4>
            <p className="text-sm text-gray-600">Policy management and approval workflows</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
            <p className="text-sm text-gray-600">Platform performance and operational metrics</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-8">
        <div className="mb-6 border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900">About</h3>
          <p className="text-sm text-gray-500 mt-1">Platform information and technical details</p>
        </div>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900">ReClaim</p>
            <p className="mt-1">Revenue Recovery & Intelligence Platform</p>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-gray-500">Technology Stack</p>
            <p className="mt-2 text-gray-900">Backend: Python + FastAPI • Frontend: React + TypeScript • ML: scikit-learn</p>
          </div>
        </div>
      </div>
    </div>
  )
}
