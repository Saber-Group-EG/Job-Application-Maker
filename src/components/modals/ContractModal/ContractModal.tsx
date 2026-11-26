import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useFormDraft } from '../../../hooks/useFormDraft';
import DraftBanner from '../../common/DraftBanner';
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
import { ApplicantObject, applicantDepartment } from '../JobOffersModal/EmailModule';
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
  DocLang,
  EditorShell,
  InlineField,
  InlineSelect,
  Paper,
  SectionsEditor,
  SideCard,
  SortableList,
  SortableRow,
  EditableLabel,
  LetterHeader,
  LetterHeading,
  TemplateText,
  LetterRow,
  LetterSignatures,
} from '../../documentEditor/Paper';
import {
  LETTER,
  defaultContractAgreement,
  defaultContractIntro,
  letterVars,
  formatLetterDate,
  letterLogoUrl,
  letterText,
  cleanLabels,
  type LetterKey,
  type LetterLabels,
} from '../../../utils/offerLetter';
import {
  CONTRACT_TYPE_VALUES,
  contractTypeLabel,
} from '../../../utils/documentLabels';
import {
  allBlank,
  detectSectionRemoval,
  hasCustomBulkValues,
  useRemoveWithUndo,
} from '../JobOffersModal/documentDraft';

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
  /** Typed name when the contract is not for an applicant. */
  employeeName: string;
  selectedApplicantObject?: ApplicantObject | null;
  applicantIds?: string[];
  isBulk?: boolean;
  contractType: ContractType;

  position: {
    en: string;
    ar: string;
  };
  department: { en: string; ar: string };
  reportingTo: { en: string; ar: string };
  /** Headings and labels retyped on the sheet; missing = standard wording. */
  labels: LetterLabels;
  /** Contract paragraphs as written by the user; empty = the default wording. */
  intro: { en: string; ar: string };
  agreement: { en: string; ar: string };
  /** How many sections come before the Compensation & Benefits block. */
  compensationOrder: number;

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
  employeeName: '',
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
  department: { en: '', ar: '' },
  reportingTo: { en: '', ar: '' },
  labels: {},
  intro: { en: '', ar: '' },
  agreement: { en: '', ar: '' },
  compensationOrder: 0,
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
    employeeName: c.employeeName ?? '',
    applicantIds: [],
    isBulk: false,
    contractType: c.contractType,
    position: {
      en: c.position?.en ?? '',
      ar: c.position?.ar ?? '',
    },
    department: { en: c.department?.en ?? '', ar: c.department?.ar ?? '' },
    reportingTo: { en: c.reportingTo?.en ?? '', ar: c.reportingTo?.ar ?? '' },
  labels: { ...(c.labels ?? {}) },
    intro: { en: c.intro?.en ?? '', ar: c.intro?.ar ?? '' },
    agreement: { en: c.agreement?.en ?? '', ar: c.agreement?.ar ?? '' },
    compensationOrder: Math.min(
      Math.max(c.compensationOrder ?? 0, 0),
      c.sections.length
    ),
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
    ...(defaults.department
      ? {
          department: {
            en: defaults.department.en ?? '',
            ar: defaults.department.ar ?? '',
          },
        }
      : {}),
    ...(defaults.reportingTo
      ? {
          reportingTo: {
            en: defaults.reportingTo.en ?? '',
            ar: defaults.reportingTo.ar ?? '',
          },
        }
      : {}),
    ...(defaults.compensationOrder != null
      ? { compensationOrder: defaults.compensationOrder }
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
  // The form as it was opened (set by the init effect); null until then.
  const [startForm, setStartForm] = useState<FormState | null>(null);
  const [docLang, setDocLang] = useState<DocLang>(locale === 'ar' ? 'ar' : 'en');
  const [showSalaryReview, setShowSalaryReview] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiJobDescription, setAiJobDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitleError, setAiTitleError] = useState(false);

  const draftContractMutation = useDraftContractWithAi();

  // The company this contract is for. From the Contracts page propCompanyId
  // is just the first of the user's companies, so the applicant's company
  // (or the contract being edited/copied) comes first; propCompanyId is the
  // fallback. Used for saving, the sheet header and AI drafts.
  const contractCompanyOf = (c?: JobContract | null): string | undefined => {
    const id = c?.companyId;
    if (!id) return undefined;
    return typeof id === 'object' ? id._id : String(id);
  };
  const contractCompanyId =
    form.selectedApplicantObject?.jobPositionId?.companyId?._id ||
    contractCompanyOf(editing) ||
    contractCompanyOf(cloneFrom) ||
    propCompanyId;
  const resolvedCompanyIdForAi = contractCompanyId;

  // offerId wins over jobPositionId, matching the backend's own priority.
  const aiHasKnownSource = Boolean(offerId || jobPositionId);

  const applyAiDraft = (draft: DraftContractResult) => {
    setForm((prev) => ({
      ...prev,
      contractType: draft.contractType,
      position: draft.position,
      // The AI only fills these when they are empty: a department from the
      // applicant's job, or a reporting line someone typed, is kept.
      department:
        prev.department.en || prev.department.ar
          ? prev.department
          : (draft.department ?? prev.department),
      reportingTo:
        prev.reportingTo.en || prev.reportingTo.ar
          ? prev.reportingTo
          : (draft.reportingTo ?? prev.reportingTo),
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
      employeeName: prev.employeeName,
      applicantIds: prev.applicantIds,
      selectedApplicantObject: prev.selectedApplicantObject,
      isBulk: prev.isBulk,
      senderByCompany: prev.senderByCompany,
    }));
  };

  useEffect(() => {
    const ids = applicantObjects?.map((a) => a._id) ?? [];
    const bulk = ids.length > 0 && mode === 'contract' && !editing && !cloneFrom;

    let initial: FormState;
    if (editing) {
      initial = { ...contractToForm(editing), senderByCompany: {} };
    } else if (cloneFrom) {
      initial = {
        ...contractToForm(cloneFrom),
        applicantId: null,
        employeeName: '',
        applicantIds: [],
        isBulk: bulk,
        senderByCompany: {},
        startDate: '',
        endDate: '',
      };
    } else if (defaults) {
      initial = { ...emptyForm(), ...defaultsToForm(defaults) };
    } else {
      initial = {
        ...emptyForm(),
        applicantIds: ids,
        isBulk: bulk,
        bulkOverrideMap: bulk
          ? seedBulkOverrideMap(applicantObjects ?? [])
          : {},
        ...(propApplicantId ? { applicantId: propApplicantId } : {}),
      };
    }
    setForm(initial);
    setStartForm(initial);
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [
    editing,
    cloneFrom,
    defaults,
    applicantObjects,
    mode,
    propApplicantId,
  ]);

  // Unsaved-draft persistence, keyed per record so drafts don't collide.
  const draftKey = (() => {
    const kind = mode === 'template' ? 'contractTemplate' : 'contract';
    if (editing) return `${kind}:edit:${editing._id}`;
    if (cloneFrom) return `${kind}:clone:${cloneFrom._id}`;
    if (offerId) return `${kind}:new:offer:${offerId}`;
    const ids = (applicantObjects ?? []).map((a) => a._id).sort();
    if (ids.length && mode === 'contract') return `${kind}:new:bulk:${ids.join(',')}`;
    if (propApplicantId) return `${kind}:new:${propApplicantId}`;
    return `${kind}:new:${jobPositionId || propCompanyId || 'blank'}`;
  })();
  const isBlankCreate = !editing && !cloneFrom && !defaults;
  const contractDraft = useFormDraft<FormState>({
    key: draftKey,
    value: form,
    baseline: startForm ?? undefined,
    ready: startForm !== null,
    isEmpty: isBlankCreate
      ? (f) =>
          allBlank(
            f.position,
            f.startDate,
            f.endDate,
            f.probationPeriod,
            f.salaryBasic,
            f.benefits,
            f.sections,
            f.notes
          ) && !hasCustomBulkValues(f.bulkOverrideMap)
      : undefined,
    // Drafts saved before a field existed lack it: fill in the blanks.
    onRestore: (saved) => setForm({ ...emptyForm(), ...saved }),
  });
  const discardDraft = () => {
    if (startForm) setForm(startForm);
  };

  // Company + fixed applicant shown on the sheet
  const { data: companies = [] } = useCompanies();
  const sheetCompanyId = contractCompanyId;
  const sheetCompanyLogo = letterLogoUrl(
    companies.find((c) => c._id === sheetCompanyId)?.logoPath
  );
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

  const removeWithUndo = useRemoveWithUndo(setForm);

  const changeSections = (sections: FormSection[]) => {
    const removed = detectSectionRemoval(form.sections, sections);
    if (!removed) return set('sections', sections);
    removeWithUndo(
      t(removed === 'section' ? 'undoSectionRemoved' : 'undoItemRemoved', 'common'),
      ['sections'],
      (prev) => ({ ...prev, sections })
    );
  };

  const patchBenefit = (id: string, patch: Partial<FormBenefit>) =>
    set(
      'benefits',
      form.benefits.map((b) => (b._id === id ? { ...b, ...patch } : b))
    );

  const removeBenefit = (id: string) =>
    removeWithUndo(t('undoEntryRemoved', 'common'), ['benefits'], (prev) => ({
      ...prev,
      benefits: prev.benefits.filter((b) => b._id !== id),
    }));

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
      department: applicantDepartment(applicant) ?? prev.department,
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
      const dep = await smartTranslate(form.department.en, form.department.ar);
      const rep = await smartTranslate(form.reportingTo.en, form.reportingTo.ar);
      const fill = (
        field: { en: string; ar: string },
        r: { target: 'en' | 'ar'; text: string } | null
      ) => (r ? { ...field, [r.target]: r.text } : field);

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
        department: fill(prev.department, dep),
        reportingTo: fill(prev.reportingTo, rep),
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
      department: {
        en: form.department.en.trim(),
        ar: form.department.ar.trim(),
      },
      reportingTo: {
        en: form.reportingTo.en.trim(),
        ar: form.reportingTo.ar.trim(),
      },
      labels: cleanLabels(form.labels),
      intro: { en: form.intro.en.trim(), ar: form.intro.ar.trim() },
      agreement: { en: form.agreement.en.trim(), ar: form.agreement.ar.trim() },
      compensationOrder: Math.min(form.compensationOrder, form.sections.length),
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

    // A typed name only counts when no applicant is attached.
    const typedEmployee =
      mode === 'contract' && !(propApplicantId ?? form.applicantId)
        ? { employeeName: form.employeeName.trim() }
        : mode === 'contract'
          ? { employeeName: '' }
          : {};

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing._id,
          payload: { ...base, ...typedEmployee },
        });
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
          ...typedEmployee,
          companyId: contractCompanyId!,
          ...(mode === 'contract' && singleApplicantId
            ? { applicantId: singleApplicantId }
            : {}),
          ...(mode === 'contract' && jobPositionId ? { jobPositionId } : {}),
          ...(mode === 'contract' && offerId ? { offerId } : {}),
        });
      }
      contractDraft.clear();
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
  const rtl = docLang === 'ar';
  // Every heading and label on the sheet can be retyped in place.
  const setLabel = (key: LetterKey, text: string) =>
    setForm((prev) => ({
      ...prev,
      labels: {
        ...prev.labels,
        [key]: { ...(prev.labels[key] ?? { en: '', ar: '' }), [docLang]: text },
      },
    }));
  const lbl = (key: LetterKey) => (
    <EditableLabel
      value={form.labels[key]?.[docLang]}
      fallback={letterText(key, docLang)}
      onChange={(text) => setLabel(key, text)}
      lang={docLang}
    />
  );
  const cur = form.salaryCurrency;
  // Bulk contracts are addressed to each applicant when they are created.
  const employeeName =
    (form.isBulk
      ? ''
      : editing
        ? form.selectedApplicantObject?.fullName
        : propApplicantId
          ? fixedApplicant?.fullName
          : form.selectedApplicantObject?.fullName) ||
    (form.isBulk ? '' : form.employeeName.trim());

  // Picking the employee happens in the side panel; the contract names them
  // in its opening paragraph.
  // Or, for someone who is not an applicant, their name is typed here.
  const isAr = locale === 'ar';
  const applicantPicker =
    mode === 'contract' && !form.isBulk && !propApplicantId && !(editing && editing.applicantId) ? (
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontSize: '10pt' }} className="space-y-3">
        {!editing && (
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
        {!form.applicantId && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {editing
                ? isAr ? 'اسم الموظف' : 'Employee name'
                : isAr ? 'ليس متقدمًا؟ اكتب اسم الموظف' : 'Not an applicant? Type the employee name'}
            </span>
            <input
              type="text"
              value={form.employeeName}
              maxLength={120}
              onChange={(e) => set('employeeName', e.target.value)}
              placeholder={letterText('employeePlaceholder', isAr ? 'ar' : 'en')}
              className={inputCls}
            />
          </label>
        )}
      </div>
    ) : null;

  const vars = letterVars(
    {
      name: employeeName || letterText('employeePlaceholder', docLang),
      position: form.position[docLang].trim(),
      company: sheetCompanyName,
    },
    docLang
  );

  const side = (
    <>
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {t('documentEditorHint', 'modals')}
        {mode === 'contract' && (
          <span className="mt-1.5 block">
            {locale === 'ar'
              ? 'يمكن تعديل الفقرات أيضاً. {name} و{position} و{company} تُملأ تلقائياً.'
              : 'The paragraphs can be edited too. {name}, {position} and {company} fill in automatically.'}
          </span>
        )}
      </p>

      {applicantPicker && (
        <SideCard
          icon={<Users className="size-4 text-brand-500" />}
          title={locale === 'ar' ? 'الموظف' : 'Employee'}
        >
          {applicantPicker}
        </SideCard>
      )}

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
              removeWithUndo(
                t('undoRemoved', 'common'),
                ['isBulk', 'applicantIds'],
                (prev) => ({ ...prev, isBulk: false, applicantIds: [] })
              )
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
      <DraftBanner
        draft={contractDraft}
        onDiscard={discardDraft}
        className="mx-auto mb-4 max-w-[210mm]"
      />
      <Paper
        lang={docLang}
        style={{
          padding: LETTER.padding,
          color: LETTER.text,
          lineHeight: 1.6,
          fontFamily: rtl ? LETTER.fontAr : LETTER.font,
        }}
      >
        <LetterHeader
          lang={docLang}
          company={sheetCompanyName}
          logo={sheetCompanyLogo}
          date={formatLetterDate(editing?.sentAt || editing?.createdAt || new Date(), docLang)}
          title={lbl('contractTitle')}
        />

        <TemplateText
          value={form.intro}
          lang={docLang}
          onChange={(intro) => set('intro', intro)}
          fallback={defaultContractIntro(docLang)}
          vars={vars}
          style={{ textAlign: 'justify' }}
        />

        <LetterHeading>{lbl('employmentDetails')}</LetterHeading>
        <LetterRow label={lbl('jobTitle')}>
          <div className="min-w-0 flex-1">
            <BiField
              value={form.position}
              lang={docLang}
              onChange={(position) => set('position', position)}
              placeholder={t('positionPlaceholder', 'modals')}
              inputRef={firstInputRef}
            />
          </div>
        </LetterRow>
        <LetterRow label={lbl('department')}>
          <div className="min-w-0 flex-1">
            <BiField
              value={form.department}
              lang={docLang}
              onChange={(department) => set('department', department)}
              placeholder={letterText('departmentPlaceholder', docLang)}
            />
          </div>
        </LetterRow>
        <LetterRow label={lbl('reportingTo')}>
          <div className="min-w-0 flex-1">
            <BiField
              value={form.reportingTo}
              lang={docLang}
              onChange={(reportingTo) => set('reportingTo', reportingTo)}
              placeholder={letterText('reportingToPlaceholder', docLang)}
            />
          </div>
        </LetterRow>
        <LetterRow label={lbl('contractType')}>
          <InlineSelect
            value={form.contractType}
            onChange={(v) => set('contractType', v as ContractType)}
            options={CONTRACT_TYPE_VALUES.map((v) => ({
              value: v,
              label: contractTypeLabel(v, docLang),
            }))}
            className="-mx-1"
          />
        </LetterRow>
        <LetterRow label={lbl('startDate')}>
          <InlineField
            type="date"
            value={form.startDate}
            onChange={(v) => set('startDate', v)}
            className="!w-40"
          />
        </LetterRow>
        <LetterRow label={lbl('endDate')}>
          <InlineField
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(v) => set('endDate', v)}
            className="!w-40"
          />
        </LetterRow>
        <LetterRow label={lbl('probation')}>
          <InlineField
            type="number"
            min={0}
            value={form.probationPeriod}
            placeholder="0"
            onChange={(v) =>
              set('probationPeriod', v === '' ? '' : Math.max(0, Number(v)))
            }
            className="!w-14"
          />
          <span style={{ fontWeight: 400 }}>{lbl('months')}</span>
        </LetterRow>

        <SectionsEditor
          sections={form.sections}
          onChange={changeSections}
          lang={docLang}
          docType="contract"
          variant="offer"
          block={{
            id: '__compensation',
            order: form.compensationOrder,
            onOrderChange: (order) => set('compensationOrder', order),
            content: (
              <>
                <LetterHeading>
                  {lbl('compensationBenefits')}
                </LetterHeading>
                <LetterRow label={lbl('basicSalary')}>
                  <InlineSelect
                    value={cur}
                    onChange={(v) => set('salaryCurrency', v)}
                    options={['EGP', 'USD', 'EUR', 'SAR', 'AED'].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    className="-mx-1"
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
                    style={{ fontWeight: 600 }}
                  />
                </LetterRow>
                {form.benefits.length > 0 && (
                  <>
                    <div style={{ padding: '2px 0', color: LETTER.muted }}>
                      {lbl('benefits')}:
                    </div>
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
                          {/* Reads like the printed line: "Medical insurance: Full coverage" */}
                          <div
                            className="flex items-baseline gap-2"
                            style={{ padding: '2px 0', paddingInlineStart: 6 }}
                          >
                            <span>•</span>
                            <div className="flex min-w-0 flex-1 items-baseline">
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
                                className="!mx-0 !w-auto"
                                style={
                                  {
                                    fieldSizing: 'content',
                                    minWidth: '9ch',
                                    maxWidth: '50ch',
                                    paddingInlineEnd: 0,
                                  } as CSSProperties
                                }
                              />
                              <span style={{ marginInlineEnd: 6 }}>:</span>
                              <div className="min-w-0 flex-1">
                                <BiField
                                  value={b.value}
                                  lang={docLang}
                                  onChange={(value) => patchBenefit(b._id, { value })}
                                  placeholder={t('benefitValuePlaceholder', 'modals')}
                                  style={{ fontWeight: 600 }}
                                />
                              </div>
                            </div>
                          </div>
                        </SortableRow>
                      ))}
                    </SortableList>
                  </>
                )}
                <div className="pt-1">
                  <AddButton onClick={addBenefit}>{t('addBenefit', 'modals')}</AddButton>
                </div>
              </>
            ),
          }}
        />

        <LetterHeading>{lbl('agreement')}</LetterHeading>
        <TemplateText
          value={form.agreement}
          lang={docLang}
          onChange={(agreement) => set('agreement', agreement)}
          fallback={defaultContractAgreement(docLang)}
          vars={vars}
          style={{ textAlign: 'justify' }}
        />

        <LetterSignatures
          left={{
            caption: lbl('forCompany'),
            name: sheetCompanyName,
            sub: <>{lbl('date')} ____________</>,
          }}
          right={{
            caption: lbl('employeeSignature'),
            name: employeeName || letterText('employeePlaceholder', docLang),
            sub: <>{lbl('date')} ____________</>,
          }}
        />
      </Paper>

      {/* Internal notes stay off the printed contract: they are for HR. */}
      <div
        className="mx-auto mt-4 max-w-[210mm] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          {locale === 'ar'
            ? 'ملاحظات داخلية (لا تظهر في العقد)'
            : 'Internal notes (not printed on the contract)'}
        </div>
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <BiField
            multiline
            value={form.notes}
            lang={docLang}
            onChange={(notes) => set('notes', notes)}
            placeholder={t('notesPlaceholderDoc', 'modals')}
          />
        </div>
      </div>
    </EditorShell>
  );
}
