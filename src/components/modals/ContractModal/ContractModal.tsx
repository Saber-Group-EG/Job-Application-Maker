import { useState, useEffect, useRef, useCallback } from 'react';
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
  ContractType,
  CreateJobContractPayload,
  JobContract,
} from '../../../services/contractsService';
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
import {
  BulkOverrideMap,
  BulkSalaryReview,
  resolveApplicantSalary,
  resolveApplicantPosition,
  seedBulkOverrideMap,
} from '../JobOffersModal/BulkSalaryReview';
import { ChevronDown } from 'lucide-react';
import SectionTemplatePicker from '../../form/SectionTemplatePicker';
import { translateText } from '../../../utils/translate';
import { useLocale } from '../../../context/LocaleContext';

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
  defaults?: Partial<CreateJobContractPayload> | null;
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

  value: {
    en: string;
    ar: string;
  };
};

export type FormState = {
  applicantId: string | null;
  selectedApplicantObject?: ApplicantObject | null;
  applicantIds?: string[];
  isBulk?: boolean;
  contractType: ContractType;

  position: {
    en: string;
    ar: string;
  };

  startDate: string;
  endDate: string;

  probationPeriod: number | '';

  salaryBasic: number | '';
  salaryCurrency: string;

  benefits: FormBenefit[];

  sections: FormSection[];

  notes: {
    en: string;
    ar: string;
  };

  senderByCompany: Record<string, string>;
  bulkOverrideMap: BulkOverrideMap;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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
  position: {
    en: '',
    ar: '',
  },

  notes: {
    en: '',
    ar: '',
  },
  startDate: '',
  endDate: '',
  probationPeriod: '',
  salaryBasic: '',
  salaryCurrency: 'EGP',
  benefits: [],
  sections: [],
  senderByCompany: {},
  selectedApplicantObject: null,
  bulkOverrideMap: {},
});

const contractToForm = (c: JobContract): FormState => {
  console.log('Contract to form', c);
  return {
    applicantId: c.applicantId?._id || null,
    applicantIds: [],
    isBulk: false,
    contractType: c.contractType,
    position: {
      en: c.position?.en ?? '',
      ar: c.position?.ar ?? '',
    },
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
    probationPeriod: c.probationPeriod ?? '',
    salaryBasic: c.salary.basic ?? '',
    salaryCurrency: c.salary.currency ?? 'EGP',
    benefits: c.benefits.map((b) => ({
      _id: uid(),
      labelEn: b.label.en ?? '',
      labelAr: b.label.ar ?? '',
      value: {
        en: b.value?.en ?? '',
        ar: b.value?.ar ?? '',
      },
    })),
    sections: c.sections.map((s, idx) => ({
      _id: uid(),
      title: { en: s.title.en || '', ar: s.title.ar || '' },
      items: s.items.map((i) => ({ _id: uid(), en: i.en, ar: i.ar })),
      displayOrder: idx,
    })),
    notes: {
      en: c.notes?.en ?? '',
      ar: c.notes?.ar ?? '',
    },
    senderByCompany: {},
    selectedApplicantObject: c.applicantId,
    bulkOverrideMap: {},
  };
};

