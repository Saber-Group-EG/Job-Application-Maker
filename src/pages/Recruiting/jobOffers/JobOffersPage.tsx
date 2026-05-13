import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Search,
  Briefcase,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Hash,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCompanies } from '../../../hooks/queries/useCompanies';
import {
  jobOffersKeys,
  useJobOffers,
  useDeleteJobOffer,
  useUpdateOfferStatus,
} from '../../../hooks/queries/useJobOffers';
import { jobOffersService } from '../../../services/jobOffersService';
import type { JobOffer, OfferStatus } from '../../../services/jobOffersService';
import Swal from '../../../utils/swal';
import JobOfferModal from '../../../components/modals/JobOffersModal/JobOffersModal';
import { useDebounce } from '../../../hooks/useDebounce';
import { SidebarNavItem } from './SidebarNavItem';
import { OfferDetail } from './OfferDetail';
import { ResendModal } from './OffersActions';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 10;

const STATUS_OPTIONS: Array<{
  key: 'all' | OfferStatus;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'all', label: 'All', icon: Hash },
  { key: 'draft', label: 'Draft', icon: FileText },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'expired', label: 'Expired', icon: AlertCircle },
];

export const STATUS_CHIP: Record<
  OfferStatus,
  { bg: string; text: string; dot: string }
> = {
  draft: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-600 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  sent: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-400',
  },
  accepted: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-400',
  },
  rejected: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-400',
  },
  expired: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
};

