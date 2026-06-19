import { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronDown,
  Layers,
  GripVertical,
  Languages,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
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
import {
  BulkOverrideMap,
  BulkSalaryReview,
  resolveApplicantSalary,
  resolveApplicantPosition,
  seedBulkOverrideMap,
} from './BulkSalaryReview';
import SectionTemplatePicker from '../../form/SectionTemplatePicker';
import { translateText } from '../../../utils/translate';

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

  label: {
    en: string;
    ar: string;
  };

  value: number | '';

  type: CommissionType;

  condition: {
    en: string;
    ar: string;
  };
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
  position: {
    en: string;
    ar: string;
  };

  notes: {
    en: string;
    ar: string;
  };
  workType: WorkType;
  workHours: {
    en: string;
    ar: string;
  };
  salaryBasic: number | '';
  salaryCurrency: string;
  commissions: FormCommission[];
  sections: FormSection[];
  sendAsEmail: boolean;
  senderByCompany: Record<string, string>;
  emailLang: 'en' | 'ar';
  bulkOverrideMap: BulkOverrideMap;
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
  position: {
    en: '',
    ar: '',
  },
  applicantIds: [],
  isBulk: false,
  workType: 'full-time',
  workHours: {
    en: '',
    ar: '',
  },
  salaryBasic: '',
  salaryCurrency: 'EGP',
  commissions: [],
  sections: [],
  notes: {
    en: '',
    ar: '',
  },
  sendAsEmail: false,
  senderByCompany: {},
  selectedApplicantObject: null,
  emailLang: 'en',
  bulkOverrideMap: {},
});

