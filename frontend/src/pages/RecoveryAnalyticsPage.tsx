import React, { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, PieChart, LineChart, Activity,
  ArrowUpRight, ArrowDownRight, Target, Zap, Users, DollarSign,
  RefreshCw, Download, Filter, Info
} from 'lucide-react';
import { api } from '../api';

interface FunnelMetric {
  at_risk: { count: number; amount: number };
  recovered: { count: number; amount: number };
  conversion_rate: number;
  period_days: number;
}

interface StrategyPerformance {
  strategy: string;
  attempts: number;
  success_count: number;
  recovery_rate: number;
  total_recovered: number;
  average_recovered: number;
  average_attempts: number;
  average_friction?: number;
  confidence: string;
  sample_size: number;
}

interface CohortPerformance {
  cohort_type: string;
  cohort_value: string;
  attempts: number;
  success_count: number;
  recovery_rate: number;
  total_recovered: number;
  average_recovered: number;
  best_strategy?: string;
  best_strategy_rate?: number;
  strategy_breakdown?: Record<string, any>;
}

interface IncrementalRevenue {
  period_days: number;
  total_recovered: number;
  estimated_incremental_revenue: number;
  incremental_percentage: number;
  outcome_count: number;
}

interface Recommendation {
  strategy: string;
  recovery_rate: number;
  attempts: number;
  total_recovered: number;
  confidence: string;
}

export const RecoveryAnalyticsPage: React.FC = () => {
  const [funnel, setFunnel] = useState<FunnelMetric | null>(null);
  const [strategies, setStrategies] = useState<StrategyPerformance[]>([]);
  const [cohorts, setCohorts] = useState<CohortPerformance[]>([]);
  const [incremental, setIncremental] = useState<IncrementalRevenue | null>(null);
  const [selectedCohortType, setSelectedCohortType] = useState('payment_method');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedOpportunityType, setSelectedOpportunityType] = useState('PAYMENT_FAILURE');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'funnel' | 'strategies' | 'cohorts' | 'incremental'>('funnel');

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedCohortType, selectedOpportunityType]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const [funnelRes, strategiesRes, cohortsRes, incrementalRes, recommendationsRes] = await Promise.all([
        api.getRecoveryFunnel(selectedPeriod),
        api.getStrategyPerformance(),
        api.getCohortAnalysis(selectedCohortType),
        api.getIncrementalRevenue(selectedPeriod),
        api.getStrategyRecommendations(selectedOpportunityType),
      ]);

      setFunnel(funnelRes as typeof funnel);
      setStrategies(Array.isArray(strategiesRes) ? strategiesRes : [strategiesRes]);
      setCohorts(Array.isArray(cohortsRes) ? cohortsRes : []);
      setIncremental(incrementalRes as typeof incremental);
      setRecommendations(Array.isArray(recommendationsRes) ? recommendationsRes : []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderFunnelTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">At Risk</h3>
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-blue-900">{funnel?.at_risk.count || 0}</p>
            <p className="text-sm text-blue-700">Opportunities</p>
            <p className="text-2xl font-semibold text-blue-800">{formatCurrency(funnel?.at_risk.amount || 0)}</p>
            <p className="text-sm text-blue-700">Total at risk</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">Recovered</h3>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-green-900">{funnel?.recovered.count || 0}</p>
            <p className="text-sm text-green-700">Successful recoveries</p>
            <p className="text-2xl font-semibold text-green-800">{formatCurrency(funnel?.recovered.amount || 0)}</p>
            <p className="text-sm text-green-700">Total recovered</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-900">Conversion Rate</h3>
          <TrendingUp className="w-6 h-6 text-purple-600" />
        </div>
        <div className="space-y-2">
          <p className="text-4xl font-bold text-purple-900">{funnel?.conversion_rate.toFixed(1)}%</p>
          <p className="text-sm text-purple-700">Recovery conversion rate (last {selectedPeriod} days)</p>
          <div className="mt-4 bg-white rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full"
              style={{ width: `${Math.min(funnel?.conversion_rate || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStrategiesTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strategy) => (
          <div key={strategy.strategy} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{strategy.strategy}</h4>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                strategy.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                strategy.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {strategy.confidence}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Recovery Rate:</span>
                <span className="font-semibold text-gray-900">{strategy.recovery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Successes:</span>
                <span className="font-semibold text-gray-900">{strategy.success_count}/{strategy.attempts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Recovered:</span>
                <span className="font-semibold text-green-600">{formatCurrency(strategy.total_recovered)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Amount:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(strategy.average_recovered)}</span>
              </div>
              {strategy.average_friction !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. Friction:</span>
                  <span className="font-semibold text-gray-900">{strategy.average_friction.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCohortsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Cohort Type:</span>
          <select
            value={selectedCohortType}
            onChange={(e) => setSelectedCohortType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="payment_method">Payment Method</option>
            <option value="failure_reason">Failure Reason</option>
            <option value="opportunity_type">Opportunity Type</option>
            <option value="customer_segment">Customer Segment</option>
            <option value="risk_level">Risk Level</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cohorts.map((cohort) => (
          <div key={`${cohort.cohort_type}_${cohort.cohort_value}`} className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">{cohort.cohort_value}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Attempts:</span>
                <span className="font-semibold text-gray-900">{cohort.attempts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-semibold text-green-600">{cohort.recovery_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Recovered:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(cohort.total_recovered)}</span>
              </div>
              {cohort.best_strategy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Strategy:</span>
                  <span className="font-semibold text-blue-600">{cohort.best_strategy}</span>
                </div>
              )}
              {cohort.best_strategy_rate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Strategy Rate:</span>
                  <span className="font-semibold text-gray-900">{cohort.best_strategy_rate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIncrementalTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-900">Total Recovered</h3>
            <DollarSign className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-4xl font-bold text-orange-900">{formatCurrency(incremental?.total_recovered || 0)}</p>
          <p className="text-sm text-orange-700 mt-2">Recovery value (last {selectedPeriod} days)</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-emerald-900">Incremental Revenue</h3>
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-4xl font-bold text-emerald-900">{formatCurrency(incremental?.estimated_incremental_revenue || 0)}</p>
          <p className="text-sm text-emerald-700 mt-2">{incremental?.incremental_percentage.toFixed(1)}% of total recovered</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Strategies</h3>
        <div className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{rec.strategy}</p>
                  <p className="text-sm text-gray-600">
                    {rec.recovery_rate.toFixed(1)}% success rate ({rec.attempts} attempts)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{formatCurrency(rec.total_recovered)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rec.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                    rec.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {rec.confidence}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-sm">No recommendations available yet</p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && !funnel) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Recovery Analytics</h1>
        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {['funnel', 'strategies', 'cohorts', 'incremental'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-3 font-medium text-sm transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'funnel' && 'Recovery Funnel'}
            {tab === 'strategies' && 'Strategies'}
            {tab === 'cohorts' && 'Cohorts'}
            {tab === 'incremental' && 'Incremental Revenue'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'funnel' && renderFunnelTab()}
        {activeTab === 'strategies' && renderStrategiesTab()}
        {activeTab === 'cohorts' && renderCohortsTab()}
        {activeTab === 'incremental' && renderIncrementalTab()}
      </div>
    </div>
  );
};
