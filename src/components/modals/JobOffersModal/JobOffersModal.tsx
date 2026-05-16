import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Briefcase,
  Clock,
  DollarSign,
  Percent,
  Plus,
  StickyNote,
  Hash,
  Mail,
  Send,
} from 'lucide-react';
import {
  CommissionType,
  JobOffer,
  OfferStatus,
  WorkType,
} from '../../../services/jobOffersService';
import {
  useBulkCreateJobOffers,
  useCreateJobOffer,
  useUpdateJobOffer,
} from '../../../hooks/queries/useJobOffers';
import Swal from '../../../utils/swal';
import { ApplicantSelect } from '../../form/ApplicantSelection';
import { TemplateSelector } from './TemplateSelector';
import { SectionBlock } from '../../form/SectionBlock';
import { CommissionRow } from './CommissionRow';
import {
  useJobOfferEmail,
  EmailSettingsPanel,
  type ApplicantObject,
} from './EmailModule';
import { SectionDivider } from '../../form/SectionDivider';
import { ModalLabel } from '../../form/ModalLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = 'template' | 'offer';

export type JobOfferModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  companyId: string | string[];
  company?: string;
  editing?: JobOffer | null;
  applicantId?: string | null;
  jobPositionId?: string | null;
  cloneFrom?: JobOffer | null;
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

export type FormCommission = {
  _id: string;
  label: string;
  value: number | '';
  type: CommissionType;
  condition: string;
};