const offerToForm = (offer: JobOffer): FormState => ({
  applicantId: offer.applicantId?._id || null,
  position: {
    en: offer.position?.en ?? '',
    ar: offer.position?.ar ?? '',
  },
  workType: offer.workType,
  workHours: {
    en: offer.workHours?.en ?? '',
    ar: offer.workHours?.ar ?? '',
  },
  salaryBasic: offer.salary.basic ?? '',
  salaryCurrency: offer.salary.currency ?? 'EGP',
  commissions: offer.commissions.map((c) => ({
    _id: uid(),
    label: {
      en: c.label.en ?? '',
      ar: c.label.ar ?? '',
    },
    value: c.value,
    type: c.type,
    condition: {
      en: c.condition?.en ?? '',
      ar: c.condition?.ar ?? '',
    },
  })),
  sections: offer.sections.map((s, idx) => ({
    _id: uid(),
    title: { en: s.title.en, ar: s.title.ar },
    items: s.items.map((i) => ({ _id: uid(), en: i.en, ar: i.ar })),
    displayOrder: idx,
  })),
  notes: offer.notes
    ? { en: offer.notes.en ?? '', ar: offer.notes.ar ?? '' }
    : { en: '', ar: '' },
  sendAsEmail: false,
  senderByCompany: {},
  selectedApplicantObject: offer.applicantId,
  emailLang: 'en',
  bulkOverrideMap: {},
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showSalaryReview, setShowSalaryReview] = useState(false);
  const [activeCommissionId, setActiveCommissionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.4' } },
    }),
    duration: 200,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  };
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

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleCommissionDragStart = useCallback((event: DragStartEvent) => {
    setActiveCommissionId(event.active.id as string);
  }, []);

  const handleCommissionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCommissionId(null);
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.commissions.findIndex((c) => c._id === active.id);
        const newIndex = prev.commissions.findIndex((c) => c._id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return { ...prev, commissions: arrayMove(prev.commissions, oldIndex, newIndex) };
        }
        return prev;
      });
    }
  }, []);

  const handleCommissionDragCancel = useCallback(() => {
    setActiveCommissionId(null);
  }, []);

  const handleSectionDragStart = useCallback((event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string);
  }, []);

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSectionId(null);
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s._id === active.id);
        const newIndex = prev.sections.findIndex((s) => s._id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) };
        }
        return prev;
      });
    }
  }, []);

  const handleSectionDragCancel = useCallback(() => {
    setActiveSectionId(null);
  }, []);

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
        setForm({
          ...emptyForm(),
          applicantIds: ids,
          isBulk: bulk,
          bulkOverrideMap: bulk
            ? seedBulkOverrideMap(applicantObjects ?? [])
            : {},
        });
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
      {
        _id: uid(),
        label: { en: '', ar: '' },
        value: '',
        type: 'fixed',
        condition: { en: '', ar: '' },
      },
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

  const handlePrefillFromApplicant = (applicant: ApplicantObject) => {
    setForm((prev) => ({
      ...prev,
      position: {
        en: applicant.jobPositionId?.title?.en ?? prev.position.en,
        ar: applicant.jobPositionId?.title?.ar ?? prev.position.ar,
      },
      salaryBasic: applicant.expectedSalary
        ? Number(applicant.expectedSalary)
        : prev.salaryBasic,
    }));
  };

  // ── Translate All ──────────────────────────────────────────────────────────

  const translateAll = async () => {
    setTranslatingAll(true);
    try {
      const smartTranslate = (en: string, ar: string) =>
        en.trim()
          ? translateText(en, 'en', 'ar').then((t) => ({ target: 'ar' as const, text: t }))
          : ar.trim()
            ? translateText(ar, 'ar', 'en').then((t) => ({ target: 'en' as const, text: t }))
            : Promise.resolve(null);

      const pos = await smartTranslate(form.position.en, form.position.ar);
      const wh = await smartTranslate(form.workHours.en, form.workHours.ar);
      const nt = await smartTranslate(form.notes.en, form.notes.ar);

      const sectionResults = await Promise.all(
        form.sections.map(async (s) => {
          const title = await smartTranslate(s.title.en, s.title.ar);
          const items = await Promise.all(
            s.items.map(async (item) => {
              const r = await smartTranslate(item.en, item.ar);
              return r ? { _id: item._id, target: r.target, text: r.text } : null;
            })
          );
          return { _id: s._id, title, items: items.filter(Boolean) as { _id: string; target: 'en' | 'ar'; text: string }[] };
        })
      );

      const commissionResults = await Promise.all(
        form.commissions.map(async (c) => {
          const label = await smartTranslate(c.label.en, c.label.ar);
          const condition = await smartTranslate(c.condition.en, c.condition.ar);
          return { _id: c._id, label, condition };
        })
      );

      setForm((prev) => ({
        ...prev,
        position: pos && pos.target === 'ar' ? { ...prev.position, ar: pos.text } : pos && pos.target === 'en' ? { ...prev.position, en: pos.text } : prev.position,
        workHours: wh && wh.target === 'ar' ? { ...prev.workHours, ar: wh.text } : wh && wh.target === 'en' ? { ...prev.workHours, en: wh.text } : prev.workHours,
        notes: nt && nt.target === 'ar' ? { ...prev.notes, ar: nt.text } : nt && nt.target === 'en' ? { ...prev.notes, en: nt.text } : prev.notes,
        sections: prev.sections.map((s) => {
          const r = sectionResults.find((x) => x._id === s._id);
          if (!r) return s;
          return {
            ...s,
            title: r.title?.target === 'ar' ? { ...s.title, ar: r.title.text } : r.title?.target === 'en' ? { ...s.title, en: r.title.text } : s.title,
            items: s.items.map((item) => {
              const ri = r.items.find((x) => x._id === item._id);
              if (!ri) return item;
              return ri.target === 'ar' ? { ...item, ar: ri.text } : { ...item, en: ri.text };
            }),
          };
        }),
        commissions: prev.commissions.map((c) => {
          const r = commissionResults.find((x) => x._id === c._id);
          if (!r) return c;
          return {
            ...c,
            label: r.label?.target === 'ar' ? { ...c.label, ar: r.label.text } : r.label?.target === 'en' ? { ...c.label, en: r.label.text } : c.label,
            condition: r.condition?.target === 'ar' ? { ...c.condition, ar: r.condition.text } : r.condition?.target === 'en' ? { ...c.condition, en: r.condition.text } : c.condition,
          };
        }),
      }));
    } finally {
      setTranslatingAll(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.isBulk && !form.position.en.trim() && !form.position.ar.trim()) {
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
      position: {
        en: form.position.en.trim(),
        ar: form.position.ar.trim(),
      },
      workType: form.workType,
      workHours: {
        en: form.workHours.en.trim() ?? '',
        ar: form.workHours.ar.trim() ?? '',
      },
      salary: {
        basic: form.salaryBasic === '' ? null : Number(form.salaryBasic),
        currency: form.salaryCurrency || 'EGP',
      },
      commissions: form.commissions.map(({ _id, ...c }) => {
        const conditionEn = c.condition.en.trim();
        const conditionAr = c.condition.ar.trim();

        return {
          label: {
            en: c.label.en.trim(),
            ar: c.label.ar.trim(),
          },

          value: Number(c.value) || 0,

          type: c.type,

          condition:
            !conditionEn && !conditionAr
              ? null
              : {
                  en: conditionEn,
                  ar: conditionAr,
                },
        };
      }),
      sections: form.sections.map(({ _id, items, ...s }, idx) => ({
        title: s.title,
        displayOrder: idx,
        items: items.map(({ _id: _i, ...item }) => item),
      })),
      notes: {
        en: form.notes.en.trim(),
        ar: form.notes.ar.trim(),
      },
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
          // In handleSubmit, change the applicantIds map:
          applicantIds: applicantObjects!.map((a) => {
            const override = form.bulkOverrideMap[a._id];
            const resolvedSalary = override
              ? resolveApplicantSalary(a, override)
              : null;
            // fall back to form salary if source is 'form' or unresolved
            const finalSalary =
              resolvedSalary != null
                ? resolvedSalary
                : form.salaryBasic !== ''
                  ? Number(form.salaryBasic)
                  : null;
            const resolvedPosition = override
              ? resolveApplicantPosition(a, override, form.position)
              : form.position;
            return {
              applicantId: a._id!,
              companyId: a.jobPositionId?.companyId?._id!,
              salary: {
                basic: finalSalary,
                currency: form.salaryCurrency || 'EGP',
              },
              ...(resolvedPosition.en || resolvedPosition.ar
                ? { position: resolvedPosition }
                : {}),
            };
          }),
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={translateAll}
                disabled={translatingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                title="Translate all EN fields to AR"
              >
                {translatingAll ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
                ) : (
                  <Languages className="size-3.5" />
                )}
                Translate All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>
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
                    {/* Header */}
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

                    {/* Applicant list */}
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

                    {/* Salary review toggle */}
                    <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setShowSalaryReview((v) => !v)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      >
                        <span>Configure individual salaries</span>
                        <ChevronDown
                          className={`size-3.5 transition-transform ${showSalaryReview ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Review panel */}
                    {showSalaryReview && (
                      <div className="border-t border-slate-200 p-3 dark:border-slate-700 max-h-96 overflow-y-auto">
                        <BulkSalaryReview
                          applicants={applicantObjects ?? []}
                          overrideMap={form.bulkOverrideMap}
                          currency={form.salaryCurrency}
                          formPosition={form.position}
                          onChange={(map) => set('bulkOverrideMap', map)}
                          formSalary={form.salaryBasic}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <ApplicantSelect
                    value={form.applicantId}
                    onChange={(id, applicant) => {
                      set('applicantId', id);
                      set('selectedApplicantObject', applicant ?? null);
                    }}
                    onPrefill={handlePrefillFromApplicant}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <ModalLabel required>Position Title (EN)</ModalLabel>

                <input
                  ref={firstInputRef}
                  className={inputCls}
                  value={form.position.en}
                  onChange={(e) =>
                    set('position', {
                      ...form.position,
                      en: e.target.value,
                    })
                  }
                  placeholder="e.g. Senior Sales Representative"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <ModalLabel required>Position Title (AR)</ModalLabel>
                  <button
                    type="button"
                    onClick={async () => {
                      if (form.position.en.trim()) {
                        const t = await translateText(form.position.en, 'en', 'ar');
                        if (t) set('position', { ...form.position, ar: t });
                      } else if (form.position.ar.trim()) {
                        const t = await translateText(form.position.ar, 'ar', 'en');
                        if (t) set('position', { ...form.position, en: t });
                      }
                    }}
                    disabled={!form.position.en.trim() && !form.position.ar.trim()}
                    className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                    title={form.position.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
                  >
                    <Languages className="size-3" />
                  </button>
                </div>

                <input
                  className={inputCls}
                  dir="rtl"
                  value={form.position.ar}
                  onChange={(e) =>
                    set('position', {
                      ...form.position,
                      ar: e.target.value,
                    })
                  }
                  placeholder="مندوب مبيعات أول"
                />
              </div>
            </div>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ModalLabel>Work Hours</ModalLabel>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={form.workHours.en}
                    onChange={(e) =>
                      set('workHours', {
                        ...form.workHours,
                        en: e.target.value,
                      })
                    }
                    placeholder="e.g. 8 flexible hours"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <ModalLabel>Work Hours (AR)</ModalLabel>
                  <button
                    type="button"
                    onClick={async () => {
                      if (form.workHours.en.trim()) {
                        const t = await translateText(form.workHours.en, 'en', 'ar');
                        if (t) set('workHours', { ...form.workHours, ar: t });
                      } else if (form.workHours.ar.trim()) {
                        const t = await translateText(form.workHours.ar, 'ar', 'en');
                        if (t) set('workHours', { ...form.workHours, en: t });
                      }
                    }}
                    disabled={!form.workHours.en.trim() && !form.workHours.ar.trim()}
                    className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                    title={form.workHours.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
                  >
                    <Languages className="size-3" />
                  </button>
                </div>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    dir="rtl"
                    value={form.workHours.ar}
                    onChange={(e) =>
                      set('workHours', {
                        ...form.workHours,
                        ar: e.target.value,
                      })
                    }
                    placeholder="e.g. 8 ساعات مرنة"
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
                        e.target.value === ''
                          ? ''
                          : Math.round(Number(e.target.value))
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleCommissionDragStart}
                onDragEnd={handleCommissionDragEnd}
                onDragCancel={handleCommissionDragCancel}
              >
                <SortableContext
                  items={form.commissions.map((c) => c._id)}
                  strategy={verticalListSortingStrategy}
                >
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
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeCommissionId ? (
                      (() => {
                        const c = form.commissions.find((x) => x._id === activeCommissionId);
                        if (!c) return null;
                        return (
                          <div className="rounded-xl border border-brand-400 bg-white p-4 shadow-xl dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <GripVertical className="size-4 text-brand-500" />
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Tier {form.commissions.indexOf(c) + 1}
                              </span>
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                              {c.label.en || c.label.ar || 'Untitled'}
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleSectionDragStart}
                onDragEnd={handleSectionDragEnd}
                onDragCancel={handleSectionDragCancel}
              >
                <SortableContext
                  items={form.sections.map((s) => s._id)}
                  strategy={verticalListSortingStrategy}
                >
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
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeSectionId ? (
                      (() => {
                        const s = form.sections.find((x) => x._id === activeSectionId);
                        if (!s) return null;
                        return (
                          <div className="rounded-xl border border-brand-400 bg-white p-4 shadow-xl dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <GripVertical className="size-4 text-brand-500" />
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {s.title.en || s.title.ar || `Section ${form.sections.indexOf(s) + 1}`}
                              </span>
                            </div>
                          </div>
                        );
                      })()
                    ) : null}
                  </DragOverlay>,
                  document.body
                )}
              </DndContext>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
                >
                  <Plus className="size-4" />
                  Add Section
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10"
                >
                  <Layers className="size-4" />
                  From Templates
                </button>
              </div>
              <SectionTemplatePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                docType={'offer'}
                onInsert={(section) =>
                  set('sections', [...form.sections, section])
                }
              />
            </div>

            {/* ── Internal Notes ── */}
            <SectionDivider
              icon={StickyNote}
              title="Internal Notes"
              description="Only visible to your team"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <ModalLabel>Notes (EN)</ModalLabel>

                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={form.notes.en}
                  onChange={(e) =>
                    set('notes', {
                      ...form.notes,
                      en: e.target.value,
                    })
                  }
                  placeholder="Any internal notes..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <ModalLabel>Notes (AR)</ModalLabel>
                  <button
                    type="button"
                    onClick={async () => {
                      if (form.notes.en.trim()) {
                        const t = await translateText(form.notes.en, 'en', 'ar');
                        if (t) set('notes', { ...form.notes, ar: t });
                      } else if (form.notes.ar.trim()) {
                        const t = await translateText(form.notes.ar, 'ar', 'en');
                        if (t) set('notes', { ...form.notes, en: t });
                      }
                    }}
                    disabled={!form.notes.en.trim() && !form.notes.ar.trim()}
                    className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                    title={form.notes.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
                  >
                    <Languages className="size-3" />
                  </button>
                </div>

                <textarea
                  className={`${inputCls} resize-none`}
                  dir="rtl"
                  rows={4}
                  value={form.notes.ar}
                  onChange={(e) =>
                    set('notes', {
                      ...form.notes,
                      ar: e.target.value,
                    })
                  }
                  placeholder="أي ملاحظات داخلية..."
                />
              </div>
            </div>

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
                onLangChange={(lang) => set('emailLang', lang)} // ← add this
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
                {editing && editing.lastEmailSentAt && (
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Last sent{' '}
                    {new Date(editing.lastEmailSentAt).toLocaleDateString(
                      undefined,
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }
                    )}
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
