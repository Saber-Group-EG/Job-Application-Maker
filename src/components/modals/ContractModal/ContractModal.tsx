import { useState, useEffect, useRef } from 'react';
import { FileSignature, ChevronDown, Sparkles, Users } from 'lucide-react';
import {
  ContractType,
  CreateJobContractPayload,
  DraftContractResult,
  JobContract,
} from '../../../services/contractsService';
import {
  useCreateJobContract,
  useUpdateJobContract,
  useBulkCreateJobContracts,
  useDraftContractWithAi,
} from '../../../hooks/queries/useContracts';
import { useApplicant } from '../../../hooks/queries/useApplicants';
import { useCompanies } from '../../../hooks/queries';
import Swal from '../../../utils/swal';
import { ApplicantSelect } from '../../form/ApplicantSelection';
import { ContractTemplateSelector } from './ContractTemplateSelector';
import { ApplicantObject } from '../JobOffersModal/EmailModule';
import { ModalLabel } from '../../form/ModalLabel';
import {
  BulkOverrideMap,
  BulkSalaryReview,
  resolveApplicantSalary,
  resolveApplicantPosition,
  seedBulkOverrideMap,
} from '../JobOffersModal/BulkSalaryReview';
import { translateText } from '../../../utils/translate';
import { useLocale } from '../../../context/LocaleContext';
import {
  AddButton,
  BiField,
  DetailRow,
  DetailsGrid,
  DocLang,
  EditorShell,
  InlineField,
  InlineSelect,
  Paper,
  PaperBox,
  PaperFooter,
  PaperHeader,
  PaperHeading,
  PaperNotes,
  PaperTitle,
  SectionsEditor,
  SideCard,
  SortableList,
  SortableRow,
  TableHead,
} from '../../documentEditor/Paper';
import {
  CONTRACT_TYPE_VALUES,
  contractTypeLabel,
} from '../../../utils/documentLabels';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobContractEditorProps = {
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

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const bilingualName = (
  name: string | { en?: string; ar?: string } | undefined,
  lang: DocLang
) =>
  typeof name === 'string'
    ? name
    : ((lang === 'ar' ? name?.ar || name?.en : name?.en || name?.ar) ?? '');

const formatDocDate = (date: Date | string, lang: DocLang) =>
  new Date(date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// ─── Editor page ──────────────────────────────────────────────────────────────

export default function JobContractEditor({
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
}: JobContractEditorProps) {
  const { t, locale } = useLocale();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [docLang, setDocLang] = useState<DocLang>(locale === 'ar' ? 'ar' : 'en');
  const [showSalaryReview, setShowSalaryReview] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiJobDescription, setAiJobDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitleError, setAiTitleError] = useState(false);

  const draftContractMutation = useDraftContractWithAi();

  // Same fallback chain handleSubmit already uses for companyId
  const resolvedCompanyIdForAi =
    propCompanyId ||
    form.selectedApplicantObject?.jobPositionId?.companyId?._id;

  // offerId wins over jobPositionId, matching the backend's own priority.
  const aiHasKnownSource = Boolean(offerId || jobPositionId);

  const applyAiDraft = (draft: DraftContractResult) => {
    setForm((prev) => ({
      ...prev,
      contractType: draft.contractType,
      position: draft.position,
      benefits: draft.benefits.map((b) => ({
        _id: uid(),
        labelEn: b.label.en,
        labelAr: b.label.ar,
        value: b.value,
      })),
      sections: draft.sections.map((s) => ({
        _id: uid(),
        title: s.title,
        items: s.items.map((i) => ({ _id: uid(), ...i })),
        displayOrder: s.displayOrder,
      })),
      notes: draft.notes,
      // salaryBasic/salaryCurrency/startDate/endDate/probationPeriod untouched
    }));
    setAiPanelOpen(false);
    setAiJobTitle('');
    setAiJobDescription('');
    setAiPrompt('');
  };

  const handleAiPanelSubmit = async () => {
    if (!aiHasKnownSource && !aiJobTitle.trim()) {
      setAiTitleError(true);
      return;
    }
    setAiTitleError(false);

    const result = await draftContractMutation.mutateAsync({
      companyId: resolvedCompanyIdForAi!,
      ...(offerId
        ? { offerId }
        : jobPositionId
          ? { jobPositionId }
          : {
              jobTitle: aiJobTitle.trim(),
              jobDescription: aiJobDescription.trim() || undefined,
            }),
      prompt: aiPrompt.trim() || undefined,
    });
    applyAiDraft(result);
  };
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

  useEffect(() => {
    const ids = applicantObjects?.map((a) => a._id) ?? [];
    const bulk = ids.length > 0 && mode === 'contract' && !editing && !cloneFrom;

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
  }, [
    editing,
    cloneFrom,
    defaults,
    applicantObjects,
    mode,
    propApplicantId,
  ]);

  // Company + fixed applicant shown on the sheet
  const { data: companies = [] } = useCompanies();
  const sheetCompanyId =
    propCompanyId || form.selectedApplicantObject?.jobPositionId?.companyId?._id;
  const sheetCompanyName = bilingualName(
    companies.find((c) => c._id === sheetCompanyId)?.name as
      | string
      | { en?: string; ar?: string }
      | undefined,
    docLang
  );
  const { data: fixedApplicant } = useApplicant(propApplicantId ?? '', {
    enabled: !!propApplicantId,
  });

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
          ? translateText(en, 'en', 'ar').then((t) => ({
              target: 'ar' as const,
              text: t,
            }))
          : ar.trim()
            ? translateText(ar, 'ar', 'en').then((t) => ({
                target: 'en' as const,
                text: t,
              }))
            : Promise.resolve(null);

      const pos = await smartTranslate(form.position.en, form.position.ar);
      const nt = await smartTranslate(form.notes.en, form.notes.ar);

      const sectionResults = await Promise.all(
        form.sections.map(async (s) => {
          const title = await smartTranslate(s.title.en, s.title.ar);
          const items = await Promise.all(
            s.items.map(async (item) => {
              const r = await smartTranslate(item.en, item.ar);
              return r
                ? { _id: item._id, target: r.target, text: r.text }
                : null;
            })
          );
          return {
            _id: s._id,
            title,
            items: items.filter(Boolean) as {
              _id: string;
              target: 'en' | 'ar';
              text: string;
            }[],
          };
        })
      );

      const benefitResults = await Promise.all(
        form.benefits.map(async (b) => {
          const label = b.labelEn.trim()
            ? await translateText(b.labelEn, 'en', 'ar').then((t) => ({
                target: 'ar' as const,
                text: t,
              }))
            : b.labelAr.trim()
              ? await translateText(b.labelAr, 'ar', 'en').then((t) => ({
                  target: 'en' as const,
                  text: t,
                }))
              : null;
          const value = await smartTranslate(b.value.en, b.value.ar);
          return { _id: b._id, label, value };
        })
      );

      setForm((prev) => ({
        ...prev,
        position:
          pos && pos.target === 'ar'
            ? { ...prev.position, ar: pos.text }
            : pos && pos.target === 'en'
              ? { ...prev.position, en: pos.text }
              : prev.position,
        notes:
          nt && nt.target === 'ar'
            ? { ...prev.notes, ar: nt.text }
            : nt && nt.target === 'en'
              ? { ...prev.notes, en: nt.text }
              : prev.notes,
        sections: prev.sections.map((s) => {
          const r = sectionResults.find((x) => x._id === s._id);
          if (!r) return s;
          return {
            ...s,
            title:
              r.title?.target === 'ar'
                ? { ...s.title, ar: r.title.text }
                : r.title?.target === 'en'
                  ? { ...s.title, en: r.title.text }
                  : s.title,
            items: s.items.map((item) => {
              const ri = r.items.find((x) => x._id === item._id);
              if (!ri) return item;
              return ri.target === 'ar'
                ? { ...item, ar: ri.text }
                : { ...item, en: ri.text };
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
            value:
              r.value?.target === 'ar'
                ? { ...b.value, ar: r.value.text }
                : r.value?.target === 'en'
                  ? { ...b.value, en: r.value.text }
                  : b.value,
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
      Swal.fire(
        t('validation', 'modals'),
        t('validationPositionRequired', 'modals'),
        'warning'
      );
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

  // ── Render ─────────────────────────────────────────────────────────────────
  const L = (en: string, ar: string) => (docLang === 'ar' ? ar : en);
  const rtl = docLang === 'ar';
  const cur = form.salaryCurrency;
  const align = { textAlign: rtl ? 'left' : 'right' } as const;

  const candidate = (() => {
    if (mode !== 'contract') return null;
    const person = (name?: string, email?: string) =>
      name ? (
        <>
          <div style={{ fontSize: '11pt', fontWeight: 500 }}>{name}</div>
          {email && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 4 }}>
              {email}
            </div>
          )}
        </>
      ) : null;
    if (editing) {
      return person(
        form.selectedApplicantObject?.fullName,
        form.selectedApplicantObject?.email
      );
    }
    if (form.isBulk) {
      return (
        <div style={{ fontSize: '10pt', color: '#555' }}>
          {(applicantObjects ?? []).map((a) => a.fullName).join(L(', ', '، '))}
        </div>
      );
    }
    if (propApplicantId) {
      return person(fixedApplicant?.fullName, fixedApplicant?.email);
    }
    return (
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} style={{ fontSize: '10pt' }}>
        <ApplicantSelect
          value={form.applicantId}
          onChange={(id, applicant) => {
            set('applicantId', id);
            set('selectedApplicantObject', applicant ?? null);
          }}
          onPrefill={handlePrefillFromApplicant}
          inputCls={inputCls}
        />
      </div>
    );
  })();

  const side = (
    <>
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {t('documentEditorHint', 'modals')}
      </p>

      {mode === 'contract' && <ContractTemplateSelector onSelect={applyTemplate} />}

      {mode === 'contract' && (
        <SideCard
          icon={<Sparkles className="size-4 text-indigo-500" />}
          title={t('generateContractWithAi', 'modals')}
        >
          {!aiPanelOpen ? (
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              disabled={draftContractMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <Sparkles className="size-3.5" />
              {t('generateContractWithAi', 'modals')}
            </button>
          ) : (
            <div className="space-y-3">
              {offerId ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('aiContractUsingOffer', 'modals')}
                </p>
              ) : jobPositionId ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('aiContractUsingJobPosition', 'modals')}
                </p>
              ) : (
                <>
                  <div>
                    <ModalLabel required>
                      {t('positionTitleEn', 'modals')}
                    </ModalLabel>
                    <input
                      className={inputCls}
                      value={aiJobTitle}
                      onChange={(e) => {
                        setAiJobTitle(e.target.value);
                        if (aiTitleError) setAiTitleError(false);
                      }}
                      placeholder={t('aiContractJobTitlePlaceholder', 'modals')}
                    />
                    {aiTitleError && (
                      <p className="mt-1 text-xs text-red-500">
                        {t('aiContractValidationTitleRequired', 'modals')}
                      </p>
                    )}
                  </div>
                  <div>
                    <ModalLabel>{t('jobDescription', 'modals')}</ModalLabel>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={3}
                      value={aiJobDescription}
                      onChange={(e) => setAiJobDescription(e.target.value)}
                      placeholder={t(
                        'aiContractJobDescriptionPlaceholder',
                        'modals'
                      )}
                    />
                  </div>
                </>
              )}
              <div>
                <ModalLabel>{t('additionalInstructions', 'modals')}</ModalLabel>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t('aiContractPromptPlaceholder', 'modals')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAiPanelOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {t('cancel', 'modals')}
                </button>
                <button
                  type="button"
                  onClick={handleAiPanelSubmit}
                  disabled={draftContractMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                >
                  {draftContractMutation.isPending && (
                    <div className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {t('generate', 'modals')}
                </button>
              </div>
            </div>
          )}
        </SideCard>
      )}

      {mode === 'contract' && !propApplicantId && !editing && form.isBulk && (
        <SideCard
          icon={<Users className="size-4 text-brand-500" />}
          title={t('applicantCount', 'modals', {
            count: form.applicantIds?.length ?? 0,
          })}
        >
          <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-700/60 dark:border-slate-700">
            {(applicantObjects ?? []).map((a) => (
              <li key={a._id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                  {a.fullName?.[0]?.toUpperCase() ?? '?'}
                </span>
                <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                  {a.fullName}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowSalaryReview((v) => !v)}
            className="mt-3 flex w-full items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <span>{t('configureSalaries', 'modals')}</span>
            <ChevronDown
              className={`size-3.5 transition-transform ${showSalaryReview ? 'rotate-180' : ''}`}
            />
          </button>
          {showSalaryReview && (
            <div className="mt-3 max-h-96 overflow-y-auto border-t border-slate-200 pt-3 dark:border-slate-700">
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
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({ ...prev, isBulk: false, applicantIds: [] }))
            }
            className="mt-3 text-xs text-brand-600 hover:underline dark:text-brand-400"
          >
            {t('switchToSingle', 'modals')}
          </button>
        </SideCard>
      )}
    </>
  );

  return (
    <EditorShell
      icon={<FileSignature className="size-5" />}
      title={title}
      subtitle={
        isTemplate ? t('templateDesc', 'modals') : t('contractDesc', 'modals')
      }
      onBack={onClose}
      lang={docLang}
      onLangChange={setDocLang}
      onTranslateAll={translateAll}
      translating={translatingAll}
      onSave={handleSubmit}
      saving={isSaving}
      saveLabel={submitLabel}
      saveIcon={<FileSignature className="size-4" />}
      side={side}
    >
      <Paper lang={docLang}>
        <PaperHeader
          lang={docLang}
          company={sheetCompanyName}
          title={L('JOB CONTRACT', 'عقد عمل')}
          date={formatDocDate(new Date(), docLang)}
        />

        <PaperTitle>
          <BiField
            value={form.position}
            lang={docLang}
            onChange={(position) => set('position', position)}
            placeholder={t('positionPlaceholder', 'modals')}
            inputRef={firstInputRef}
            style={{ textAlign: 'center' }}
          />
        </PaperTitle>

        {candidate && (
          <PaperBox label={L('Candidate', 'المرشح')} lang={docLang}>
            {candidate}
          </PaperBox>
        )}

        <DetailsGrid>
          <DetailRow label={L('Contract Type', 'نوع العقد')} lang={docLang}>
            <InlineSelect
              value={form.contractType}
              onChange={(v) => set('contractType', v as ContractType)}
              options={CONTRACT_TYPE_VALUES.map((v) => ({
                value: v,
                label: contractTypeLabel(v, docLang),
              }))}
              style={align}
            />
          </DetailRow>
          <DetailRow label={L('Start Date', 'تاريخ البدء')} lang={docLang}>
            <InlineField
              type="date"
              value={form.startDate}
              onChange={(v) => set('startDate', v)}
              className="!w-40"
              style={align}
            />
          </DetailRow>
          <DetailRow label={L('End Date', 'تاريخ الانتهاء')} lang={docLang}>
            <InlineField
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(v) => set('endDate', v)}
              className="!w-40"
              style={align}
            />
          </DetailRow>
          <DetailRow label={L('Probation Period', 'فترة التجربة')} lang={docLang}>
            <InlineField
              type="number"
              min={0}
              value={form.probationPeriod}
              placeholder="0"
              onChange={(v) =>
                set('probationPeriod', v === '' ? '' : Math.max(0, Number(v)))
              }
              className="!w-14"
              style={align}
            />
            <span>{L('month(s)', 'شهر')}</span>
          </DetailRow>
          <DetailRow label={L('Basic Salary', 'الراتب الأساسي')} lang={docLang}>
            <InlineSelect
              value={cur}
              onChange={(v) => set('salaryCurrency', v)}
              options={['EGP', 'USD', 'EUR', 'SAR', 'AED'].map((c) => ({
                value: c,
                label: c,
              }))}
              style={{ fontSize: '11pt', fontWeight: 700, color: '#059669' }}
            />
            <InlineField
              type="number"
              min={0}
              value={form.salaryBasic}
              placeholder="0"
              onChange={(v) =>
                set('salaryBasic', v === '' ? '' : Math.max(0, Number(v)))
              }
              className="!w-28"
              style={{
                fontSize: '11pt',
                fontWeight: 700,
                color: '#059669',
                ...align,
              }}
            />
          </DetailRow>
        </DetailsGrid>

        {/* Benefits */}
        <div style={{ margin: '20px 0' }}>
          <PaperHeading>{L('Benefits', 'المزايا')}</PaperHeading>
          {form.benefits.length > 0 && (
            <div style={{ margin: '20px 0 12px', fontSize: '9pt' }}>
              <TableHead cols={[L('Benefit', 'الميزة'), L('Value', 'القيمة')]} />
              <SortableList
                items={form.benefits}
                onReorder={(next) => set('benefits', next)}
              >
                {form.benefits.map((b) => (
                  <SortableRow
                    key={b._id}
                    id={b._id}
                    onDuplicate={() => duplicateBenefit(b._id)}
                    onRemove={() => removeBenefit(b._id)}
                  >
                    <div
                      className="grid grid-cols-[1fr_auto]"
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      <div style={{ padding: '10px 8px' }}>
                        <BiField
                          value={{ en: b.labelEn, ar: b.labelAr }}
                          lang={docLang}
                          onChange={(label) =>
                            patchBenefit(b._id, {
                              labelEn: label.en,
                              labelAr: label.ar,
                            })
                          }
                          placeholder={t('benefitLabelPlaceholder', 'modals')}
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                      <div
                        style={{
                          padding: '10px 8px',
                          minWidth: 130,
                          fontWeight: 500,
                        }}
                      >
                        <BiField
                          value={b.value}
                          lang={docLang}
                          onChange={(value) => patchBenefit(b._id, { value })}
                          placeholder={t('benefitValuePlaceholder', 'modals')}
                          style={{ textAlign: 'end' }}
                        />
                      </div>
                    </div>
                  </SortableRow>
                ))}
              </SortableList>
            </div>
          )}
          <AddButton onClick={addBenefit}>{t('addBenefit', 'modals')}</AddButton>
        </div>

        {/* Terms */}
        <div style={{ margin: '20px 0' }}>
          <SectionsEditor
            sections={form.sections}
            onChange={(sections) => set('sections', sections)}
            lang={docLang}
            docType="contract"
            variant="contract"
          />
        </div>

        <PaperNotes lang={docLang} label={L('Notes:', 'ملاحظات:')}>
          <BiField
            multiline
            value={form.notes}
            lang={docLang}
            onChange={(notes) => set('notes', notes)}
            placeholder={t('notesPlaceholderDoc', 'modals')}
          />
        </PaperNotes>

        <PaperFooter>
          {L('Thank you for your business', 'شكراً لثقتكم بنا')}
        </PaperFooter>
      </Paper>
    </EditorShell>
  );
}