function defaultsToForm(
  defaults: Partial<CreateJobContractPayload>
): Partial<FormState> {
  return {
    ...(defaults.contractType ? { contractType: defaults.contractType } : {}),
    ...(defaults.position
      ? {
          position: {
            en: defaults.position.en ?? '',
            ar: defaults.position.ar ?? '',
          },
        }
      : {}),
    ...(defaults.startDate ? { startDate: defaults.startDate } : {}),
    ...(defaults.endDate ? { endDate: defaults.endDate } : {}),
    ...(defaults.probationPeriod != null
      ? { probationPeriod: defaults.probationPeriod }
      : {}),
    ...(defaults.salary
      ? {
          salaryBasic: defaults.salary.basic ?? '',
          salaryCurrency: defaults.salary.currency ?? 'EGP',
        }
      : {}),
    ...(defaults.sections
      ? {
          sections: defaults.sections.map((s, idx) => ({
            _id: uid(),
            title: {
              en: s.title.en ?? '',
              ar: s.title.ar ?? '',
            },
            items: (s.items ?? []).map((i) => ({
              _id: uid(),
              en: i.en ?? '',
              ar: i.ar ?? '',
            })),
            displayOrder: idx,
          })),
        }
      : {}),
    ...(defaults.notes
      ? {
          notes: {
            en: defaults.notes.en ?? '',
            ar: defaults.notes.ar ?? '',
          },
        }
      : {}),
    ...(defaults.applicantId ? { applicantId: defaults.applicantId } : {}),
  };
}
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
  defaults,
}: JobContractModalProps) {
  const { t } = useLocale();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showSalaryReview, setShowSalaryReview] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeBenefitId, setActiveBenefitId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
    { value: 'permanent', label: t('permanent', 'modals') },
    { value: 'fixed-term', label: t('fixedTerm', 'modals') },
    { value: 'freelance', label: t('freelance', 'modals') },
    { value: 'probation', label: t('probation', 'modals') },
  ];

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

  const createMutation = useCreateJobContract();
  const updateMutation = useUpdateJobContract();
  const bulkMutation = useBulkCreateJobContracts();

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkMutation.isPending;

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleBenefitDragStart = useCallback((event: DragStartEvent) => {
    setActiveBenefitId(event.active.id as string);
  }, []);

  const handleBenefitDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBenefitId(null);
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.benefits.findIndex((b) => b._id === active.id);
        const newIndex = prev.benefits.findIndex((b) => b._id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return { ...prev, benefits: arrayMove(prev.benefits, oldIndex, newIndex) };
        }
        return prev;
      });
    }
  }, []);

  const handleBenefitDragCancel = useCallback(() => {
    setActiveBenefitId(null);
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
      } else if (defaults) {
        setForm({ ...emptyForm(), ...defaultsToForm(defaults) });
      } else {
        setForm({
          ...emptyForm(),
          applicantIds: ids,
          isBulk: bulk,
          bulkOverrideMap: bulk
            ? seedBulkOverrideMap(applicantObjects ?? [])
            : {},
          ...(propApplicantId ? { applicantId: propApplicantId } : {}),
        });
      }
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [
    isOpen,
    editing,
    cloneFrom,
    defaults,
    applicantObjects,
    mode,
    propApplicantId,
  ]);

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
      {
        _id: uid(),
        labelEn: '',
        labelAr: '',
        value: {
          en: '',
          ar: '',
        },
      },
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

  const handlePrefillFromApplicant = (applicant: ApplicantObject) => {
    setForm((prev) => ({
      ...prev,
      position: {
        en: applicant.jobPositionId?.title?.en?.trim() || prev.position.en,
        ar: applicant.jobPositionId?.title?.ar?.trim() || prev.position.ar,
      },
      salaryBasic: applicant.expectedSalary
        ? Number(applicant.expectedSalary)
        : prev.salaryBasic,
    }));
  };

  // Translate All
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

      const benefitResults = await Promise.all(
        form.benefits.map(async (b) => {
          const label = b.labelEn.trim()
            ? await translateText(b.labelEn, 'en', 'ar').then((t) => ({ target: 'ar' as const, text: t }))
            : b.labelAr.trim()
              ? await translateText(b.labelAr, 'ar', 'en').then((t) => ({ target: 'en' as const, text: t }))
              : null;
          const value = await smartTranslate(b.value.en, b.value.ar);
          return { _id: b._id, label, value };
        })
      );

      setForm((prev) => ({
        ...prev,
        position: pos && pos.target === 'ar' ? { ...prev.position, ar: pos.text } : pos && pos.target === 'en' ? { ...prev.position, en: pos.text } : prev.position,
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
        benefits: prev.benefits.map((b) => {
          const r = benefitResults.find((x) => x._id === b._id);
          if (!r) return b;
          return {
            ...b,
            labelEn: r.label?.target === 'en' ? r.label.text : b.labelEn,
            labelAr: r.label?.target === 'ar' ? r.label.text : b.labelAr,
            value: r.value?.target === 'ar' ? { ...b.value, ar: r.value.text } : r.value?.target === 'en' ? { ...b.value, en: r.value.text } : b.value,
          };
        }),
      }));
    } finally {
      setTranslatingAll(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!form.isBulk && !form.position.en.trim() && !form.position.ar.trim()) {
      Swal.fire(t('validation', 'modals'), t('validationPositionRequired', 'modals'), 'warning');
      return;
    }
    const base = {
      isTemplate: mode === 'template',
      contractType: form.contractType,
      position: {
        en: form.position.en.trim(),
        ar: form.position.ar.trim(),
      },
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
        value: {
          en: value.en.trim() || null,
          ar: value.ar.trim() || null,
        },
      })),
      sections: form.sections.map(({ _id, items, ...s }, idx) => ({
        title: s.title,
        displayOrder: idx,
        items: items.map(({ _id: _i, ...item }) => item),
      })),
      notes: {
        en: form.notes.en.trim(),
        ar: form.notes.ar.trim(),
      },
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, payload: base });
      } else if (form.isBulk && form.applicantIds?.length) {
        await bulkMutation.mutateAsync({
          ...base,
          applicantIds: applicantObjects!.map((a) => {
            const override = form.bulkOverrideMap[a._id];
            const resolvedSalary = override
              ? resolveApplicantSalary(a, override)
              : null;
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
              companyId: a.jobPositionId?.companyId?._id || propCompanyId!,
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
      ? t('editContractTemplate', 'modals')
      : t('editJobContract', 'modals')
    : isTemplate
      ? t('newContractTemplate', 'modals')
      : t('newJobContract', 'modals');

  const submitLabel = editing
    ? isTemplate
      ? t('saveTemplate', 'modals')
      : t('saveContract', 'modals')
    : isTemplate
      ? t('createTemplate', 'modals')
      : t('createContract', 'modals');

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
                    ? t('templateDesc', 'modals')
                    : t('contractDesc', 'modals')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={translateAll}
                disabled={translatingAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                title={t('translateAllFields', 'modals')}
              >
                {translatingAll ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
                ) : (
                  <Languages className="size-3.5" />
                )}
                {t('translateAll', 'modals')}
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
                  {form.isBulk
                    ? t('applicantCount', 'modals', { count: form.applicantIds?.length ?? 0 })
                    : t('applicant', 'modals')}
                </ModalLabel>
                {form.isBulk ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('applicantCount', 'modals', { count: form.applicantIds?.length ?? 0 })}
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
                        {t('switchToSingle', 'modals')}
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

                    {/* Salary review toggle */}
                    <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setShowSalaryReview((v) => !v)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      >
                        <span>{t('configureSalaries', 'modals')}</span>
                        <ChevronDown
                          className={`size-3.5 transition-transform ${showSalaryReview ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {showSalaryReview && (
                      <div className="border-t border-slate-200 p-3 dark:border-slate-700 max-h-96 overflow-y-auto">
                        <BulkSalaryReview
                          applicants={applicantObjects ?? []}
                          overrideMap={form.bulkOverrideMap}
                          currency={form.salaryCurrency}
                          formPosition={form.position}
                          formSalary={form.salaryBasic}
                          onChange={(map) => set('bulkOverrideMap', map)}
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

            {/* Core Info */}
            <SectionDivider
              icon={Briefcase}
              title={t('coreInformation', 'modals')}
              description={t('coreInfoDesc', 'modals')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <ModalLabel required>{t('positionTitleEn', 'modals')}</ModalLabel>

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
                  placeholder={t('positionEnPlaceholder', 'modals')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <ModalLabel required>{t('positionTitleAr', 'modals')}</ModalLabel>
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
                    title={form.position.en.trim() ? t('translateEnToAr', 'modals') : t('translateArToEn', 'modals')}
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
                  placeholder={t('positionArPlaceholder', 'modals')}
                />
              </div>
            </div>
            <div>
                <ModalLabel required>{t('contractType', 'modals')}</ModalLabel>
              <select
                className={selectCls}
                value={form.contractType}
                onChange={(e) =>
                  set('contractType', e.target.value as ContractType)
                }
              >
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <SectionDivider
              icon={Calendar}
              title={t('contractDates', 'modals')}
              description={t('contractDatesDesc', 'modals')}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <ModalLabel required={mode === 'contract' && !form.isBulk}>
                  {t('startDate', 'modals')}
                </ModalLabel>
                <input
                  className={inputCls}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <div>
                <ModalLabel>{t('endDate', 'modals')}</ModalLabel>
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
                <ModalLabel>{t('probationPeriod', 'modals')}</ModalLabel>
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
                    placeholder={t('months', 'modals')}
                  />
                </div>
              </div>
              <div className="flex items-end">
                {form.probationPeriod !== '' &&
                  Number(form.probationPeriod) > 0 && (
                    <p className="mb-2.5 text-xs text-slate-500 dark:text-slate-400">
                      {t('monthProbation', 'modals', { count: Number(form.probationPeriod) })}
                    </p>
                  )}
              </div>
            </div>

            {/* Salary */}
            <SectionDivider
              icon={DollarSign}
              title={t('basicSalary', 'modals')}
              description={t('salaryDesc', 'modals')}
            />

            <div className="grid grid-cols-[1fr_120px] gap-4">
              <div>
                <ModalLabel>{t('basicSalary', 'modals')}</ModalLabel>
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
                <ModalLabel>{t('currency', 'modals')}</ModalLabel>
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
              title={t('benefits', 'modals')}
              description={t('benefitsDesc', 'modals')}
            />

            <div className="space-y-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleBenefitDragStart}
                onDragEnd={handleBenefitDragEnd}
                onDragCancel={handleBenefitDragCancel}
              >
                <SortableContext
                  items={form.benefits.map((b) => b._id)}
                  strategy={verticalListSortingStrategy}
                >
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
                </SortableContext>
                {createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeBenefitId ? (
                      (() => {
                        const b = form.benefits.find((x) => x._id === activeBenefitId);
                        if (!b) return null;
                        return (
                          <div className="rounded-xl border border-brand-400 bg-white p-4 shadow-xl dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                              <GripVertical className="size-4 text-brand-500" />
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Benefit {form.benefits.indexOf(b) + 1}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                              {b.labelEn || b.labelAr || 'Untitled'}
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
                onClick={addBenefit}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-4" />
                {t('addBenefit', 'modals')}
              </button>
            </div>

            {/* Contract Sections */}
            <SectionDivider
              icon={Layers}
              title={t('contractSections', 'modals')}
              description={t('contractSectionsDesc', 'modals')}
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
                  {t('addSection', 'modals')}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10"
                >
                  <Layers className="size-4" />
                  {t('fromTemplates', 'modals')}
                </button>
              </div>
              <SectionTemplatePicker
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                docType={'contract'}
                onInsert={(section) =>
                  set('sections', [...form.sections, section])
                }
              />
            </div>

            {/* Internal Notes */}
            <SectionDivider
              icon={StickyNote}
              title={t('internalNotes', 'modals')}
              description={t('internalNotesDesc', 'modals')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <ModalLabel>{t('notesEn', 'modals')}</ModalLabel>

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
                  placeholder={t('notesEnPlaceholder', 'modals')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <ModalLabel>{t('notesAr', 'modals')}</ModalLabel>
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
                    title={form.notes.en.trim() ? t('translateEnToAr', 'modals') : t('translateArToEn', 'modals')}
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
                  placeholder={t('notesArPlaceholder', 'modals')}
                />
              </div>
            </div>
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
                {t('cancel', 'modals')}
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
