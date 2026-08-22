export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="card p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Merchant Settings</h3>
        <p className="text-gray-600 mb-6">
          Configuration options for your ReClaim account. Additional settings will be available in future phases.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Phase 2 Information</span>
              <br />
              <span className="text-blue-800">
                Phase 2 adds Risk Intelligence with ML-powered risk scoring and predictive analytics.
                Settings and recovery preferences will be available in Phase 3 for automated recovery execution.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Recovery Preferences</h4>
          <p className="text-sm text-gray-600">
            Coming in Phase 3: Configure recovery strategies, retry schedules, and customer communication preferences.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Automation</h4>
          <p className="text-sm text-gray-600">
            Coming in Phase 3: Set up automated recovery actions, policy rules, and execution guardrails.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Integrations</h4>
          <p className="text-sm text-gray-600">
            Coming in Phase 3: Connect Razorpay Test Mode and other payment services for automated recovery execution.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">System</h4>
          <p className="text-sm text-gray-600">
            Phase 2 • Database: SQLite • Backend: FastAPI • Frontend: React + Vite • ML: scikit-learn
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h4 className="font-semibold text-gray-900 mb-4">About</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-900">ReClaim</span> - Revenue Recovery & Intelligence Platform
          </p>
          <p>Version: 0.2.0 (Phase 1 + Phase 2)</p>
          <p>Buildathon: Razorpay Revenue Recovery Challenge</p>
          <p className="text-xs text-gray-500 mt-4">
            Phase 1: Revenue Command Center. Phase 2: Risk Intelligence with ML-powered risk scoring.
            Future phases will add automated recovery capabilities and Razorpay integration.
          </p>
        </div>
      </div>
    </div>
  )
}
