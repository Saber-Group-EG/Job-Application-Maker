import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  FileSignature,
  DollarSign,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hash,
  Pencil,
  Clock,
  FileText,
  Send,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCompanies } from '../../../hooks/queries/useCompanies';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { jobContractsService } from '../../../services/contractsService';
import type {
  JobContract,
  ContractStatus,
} from '../../../services/contractsService';
import Swal from '../../../utils/swal';
import JobContractModal from '../../../components/modals/ContractModal/ContractModal';
import { useDebounce } from '../../../hooks/useDebounce';
import { Badge, Button, Card, EmptyState, IconButton, PageShell, Pagination, SearchInput, StatStrip, TabBar, focusRing, ErrorState } from '../../../components/ui/kit';
import { CONTRACT_STATUS_TONE, CONTRACT_TYPE_TONE, contractStatusKey, contractTypeKey } from './contractMeta';
import { useLocale } from '../../../context/LocaleContext';
import PageMeta from '../../../components/common/PageMeta';
import { ContractDetail } from './ContractDetails';
import {
  useUpdateContractStatus,
  jobContractsKeys,
  useJobContracts,
  useJobContractStatusCounts,
  useDeleteJobContract,
} from '../../../hooks/queries/useContracts';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 10;

const STATUS_OPTIONS: Array<{
  key: 'all' | ContractStatus;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'all', label: 'statusAll', icon: Hash },
  { key: 'draft', label: 'statusDraft', icon: FileText },
  { key: 'sent', label: 'statusSent', icon: Send },
  { key: 'signed', label: 'statusSigned', icon: CheckCircle2 },
  { key: 'rejected', label: 'statusRejected', icon: XCircle },
  { key: 'expired', label: 'statusExpired', icon: AlertCircle },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobContractsPage() {
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { data: companies = [] } = useCompanies();

  const canWrite =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write');

  const { selectedCompanyId } = useCompanyFilter();
  const companyId: string[] = companies.map((c) => c._id);

  // ── View state ─────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );
  const [cloneSource, setCloneSource] = useState<JobContract | null>(null);

  // ── Filters ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | ContractStatus>(
    'all'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<JobContract | null>(
    null
  );
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // No company picked: send no companyId and let the API scope the list to
  // the user's companies, so the list doesn't wait for company details.
  const scopeCompanyIds = selectedCompanyId ? [selectedCompanyId] : undefined;
  const trimmedSearch = debouncedSearch.trim();

  const queryParams = {
    companyId: scopeCompanyIds,
    isTemplate: false as const,
    PageCount: LIMIT,
    page,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  };

  // ── Data ───────────────────────────────────────────────────────────────
  const {
    data: contractsData,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    refetch,
  } = useJobContracts(queryParams);

  const contracts = contractsData?.data ?? [];
  const total = contractsData?.totalCount ?? 0;
  const totalPages = contractsData?.totalPages ?? 1;

  // ── Per-status counts (one request for every tab) ──────────────────────
  const { data: statusCounts } = useJobContractStatusCounts({
    companyId: scopeCompanyIds,
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  });

  // ── Prefetch next page ─────────────────────────────────────────────────
  useEffect(() => {
    // Wait for the real result: while the previous filter's data is shown as
    // a placeholder, totalPages belongs to that filter.
    if (!isPlaceholderData && page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: jobContractsKeys.list({ ...queryParams, page: page + 1 }),
        queryFn: () =>
          jobContractsService.listContracts({ ...queryParams, page: page + 1 }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [page, totalPages, isPlaceholderData, selectedCompanyId, statusFilter, trimmedSearch]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, selectedCompanyId]);

  // ── Mutations ──────────────────────────────────────────────────────────
  const deleteMutation = useDeleteJobContract();
  const updateStatusMutation = useUpdateContractStatus();

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t('deleteTitle', 'jobContracts'),
      text: t('deleteText', 'jobContracts'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonText: t('deleteConfirm', 'jobContracts'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      await deleteMutation.mutateAsync(id);
      if (selectedContractId === id) {
        setView('list');
        setSelectedContractId(null);
      }
    }
  };

  const selectedContract = useMemo(
    () => contracts.find((c) => c._id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  const getStatusCount = (status: 'all' | ContractStatus) => {
    if (!statusCounts) return status === 'all' || status === statusFilter ? total : 0;
    return status === 'all' ? statusCounts.total : (statusCounts.counts[status] ?? 0);
  };

  const handleContractClick = (id: string) => {
    setSelectedContractId(id);
    setView('detail');
  };

  const handleClone = (contract: JobContract) => {
    setEditingContract(null);
    setCloneSource(contract);
    setModalOpen(true);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedContractId(null);
  };

  const handleEdit = (contract: JobContract) => {
    setEditingContract(contract);
    setModalOpen(true);
  };

  // ── Shared modal ───────────────────────────────────────────────────────
  const sharedModal = companyId.length > 0 && (
    <JobContractModal
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false);
        setCloneSource(null);
        setEditingContract(null);
      }}
      mode="contract"
      companyId={companyId[0]}
      editing={editingContract}
      cloneFrom={cloneSource}
    />
  );

  const openNew = () => {
    setEditingContract(null);
    setModalOpen(true);
  };

  const pickText = (v?: { en?: string | null; ar?: string | null } | null) =>
    (locale === 'ar' ? v?.ar || v?.en : v?.en || v?.ar) || '';
  const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

  // ── List View ──────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <PageShell
        title={t('sidebarTitle', 'jobContracts')}
        subtitle={t('pageMetaDescription', 'jobContracts')}
        actions={
          canWrite && (
            <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openNew}>
              {t('newContract', 'jobContracts')}
            </Button>
          )
        }
      >
        <PageMeta title={t('pageMetaTitle', 'jobContracts')} description={t('pageMetaDescription', 'jobContracts')} />

        <Card>
          <StatStrip
            stats={[
              { label: t('totalContracts', 'jobContracts'), value: getStatusCount('all') },
              { label: t('signed', 'jobContracts'), value: getStatusCount('signed'), tone: 'success' },
              { label: t('pending', 'jobContracts'), value: getStatusCount('draft') + getStatusCount('sent'), tone: 'info' },
              { label: t('rejected', 'jobContracts'), value: getStatusCount('rejected'), tone: 'danger' },
              { label: t('statusExpired', 'jobContracts'), value: getStatusCount('expired'), tone: 'warning' },
            ]}
          />
        </Card>

        <Card>
          <TabBar
            ariaLabel={t('summaryTitle', 'jobContracts')}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={STATUS_OPTIONS.map((opt) => ({
              value: opt.key,
              icon: <opt.icon className="size-4" />,
              label: (
                <>
                  {t(opt.label, 'jobContracts')}
                  <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {getStatusCount(opt.key)}
                  </span>
                </>
              ),
            }))}
          />
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SearchInput value={search} onChange={setSearch} placeholder={t('searchPlaceholder', 'jobContracts')} className="max-w-sm" />
          </div>

          {isLoading ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true">
              {[...Array(5)].map((_, i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-56 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                </li>
              ))}
            </ul>
          ) : isError && !contractsData ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : contracts.length === 0 ? (
            <EmptyState
              icon={<FileSignature className="size-6" />}
              title={t('emptyTitle', 'jobContracts')}
              text={search || statusFilter !== 'all' ? t('emptyDescFilter', 'jobContracts') : t('emptyDescCreate', 'jobContracts')}
              action={
                canWrite && !search && statusFilter === 'all' && (
                  <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openNew}>
                    {t('newContract', 'jobContracts')}
                  </Button>
                )
              }
            />
          ) : (
            <ul className={`divide-y divide-slate-100 transition-opacity dark:divide-slate-800 ${isFetching ? 'opacity-60' : ''}`}>
              {contracts.map((contract) => {
                const applicantName =
                  typeof contract.applicantId === 'object' && contract.applicantId !== null
                    ? contract.applicantId.fullName
                    : '—';
                return (
                  <li key={contract._id} className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleContractClick(contract._id)}
                        className={`block max-w-full truncate rounded text-start text-sm font-semibold text-slate-900 after:absolute after:inset-0 hover:text-brand-600 dark:text-white ${focusRing}`}
                      >
                        {applicantName}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{pickText(contract.position)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <Badge tone={CONTRACT_TYPE_TONE[contract.contractType] ?? 'slate'}>{t(contractTypeKey(contract.contractType), 'modals')}</Badge>
                        {contract.salary.basic != null && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <DollarSign className="size-3.5" />
                            {contract.salary.basic.toLocaleString()} {contract.salary.currency}
                          </span>
                        )}
                        {contract.startDate && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {new Date(contract.startDate).toLocaleDateString(dateLocale, { month: 'short', day: '2-digit', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{t(contractStatusKey(contract.status), 'jobContracts')}</Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(contract.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: '2-digit' })}
                      </span>
                    </div>
                    {canWrite && (
                      <div className="relative z-10 flex shrink-0">
                        <IconButton label={t('edit', 'jobContracts')} onClick={() => handleEdit(contract)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={t('clone', 'jobContracts')} onClick={() => handleClone(contract)}>
                          <Copy className="size-4" />
                        </IconButton>
                        <IconButton tone="danger" label={t('delete', 'jobContracts')} onClick={() => handleDelete(contract._id)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} totalCount={total} onChange={setPage} busy={isFetching} />
          )}
        </Card>

        {sharedModal}
      </PageShell>
    );
  }

  // ── Detail View ────────────────────────────────────────────────────────
  if (view === 'detail' && selectedContract) {
    return (
      <>
        <PageMeta title={t('pageMetaTitle', 'jobContracts')} description={t('pageMetaDescription', 'jobContracts')} />
        <ContractDetail
          contract={selectedContract}
          canWrite={canWrite}
          onBack={handleBackToList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClone={handleClone}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
        {sharedModal}
      </>
    );
  }

  // Fallback
  if (view === 'detail' && !selectedContract) {
    setView('list');
    setSelectedContractId(null);
    return null;
  }

  return null;
}