export type FormState = {
  applicantId: string | null;
  selectedApplicantObject?: {
    _id: string;
    fullName: string;
    email: string;
    jobPositionId?: { _id: string; companyId: { _id: string } } | null;
  } | null;
  applicantIds?: string[];
  isBulk?: boolean;
  position: string;
  workType: WorkType;
  workHours: string;
  salaryBasic: number | '';
  salaryCurrency: string;
  commissions: FormCommission[];
  sections: FormSection[];
  notes: string;
  sendAsEmail: boolean;
  senderByCompany: Record<string, string>;
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
  applicantIds: [],
  isBulk: false,
  workType: 'full-time',
  workHours: '',
  salaryBasic: '',
  salaryCurrency: 'EGP',
  commissions: [],
  sections: [],
  notes: '',
  sendAsEmail: false,
  senderByCompany: {},
  selectedApplicantObject: null,
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
  sendAsEmail: false,
  senderByCompany: {},
  selectedApplicantObject: offer.applicantId,
});

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function JobOfferModal({
  isOpen,
  onClose,
  mode,
  company: propCompany,
  editing,
  applicantId,
  jobPositionId,
  cloneFrom,
  applicantObjects,
}: JobOfferModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useCreateJobOffer();
  const bulkMutation = useBulkCreateJobOffers();
  const updateMutation = useUpdateJobOffer();

  // ── Email ──────────────────────────────────────────────────────────────────
  const {
    sendersByCompany,
    groupedByCompany,
    sendSingleOfferEmail,
    sendBulkOfferEmail,
    isPending: isEmailPending,
  } = useJobOfferEmail({
    propCompany,
    form,
    setForm,
    applicantObjects,
    jobPositionId,
  });

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkMutation.isPending ||
    isEmailPending;

  // ── Template apply ─────────────────────────────────────────────────────────
  const applyTemplate = (template: JobOffer) => {
    setForm((prev) => ({
      ...offerToForm(template),
      applicantId: prev.applicantId,
      applicantIds: prev.applicantIds,
      selectedApplicantObject: prev.selectedApplicantObject,
      isBulk: prev.isBulk,
      sendAsEmail: prev.sendAsEmail,
      senderByCompany: prev.senderByCompany,
    }));
  };

  // ── Keyboard + scroll lock ─────────────────────────────────────────────────
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

  // ── Init form on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const ids = applicantObjects?.map((a) => a._id) ?? [];
      const bulk = ids.length > 0;

      if (editing) {
        setForm({ ...offerToForm(editing), senderByCompany: {} });
      } else if (cloneFrom) {
        setForm({
          ...offerToForm(cloneFrom),
          applicantId: null,
          applicantIds: [],
          isBulk: bulk,
          sendAsEmail: false,
          senderByCompany: {},
        });
      } else {
        setForm({ ...emptyForm(), applicantIds: ids, isBulk: bulk });
      }
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

  const duplicateCommission = (id: string) => {
    const target = form.commissions.find((c) => c._id === id);
    if (!target) return;
    const next = [...form.commissions];
    next.splice(next.findIndex((c) => c._id === id) + 1, 0, {
      ...target,
      _id: uid(),
    });
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
    const next = [...form.sections];
    next.splice(next.findIndex((s) => s._id === id) + 1, 0, clone);
    set('sections', next);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.position.trim()) {
      Swal.fire('Validation', 'Position title is required.', 'warning');
      return;
    }

    const willSendEmail = form.sendAsEmail && mode === 'offer';

    if (willSendEmail) {
      const missingSender = Object.keys(groupedByCompany).find(
        (cid) => !form.senderByCompany[cid]
      );
      if (missingSender) {
        Swal.fire(
          'Validation',
          'Please select a sender address for every company group before sending.',
          'warning'
        );
        return;
      }
    }

    const now = new Date();

    const base = {
      isTemplate: mode === 'template',
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
      ...(willSendEmail
        ? {
            status: 'sent' as OfferStatus,
            emailSent: true,
            sentAt: now,
            lastEmailSentAt: now,
          }
        : {}),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, payload: base });
        if (willSendEmail) await sendSingleOfferEmail();
      } else if (form.isBulk && form.applicantIds?.length) {
        await bulkMutation.mutateAsync({
          ...base,
          applicantIds: applicantObjects!.map(
            ({ _id, jobPositionId: cid }) => ({
              applicantId: _id!,
              companyId: cid?.companyId?._id!,
            })
          ),
        });
        if (willSendEmail) await sendBulkOfferEmail();
      } else {
        const singleApplicantId = applicantId ?? form.applicantId;
        await createMutation.mutateAsync({
          ...base,
          companyId:
            form.selectedApplicantObject?.jobPositionId?.companyId._id!,
          ...(mode === 'offer' && singleApplicantId
            ? { applicantId: singleApplicantId }
            : {}),
        });
        if (willSendEmail) await sendSingleOfferEmail();
      }
      onClose();
    } catch {
      // errors handled inside individual mutation hooks
    }
  };

  // ── Derived labels ─────────────────────────────────────────────────────────

  const isTemplate = mode === 'template';

  const title = editing
    ? isTemplate
      ? 'Edit Offer Template'
      : 'Edit Job Offer'
    : isTemplate
      ? 'New Offer Template'
      : 'New Job Offer';

  const submitLabel = editing
    ? form.sendAsEmail && mode === 'offer'
      ? 'Save & Resend'
      : 'Save Changes'
    : isTemplate
      ? 'Create Template'
      : form.sendAsEmail
        ? 'Create & Send'
        : 'Create Offer';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm h-screen"
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
          {/* ── Header ── */}
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
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {mode === 'offer' && <TemplateSelector onSelect={applyTemplate} />}

            {/* Applicant selector */}
            {mode === 'offer' && !applicantId && !editing && (
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

            {/* ── Core Info ── */}
            <SectionDivider
              icon={Briefcase}
              title="Core Information"
              description="Position title, type, and working hours"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <ModalLabel>Work Type</ModalLabel>
                <select
                  className={selectCls}
                  value={form.workType}
                  onChange={(e) => set('workType', e.target.value as WorkType)}
                >
                  {WORK_TYPES.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <ModalLabel>Work Hours</ModalLabel>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={form.workHours}
                    onChange={(e) => set('workHours', e.target.value)}
                    placeholder="e.g. 8 flexible hours"
                  />
                </div>
              </div>
            </div>

            {/* ── Salary ── */}
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
                    onChange={(e) =>
                      set(
                        'salaryBasic',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
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

            {/* ── Commissions ── */}
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
                  onDuplicate={() => duplicateCommission(c._id)}
                />
              ))}
              <button
                type="button"
                onClick={addCommission}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                Add Commission Tier
              </button>
            </div>

            {/* ── Offer Sections ── */}
            <SectionDivider
              icon={Hash}
              title="Offer Sections"
              description="Custom bilingual content blocks (benefits, terms, etc.)"
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

            {/* ── Internal Notes ── */}
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
            />

            {/* ── Email Settings ── */}
            {mode === 'offer' && form.sendAsEmail && (
              <EmailSettingsPanel
                form={form}
                isBulk={!!form.isBulk}
                sendersByCompany={sendersByCompany}
                groupedByCompany={groupedByCompany}
                onSenderChange={(senderByCompany) =>
                  set('senderByCompany', senderByCompany)
                }
              />
            )}

            <div className="h-2" />
          </div>

          {/* ── Footer ── */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
            {mode === 'offer' ? (
              <label className="flex cursor-pointer select-none items-center gap-2.5">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.sendAsEmail}
                    onChange={(e) => set('sendAsEmail', e.target.checked)}
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 dark:bg-slate-700 peer-checked:dark:bg-brand-500" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                </div>
                <Mail className="size-3.5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Send as email
                </span>
                {editing && (editing as any).lastEmailSentAt && (
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Last sent{' '}
                    {new Date(
                      (editing as any).lastEmailSentAt
                    ).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </label>
            ) : (
              <div />
            )}

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
                ) : form.sendAsEmail && mode === 'offer' ? (
                  <Send className="size-4" />
                ) : (
                  <FileText className="size-4" />
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
