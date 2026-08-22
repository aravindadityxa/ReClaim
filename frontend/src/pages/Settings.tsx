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
              <span className="font-semibold">Complete Platform</span>
              <br />
              <span className="text-blue-800">
                ReClaim includes Revenue Intelligence with ML-powered risk scoring and predictive analytics.
                Automated recovery execution and policy management are fully configured for your account.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Recovery Preferences</h4>
          <p className="text-sm text-gray-600">
            Configure recovery strategies, retry schedules, and customer communication preferences.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Automation</h4>
          <p className="text-sm text-gray-600">
            Automated recovery actions, policy rules, and execution guardrails are active and monitored.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Integrations</h4>
          <p className="text-sm text-gray-600">
            Connected to Razorpay Test Mode and other payment services for automated recovery execution.
          </p>
        </div>

        <div className="card p-6">
          <h4 className="font-semibold text-gray-900 mb-4">System</h4>
          <p className="text-sm text-gray-600">
            Database: SQLite • Backend: FastAPI • Frontend: React + Vite • ML: scikit-learn
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h4 className="font-semibold text-gray-900 mb-4">About</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-900">ReClaim</span> - Revenue Recovery & Intelligence Platform
          </p>
          <p>Version: 1.0.0 (Complete Release)</p>
          <p>Buildathon: Razorpay Revenue Recovery Challenge</p>
          <p className="text-xs text-gray-500 mt-4">
            Complete platform with revenue intelligence, risk analytics, recovery recommendations, and autonomous recovery execution with full governance controls.
          </p>
        </div>
      </div>
    </div>
  )
}
