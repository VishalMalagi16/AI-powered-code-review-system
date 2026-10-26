import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  RotateCw,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sparkles,
  Check,
  X,
  Code2,
  Layers,
  Wrench
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SeverityBadge, CategoryBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { reviewsApi } from '@/services/api/reviews';
import { findingsApi } from '@/services/api/findings';
import { Review, Finding, FindingStatus } from '@/types';

export const ReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { success, error: toastError } = useToast();

  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const fetchReview = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await reviewsApi.getById(id);
      setReview(data);
    } catch (err: any) {
      toastError('Could not locate or load review record.', 'Error');
      navigate('/app/reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    setIsReanalyzing(true);
    try {
      const updated = await reviewsApi.reanalyze(id);
      setReview(updated);
      success('Review successfully re-analyzed!', 'Analysis Complete');
    } catch {
      toastError('Failed to trigger re-analysis.', 'Error');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleUpdateStatus = async (findingId: string, newStatus: FindingStatus) => {
    try {
      const updated = await findingsApi.updateStatus(findingId, newStatus);
      if (review) {
        const updatedFindings = review.findings.map((f) =>
          f.id === findingId ? { ...f, status: updated.status } : f
        );
        // Recalculate score locally
        const openFindings = updatedFindings.filter((f) => f.status === 'open');
        const deductions = openFindings.reduce((acc, f) => {
          if (f.severity === 'critical') return acc + 25;
          if (f.severity === 'high') return acc + 15;
          if (f.severity === 'medium') return acc + 8;
          if (f.severity === 'low') return acc + 3;
          return acc + 1;
        }, 0);
        const newScore = Math.max(0, Math.min(100, Math.round((100 - deductions) * 10) / 10));

        setReview({
          ...review,
          quality_score: newScore,
          findings: updatedFindings,
        });
      }
      success(`Finding marked as ${newStatus}.`, 'Updated');
    } catch {
      toastError('Failed to update status.', 'Error');
    }
  };

  const navigateToLine = (line: number) => {
    if (editorInstance) {
      editorInstance.revealLineInCenter(line);
      editorInstance.setPosition({ lineNumber: line, column: 1 });
      editorInstance.focus();
    }
  };

  const exportAsJson = () => {
    if (!review) return;
    const blob = new Blob([JSON.stringify(review, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeguard-${review.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !review) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 w-full">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const filteredFindings = review.findings.filter((f) => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/reviews')}
            className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{review.title}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-300 capitalize">
                {review.language}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audited on {new Date(review.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsJson}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReanalyze}
            isLoading={isReanalyzing}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Re-Analyze Code
          </Button>
        </div>
      </div>

      {/* Metrics & Quality Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Quality Score</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {review.quality_score}/100
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Lines of Code</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {review.metrics?.loc || 0}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Cyclomatic Complexity</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {review.metrics?.cyclomatic_complexity || 1}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Maintainability Index</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {review.metrics?.maintainability_index || 100}%
          </div>
        </Card>
      </div>

      {/* Editor & Findings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Source Code Viewer in Monaco */}
        <div className="lg:col-span-7 bg-[#0d1117] border border-surface-border rounded-xl overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="px-4 py-2 bg-slate-900 border-b border-surface-border text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono">{review.title}</span>
            <span className="text-[11px] text-slate-500 font-mono">Read-Only</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={review.language === 'c' || review.language === 'cpp' ? 'cpp' : review.language}
              value={review.source_code}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              onMount={(editor) => setEditorInstance(editor)}
              options={{
                readOnly: true,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Findings Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              Findings ({review.findings.length})
            </h3>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-surface border border-surface-border rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                  finding.status === 'resolved'
                    ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                    : finding.status === 'dismissed'
                    ? 'bg-slate-900/30 border-slate-700/40 opacity-60'
                    : 'bg-surface border-surface-border shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SeverityBadge severity={finding.severity} />
                    <CategoryBadge category={finding.category} />
                  </div>
                  <button
                    onClick={() => navigateToLine(finding.start_line)}
                    className="font-mono text-xs px-2 py-0.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>L{finding.start_line}</span>
                  </button>
                </div>

                <div className="font-bold text-slate-100">{finding.title}</div>
                <p className="text-slate-300 leading-relaxed">{finding.description}</p>

                {finding.why_it_matters && (
                  <div className="p-2 rounded bg-amber-950/30 border-l-2 border-amber-500/60 text-amber-200 text-[11px]">
                    <span className="font-semibold">Impact: </span>
                    {finding.why_it_matters}
                  </div>
                )}

                {finding.suggested_code && (
                  <div className="rounded border border-slate-700 bg-[#0b0f17] p-2">
                    <div className="text-[10px] text-slate-400 font-mono mb-1">Recommended Fix:</div>
                    <pre className="font-mono text-emerald-300 text-[11px] whitespace-pre-wrap">
                      {finding.suggested_code}
                    </pre>
                  </div>
                )}

                <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">{finding.rule_id}</span>
                  <div className="flex items-center gap-1.5">
                    {finding.status === 'open' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(finding.id, 'resolved')}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(finding.id, 'dismissed')}
                          className="px-2 py-1 rounded bg-surface-hover text-slate-400 text-[11px]"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(finding.id, 'open')}
                        className="px-2 py-1 rounded bg-surface border border-surface-border text-slate-300 text-[11px]"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
