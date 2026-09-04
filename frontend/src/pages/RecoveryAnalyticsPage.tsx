import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, BarChart3, PieChart, LineChart, Activity,
  ArrowUpRight, ArrowDownRight, Target, Zap, Users, DollarSign,
  RefreshCw, Download, Filter, Info, Gauge
} from 'lucide-react';
import { api } from '../api';
import { CinematicBackground } from '../components/CinematicBackground';
import { ScrollTriggerAnimation } from '../components/ScrollTriggerAnimation';
import { formatINR } from '../utils/currency';

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
  const containerRef = useRef<HTMLDivElement>(null);

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
    return formatINR(value);
  };

  const renderFunnelTab = () => (
    <div className="space-y-8">
      {/* Animated funnel hero section */}
      <ScrollTriggerAnimation>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* At Risk Card - Left */}
          <div 
            className="card p-8 rounded-xl border overflow-hidden group relative"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>At Risk</h3>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-light)' }}>
                  <Activity className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold" style={{ color: 'var(--color-error)' }}>{funnel?.at_risk.count || 0}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Opportunities</p>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(funnel?.at_risk.amount || 0)}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total at risk</p>
                </div>
              </div>
            </div>
          </div>

          {/* Funnel Icon - Center */}
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-32 flex items-center justify-center">
              <svg viewBox="0 0 100 150" className="w-full h-full">
                {/* Funnel shape */}
                <defs>
                  <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#ef4444', stopOpacity: 1}} />
                    <stop offset="50%" style={{stopColor: '#f59e0b', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#10b981', stopOpacity: 1}} />
                  </linearGradient>
                </defs>
                
                {/* Top */}
                <rect x="10" y="10" width="80" height="12" fill="url(#funnelGrad)" opacity="0.3" rx="2" />
                
                {/* Middle */}
                <polygon points="25,35 75,35 55,75 45,75" fill="url(#funnelGrad)" opacity="0.6" />
                
                {/* Bottom */}
                <polygon points="40,80 60,80 50,120 50,120" fill="url(#funnelGrad)" opacity="1" />
                
                {/* Flow lines */}
                <line x1="50" y1="25" x2="50" y2="50" stroke="url(#funnelGrad)" strokeWidth="2" strokeDasharray="4" opacity="0.7" />
              </svg>
            </div>
          </div>

          {/* Recovered Card - Right */}
          <div 
            className="card p-8 rounded-xl border overflow-hidden group relative"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recovered</h3>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold" style={{ color: 'var(--color-success)' }}>{funnel?.recovered.count || 0}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Successful recoveries</p>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(funnel?.recovered.amount || 0)}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total recovered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollTriggerAnimation>

      {/* Conversion Rate - Full Width Animated Bar */}
      <ScrollTriggerAnimation>
        <div 
          className="card p-8 rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Conversion Rate</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Last {selectedPeriod} days</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-100)' }}>
              <Gauge className="w-6 h-6" style={{ color: 'var(--color-primary-500)' }} />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-5xl font-bold" style={{ color: 'var(--color-primary-600)' }}>
              {funnel?.conversion_rate.toFixed(1)}%
            </p>
            <div 
              className="w-full h-4 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.min(funnel?.conversion_rate || 0, 100)}%`,
                  background: 'linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))',
                  boxShadow: 'var(--glow-md)',
                }}
              />
            </div>
          </div>
        </div>
      </ScrollTriggerAnimation>
    </div>
  );

  const renderStrategiesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy, idx) => (
          <ScrollTriggerAnimation key={strategy.strategy} delay={idx * 100}>
            <div 
              className="card p-6 rounded-xl border hover:shadow-lg transition-all duration-300 overflow-hidden group relative"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {strategy.strategy}
                  </h4>
                  <span 
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all duration-300"
                    style={{
                      backgroundColor: strategy.confidence === 'HIGH' ? 'var(--color-success-light)' :
                                       strategy.confidence === 'MEDIUM' ? 'var(--color-warning-light)' :
                                       'var(--color-border)',
                      color: strategy.confidence === 'HIGH' ? 'var(--color-success-dark)' :
                             strategy.confidence === 'MEDIUM' ? 'var(--color-warning-dark)' :
                             'var(--color-text-secondary)',
                    }}
                  >
                    {strategy.confidence}
                  </span>
                </div>

                {/* Recovery Rate Gauge */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: 'var(--color-text-secondary)' }} className="text-xs">Recovery Rate</span>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-success)' }}>
                      {strategy.recovery_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div 
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${strategy.recovery_rate}%`,
                        background: 'linear-gradient(to right, var(--color-success), var(--color-primary-500))',
                        boxShadow: 'var(--glow-success)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3 text-sm border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Success Rate:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {strategy.success_count}/{strategy.attempts}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Total Recovered:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(strategy.total_recovered)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Avg Amount:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(strategy.average_recovered)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        ))}
      </div>
    </div>
  );

  const renderCohortsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <label className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Cohort Type:</span>
          <select
            value={selectedCohortType}
            onChange={(e) => setSelectedCohortType(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="payment_method">Payment Method</option>
            <option value="failure_reason">Failure Reason</option>
            <option value="opportunity_type">Opportunity Type</option>
            <option value="customer_segment">Customer Segment</option>
            <option value="risk_level">Risk Level</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cohorts.map((cohort, idx) => (
          <ScrollTriggerAnimation key={`${cohort.cohort_type}_${cohort.cohort_value}`} delay={idx * 100}>
            <div 
              className="card p-6 rounded-xl border overflow-hidden group relative"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              
              <div className="relative z-10">
                <h4 className="font-semibold mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {cohort.cohort_value}
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Attempts:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{cohort.attempts}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Success Rate:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                      {cohort.recovery_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Total Recovered:</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(cohort.total_recovered)}
                    </span>
                  </div>
                  {cohort.best_strategy && (
                    <div className="flex justify-between pt-2">
                      <span style={{ color: 'var(--color-text-secondary)' }}>Best Strategy:</span>
                      <span className="font-semibold" style={{ color: 'var(--color-info)' }}>
                        {cohort.best_strategy}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollTriggerAnimation>
        ))}
      </div>
    </div>
  );

  const renderIncrementalTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollTriggerAnimation>
          <div 
            className="card p-8 rounded-xl border overflow-hidden group relative"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total Recovered</h3>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-warning-light)' }}>
                  <DollarSign className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
                </div>
              </div>
              <p className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {formatCurrency(incremental?.total_recovered || 0)}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Recovery value (last {selectedPeriod} days)</p>
            </div>
          </div>
        </ScrollTriggerAnimation>

        <ScrollTriggerAnimation>
          <div 
            className="card p-8 rounded-xl border overflow-hidden group relative"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Incremental Revenue</h3>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)' }}>
                  <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                </div>
              </div>
              <p className="text-4xl font-bold mb-2" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(incremental?.estimated_incremental_revenue || 0)}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {incremental?.incremental_percentage.toFixed(1)}% of total recovered
              </p>
            </div>
          </div>
        </ScrollTriggerAnimation>
      </div>

      <ScrollTriggerAnimation>
        <div 
          className="card p-8 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
            Recommended Strategies
          </h3>
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <ScrollTriggerAnimation key={idx} delay={idx * 100}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all"
                    style={{ 
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rec.strategy}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {rec.recovery_rate.toFixed(1)}% success rate ({rec.attempts} attempts)
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--color-success)' }}>
                          {formatCurrency(rec.total_recovered)}
                        </p>
                        <span 
                          className="text-xs px-3 py-1 rounded-full inline-block mt-1 font-medium"
                          style={{
                            backgroundColor: rec.confidence === 'HIGH' ? 'var(--color-success-light)' :
                                           rec.confidence === 'MEDIUM' ? 'var(--color-warning-light)' :
                                           'var(--color-border)',
                            color: rec.confidence === 'HIGH' ? 'var(--color-success-dark)' :
                                   rec.confidence === 'MEDIUM' ? 'var(--color-warning-dark)' :
                                   'var(--color-text-secondary)',
                          }}
                        >
                          {rec.confidence}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollTriggerAnimation>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-tertiary)' }}>No recommendations available yet</p>
            )}
          </div>
        </div>
      </ScrollTriggerAnimation>
    </div>
  );

  if (loading && !funnel) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary-500)' }} />
          </div>
          <p style={{ color: 'var(--color-text-secondary)' }} className="font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <CinematicBackground intensity="subtle" />
      
      <div className="relative z-10 space-y-12 p-8 md:p-12">
        {/* Hero Section */}
        <ScrollTriggerAnimation>
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                <BarChart3 className="w-8 h-8" style={{ color: 'var(--color-primary-600)' }} />
              </div>
              <h1 
                className="text-6xl font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                RECOVERY ANALYTICS TERMINAL
              </h1>
            </div>
            <p 
              className="text-xl"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Premium data analysis terminal for recovery strategy optimization
            </p>
          </div>
        </ScrollTriggerAnimation>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'var(--color-primary-600)',
              color: 'var(--color-text-inverse)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex gap-8 overflow-x-auto pb-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {['funnel', 'strategies', 'cohorts', 'incremental'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className="px-1 py-3 font-semibold text-sm transition-all relative whitespace-nowrap"
              style={{
                color: activeTab === tab ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
              }}
            >
              {tab === 'funnel' && 'Recovery Funnel'}
              {tab === 'strategies' && 'Strategies'}
              {tab === 'cohorts' && 'Cohorts'}
              {tab === 'incremental' && 'Incremental Revenue'}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 transition-all"
                  style={{ background: 'linear-gradient(to right, var(--color-primary-500), var(--color-primary-600))' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'funnel' && renderFunnelTab()}
          {activeTab === 'strategies' && renderStrategiesTab()}
          {activeTab === 'cohorts' && renderCohortsTab()}
          {activeTab === 'incremental' && renderIncrementalTab()}
        </div>
      </div>
    </div>
  );
};
