import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Briefcase,
  Clock,
  DollarSign,
  Percent,
  Plus,
  Globe,
  Languages,
  StickyNote,
  Hash,
} from 'lucide-react';
import {
  CommissionType,
  JobOffer,
  WorkType,
} from '../../../services/jobOffersService';
import {
  useCreateJobOffer,
  useUpdateJobOffer,
} from '../../../hooks/queries/useJobOffers';
import Swal from '../../../utils/swal';
import { ApplicantSelect } from './ApplicantSelection';
import { TemplateSelector } from './TemplateSelector';
import { SectionBlock } from './SectionBlock';
import { CommissionRow } from './CommissionRow';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = 'template' | 'offer';

export type JobOfferModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  companyId: string;
  editing?: JobOffer | null;
  /** Pre-selected applicant — for 'offer' mode */
  applicantId?: string | null;
  /** Pre-selected job position — for 'offer' mode */
  jobPositionId?: string | null;
  cloneFrom?: JobOffer | null;
};

export type FormSectionItem = {
  _id: string;
  en: string;
  ar: string;
};

export type FormSection = {
  _id: string;
  title: { en: string; ar: string };
  items: FormSectionItem[];
  displayOrder: number;
};

export type FormCommission = {
  _id: string;
  label: string;
  value: number | '';
  type: CommissionType;
  condition: string;
};

