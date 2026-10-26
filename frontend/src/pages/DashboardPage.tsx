import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi } from '@/services/api/analytics';
import { reviewsApi } from '@/services/api/reviews';
import { AnalyticsOverview, ReviewListItem } from '@/types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [recentReviews, setRecentReviews] = useState<ReviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [statsData, reviewsData] = await Promise.all([
          analyticsApi.getOverview(),
          reviewsApi.list({ page: 1, limit: 5 }),
        ]);
        setOverview(statsData);
        setRecentReviews(reviewsData.items);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Format data for Recharts Severity Bar Chart
  const severityChartData = overview
    ? [
        { name: 'Critical', count: overview.severities.critical, color: '#ef4444' },
        { name: 'High', count: overview.severities.high, color: '#f97316' },
        { name: 'Medium', count: overview.severities.medium, color: '#eab308' },
        { name: 'Low', count: overview.severities.low, color: '#3b82f6' },
        { name: 'Info', count: overview.severities.informational, color: '#94a3b8' },
      ]
    : [];

  const PIE_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Welcome back, {user?.name || 'Engineer'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time static AST analysis, vulnerability telemetry, and code health overview.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/app/workspace')}
          icon={<Sparkles className="w-4 h-4 text-cyan-200" />}
          className="shadow-md shadow-brand-600/30 font-semibold shrink-0"
        >
          Start New Review
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-surface border border-surface-border space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : overview && overview.total_reviews > 0 ? (
        <>
          {/* Real Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reviews */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Code Reviews</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileCode2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{overview.total_reviews}</div>
              <div className="text-[11px] text-slate-400 mt-1">Across all repositories & snippets</div>
            </Card>

            {/* Total Issues */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Issues Detected</span>
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{overview.total_findings}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {overview.critical_high_count} critical or high severity
              </div>
            </Card>

            {/* Resolved Rate */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Issues Addressed</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {overview.resolved_count + overview.dismissed_count}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                {overview.total_findings > 0
                  ? `${Math.round(((overview.resolved_count + overview.dismissed_count) / overview.total_findings) * 100)}% resolution rate`
                  : 'Zero open findings'}
              </div>
            </Card>

            {/* Average Quality Score */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Average Quality Score</span>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {overview.average_quality_score}/100
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {overview.average_quality_score >= 80 ? 'Grade A - Robust' : 'Attention Recommended'}
              </div>
            </Card>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution Bar Chart */}
            <Card>
              <CardHeader
                title="Issues by Severity Level"
                subtitle="Distribution of identified security and quality findings"
              />
              <CardContent className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                      allowDecimals={false}
                    />
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
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Language Distribution Pie Chart */}
            <Card>
              <CardHeader
                title="Analyzed Languages"
                subtitle="Breakdown of source code languages evaluated"
              />
              <CardContent className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                {overview.languages.length > 0 ? (
                  <>
                    <div className="w-full sm:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overview.languages}
                            dataKey="count"
                            nameKey="language"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {overview.languages.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#161b22',
                              borderColor: '#30363d',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#f0f6fc',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full sm:w-1/2 space-y-2">
                      {overview.languages.map((lang, idx) => (
                        <div key={lang.language} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                            />
                            <span className="text-slate-300 font-medium">{lang.language}</span>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {lang.count} ({lang.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No language distribution data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Reviews Table */}
          <Card>
            <CardHeader
              title="Recent Code Reviews"
              subtitle="Latest audited source files and quality scores"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app/reviews')}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  View All Reviews
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/40 text-slate-400 uppercase font-semibold border-b border-surface-border">
                  <tr>
                    <th className="px-5 py-3">Review Title</th>
                    <th className="px-5 py-3">Language</th>
                    <th className="px-5 py-3">Quality Score</th>
                    <th className="px-5 py-3">Findings</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {recentReviews.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-200">
                        <button
                          onClick={() => navigate(`/app/reviews/${item.id}`)}
                          className="hover:text-brand-400 text-left font-semibold"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-300 font-mono">{item.language}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                            item.quality_score >= 85
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.quality_score >= 60
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {item.quality_score}/100
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-semibold">{item.total_findings}</span>
                          {item.critical_findings > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                              {item.critical_findings} crit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/reviews/${item.id}`)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        /* Empty State */
        <EmptyState
          title="No Code Reviews Yet"
          description="Submit your first code snippet or repository file to begin detecting vulnerabilities, syntax flaws, and code smells."
          actionText="Open Review Workspace"
          onAction={() => navigate('/app/workspace')}
        />
      )}
    </div>
  );
};
