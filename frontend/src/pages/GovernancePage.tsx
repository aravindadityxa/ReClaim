import React, { useState, useEffect } from 'react';
import {
  Lock, Shield, AlertTriangle, CheckCircle, Clock, XCircle,
  Settings, Zap, PauseCircle, PlayCircle, FileText, Trash2
} from 'lucide-react';
import { api } from '../api';

interface Policy {
  policy_type: string;
  value: any;
  enabled: boolean;
  description: string;
  editable: boolean;
}

interface ApprovalRequest {
  id: string;
  opportunity_id: string;
  action_type: string;
  amount: number;
  expected_value: number;
  recovery_probability: number;
  reason: string;
  status: string;
  requested_at: string;
  reviewed_at?: string;
  reviewer_note?: string;
}

interface GovernanceStatus {
  is_paused: boolean;
  autonomous_actions_today: number;
  pending_approvals: number;
  total_policies: number;
  active_policies: number;
}

export const GovernancePage: React.FC = () => {
  const [policies, setPolicies] = useState<Record<string, Policy>>({});
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatus | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'approvals'>('overview');
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  useEffect(() => {
    loadGovernanceData();
    const interval = setInterval(loadGovernanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadGovernanceData = async () => {
    try {
      setLoading(true);
      const [policiesRes, statusRes, approvalsRes] = await Promise.all([
        api.getGovernancePolicies(),
        api.getGovernanceDashboard(),
        api.getApprovals(),
      ]);

      if (policiesRes.policies) {
        setPolicies(policiesRes.policies);
      }
      if (statusRes) {
        setGovernanceStatus(statusRes);
      }
      if (approvalsRes.pending_requests) {
        setPendingApprovals(approvalsRes.pending_requests);
      }
    } catch (error) {
      console.error('Failed to load governance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseRecovery('Manual pause via governance interface');
      await loadGovernanceData();
    } catch (error) {
      console.error('Failed to pause recovery:', error);
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeRecovery();
      await loadGovernanceData();
    } catch (error) {
      console.error('Failed to resume recovery:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.approveApproval(requestId, 'Approved via governance interface');
      await loadGovernanceData();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.rejectApproval(requestId, 'Rejected via governance interface');
      await loadGovernanceData();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handlePolicyUpdate = async (policyType: string) => {
    if (editValue === null) return;
    try {
      await api.updateGovernancePolicy(policyType, { value: editValue });
      setEditingPolicy(null);
      setEditValue(null);
      await loadGovernanceData();
    } catch (error) {
      console.error('Failed to update policy:', error);
    }
  };

  if (loading && !Object.keys(policies).length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p>Loading Governance Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-amber-400" />
              <h1 className="text-4xl font-bold text-white">Governance & Safety</h1>
            </div>
            <div className="flex gap-2">
              {governanceStatus?.is_paused ? (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <PlayCircle className="w-5 h-5" />
                  Resume Recovery
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <PauseCircle className="w-5 h-5" />
                  Pause Recovery
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-300">Control and monitor autonomous recovery operations</p>
        </div>

        {/* System Status */}
        {governanceStatus && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              System Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300 text-sm">Recovery Status</p>
                <p className="text-2xl font-bold mt-2">
                  {governanceStatus.is_paused ? (
                    <span className="text-red-400 flex items-center gap-2">
                      <PauseCircle className="w-5 h-5" />
                      PAUSED
                    </span>
                  ) : (
                    <span className="text-green-400 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      ACTIVE
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300 text-sm">Actions Today</p>
                <p className="text-2xl font-bold text-amber-400 mt-2">
                  {governanceStatus.autonomous_actions_today}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300 text-sm">Pending Approvals</p>
                <p className="text-2xl font-bold text-blue-400 mt-2">
                  {governanceStatus.pending_approvals}
                </p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300 text-sm">Active Policies</p>
                <p className="text-2xl font-bold text-purple-400 mt-2">
                  {governanceStatus.active_policies}/{governanceStatus.total_policies}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'overview'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'policies'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Policies
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'approvals'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Approvals ({pendingApprovals.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Safety Information */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Safety Guarantees
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Backend Enforcement</p>
                    <p className="text-sm text-slate-400">All policies are enforced on the backend. Frontend cannot bypass governance.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Approval Re-validation</p>
                    <p className="text-sm text-slate-400">Approved actions are re-evaluated before execution. Conditions may change after approval.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Emergency Control</p>
                    <p className="text-sm text-slate-400">Pause/resume available at any time. System respects execution windows.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Customer Protection</p>
                    <p className="text-sm text-slate-400">Contact limits and friction thresholds prevent customer fatigue.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Policies */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Active Policy Limits</h2>
              <div className="space-y-2 text-sm">
                {policies && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-300">Max Recovery Attempts</span>
                      <span className="text-amber-400 font-semibold">
                        {policies.MAX_RECOVERY_ATTEMPTS?.value || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-300">Max Customer Contacts</span>
                      <span className="text-amber-400 font-semibold">
                        {policies.MAX_CUSTOMER_CONTACTS?.value || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-300">Minimum Expected Value</span>
                      <span className="text-amber-400 font-semibold">
                        ₹{policies.MIN_EXPECTED_VALUE?.value || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-300">Approval Threshold</span>
                      <span className="text-amber-400 font-semibold">
                        ₹{policies.REQUIRE_APPROVAL_ABOVE_AMOUNT?.value || '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Editable Policies
            </h2>
            <div className="space-y-4">
              {policies && Object.entries(policies).map(([key, policy]) => {
                if (!policy.editable) return null;
                return (
                  <div key={key} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-white">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-slate-400">{policy.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        policy.enabled ? 'bg-green-900 text-green-300' : 'bg-slate-600 text-slate-300'
                      }`}>
                        {policy.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {editingPolicy === key ? (
                        <>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-600 text-white rounded border border-slate-500"
                          />
                          <button
                            onClick={() => handlePolicyUpdate(key)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPolicy(null)}
                            className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPolicy(key);
                            setEditValue(policy.value);
                          }}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {pendingApprovals.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-white font-semibold">No Pending Approvals</p>
                <p className="text-slate-400 text-sm mt-2">All actions are within policy limits</p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <div key={approval.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-white">{approval.action_type}</p>
                      <p className="text-sm text-slate-400">Opportunity: {approval.opportunity_id}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-xs font-semibold">
                      PENDING
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-slate-400">Amount</p>
                      <p className="text-amber-400 font-semibold">₹{approval.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Expected Recovery</p>
                      <p className="text-green-400 font-semibold">₹{approval.expected_value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Recovery Probability</p>
                      <p className="text-blue-400 font-semibold">{(approval.recovery_probability * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Requested</p>
                      <p className="text-slate-300 font-semibold">{new Date(approval.requested_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-4">
                    <span className="font-semibold">Reason:</span> {approval.reason}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