export type FormState = {
  applicantId: string | null; // add this
  position: string;
  workType: WorkType;
  workHours: string;
  salaryBasic: number | '';
  salaryCurrency: string;
  commissions: FormCommission[];
  sections: FormSection[];
  notes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

const emptyForm = (): FormState => ({
  applicantId: null,
  position: '',
  workType: 'full-time',
  workHours: '',
  salaryBasic: '',
  salaryCurrency: 'EGP',
  commissions: [],
  sections: [],
  notes: '',
});

const offerToForm = (offer: JobOffer): FormState => ({
  applicantId: offer.applicantId?._id || null,
  position: offer.position,
  workType: offer.workType,
  workHours: offer.workHours ?? '',
  salaryBasic: offer.salary.basic ?? '',
  salaryCurrency: offer.salary.currency ?? 'EGP',
  commissions: offer.commissions.map((c) => ({
    _id: uid(),
    label: c.label,
    value: c.value,
    type: c.type,
    condition: c.condition ?? '',
  })),
  sections: offer.sections.map((s, idx) => ({
    _id: uid(),
    title: { en: s.title.en, ar: s.title.ar },
    items: s.items.map((i) => ({ _id: uid(), en: i.en, ar: i.ar })),
    displayOrder: idx,
  })),
  notes: offer.notes ?? '',
});

// ─── Small reusable atoms ─────────────────────────────────────────────────────

function SectionDivider({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-2 pt-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <Icon className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function JobOfferModal({
  isOpen,
  onClose,
  mode,
  companyId,
  editing,
  applicantId,
  jobPositionId,
  cloneFrom,
}: JobOfferModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeLang, setActiveLang] = useState<'en' | 'ar'>('en');
  const firstInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateJobOffer();
  const updateMutation = useUpdateJobOffer();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const applyTemplate = (template: JobOffer) => {
    setForm((prev) => ({
      ...offerToForm(template),
      applicantId: prev.applicantId, // keep whatever applicant was already selected
    }));
  };

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setForm(offerToForm(editing));
      } else if (cloneFrom) {
        setForm({ ...offerToForm(cloneFrom), applicantId: null });
      } else {
        setForm(emptyForm());
      }
      setActiveLang('en');
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen, editing, cloneFrom]);

  if (!isOpen) return null;

  // ── Patch helpers ──────────────────────────────────────────────────────────

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const patchCommission = (id: string, patch: Partial<FormCommission>) =>
    set(
      'commissions',
      form.commissions.map((c) => (c._id === id ? { ...c, ...patch } : c))
    );

  const removeCommission = (id: string) =>
    set(
      'commissions',
      form.commissions.filter((c) => c._id !== id)
    );

  const addCommission = () =>
    set('commissions', [
      ...form.commissions,
      { _id: uid(), label: '', value: '', type: 'fixed', condition: '' },
    ]);

  const patchSection = (id: string, patch: Partial<FormSection>) =>
    set(
      'sections',
      form.sections.map((s) => (s._id === id ? { ...s, ...patch } : s))
    );

  const removeSection = (id: string) =>
    set(
      'sections',
      form.sections.filter((s) => s._id !== id)
    );

  const addSection = () => {
    const newSection: FormSection = {
      _id: uid(),
      title: { en: '', ar: '' },
      items: [],
      displayOrder: form.sections.length,
    };
    set('sections', [...form.sections, newSection]);
  };

  const duplicateCommission = (id: string) => {
    const target = form.commissions.find((c) => c._id === id);
    if (!target) return;
    const clone = { ...target, _id: uid() };
    const idx = form.commissions.findIndex((c) => c._id === id);
    const next = [...form.commissions];
    next.splice(idx + 1, 0, clone);
    set('commissions', next);
  };

  const duplicateSection = (id: string) => {
    const target = form.sections.find((s) => s._id === id);
    if (!target) return;
    const clone = {
      ...target,
      _id: uid(),
      items: target.items.map((i) => ({ ...i, _id: uid() })),
    };
    const idx = form.sections.findIndex((s) => s._id === id);
    const next = [...form.sections];
    next.splice(idx + 1, 0, clone);
    set('sections', next);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.position.trim()) {
      Swal.fire('Validation', 'Position title is required.', 'warning');
      firstInputRef.current?.focus();
      return;
    }

    const payload = {
      companyId,
      isTemplate: mode === 'template',
      ...(mode === 'offer' && (applicantId ?? form.applicantId)
        ? { applicantId: applicantId ?? form.applicantId }
        : {}),
      ...(mode === 'offer' && jobPositionId ? { jobPositionId } : {}),
      position: form.position.trim(),
      workType: form.workType,
      workHours: form.workHours.trim() || null,
      salary: {
        basic: form.salaryBasic === '' ? null : Number(form.salaryBasic),
        currency: form.salaryCurrency || 'EGP',
      },
      commissions: form.commissions.map(({ _id, ...c }) => ({
        label: c.label,
        value: Number(c.value) || 0,
        type: c.type,
        condition: c.condition.trim() || null,
      })),
      sections: form.sections.map(({ _id, items, ...s }, idx) => ({
        title: s.title,
        displayOrder: idx,
        items: items.map(({ _id: _i, ...item }) => item),
      })),
      notes: form.notes.trim() || null,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // errors handled inside mutation hooks via Swal
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isTemplate = mode === 'template';
  const title = editing
    ? isTemplate
      ? 'Edit Offer Template'
      : 'Edit Job Offer'
    : isTemplate
      ? 'New Offer Template'
      : 'New Job Offer';

  const submitLabel = editing
    ? 'Save Changes'
    : isTemplate
      ? 'Create Template'
      : 'Create Offer';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={onClose}
        className="fixed inset-0 z-60 flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* ── Modal Header ── */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isTemplate
                    ? 'Templates can be reused when creating actual offers'
                    : 'Fill in the details for this job offer'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              tabIndex={0}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {mode === 'offer' && (
              <TemplateSelector
                companyId={companyId}
                onSelect={applyTemplate}
              />
            )}
            {mode === 'offer' && !applicantId && (
              <div>
                <Label>Applicant</Label>
                <ApplicantSelect
                  value={form.applicantId}
                  onChange={(id) => set('applicantId', id)}
                  companyId={companyId}
                  inputCls={inputCls}
                />
              </div>
            )}
            {/* ── SECTION: Core Info ── */}
            <SectionDivider
              icon={Briefcase}
              title="Core Information"
              description="Position title, type, and working hours"
            />

            {/* Position */}
            <div>
              <Label required>Position Title</Label>
              <input
                ref={firstInputRef}
                className={inputCls}
                value={form.position}
                onChange={(e) => set('position', e.target.value)}
                placeholder="e.g. Senior Sales Representative"
                tabIndex={0}
              />
            </div>

            {/* Work type + Work hours side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work Type</Label>
                <select
                  className={selectCls}
                  value={form.workType}
                  onChange={(e) => set('workType', e.target.value as WorkType)}
                  tabIndex={0}
                >
                  {WORK_TYPES.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Work Hours</Label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={form.workHours}
                    onChange={(e) => set('workHours', e.target.value)}
                    placeholder="e.g. 8 flexible hours"
                    tabIndex={0}
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION: Salary ── */}
            <SectionDivider
              icon={DollarSign}
              title="Salary"
              description="Basic salary and currency"
            />

            <div className="grid grid-cols-[1fr_120px] gap-4">
              <div>
                <Label>Basic Salary</Label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    type="number"
                    min={0}
                    value={form.salaryBasic}
                    onChange={(e) =>
                      set(
                        'salaryBasic',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="0"
                    tabIndex={0}
                  />
                </div>
              </div>
              <div>
                <Label>Currency</Label>
                <select
                  className={selectCls}
                  value={form.salaryCurrency}
                  onChange={(e) => set('salaryCurrency', e.target.value)}
                  tabIndex={0}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── SECTION: Commissions ── */}
            <SectionDivider
              icon={Percent}
              title="Commission Tiers"
              description="Structured commission rules for this offer"
            />

            <div className="space-y-3">
              {form.commissions.map((c, idx) => (
                <CommissionRow
                  key={c._id}
                  comm={c}
                  index={idx}
                  onChange={(patch) => patchCommission(c._id, patch)}
                  onRemove={() => removeCommission(c._id)}
                  onDuplicate={() => duplicateCommission(c._id)} // ← add
                />
              ))}

              <button
                type="button"
                onClick={addCommission}
                tabIndex={0}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                Add Commission Tier
              </button>
            </div>

            {/* ── SECTION: Sections ── */}
            <SectionDivider
              icon={Hash}
              title="Offer Sections"
              description="Custom bilingual content blocks (benefits, terms, etc.)"
            />

            {/* Global lang toggle — only relevant for items column hint */}
            {form.sections.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Preview language:
                </span>
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['en', 'ar'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      tabIndex={0}
                      onClick={() => setActiveLang(lang)}
                      className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold transition ${
                        activeLang === lang
                          ? 'bg-brand-500 text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'en' ? (
                        <Globe className="size-3" />
                      ) : (
                        <Languages className="size-3" />
                      )}
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {form.sections.map((s, idx) => (
                <SectionBlock
                  key={s._id}
                  section={s}
                  index={idx}
                  activeLang={activeLang}
                  onChange={(patch) => patchSection(s._id, patch)}
                  onRemove={() => removeSection(s._id)}
                  onDuplicate={() => duplicateSection(s._id)} // ← add
                  inputCls={inputCls}
                />
              ))}

              <button
                type="button"
                onClick={addSection}
                tabIndex={0}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                Add Section
              </button>
            </div>

            {/* ── SECTION: Notes ── */}
            <SectionDivider
              icon={StickyNote}
              title="Internal Notes"
              description="Only visible to your team"
            />

            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any internal notes or context for this offer..."
              tabIndex={0}
            />

            {/* Bottom padding so last field isn't hidden behind footer */}
            <div className="h-2" />
          </div>

          {/* ── Modal Footer ── */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
            <button
              type="button"
              onClick={onClose}
              tabIndex={0}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              tabIndex={0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <FileText className="size-4" />
              )}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
