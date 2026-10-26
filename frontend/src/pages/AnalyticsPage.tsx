import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Shield,
  Layers,
  Bug,
  Sparkles,
  BarChart3,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { analyticsApi } from '@/services/api/analytics';
import { AnalyticsOverview, AnalyticsTrends } from '@/types';

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [ovData, trData] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getTrends(),
        ]);
        setOverview(ovData);
        setTrends(trData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const CATEGORY_COLORS: Record<string, string> = {
    security: '#ef4444',
    bug: '#f97316',
    performance: '#06b6d4',
    style: '#a855f7',
    maintainability: '#3b82f6',
    best_practice: '#10b981',
  };

  const categoryData = overview
    ? Object.entries(overview.categories).map(([cat, count]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count,
        fill: CATEGORY_COLORS[cat] || '#64748b',
      }))
    : [];

  const severityData = overview
    ? [
        { name: 'Critical', count: overview.severities.critical, fill: '#ef4444' },
        { name: 'High', count: overview.severities.high, fill: '#f97316' },
        { name: 'Medium', count: overview.severities.medium, fill: '#eab308' },
        { name: 'Low', count: overview.severities.low, fill: '#3b82f6' },
        { name: 'Info', count: overview.severities.informational, fill: '#94a3b8' },
      ]
    : [];

  const trendData = trends?.trends || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="pb-4 border-b border-surface-border">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Code Quality Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Longitudinal vulnerability trends, category frequencies, and quality metrics across your codebase.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : overview && overview.total_reviews > 0 ? (
        <>
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <span className="text-xs font-semibold text-slate-400">Total Code Reviews Executed</span>
              <div className="text-3xl font-extrabold text-slate-100 mt-2 font-mono">
                {overview.total_reviews}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">100% evaluated via AST & deterministic analyzers</p>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold text-slate-400">Findings Resolution Rate</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
                {overview.total_findings > 0
                  ? `${Math.round(((overview.resolved_count + overview.dismissed_count) / overview.total_findings) * 100)}%`
                  : '100%'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {overview.resolved_count} resolved, {overview.dismissed_count} dismissed
              </p>
            </Card>

            <Card className="p-5">
              <span className="text-xs font-semibold text-slate-400">Average Quality Health Index</span>
              <div className="text-3xl font-extrabold text-cyan-400 mt-2 font-mono">
                {overview.average_quality_score} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Weighted against severity impact curves</p>
            </Card>
          </div>

          {/* Quality Score Trend Over Time */}
          <Card>
            <CardHeader
              title="Quality Score & Findings Trend"
              subtitle="Daily progression of code quality scores and issues identified"
            />
            <CardContent className="h-72 pt-4">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        borderColor: '#30363d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f0f6fc',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="average_quality_score"
                      name="Avg Quality Score"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#06b6d4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="issues_found"
                      name="Issues Detected"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Perform multiple reviews across dates to visualize historical trend lines.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category & Severity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader
                title="Issues by Category"
                subtitle="Frequency of security, bug, performance, and maintainability concerns"
              />
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        borderColor: '#30363d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f0f6fc',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader
                title="Severity Distribution"
                subtitle="Relative proportions of critical, high, and medium severity findings"
              />
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b22',
                        borderColor: '#30363d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f0f6fc',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-sev-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title="No Analytics Data Available"
          description="Analytics are compiled from your persisted code reviews. Once you audit your first file, your metrics will render here."
        />
      )}
    </div>
  );
};
