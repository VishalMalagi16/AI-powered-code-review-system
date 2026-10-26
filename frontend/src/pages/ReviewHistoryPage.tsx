import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RotateCw,
  Calendar,
  FileCode2,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { reviewsApi } from '@/services/api/reviews';
import { ReviewListItem } from '@/types';

export const ReviewHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ReviewListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const resp = await reviewsApi.list({
        search: search.trim() || undefined,
        language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        page,
        limit: 10,
      });
      setReviews(resp.items);
      setTotal(resp.total);
      setTotalPages(resp.total_pages);
    } catch (err) {
      toastError('Failed to fetch review history.', 'Fetch Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, selectedLanguage, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await reviewsApi.delete(deleteTarget.id);
      success(`Review "${deleteTarget.title}" deleted.`, 'Deleted');
      setDeleteTarget(null);
      fetchReviews();
    } catch {
      toastError('Failed to delete review.', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Review History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and inspect past code security and quality audits.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/app/workspace')}
          icon={<Sparkles className="w-4 h-4 text-cyan-200" />}
        >
          New Code Review
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by review title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-hover border border-surface-border rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setPage(1);
              }}
              className="bg-surface-hover border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C / C++</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-surface-hover border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Table of Reviews */}
      {isLoading ? (
        <Card className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : reviews.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/40 text-slate-400 uppercase font-semibold border-b border-surface-border">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Language</th>
                  <th className="px-5 py-3">Quality Score</th>
                  <th className="px-5 py-3">Findings</th>
                  <th className="px-5 py-3">AI Remediation</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-200">
                      <button
                        onClick={() => navigate(`/app/reviews/${r.id}`)}
                        className="hover:text-brand-400 text-left"
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="px-5 py-4 capitalize font-mono text-slate-300">{r.language}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          r.quality_score >= 85
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.quality_score >= 60
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {r.quality_score}/100
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{r.total_findings}</span>
                        {r.critical_findings > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                            {r.critical_findings} crit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {r.ai_used ? (
                        <span className="inline-flex items-center gap-1 text-cyan-400 font-medium text-[11px]">
                          <Sparkles className="w-3 h-3" /> Enabled
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Static only</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/reviews/${r.id}`)}
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          View
                        </Button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-surface-border flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing page {page} of {totalPages} ({total} reviews)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <EmptyState
          title="No Reviews Match Criteria"
          description="Adjust your search term or filters to discover matching code audits."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedLanguage('all');
            setSelectedStatus('all');
            setPage(1);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Review Record?"
          description="This action permanently removes this audit report and its associated findings."
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                isLoading={isDeleting}
              >
                Delete Record
              </Button>
            </>
          }
        >
          <p className="text-xs text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};
