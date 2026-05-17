import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSignature,
  Briefcase,
  Clock,
  DollarSign,
  Plus,
  StickyNote,
  Hash,
  Gift,
  Calendar,
} from 'lucide-react';
import { ContractType, JobContract } from '../../../services/contractsService';
import {
  useCreateJobContract,
  useUpdateJobContract,
  useBulkCreateJobContracts,
} from '../../../hooks/queries/useContracts';
import Swal from '../../../utils/swal';
import { ApplicantSelect } from '../../form/ApplicantSelection';
import { ContractTemplateSelector } from './ContractTemplateSelector';
import { ApplicantObject } from '../JobOffersModal/EmailModule';
import { SectionBlock } from '../../form/SectionBlock';
import { BenefitRow } from './BenefitRow';
import { SectionDivider } from '../../form/SectionDivider';
import { ModalLabel } from '../../form/ModalLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobContractModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'template' | 'contract';
  companyId?: string;
  editing?: JobContract | null;
  applicantId?: string | null;
  jobPositionId?: string | null;
  offerId?: string | null;
  cloneFrom?: JobContract | null;
  applicantObjects?: ApplicantObject[];
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

export type FormBenefit = {
  _id: string;
  labelEn: string;
  labelAr: string;
  value: string;
};

export type FormState = {
  applicantId: string | null;
  selectedApplicantObject?: ApplicantObject | null;
  applicantIds?: string[];
  isBulk?: boolean;
  contractType: ContractType;
  position: string;
  startDate: string;
  endDate: string;
  probationPeriod: number | '';
  salaryBasic: number | '';
  salaryCurrency: string;
  benefits: FormBenefit[];
  sections: FormSection[];
  notes: string;
  senderByCompany: Record<string, string>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'fixed-term', label: 'Fixed-term' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'probation', label: 'Probation' },
];

const CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

const toDateInput = (d?: string | Date | null): string => {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
};

const emptyForm = (): FormState => ({
  applicantId: null,
  applicantIds: [],
  isBulk: false,
  contractType: 'permanent',
  position: '',
  startDate: '',
  endDate: '',
  probationPeriod: '',
  salaryBasic: '',
  salaryCurrency: 'EGP',
  benefits: [],
  sections: [],
  notes: '',
  senderByCompany: {},
  selectedApplicantObject: null,
});

const contractToForm = (c: JobContract): FormState => ({
  applicantId: c.applicantId?._id || null,
  applicantIds: [],
  isBulk: false,
  contractType: c.contractType,
  position: c.position,
  startDate: toDateInput(c.startDate),
  endDate: toDateInput(c.endDate),
  probationPeriod: c.probationPeriod ?? '',
  salaryBasic: c.salary.basic ?? '',
  salaryCurrency: c.salary.currency ?? 'EGP',
  benefits: c.benefits.map((b) => ({
    _id: uid(),
    labelEn: b.label.en,
    labelAr: b.label.ar,
    value: b.value ?? '',
  })),
  sections: c.sections.map((s, idx) => ({
    _id: uid(),
    title: { en: s.title.en, ar: s.title.ar },
    items: s.items.map((i) => ({ _id: uid(), en: i.en, ar: i.ar })),
    displayOrder: idx,
  })),
  notes: c.notes ?? '',
  senderByCompany: {},
  selectedApplicantObject: c.applicantId,
});

