import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCw,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Search,
  Check,
  X,
  Code2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Zap,
  AlertTriangle,
  ShieldOff,
  Bug,
  TrendingUp,
  Wand2,
  ChevronsRight,
  Copy,
  CheckCheck,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SeverityBadge, CategoryBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { reviewsApi } from '@/services/api/reviews';
import { findingsApi } from '@/services/api/findings';
import { systemApi } from '@/services/api/system';
import { Review, Finding, FindingStatus, SupportedLanguage } from '@/types';

// ─── Diff View: shows original (red) vs suggested (green) side-by-side ──────
const InlineDiff: React.FC<{ original?: string; suggested?: string; language: string }> = ({
  original,
  suggested,
  language,
}) => {
  if (!original && !suggested) return null;
  return (
    <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-700 text-[11px] font-mono">
      {original && (
        <div className="bg-red-950/30 border-b border-red-900/40">
          <div className="px-3 py-1 bg-red-900/30 text-red-400 text-[10px] flex items-center gap-1.5">
            <X className="w-3 h-3" />
            <span>Problematic Code (Before)</span>
          </div>
          <pre className="p-3 text-red-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {original}
          </pre>
        </div>
      )}
      {suggested && (
        <div className="bg-emerald-950/20">
          <div className="px-3 py-1 bg-emerald-900/30 text-emerald-400 text-[10px] flex items-center gap-1.5">
            <Check className="w-3 h-3" />
            <span>Suggested Fix (After)</span>
          </div>
          <pre className="p-3 text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {suggested}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─── Category icon helper ─────────────────────────────────────────────────────
const CategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className = 'w-4 h-4' }) => {
  switch (category) {
    case 'security': return <ShieldOff className={className} />;
    case 'bug': return <Bug className={className} />;
    case 'performance': return <TrendingUp className={className} />;
    case 'style': return <Layers className={className} />;
    case 'maintainability': return <RefreshCw className={className} />;
    default: return <AlertTriangle className={className} />;
  }
};

// ─── Copy-to-clipboard mini button ───────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── Finding Card ─────────────────────────────────────────────────────────────
interface FindingCardProps {
  finding: Finding;
  language: string;
  onNavigate: (line: number) => void;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
  onReopen: (id: string) => void;
  isApplying: boolean;
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  language,
  onNavigate,
  onResolve,
  onDismiss,
  onReopen,
  isApplying,
}) => {
  const [expanded, setExpanded] = useState(false);

  const severityIcon = () => {
    switch (finding.severity) {
      case 'critical': return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case 'high': return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'medium': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      case 'low': return <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />;
      default: return <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const cardBg =
    finding.status === 'resolved'
      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-80'
      : finding.status === 'dismissed'
      ? 'bg-slate-900/30 border-slate-700/40 opacity-55'
      : 'bg-surface hover:bg-surface-hover/60 border-surface-border shadow-sm';

  return (
    <div className={`rounded-xl border transition-all ${cardBg}`}>
      {/* Card Header – always visible */}
      <div
        className="p-3.5 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SeverityBadge severity={finding.severity} />
            <CategoryBadge category={finding.category} />
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {finding.rule_id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(finding.start_line); }}
              className="font-mono text-xs px-2 py-0.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1 transition-colors"
              title="Jump to line in editor"
            >
              <Eye className="w-3 h-3" />
              <span>L{finding.start_line}</span>
            </button>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-slate-100 leading-snug flex items-center gap-1.5">
          {severityIcon()}
          {finding.title}
        </h4>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
          {finding.description}
        </p>
      </div>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-surface-border pt-3">
          {/* Full description */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">What's Wrong</div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{finding.description}</p>
          </div>

          {/* Why it matters */}
          {finding.why_it_matters && (
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-700/40">
              <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-1 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Impact / Why It Matters
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">{finding.why_it_matters}</p>
            </div>
          )}

          {/* Performance tip (for PERF- rules) */}
          {finding.rule_id.startsWith('PERF-') && (
            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-700/40">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Optimization Tip
              </div>
              <p className="text-[11px] text-cyan-200/90 leading-relaxed">
                {finding.suggested_fix || 'Refactor this section to reduce time/space complexity and improve runtime performance.'}
              </p>
            </div>
          )}

          {/* Suggested fix (non-PERF) */}
          {finding.suggested_fix && !finding.rule_id.startsWith('PERF-') && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">How to Fix</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{finding.suggested_fix}</p>
            </div>
          )}

          {/* Inline Diff (original vs suggested) */}
          {(finding.original_code || finding.suggested_code) && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-between">
                <span>Code Diff</span>
                {finding.suggested_code && <CopyButton text={finding.suggested_code} />}
              </div>
              <InlineDiff
                original={finding.original_code}
                suggested={finding.suggested_code}
                language={language}
              />
            </>
          )}

          {/* Source + confidence */}
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-surface-border">
            <span>
              Source: <span className="text-slate-400">{finding.source}</span>
            </span>
            <span>
              Confidence: <span className="text-slate-400">{Math.round(finding.confidence * 100)}%</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            {finding.status === 'open' ? (
              <>
                <button
                  disabled={isApplying}
                  onClick={() => onResolve(finding.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <RotateCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  {finding.suggested_code ? 'Resolve & Apply Fix' : 'Mark Resolved'}
                </button>
                <button
                  disabled={isApplying}
                  onClick={() => onDismiss(finding.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-hover hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  Dismiss
                </button>
              </>
            ) : (
              <button
                onClick={() => onReopen(finding.id)}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border text-slate-300 hover:text-white text-[11px] transition-colors"
              >
                Reopen Issue
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Workspace Page ──────────────────────────────────────────────────────
export const WorkspacePage: React.FC = () => {
  const { theme } = useTheme();
  const { success, error: toastError, warning, info } = useToast();

  // Editor & Form State
  const [language, setLanguage] = useState<string>('python');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [reviewTitle, setReviewTitle] = useState<string>('');

  // Analysis Options
  const [enableAi, setEnableAi] = useState<boolean>(true);
  const [enableSecurity, setEnableSecurity] = useState<boolean>(true);
  const [enableBugs, setEnableBugs] = useState<boolean>(true);
  const [enablePerformance, setEnablePerformance] = useState<boolean>(true);
  const [enableStyle, setEnableStyle] = useState<boolean>(true);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'editor' | 'results'>('editor');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isApplyingAll, setIsApplyingAll] = useState<boolean>(false);
  const [applyingFindingId, setApplyingFindingId] = useState<string | null>(null);
  const [currentReview, setCurrentReview] = useState<Review | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languagesList, setLanguagesList] = useState<SupportedLanguage[]>([]);
  const [codeModified, setCodeModified] = useState<boolean>(false);
  const isProgrammaticUpdateRef = useRef<boolean>(false);

  // Monaco Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch supported languages on mount ───────────────────────────────────
  useEffect(() => {
    systemApi.getLanguages().then((langs) => {
      setLanguagesList(langs);
      if (langs.length > 0) {
        const defaultLang = langs.find((l) => l.id === 'python') || langs[0];
        setLanguage(defaultLang.id);
        setSourceCode(defaultLang.sample_snippet);
      }
    }).catch(console.error);
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // ── Sync Monaco Editor Markers with Open Findings ──────────────────────────
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        if (!currentReview || !currentReview.findings) {
          monacoRef.current.editor.setModelMarkers(model, 'codeguard', []);
          return;
        }

        const markers = currentReview.findings
          .filter((f) => f.status === 'open')
          .map((f) => {
            let severity = monacoRef.current.MarkerSeverity.Error;
            if (f.severity === 'medium') {
              severity = monacoRef.current.MarkerSeverity.Warning;
            } else if (f.severity === 'low' || f.severity === 'informational') {
              severity = monacoRef.current.MarkerSeverity.Info;
            }

            return {
              startLineNumber: f.start_line,
              startColumn: 1,
              endLineNumber: f.end_line || f.start_line,
              endColumn: 1000,
              message: `[${f.rule_id}] ${f.title}\n${f.description}${f.why_it_matters ? `\n\nImpact: ${f.why_it_matters}` : ''}${f.suggested_fix ? `\n\nFix / Optimization: ${f.suggested_fix}` : ''}`,
              severity,
            };
          });

        monacoRef.current.editor.setModelMarkers(model, 'codeguard', markers);
      }
    }
  }, [currentReview]);

  // ── Programmatically update Monaco editor content ─────────────────────────
  const applyCodeToEditor = useCallback((newCode: string) => {
    isProgrammaticUpdateRef.current = true;
    setSourceCode(newCode);
    setCodeModified(false);
    // Monaco keeps in sync via the `value` prop; also force-set via model for instant update
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        model.setValue(newCode);
      }
    }
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  }, []);

  // ── Navigate Monaco cursor to line ───────────────────────────────────────
  const navigateToLine = (lineNumber: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column: 1 });
      editorRef.current.focus();
      if (window.innerWidth < 1024) setActiveTab('editor');
    }
  };

  // ── Language change ───────────────────────────────────────────────────────
  const handleLanguageChange = (newLang: string) => {
    const prevLangObj = languagesList.find((l) => l.id === language);
    const newLangObj = languagesList.find((l) => l.id === newLang);
    setLanguage(newLang);

    // Auto-update editor with sample snippet if code is empty or untouched sample
    const isSampleCode =
      !sourceCode.trim() ||
      (prevLangObj && sourceCode.trim() === prevLangObj.sample_snippet.trim());

    if (newLangObj && isSampleCode) {
      applyCodeToEditor(newLangObj.sample_snippet);
      setCurrentReview(null);
    }
  };

  const handleLoadSample = () => {
    const langObj = languagesList.find((l) => l.id === language);
    if (langObj) {
      applyCodeToEditor(langObj.sample_snippet);
      setCurrentReview(null);
      success(`Loaded ${langObj.name} sample snippet!`, 'Sample Loaded');
    }
  };

  // ── File Upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toastError('File size exceeds the 500 KB limit.', 'Upload Error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      applyCodeToEditor(content);
      setReviewTitle(file.name);
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const matched = languagesList.find((l) => l.extension === ext);
      if (matched) setLanguage(matched.id);
      success(`Loaded file: ${file.name}`, 'File Uploaded');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        applyCodeToEditor(event.target?.result as string);
        setReviewTitle(file.name);
      };
      reader.readAsText(file);
    }
  };

  // ── Analyze Code ──────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!sourceCode.trim()) {
      warning('Please enter or upload source code before analyzing.', 'Empty Source');
      return;
    }
    setIsAnalyzing(true);
    setCurrentReview(null);
    setFilterSeverity('all');
    setFilterCategory('all');
    setSearchQuery('');
    try {
      const review = await reviewsApi.create({
        title: reviewTitle.trim() || undefined,
        language,
        source_code: sourceCode,
        enable_ai: enableAi,
        enable_security: enableSecurity,
        enable_bugs: enableBugs,
        enable_performance: enablePerformance,
        enable_style: enableStyle,
      });
      setCurrentReview(review);
      setCodeModified(false);
      setActiveTab('results');

      if (review.findings.length === 0 || review.quality_score === 100) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        success('Zero issues detected — flawless code quality!', 'Audit Complete');
      } else {
        const critCount = review.findings.filter((f) => f.severity === 'critical').length;
        const perfCount = review.findings.filter((f) => f.category === 'performance').length;
        const msg = `${review.findings.length} findings detected.${critCount ? ` ${critCount} critical.` : ''}${perfCount ? ` ${perfCount} performance issue(s).` : ''} Score: ${review.quality_score}/100`;
        success(msg, 'Analysis Complete');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Analysis request failed.';
      toastError(msg, 'Analysis Error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Resolve a single finding (and apply code fix if available) ────────────
  const handleResolve = async (findingId: string) => {
    setApplyingFindingId(findingId);
    try {
      const finding = currentReview?.findings.find((f) => f.id === findingId);
      const hasCodeFix = !!finding?.suggested_code;

      // Pass apply_to_code=true so backend replaces the bad snippet in source_code
      const updated = await findingsApi.updateStatus(findingId, 'resolved', hasCodeFix);

      if (currentReview) {
        const updatedFindings = currentReview.findings.map((f) =>
          f.id === findingId ? { ...f, status: updated.status } : f
        );

        // Recalculate quality score
        const openFindings = updatedFindings.filter((f) => f.status === 'open');
        const deductions = openFindings.reduce((acc, f) => {
          if (f.severity === 'critical') return acc + 25;
          if (f.severity === 'high') return acc + 15;
          if (f.severity === 'medium') return acc + 8;
          if (f.severity === 'low') return acc + 3;
          return acc + 1;
        }, 0);
        const newScore = Math.max(0, Math.min(100, Math.round((100 - deductions) * 10) / 10));

        setCurrentReview({ ...currentReview, quality_score: newScore, findings: updatedFindings });

        // If backend returned updated source code, apply it to the editor
        if (updated.updated_source_code) {
          applyCodeToEditor(updated.updated_source_code);
          success(
            `Fix applied to editor — bad code replaced at line ${finding?.start_line}.`,
            'Code Fixed ✓'
          );
        } else {
          success(`Issue marked as resolved.`, 'Status Updated');
        }

        if (newScore === 100) {
          setTimeout(() => confetti({ particleCount: 100, spread: 75 }), 100);
        }
      }
    } catch (err: any) {
      toastError('Failed to resolve finding.', 'Update Error');
    } finally {
      setApplyingFindingId(null);
    }
  };

  // ── Dismiss a finding ─────────────────────────────────────────────────────
  const handleDismiss = async (findingId: string) => {
    setApplyingFindingId(findingId);
    try {
      const updated = await findingsApi.updateStatus(findingId, 'dismissed', false);
      if (currentReview) {
        const updatedFindings = currentReview.findings.map((f) =>
          f.id === findingId ? { ...f, status: updated.status } : f
        );
        setCurrentReview({ ...currentReview, findings: updatedFindings });
      }
      info('Issue dismissed.', 'Dismissed');
    } catch {
      toastError('Failed to dismiss finding.', 'Update Error');
    } finally {
      setApplyingFindingId(null);
    }
  };

  // ── Reopen a finding ──────────────────────────────────────────────────────
  const handleReopen = async (findingId: string) => {
    setApplyingFindingId(findingId);
    try {
      const updated = await findingsApi.updateStatus(findingId, 'open', false);
      if (currentReview) {
        const updatedFindings = currentReview.findings.map((f) =>
          f.id === findingId ? { ...f, status: updated.status } : f
        );
        setCurrentReview({ ...currentReview, findings: updatedFindings });
      }
    } catch {
      toastError('Failed to reopen finding.', 'Update Error');
    } finally {
      setApplyingFindingId(null);
    }
  };

  // ── Apply All Fixes at once ───────────────────────────────────────────────
  const handleApplyAllFixes = async () => {
    if (!currentReview) return;
    const openWithFix = currentReview.findings.filter(
      (f) => f.status === 'open' && f.suggested_code
    );
    if (openWithFix.length === 0) {
      warning('No open findings with auto-fix available.', 'Nothing to Apply');
      return;
    }
    setIsApplyingAll(true);
    try {
      const result = await reviewsApi.applyAllFixes(currentReview.id);
      setCurrentReview(result);
      if (result.source_code) {
        applyCodeToEditor(result.source_code);
      }
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      success(
        `All ${openWithFix.length} auto-fixable issues resolved. Score: ${result.quality_score}/100`,
        '🚀 All Fixes Applied!'
      );
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to apply all fixes.', 'Apply Error');
    } finally {
      setIsApplyingAll(false);
    }
  };

  // ── Save manually-edited code back to review record ───────────────────────
  const handleSaveCode = async () => {
    if (!currentReview) return;
    try {
      await reviewsApi.updateCode(currentReview.id, sourceCode);
      setCodeModified(false);
      success('Code saved to review record.', 'Saved');
    } catch {
      toastError('Failed to save code.', 'Save Error');
    }
  };

  // ── Export Helpers ────────────────────────────────────────────────────────
  const exportAsJson = () => {
    if (!currentReview) return;
    const blob = new Blob([JSON.stringify(currentReview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeguard-report-${currentReview.id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    if (!currentReview) return;
    let md = `# CodeGuard AI Review Report\n\n`;
    md += `**Date:** ${new Date().toUTCString()}\n`;
    md += `**Language:** ${currentReview.language}\n`;
    md += `**Quality Score:** ${currentReview.quality_score} / 100\n`;
    md += `**AI Status:** ${currentReview.ai_status}\n\n`;
    md += `## Findings (${currentReview.findings.length} total)\n\n`;
    currentReview.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title} — Line ${f.start_line}\n`;
      md += `**Rule:** \`${f.rule_id}\` | **Category:** ${f.category} | **Status:** ${f.status}\n\n`;
      md += `${f.description}\n\n`;
      if (f.why_it_matters) md += `> **Impact:** ${f.why_it_matters}\n\n`;
      if (f.original_code) md += `**Problematic Code:**\n\`\`\`${currentReview.language}\n${f.original_code}\n\`\`\`\n\n`;
      if (f.suggested_code) md += `**Suggested Fix:**\n\`\`\`${currentReview.language}\n${f.suggested_code}\n\`\`\`\n\n`;
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeguard-audit-${currentReview.id.substring(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtered findings ─────────────────────────────────────────────────────
  const filteredFindings = currentReview
    ? currentReview.findings.filter((f) => {
        if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
        if (filterCategory !== 'all' && f.category !== filterCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.rule_id.toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  const openCount = currentReview?.findings.filter((f) => f.status === 'open').length ?? 0;
  const autoFixCount = currentReview?.findings.filter(
    (f) => f.status === 'open' && !!f.suggested_code
  ).length ?? 0;
  const criticalCount = currentReview?.findings.filter((f) => f.severity === 'critical').length ?? 0;
  const perfCount = currentReview?.findings.filter((f) => f.category === 'performance').length ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* ── Workspace Toolbar ─────────────────────────────────────────── */}
      <div className="border-b border-surface-border bg-surface/80 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
          >
            {languagesList.map((lang) => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>

          {/* Sample loader */}
          <button
            onClick={handleLoadSample}
            className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs text-slate-300 transition-colors"
            title="Load a buggy example snippet"
          >
            Load Sample
          </button>

          {/* File upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.go,.rs,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs text-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload File</span>
          </button>

          {/* Analysis options toggle */}
          <button
            onClick={() => setShowOptions((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-xs text-slate-300 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Options</span>
            {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Mobile tab switcher */}
          <div className="flex lg:hidden bg-slate-900 p-0.5 rounded-lg border border-surface-border text-xs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md font-medium ${activeTab === 'editor' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 ${activeTab === 'results' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            >
              Results
              {currentReview && (
                <span className="px-1.5 rounded-full bg-black/40 text-[10px]">
                  {currentReview.findings.length}
                </span>
              )}
            </button>
          </div>

          {/* Save code button (shows only after manual edit on existing review) */}
          {currentReview && codeModified && (
            <button
              onClick={handleSaveCode}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save Changes
            </button>
          )}

          {/* Analyze Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            icon={<Play className="w-4 h-4 fill-current" />}
            className="shadow-md shadow-brand-600/30 font-semibold"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
          </Button>
        </div>
      </div>

      {/* ── Analysis Options Dropdown Panel ───────────────────────────── */}
      {showOptions && (
        <div className="border-b border-surface-border bg-slate-900/60 px-5 py-3 flex flex-wrap gap-4 text-xs text-slate-300 shrink-0">
          {[
            { label: 'AI Analysis', state: enableAi, set: setEnableAi },
            { label: 'Security', state: enableSecurity, set: setEnableSecurity },
            { label: 'Bug Detection', state: enableBugs, set: setEnableBugs },
            { label: 'Performance', state: enablePerformance, set: setEnablePerformance },
            { label: 'Code Style', state: enableStyle, set: setEnableStyle },
          ].map(({ label, state, set }) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state}
                onChange={(e) => set(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-brand-500"
              />
              <span>{label}</span>
            </label>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-slate-500">
            <span>Review title:</span>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Optional label…"
              className="bg-surface border border-surface-border rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 w-40"
            />
          </label>
        </div>
      )}

      {/* ── Main Split Pane ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 overflow-hidden">

        {/* LEFT: Monaco Editor */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col min-w-0 bg-[#0d1117] border-b lg:border-b-0 lg:border-r border-surface-border overflow-hidden ${
            activeTab === 'results' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Editor tab bar */}
          <div className="h-9 px-4 bg-slate-900/70 border-b border-surface-border flex items-center justify-between text-xs text-slate-400 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-mono">
                {reviewTitle || `source.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language}`}
              </span>
              {codeModified && (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {sourceCode.split('\n').length} lines | {sourceCode.length} chars
            </div>
          </div>

          {/* Monaco */}
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={language === 'c' || language === 'cpp' ? 'cpp' : language}
              value={sourceCode}
              onChange={(value) => {
                setSourceCode(value || '');
                if (!isProgrammaticUpdateRef.current && currentReview) {
                  setCodeModified(true);
                }
              }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* RIGHT: Results Panel */}
        <div
          className={`w-full lg:w-[490px] xl:w-[560px] flex flex-col bg-surface min-w-0 min-h-0 overflow-hidden shrink-0 ${
            activeTab === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {currentReview ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

              {/* ── Results Header ── */}
              <div className="p-4 border-b border-surface-border bg-slate-900/40 space-y-3 shrink-0">
                {/* Score + Title row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-13 h-13 min-w-[52px] rounded-xl flex flex-col items-center justify-center font-bold font-mono border ${
                        currentReview.quality_score >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : currentReview.quality_score >= 60
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                      style={{ width: 52, height: 52 }}
                    >
                      <span className="text-base leading-none">{currentReview.quality_score}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">Score</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-slate-100 truncate max-w-[200px]">
                        {currentReview.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                        <span className="capitalize">{currentReview.language}</span>
                        <span>•</span>
                        <span>{currentReview.findings.length} findings</span>
                        {criticalCount > 0 && (
                          <span className="text-red-400 font-semibold">{criticalCount} critical</span>
                        )}
                        {perfCount > 0 && (
                          <span className="text-cyan-400">{perfCount} perf</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Export */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={exportAsJson}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-slate-400 hover:text-white"
                      title="Export as JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportAsMarkdown}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-slate-400 hover:text-white"
                      title="Export as Markdown report"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI status banner */}
                <div className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-300 truncate">
                      {currentReview.ai_used ? 'AI-Enhanced Analysis Active' : 'Static AST Analysis Active'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/30 text-slate-400 shrink-0">
                    {currentReview.ai_status}
                  </span>
                </div>

                {/* Stats pills */}
                {openCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400">{openCount} open</span>
                    {autoFixCount > 0 && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-emerald-400 font-medium">{autoFixCount} auto-fixable</span>
                      </>
                    )}
                    {/* Apply All Fixes */}
                    {autoFixCount > 0 && (
                      <button
                        onClick={handleApplyAllFixes}
                        disabled={isApplyingAll}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isApplyingAll ? (
                          <RotateCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        {isApplyingAll ? 'Applying…' : `Apply All ${autoFixCount} Fixes`}
                      </button>
                    )}
                  </div>
                )}

                {/* Search + Filter row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search findings…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-hover border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-surface-hover border border-surface-border rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="informational">Info</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-surface-hover border border-surface-border rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="security">Security</option>
                    <option value="bug">Bug</option>
                    <option value="performance">Performance</option>
                    <option value="style">Style</option>
                    <option value="maintainability">Maintainability</option>
                  </select>
                </div>
              </div>

              {/* ── Scrollable Findings List ── */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                {filteredFindings.length > 0 ? (
                  filteredFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      language={currentReview.language}
                      onNavigate={navigateToLine}
                      onResolve={handleResolve}
                      onDismiss={handleDismiss}
                      onReopen={handleReopen}
                      isApplying={applyingFindingId === finding.id}
                    />
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                    <h5 className="font-semibold text-slate-200 text-sm">All Clear!</h5>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      {currentReview.findings.length === 0
                        ? 'No issues were detected in this code.'
                        : 'All findings resolved or no matches for current filters.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Empty / Pre-analysis state ── */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-5">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">Ready for Analysis</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
                Click <span className="text-brand-400 font-semibold">"Analyze Code"</span> to run AST static analysis, security scanning, performance checks, and AI-powered recommendations.
              </p>

              <div className="w-full max-w-xs space-y-2 text-left">
                {[
                  { icon: <Bug className="w-3.5 h-3.5 text-red-400" />, label: 'Bug & runtime error detection' },
                  { icon: <ShieldOff className="w-3.5 h-3.5 text-orange-400" />, label: 'Security vulnerability scanning' },
                  { icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />, label: 'Performance & optimization tips' },
                  { icon: <Wand2 className="w-3.5 h-3.5 text-emerald-400" />, label: 'One-click auto-fix application' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs text-slate-400">
                    {icon}
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleLoadSample}
                className="mt-6 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Load sample vulnerable code →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
