import React, { useState, useEffect } from 'react';
import {
  Lock, Shield, AlertTriangle, CheckCircle, Clock, XCircle,
  Settings, Zap, PauseCircle, PlayCircle, RefreshCw, FileText, CheckCheck
} from 'lucide-react';
import { api } from '../api';
import { GovernancePolicy } from '../types';
import { CinematicBackground } from '../components/CinematicBackground';
import { WorkflowStateMachine } from '../components/WorkflowStateMachine';
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation';

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
  const [policies, setPolicies] = useState<Record<string, GovernancePolicy>>({});
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatus | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'approvals'>('overview');
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | null>(null);

  const containerStyle = {
    backgroundColor: 'var(--color-bg-primary)',
  };

  const cardStyle = {
    backgroundColor: 'var(--color-bg-elevated)',
    borderColor: 'var(--color-border)',
    boxShadow: 'var(--shadow-md)',
  };

  const headingStyle = {
    color: 'var(--color-text-primary)',
  };

  const subheadingStyle = {
    color: 'var(--color-text-secondary)',
  };

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
      // Error loading governance data - show empty state
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseRecovery('Manual pause via governance interface');
      await loadGovernanceData();
    } catch (error) {
      // Pause action failed - user will see error in UI
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeRecovery();
      await loadGovernanceData();
    } catch (error) {
      // Resume action failed - user will see error in UI
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.approveApproval(requestId, 'Approved via governance interface');
      await loadGovernanceData();
    } catch (error) {
      // Approval action failed - user will see error in UI
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.rejectApproval(requestId, 'Rejected via governance interface');
      await loadGovernanceData();
    } catch (error) {
      // Rejection action failed - user will see error in UI
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
      // Policy update failed - user will see error in UI
    }
  };

  if (loading && !Object.keys(policies).length) {
    return (
      <div style={containerStyle} className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-primary-500)' }} />
          <p style={{ color: 'var(--color-text-primary)' }} className="font-medium">Loading Governance Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="min-h-screen p-8 md:p-12 relative">
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <ScrollTriggerAnimation>
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-info-light)' }}>
                <Shield className="w-8 h-8" style={{ color: 'var(--color-info)' }} />
              </div>
              <h1 className="text-5xl font-bold" style={headingStyle}>
                GOVERNANCE & COMPLIANCE
              </h1>
            </div>
            <p className="text-lg mt-2" style={subheadingStyle}>Control and monitor autonomous recovery operations</p>
          </div>
        </ScrollTriggerAnimation>

        {/* System Status Cards */}
        {governanceStatus && (
          <ScrollTriggerAnimation>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {/* Recovery Status */}
              <div
                className="card p-6 rounded-lg border overflow-hidden group"
                style={{
                  backgroundColor: governanceStatus.is_paused ? 'var(--color-error-light)' : 'var(--color-success-light)',
                  borderColor: governanceStatus.is_paused ? 'var(--color-error)' : 'var(--color-success)',
                }}
              >
                <p className="text-sm font-medium mb-3" style={{
                  color: governanceStatus.is_paused ? 'var(--color-error-dark)' : 'var(--color-success-dark)',
                }}>
                  Recovery Status
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold" style={{
                    color: governanceStatus.is_paused ? 'var(--color-error)' : 'var(--color-success)',
                  }}>
                    {governanceStatus.is_paused ? 'PAUSED' : 'ACTIVE'}
                  </p>
                  {governanceStatus.is_paused ? (
                    <PauseCircle className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
                  ) : (
                    <PlayCircle className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                  )}
                </div>
              </div>

              {/* Actions Today */}
              <div
                className="card p-6 rounded-lg border"
                style={cardStyle}
              >
                <p className="text-sm font-medium mb-3" style={subheadingStyle}>Actions Today</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-primary-500)' }}>
                  {governanceStatus.autonomous_actions_today}
                </p>
              </div>

              {/* Pending Approvals */}
              <div
                className="card p-6 rounded-lg border"
                style={{
                  ...cardStyle,
                  backgroundColor: governanceStatus.pending_approvals > 0 ? 'var(--color-warning-light)' : 'var(--color-bg-elevated)',
                  borderColor: governanceStatus.pending_approvals > 0 ? 'var(--color-warning)' : 'var(--color-border)',
                }}
              >
                <p className="text-sm font-medium mb-3" style={
                  governanceStatus.pending_approvals > 0 ? { color: 'var(--color-warning-dark)' } : subheadingStyle
                }>
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold" style={{
                  color: governanceStatus.pending_approvals > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)',
                }}>
                  {governanceStatus.pending_approvals}
                </p>
              </div>

              {/* Active Policies */}
              <div
                className="card p-6 rounded-lg border"
                style={cardStyle}
              >
                <p className="text-sm font-medium mb-3" style={subheadingStyle}>Active Policies</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {governanceStatus.active_policies}/{governanceStatus.total_policies}
                </p>
              </div>
            </div>
          </ScrollTriggerAnimation>
        )}

        {/* Workflow Timeline */}
        <ScrollTriggerAnimation>
          <div className="card p-8 rounded-xl border mb-12" style={cardStyle}>
            <h2 className="text-lg font-semibold mb-8 flex items-center gap-2" style={headingStyle}>
              <Clock className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
              Decision Flow Timeline
            </h2>
            <div className="bg-gradient-to-b from-primary/5 to-transparent p-8 rounded-lg">
              <WorkflowStateMachine
                currentState="decision"
                states={[
                  { id: 'policy', label: 'Policy Check', icon: <FileText className="w-4 h-4" /> },
                  { id: 'detection', label: 'Opportunity Detected', icon: <AlertTriangle className="w-4 h-4" /> },
                  { id: 'decision', label: 'Decision', icon: <Zap className="w-4 h-4" /> },
                  { id: 'approval', label: 'Approval', icon: <CheckCheck className="w-4 h-4" /> },
                  { id: 'execution', label: 'Execution', icon: <PlayCircle className="w-4 h-4" /> },
                  { id: 'audit', label: 'Audit', icon: <CheckCircle className="w-4 h-4" /> },
                ]}
              />
            </div>
          </div>
        </ScrollTriggerAnimation>

        {/* Control Buttons */}
        <div className="mb-12 flex justify-end gap-2">
          {governanceStatus?.is_paused ? (
            <button
              onClick={handleResume}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
              style={{
                backgroundColor: 'var(--color-success)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <PlayCircle className="w-5 h-5" />
              Resume Recovery
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
              style={{
                backgroundColor: 'var(--color-error)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <PauseCircle className="w-5 h-5" />
              Pause Recovery
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-4 overflow-x-auto">
            {['overview', 'policies', 'approvals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'overview' | 'policies' | 'approvals')}
                className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 relative`}
                style={{
                  color: activeTab === tab ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                  borderBottomColor: activeTab === tab ? 'var(--color-primary-600)' : 'transparent',
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'policies' && 'Policies'}
                {tab === 'approvals' && `Approvals (${pendingApprovals.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Safety Information */}
            <ScrollTriggerAnimation>
              <div className="card p-8 rounded-xl border" style={cardStyle}>
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                  <Shield className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                  Safety Guarantees
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Backend Enforcement',
                      desc: 'All policies are enforced on the backend. Frontend cannot bypass governance.',
                    },
                    {
                      title: 'Approval Re-validation',
                      desc: 'Approved actions are re-evaluated before execution. Conditions may change after approval.',
                    },
                    {
                      title: 'Emergency Control',
                      desc: 'Pause/resume available at any time. System respects execution windows.',
                    },
                    {
                      title: 'Customer Protection',
                      desc: 'Contact limits and friction thresholds prevent customer fatigue.',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)' }}>
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-success-dark)' }}>{item.title}</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-success-dark)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollTriggerAnimation>

            {/* Key Policies */}
            <ScrollTriggerAnimation>
              <div className="card p-8 rounded-xl border" style={cardStyle}>
                <h2 className="text-lg font-semibold mb-6" style={headingStyle}>Active Policy Limits</h2>
                <div className="space-y-3">
                  {policies && [
                    { key: 'MAX_RECOVERY_ATTEMPTS', label: 'Max Recovery Attempts' },
                    { key: 'MAX_CUSTOMER_CONTACTS', label: 'Max Customer Contacts' },
                    { key: 'MIN_EXPECTED_VALUE', label: 'Minimum Expected Value', prefix: '₹' },
                    { key: 'REQUIRE_APPROVAL_ABOVE_AMOUNT', label: 'Approval Threshold', prefix: '₹' },
                  ].map((policy) => (
                    <div key={policy.key} className="flex justify-between items-center py-3 px-4 rounded-lg border" style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                    }}>
                      <span style={{ color: 'var(--color-text-secondary)' }} className="text-sm font-medium">
                        {policy.label}
                      </span>
                      <span className="font-bold" style={{ color: 'var(--color-primary-500)' }}>
                        {policy.prefix}{policies[policy.key]?.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollTriggerAnimation>
          </div>
        )}

        {activeTab === 'policies' && (
          <ScrollTriggerAnimation>
            <div className="card p-8 rounded-xl border" style={cardStyle}>
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={headingStyle}>
                <Settings className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
                Editable Policies
              </h2>
              <div className="space-y-4">
                {policies && Object.entries(policies).map(([key, policy]) => {
                  if (!policy.editable) return null;
                  return (
                    <div key={key} className="card p-4 rounded-lg border" style={cardStyle}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                            {policy.description}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          policy.enabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
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
                              className="flex-1 px-3 py-2 rounded border"
                              style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                              }}
                            />
                            <button
                              onClick={() => handlePolicyUpdate(key)}
                              className="px-3 py-2 rounded font-medium transition-all text-sm"
                              style={{
                                backgroundColor: 'var(--color-success)',
                                color: 'var(--color-text-inverse)',
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPolicy(null)}
                              className="px-3 py-2 rounded font-medium transition-all text-sm"
                              style={{
                                backgroundColor: 'var(--color-border)',
                                color: 'var(--color-text-primary)',
                              }}
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
                            className="px-3 py-2 rounded text-sm font-medium transition-all"
                            style={{
                              backgroundColor: 'var(--color-info)',
                              color: 'var(--color-text-inverse)',
                            }}
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
          </ScrollTriggerAnimation>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {pendingApprovals.length === 0 ? (
              <ScrollTriggerAnimation>
                <div className="card p-12 rounded-xl border text-center" style={cardStyle}>
                  <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
                  <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                    No Pending Approvals
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                    All actions are within policy limits
                  </p>
                </div>
              </ScrollTriggerAnimation>
            ) : (
              pendingApprovals.map((approval, idx) => (
                <ScrollTriggerAnimation key={approval.id} delay={idx * 100}>
                  <div className="card p-6 rounded-xl border" style={cardStyle}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {approval.action_type}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          Opportunity: {approval.opportunity_id}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                        backgroundColor: 'var(--color-info)',
                        color: 'var(--color-text-inverse)',
                      }}>
                        PENDING
                      </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">Amount</p>
                        <p className="font-semibold mt-1" style={{ color: 'var(--color-primary-500)' }}>
                          ₹{approval.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">Expected Recovery</p>
                        <p className="font-semibold mt-1" style={{ color: 'var(--color-success)' }}>
                          ₹{approval.expected_value.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">Success Probability</p>
                        <p className="font-semibold mt-1" style={{ color: 'var(--color-info)' }}>
                          {(approval.recovery_probability * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-secondary)' }} className="text-xs">Requested</p>
                        <p className="font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
                          {new Date(approval.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-4 p-3 rounded-lg" style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Reason:</span> {approval.reason}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2 font-medium transition-all"
                        style={{
                          backgroundColor: 'var(--color-success)',
                          color: 'var(--color-text-inverse)',
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2 font-medium transition-all"
                        style={{
                          backgroundColor: 'var(--color-error)',
                          color: 'var(--color-text-inverse)',
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </ScrollTriggerAnimation>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