// ─── Shared style constants ───────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function JobContractModal({
  isOpen,
  onClose,
  mode,
  companyId: propCompanyId,
  editing,
  applicantId: propApplicantId,
  jobPositionId,
  offerId,
  cloneFrom,
  applicantObjects,
}: JobContractModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateJobContract();
  const updateMutation = useUpdateJobContract();
  const bulkMutation = useBulkCreateJobContracts();

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkMutation.isPending;

  // Template apply
  const applyTemplate = (template: JobContract) => {
    setForm((prev) => ({
      ...contractToForm(template),
      applicantId: prev.applicantId,
      applicantIds: prev.applicantIds,
      selectedApplicantObject: prev.selectedApplicantObject,
      isBulk: prev.isBulk,
      senderByCompany: prev.senderByCompany,
    }));
  };

  // Keyboard + scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Init form on open
  useEffect(() => {
    if (isOpen) {
      const ids = applicantObjects?.map((a) => a._id) ?? [];
      const bulk =
        ids.length > 0 && mode === 'contract' && !editing && !cloneFrom;

      if (editing) {
        setForm({ ...contractToForm(editing), senderByCompany: {} });
      } else if (cloneFrom) {
        setForm({
          ...contractToForm(cloneFrom),
          applicantId: null,
          applicantIds: [],
          isBulk: bulk,
          senderByCompany: {},
          startDate: '',
          endDate: '',
        });
      } else {
        setForm({
          ...emptyForm(),
          applicantIds: ids,
          isBulk: bulk,
          ...(propApplicantId ? { applicantId: propApplicantId } : {}),
        });
      }
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen, editing, cloneFrom, applicantObjects, mode, propApplicantId]);

  if (!isOpen) return null;

  // Patch helpers
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const patchBenefit = (id: string, patch: Partial<FormBenefit>) =>
    set(
      'benefits',
      form.benefits.map((b) => (b._id === id ? { ...b, ...patch } : b))
    );

  const removeBenefit = (id: string) =>
    set(
      'benefits',
      form.benefits.filter((b) => b._id !== id)
    );

  const addBenefit = () =>
    set('benefits', [
      ...form.benefits,
      { _id: uid(), labelEn: '', labelAr: '', value: '' },
    ]);

  const duplicateBenefit = (id: string) => {
    const target = form.benefits.find((b) => b._id === id);
    if (!target) return;
    const next = [...form.benefits];
    next.splice(next.findIndex((b) => b._id === id) + 1, 0, {
      ...target,
      _id: uid(),
    });
    set('benefits', next);
  };

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

  const addSection = () =>
    set('sections', [
      ...form.sections,
      {
        _id: uid(),
        title: { en: '', ar: '' },
        items: [],
        displayOrder: form.sections.length,
      },
    ]);

  const duplicateSection = (id: string) => {
    const target = form.sections.find((s) => s._id === id);
    if (!target) return;
    const clone = {
      ...target,
      _id: uid(),
      items: target.items.map((i) => ({ ...i, _id: uid() })),
    };
    const next = [...form.sections];
    next.splice(next.findIndex((s) => s._id === id) + 1, 0, clone);
    set('sections', next);
  };

  // Submit
  const handleSubmit = async () => {
    if (!form.position.trim()) {
      Swal.fire('Validation', 'Position title is required.', 'warning');
      return;
    }
    const base = {
      isTemplate: mode === 'template',
      contractType: form.contractType,
      position: form.position.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      probationPeriod:
        form.probationPeriod === '' ? null : Number(form.probationPeriod),
      salary: {
        basic: form.salaryBasic === '' ? null : Number(form.salaryBasic),
        currency: form.salaryCurrency || 'EGP',
      },
      benefits: form.benefits.map(({ labelEn, labelAr, value }) => ({
        label: { en: labelEn, ar: labelAr },
        value: value.trim() || null,
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
        await updateMutation.mutateAsync({ id: editing._id, payload: base });
      } else if (form.isBulk && form.applicantIds?.length) {
        await bulkMutation.mutateAsync({
          ...base,
          applicantIds: applicantObjects!.map(
            ({ _id, jobPositionId: cid }) => ({
              applicantId: _id!,
              companyId: cid?.companyId?._id || propCompanyId!,
            })
          ),
        });
      } else {
        const singleApplicantId = propApplicantId ?? form.applicantId;
        await createMutation.mutateAsync({
          ...base,
          companyId:
            propCompanyId ||
            form.selectedApplicantObject?.jobPositionId?.companyId?._id!,
          ...(mode === 'contract' && singleApplicantId
            ? { applicantId: singleApplicantId }
            : {}),
          ...(mode === 'contract' && jobPositionId ? { jobPositionId } : {}),
          ...(mode === 'contract' && offerId ? { offerId } : {}),
        });
      }
      onClose();
    } catch {
      // errors handled inside individual mutation hooks
    }
  };

  const isTemplate = mode === 'template';

  const title = editing
    ? isTemplate
      ? 'Edit Contract Template'
      : 'Edit Job Contract'
    : isTemplate
      ? 'New Contract Template'
      : 'New Job Contract';

  const submitLabel = editing
    ? isTemplate
      ? 'Save Template'
      : 'Save Contract'
    : isTemplate
      ? 'Create Template'
      : 'Create Contract';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

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
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <FileSignature className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isTemplate
                    ? 'Templates can be reused when creating actual contracts'
                    : 'Fill in the details for this job contract'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {/* Template Selector */}
            {mode === 'contract' && (
              <ContractTemplateSelector onSelect={applyTemplate} />
            )}

            {/* Applicant selector */}
            {mode === 'contract' && !propApplicantId && !editing && (
              <div>
                <ModalLabel>
                  Applicant
                  {form.isBulk
                    ? `s (${form.applicantIds?.length} selected)`
                    : ''}
                </ModalLabel>
                {form.isBulk ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {form.applicantIds?.length} applicant(s) selected
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            isBulk: false,
                            applicantIds: [],
                          }))
                        }
                        className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Switch to single
                      </button>
                    </div>
                    <ul className="max-h-36 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/60">
                      {(applicantObjects ?? []).map((a) => (
                        <li
                          key={a._id}
                          className="flex items-center gap-2 px-3 py-2"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                            {a.fullName?.[0]?.toUpperCase() ?? '?'}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {a.fullName}
                          </span>
                          {a.email && (
                            <span className="ml-auto text-xs text-slate-400">
                              {a.email}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ApplicantSelect
                    value={form.applicantId}
                    onChange={(id, applicant) => {
                      set('applicantId', id);
                      set('selectedApplicantObject', applicant ?? null);
                    }}
                    inputCls={inputCls}
                  />
                )}
              </div>
            )}

            {/* Core Info */}
            <SectionDivider
              icon={Briefcase}
              title="Core Information"
              description="Position title and contract type"
            />

            <div>
              <ModalLabel required>Position Title</ModalLabel>
              <input
                ref={firstInputRef}
                className={inputCls}
                value={form.position}
                onChange={(e) => set('position', e.target.value)}
                placeholder="e.g. Senior Sales Representative"
              />
            </div>

            <div>
              <ModalLabel required>Contract Type</ModalLabel>
              <select
                className={selectCls}
                value={form.contractType}
                onChange={(e) =>
                  set('contractType', e.target.value as ContractType)
                }
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <SectionDivider
              icon={Calendar}
              title="Contract Dates"
              description="Start date, end date, and probation period"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <ModalLabel required={mode === 'contract' && !form.isBulk}>
                  Start Date
                </ModalLabel>
                <input
                  className={inputCls}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <div>
                <ModalLabel>End Date</ModalLabel>
                <input
                  className={inputCls}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  min={form.startDate || undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <ModalLabel>Probation Period</ModalLabel>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    type="number"
                    min={0}
                    value={form.probationPeriod}
                    onChange={(e) =>
                      set(
                        'probationPeriod',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="months"
                  />
                </div>
              </div>
              <div className="flex items-end">
                {form.probationPeriod !== '' &&
                  Number(form.probationPeriod) > 0 && (
                    <p className="mb-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {Number(form.probationPeriod)} month
                      {Number(form.probationPeriod) !== 1 ? 's' : ''} probation
                    </p>
                  )}
              </div>
            </div>

            {/* Salary */}
            <SectionDivider
              icon={DollarSign}
              title="Salary"
              description="Basic salary and currency"
            />

            <div className="grid grid-cols-[1fr_120px] gap-4">
              <div>
                <ModalLabel>Basic Salary</ModalLabel>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    type="number"
                    min={0}
                    value={form.salaryBasic}
                    onChange={(e) => {
                      const val =
                        e.target.value === '' ? '' : Number(e.target.value);
                      if (val !== '' && val < 0) return;
                      set('salaryBasic', val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') e.preventDefault();
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <ModalLabel>Currency</ModalLabel>
                <select
                  className={selectCls}
                  value={form.salaryCurrency}
                  onChange={(e) => set('salaryCurrency', e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Benefits */}
            <SectionDivider
              icon={Gift}
              title="Benefits"
              description="Health insurance, vacation days, and other perks"
            />

            <div className="space-y-3">
              {form.benefits.map((b, idx) => (
                <BenefitRow
                  key={b._id}
                  benefit={b}
                  index={idx}
                  onChange={(patch) => patchBenefit(b._id, patch)}
                  onRemove={() => removeBenefit(b._id)}
                  onDuplicate={() => duplicateBenefit(b._id)}
                />
              ))}
              <button
                type="button"
                onClick={addBenefit}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                Add Benefit
              </button>
            </div>

            {/* Contract Sections */}
            <SectionDivider
              icon={Hash}
              title="Contract Sections"
              description="Custom bilingual content blocks (terms, responsibilities, etc.)"
            />

            <div className="space-y-3">
              {form.sections.map((s, idx) => (
                <SectionBlock
                  key={s._id}
                  section={s}
                  index={idx}
                  onChange={(patch) => patchSection(s._id, patch)}
                  onRemove={() => removeSection(s._id)}
                  onDuplicate={() => duplicateSection(s._id)}
                />
              ))}
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                Add Section
              </button>
            </div>

            {/* Internal Notes */}
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
              placeholder="Any internal notes or context for this contract..."
            />
            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <FileSignature className="size-4" />
                )}
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
