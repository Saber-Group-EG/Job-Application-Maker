import { useMemo, useState } from 'react';
import {
  FileSignature,
  PlusCircle,
  Copy,
  Trash2,
  Pencil,
  DollarSign,
  Calendar,
  Gift,
  FileText,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import { useAuth } from '../../../context/AuthContext';
import {
  useJobContractTemplates,
  useCloneJobContract,
  useDeleteJobContract,
} from '../../../hooks/queries/useContracts';
import type {
  JobContract,
  ContractType,
} from '../../../services/contractsService';
import JobContractModal from '../../../components/modals/ContractModal/ContractModal';
import SectionTemplatesPanel from '../../../components/settings/SectionTemplatesPanel';
import {
  useCompanies,
  useUpdateContractSectionTemplates,
} from '../../../hooks/queries/useCompanies';
import type { SectionTemplate } from '../../../types/companies';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'fixed-term', label: 'Fixed-term' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'probation', label: 'Probation' },
];

const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
  permanent:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'fixed-term':
    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  freelance:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  probation:
    'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string;
  embedded?: boolean;
  hideCompanySelector?: boolean;
};

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  contract,
  canEdit,
  onEdit,
  onClone,
  onDelete,
}: {
  contract: JobContract;
  canEdit: boolean;
  onEdit: (c: JobContract) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {contract.position?.en || contract.position?.ar || 'Untitled Contract'}
          </p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONTRACT_TYPE_COLORS[contract.contractType]}`}
          >
            {CONTRACT_TYPES.find((c) => c.value === contract.contractType)
              ?.label ?? contract.contractType}
          </span>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
            <button
              type="button"
              title="Edit"
              onClick={() => onEdit(contract)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              title="Clone"
              onClick={() => onClone(contract._id)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => onDelete(contract._id)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {contract.salary.basic != null && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <DollarSign className="size-3.5 shrink-0" />
            <span>
              {contract.salary.basic.toLocaleString()}{' '}
              {contract.salary.currency}
            </span>
          </div>
        )}
        {contract.probationPeriod != null && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="size-3.5 shrink-0" />
            <span>{contract.probationPeriod}mo probation</span>
          </div>
        )}
        {contract.benefits.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Gift className="size-3.5 shrink-0" />
            <span>
              {contract.benefits.length} benefit
              {contract.benefits.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {contract.sections.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="size-3.5 shrink-0" />
            <span>
              {contract.sections.length} section
              {contract.sections.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractTemplatesTab({
  companyId,
  embedded = true,
}: Props) {
  const { hasPermission } = useAuth();
  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

  const { data: templatesData, isLoading } = useJobContractTemplates([
    companyId,
  ]);
  const templates = templatesData?.data ?? [];

  // in OfferTemplatesTab
  const { data: companies = [] } = useCompanies();

  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === companyId),
    [companies, companyId]
  );

  const settingsId = selectedCompany?.settings?._id ?? '';
  const contractSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.contractSectionTemplates ?? [];
  const offerSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.offerSectionTemplates ?? [];

  const cloneMutation = useCloneJobContract();
  const deleteMutation = useDeleteJobContract();
  const updateContractSections = useUpdateContractSectionTemplates();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<JobContract | null>(
    null
  );

  const openCreate = () => {
    setEditingContract(null);
    setDrawerOpen(true);
  };
  const openEdit = (contract: JobContract) => {
    setEditingContract(contract);
    setDrawerOpen(true);
  };
  const handleClone = async (id: string) => {
    await cloneMutation.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Template?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) await deleteMutation.mutateAsync(id);
  };

  const handleSaveSections = async (updated: SectionTemplate[]) => {
    await updateContractSections.mutateAsync({
      settingsId,
      templates: updated,
    });
  };

  const withBenefits = templates.filter((t) => t.benefits.length > 0).length;
  const withSections = templates.filter((t) => t.sections.length > 0).length;

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 p-6'}>
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <FileSignature className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Contract Templates
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Reusable contract structures with sections, benefits, and salary
                presets.
              </p>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <PlusCircle className="size-4" /> New Template
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 sm:grid-cols-3">
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total Templates
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {templates.length}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              With Benefits
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {withBenefits}
            </p>
          </div>
          <div className="hidden px-6 py-4 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              With Sections
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {withSections}
            </p>
          </div>
        </div>
      </div>

      {/* ── Templates grid ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <FileSignature className="mb-3 size-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No contract templates yet
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Create a template to reuse across multiple job contracts
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <PlusCircle className="size-4" /> Create First Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((contract) => (
            <TemplateCard
              key={contract._id}
              contract={contract}
              canEdit={canEdit}
              onEdit={openEdit}
              onClone={handleClone}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Section Templates Panel ──────────────────────────────────────────── */}
      <SectionTemplatesPanel
        type="contract"
        settingsId={settingsId}
        templates={contractSectionTemplates}
        crossTemplates={offerSectionTemplates}
        canEdit={canEdit}
        onSave={handleSaveSections}
        isSaving={updateContractSections.isPending}
      />

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      {companyId && (
        <JobContractModal
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="template"
          companyId={companyId}
          editing={editingContract}
        />
      )}
    </div>
  );
}