export const WORK_TYPE_COLORS: Record<string, string> = {
  'full-time':
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'part-time':
    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  contract:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  internship:
    'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobOffersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: companies = [] } = useCompanies(); // ← full objects, not just IDs

  const canWrite =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write');

  const companyId: string[] = companies.map((c) => c._id);

  // ── View state ─────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [cloneSource, setCloneSource] = useState<JobOffer | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [resendOpen, setResendOpen] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | OfferStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const queryParams = {
    companyId: companyFilter === 'all' ? companyId : [companyFilter],
    isTemplate: false as const,
    PageCount: LIMIT,
    page,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  };

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: offersData, isLoading, isFetching } = useJobOffers(queryParams);

  const offers = offersData?.data ?? [];
  const total = offersData?.totalCount ?? 0;
  const totalPages = offersData?.totalPages ?? 1;

  // ── Prefetch next page ─────────────────────────────────────────────────
  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: jobOffersKeys.list({ ...queryParams, page: page + 1 }),
        queryFn: () =>
          jobOffersService.listOffers({ ...queryParams, page: page + 1 }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [page, totalPages, companyId, statusFilter]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, companyFilter]);

  // ── Mutations ──────────────────────────────────────────────────────────
  const deleteMutation = useDeleteJobOffer();
  const updateStatusMutation = useUpdateOfferStatus();

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Offer?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      await deleteMutation.mutateAsync(id);
      if (selectedOfferId === id) {
        setView('list');
        setSelectedOfferId(null);
      }
    }
  };

  const selectedOffer = useMemo(
    () => offers.find((o) => o._id === selectedOfferId) ?? null,
    [offers, selectedOfferId]
  );

  const getStatusCount = (status: 'all' | OfferStatus) => {
    if (status === 'all') return total;
    return offers.filter((o) => o.status === status).length;
  };

  const handleOfferClick = (id: string) => {
    setSelectedOfferId(id);
    setView('detail');
  };

  const handleClone = (offer: JobOffer) => {
    setEditingOffer(null);
    setCloneSource(offer);
    setModalOpen(true);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedOfferId(null);
  };

  const handleEdit = (offer: JobOffer) => {
    setEditingOffer(offer);
    setModalOpen(true);
  };

  // ── Shared modal (used in both list & detail views) ────────────────────
  const sharedModal = companyId.length > 0 && (
    <JobOfferModal
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false);
        setCloneSource(null);
      }}
      mode="offer"
      companyId={companyId}
      editing={editingOffer}
      cloneFrom={cloneSource}
    />
  );

  // ── List View ──────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="mx-auto flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex h-full flex-1">
          {/* Sidebar */}
          <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="sticky top-0 p-4">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-brand-600" />
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    Job Offers
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                {STATUS_OPTIONS.map((opt) => (
                  <SidebarNavItem
                    key={opt.key}
                    icon={opt.icon}
                    label={opt.label}
                    count={getStatusCount(opt.key)}
                    active={statusFilter === opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                  />
                ))}
              </div>

              {/* Stats summary */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Summary
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Offers</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {total}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Accepted</span>
                    <span className="font-semibold text-emerald-600">
                      {offers.filter((o) => o.status === 'accepted').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Pending</span>
                    <span className="font-semibold text-blue-600">
                      {offers.filter((o) => o.status === 'sent').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Rejected</span>
                    <span className="font-semibold text-red-500">
                      {offers.filter((o) => o.status === 'rejected').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex flex-1 flex-col">
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search offers..."
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                />
              </div>

              {/* Company filter */}
              {companies.length > 1 && (
                <select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                >
                  <option value="all">All Companies</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {typeof c.name === 'string'
                        ? c.name
                        : c.name?.en || c.name?.ar}
                    </option>
                  ))}
                </select>
              )}

              {canWrite && (
                <button
                  onClick={() => {
                    setEditingOffer(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <PlusCircle className="h-4 w-4" /> New Offer
                </button>
              )}
            </div>

            {/* Offer list */}
            <div className="flex-1 bg-white dark:bg-slate-900">
              {isLoading ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...Array(LIMIT)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse bg-slate-50 dark:bg-slate-800/30"
                    />
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <Briefcase className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
                    No offers found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {search || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create the first offer for your team'}
                  </p>
                  {canWrite && !search && statusFilter === 'all' && (
                    <button
                      onClick={() => {
                        setEditingOffer(null);
                        setModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      <PlusCircle className="size-4" /> New Offer
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`divide-y divide-slate-100 dark:divide-slate-800 ${isFetching ? 'opacity-60' : ''}`}
                >
                  {offers.map((offer) => {
                    const chip = STATUS_CHIP[offer.status];
                    const applicantName =
                      typeof offer.applicantId === 'object' &&
                      offer.applicantId !== null
                        ? offer.applicantId.fullName
                        : '—';

                    return (
                      <button
                        key={offer._id}
                        onClick={() => handleOfferClick(offer._id)}
                        className="w-full px-6 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {applicantName}
                              </p>
                              <div
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${chip.dot}`}
                              />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {offer.position}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${WORK_TYPE_COLORS[offer.workType]}`}
                              >
                                {offer.workType}
                              </span>
                              {offer.salary.basic != null && (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <DollarSign className="size-3" />
                                  {offer.salary.basic.toLocaleString()}{' '}
                                  {offer.salary.currency}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                              {new Date(offer.createdAt).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: '2-digit' }
                              )}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${chip.bg} ${chip.text}`}
                            >
                              {offer.status}
                            </span>
                            {canWrite && (
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleEdit(offer)}
                                  className="flex size-6 items-center justify-center rounded text-slate-300 hover:text-brand-500"
                                  title="Edit"
                                >
                                  <Pencil className="size-3" />
                                </button>
                                <button
                                  onClick={() => handleClone(offer)}
                                  className="flex size-6 items-center justify-center rounded text-slate-300 hover:text-emerald-500"
                                  title="Clone"
                                >
                                  <Copy className="size-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(offer._id)}
                                  className="flex size-6 items-center justify-center rounded text-slate-300 hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {page} of {totalPages} · {total} total
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {sharedModal}
      </div>
    );
  }

  // ── Detail View ────────────────────────────────────────────────────────
  if (view === 'detail' && selectedOffer) {
    return (
      <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Sidebar */}
        <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="sticky top-0 p-4">
            <div className="mb-6 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-brand-600" />
              <span className="text-lg font-bold text-slate-800 dark:text-white">
                Job Offers
              </span>
            </div>
            <div className="space-y-1">
              {STATUS_OPTIONS.map((opt) => (
                <SidebarNavItem
                  key={opt.key}
                  icon={opt.icon}
                  label={opt.label}
                  count={getStatusCount(opt.key)}
                  active={statusFilter === opt.key}
                  onClick={() => {
                    setStatusFilter(opt.key);
                    handleBackToList();
                  }}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Detail panel — now receives full company objects */}
        <OfferDetail
          offer={selectedOffer}
          canWrite={canWrite}
          onBack={handleBackToList}
          onEdit={(o) => {
            setEditingOffer(o);
            setModalOpen(true);
          }}
          setResendOpen={setResendOpen}
          onDelete={handleDelete}
          onClone={handleClone}
          onStatusChange={(id, status) =>
            updateStatusMutation.mutate({ id, status })
          }
        />
        {resendOpen && (
          <ResendModal
            offer={selectedOffer}
            companies={companies}
            onClose={() => setResendOpen(false)}
          />
        )}
        {sharedModal}
      </div>
    );
  }

  // Fallback
  if (view === 'detail' && !selectedOffer) {
    setView('list');
    setSelectedOfferId(null);
    return null;
  }

  return null;
}
