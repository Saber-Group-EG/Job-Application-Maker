import { useState } from 'react';
import {
  FileText,
  PlusCircle,
  Copy,
  Trash2,
  Pencil,
  DollarSign,
  Clock,
  Hash,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import { useAuth } from '../../../context/AuthContext';
import {
  useJobOfferTemplates,
  useCloneJobOffer,
  useDeleteJobOffer,
} from '../../../hooks/queries/useJobOffers';
import type { JobOffer, WorkType } from '../../../services/jobOffersService';
import JobOfferModal from '../../../components/modals/JobOffersModal/JobOffersModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const WORK_TYPE_COLORS: Record<WorkType, string> = {
  'full-time':
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'part-time':
    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  contract:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  internship:
    'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string;
  embedded?: boolean;
};

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  offer,
  canEdit,
  onEdit,
  onClone,
  onDelete,
}: {
  offer: JobOffer;
  canEdit: boolean;
  onEdit: (o: JobOffer) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {offer.position}
          </p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${WORK_TYPE_COLORS[offer.workType]}`}
          >
            {WORK_TYPES.find((w) => w.value === offer.workType)?.label ??
              offer.workType}
          </span>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              title="Edit"
              onClick={() => onEdit(offer)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              title="Clone"
              onClick={() => onClone(offer._id)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => onDelete(offer._id)}
              className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {offer.salary.basic != null && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <DollarSign className="size-3.5 shrink-0" />
            <span>
              {offer.salary.basic.toLocaleString()} {offer.salary.currency}
            </span>
          </div>
        )}
        {offer.workHours && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5 shrink-0" />
            <span>{offer.workHours}</span>
          </div>
        )}
        {offer.commissions.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Hash className="size-3.5 shrink-0" />
            <span>
              {offer.commissions.length} commission tier
              {offer.commissions.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {offer.sections.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="size-3.5 shrink-0" />
            <span>
              {offer.sections.length} section
              {offer.sections.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OfferTemplatesTab({
  companyId,
  embedded = true,
}: Props) {
  const { hasPermission } = useAuth();
  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

    const { data: templatesData, isLoading } = useJobOfferTemplates([companyId]);
    const templates = templatesData?.data ?? [];
  const cloneMutation = useCloneJobOffer();
  const deleteMutation = useDeleteJobOffer();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);

  const openCreate = () => {
    setEditingOffer(null);
    setDrawerOpen(true);
  };

  const openEdit = (offer: JobOffer) => {
    setEditingOffer(offer);
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
    if (result.isConfirmed) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 p-6'}>
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Offer Templates
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Reusable offer structures with sections, commissions, and salary
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

        {/* Stats strip */}
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
              With Commissions
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {templates.filter((t) => t.commissions.length > 0).length}
            </p>
          </div>
          <div className="hidden px-6 py-4 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              With Sections
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {templates.filter((t) => t.sections.length > 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
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
          <FileText className="mb-3 size-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No offer templates yet
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Create a template to reuse across multiple job offers
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
          {templates.map((offer) => (
            <TemplateCard
              key={offer._id}
              offer={offer}
              canEdit={canEdit}
              onEdit={openEdit}
              onClone={handleClone}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      {companyId && (
        <JobOfferModal
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="template"
          companyId={companyId}
          editing={editingOffer}
        />
      )}
    </div>
  );
}
