import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import {
  FileText,
  Mail,
  Send,
  ChevronDown,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  CommissionType,
  DraftOfferResult,
  JobOffer,
  OfferStatus,
  WorkType,
} from '../../../services/jobOffersService';
import {
  useBulkCreateJobOffers,
  useCreateJobOffer,
  useUpdateJobOffer,
  useDraftOfferWithAi,
} from '../../../hooks/queries/useJobOffers';
import { useApplicant } from '../../../hooks/queries/useApplicants';
import { useCompanies } from '../../../hooks/queries';
import Swal from '../../../utils/swal';
import { useWhatsAppStatus } from '../../../hooks/queries/useCompanies';
import { applicantsService } from '../../../services/applicantsService';
import { warnWhatsAppNotSent } from '../../../utils/whatsappWarnings';
import { ApplicantSelect } from '../../form/ApplicantSelection';
import { TemplateSelector } from './TemplateSelector';
import {
  useJobOfferEmail,
  EmailSettingsPanel,
  type ApplicantObject,
} from './EmailModule';
import { ModalLabel } from '../../form/ModalLabel';
import {
  BulkOverrideMap,
  BulkSalaryReview,
  resolveApplicantSalary,
  resolveApplicantPosition,
  seedBulkOverrideMap,
} from './BulkSalaryReview';
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
  LetterHeader,
  LetterHeading,
  LetterRow,
  LetterSignatures,
} from '../../documentEditor/Paper';
import {
  LETTER,
  formatLetterDate,
  letterAcceptance,
  letterIntro,
  letterLogoUrl,
  letterText,
} from '../../../utils/offerLetter';
import {
  WORK_TYPE_VALUES,
  workTypeLabel,
} from '../../../utils/documentLabels';
import { useFormDraft } from '../../../hooks/useFormDraft';
import DraftBanner from '../../common/DraftBanner';
import {
  allBlank,
  detectSectionRemoval,
  hasCustomBulkValues,
  useRemoveWithUndo,
} from './documentDraft';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorMode = 'template' | 'offer';

export type JobOfferEditorProps = {
  onClose: () => void;
  mode: EditorMode;
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

const bilingualName = (
  name: string | { en?: string; ar?: string } | undefined,
  lang: DocLang
) =>
  typeof name === 'string'
    ? name
    : ((lang === 'ar' ? name?.ar || name?.en : name?.en || name?.ar) ?? '');

// ─── Editor page ──────────────────────────────────────────────────────────────

export default function JobOfferEditor({
  onClose,
  mode,
  company: propCompany,
  editing,
  companyId,
  applicantId,
  jobPositionId,
  cloneFrom,
  applicantObjects,
}: JobOfferEditorProps) {
  const { t, locale } = useLocale();

  const [form, setForm] = useState<FormState>(emptyForm);
  // The form as it was opened (set by the init effect); null until then.
  const [startForm, setStartForm] = useState<FormState | null>(null);
  const [docLang, setDocLang] = useState<DocLang>(locale === 'ar' ? 'ar' : 'en');
  const [showSalaryReview, setShowSalaryReview] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);

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

  // "Also send a WhatsApp update": the approved "offer sent" template from the
  // platform number (SG Hiring). Only with "send as email", since it tells the
  // applicant to check their email. Starts ticked when the company is on Automatic.
  const waCompanyId: string =
    Object.keys(groupedByCompany)[0] ||
    form.selectedApplicantObject?.jobPositionId?.companyId?._id ||
    (Array.isArray(companyId) ? companyId[0] : companyId) ||
    (typeof propCompany === 'string' ? propCompany : (propCompany as { _id?: string } | undefined)?._id) ||
    '';
  const { data: waStatus } = useWhatsAppStatus(waCompanyId, mode === 'offer' && Boolean(waCompanyId));
  const waOfferEvent = waStatus?.events?.find((ev) => ev.key === 'offerSent');
  const whatsAppOffered = Boolean(waStatus?.connected && waOfferEvent);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const notifyWhatsAppTouched = useRef(false);
  useEffect(() => {
    if (!notifyWhatsAppTouched.current && waOfferEvent) {
      setNotifyWhatsApp(waOfferEvent.allowedByPlan && waOfferEvent.mode === 'auto');
    }
  }, [waOfferEvent]);

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    bulkMutation.isPending ||
    isEmailPending;

  // ── AI draft ───────────────────────────────────────────────────────────────
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiJobDescription, setAiJobDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTitleError, setAiTitleError] = useState(false);

  const draftOfferMutation = useDraftOfferWithAi();

  // From the Job Offers page companyId is every company the user belongs to,
  // so its first entry is just whichever company comes first, not the one
  // the offer is for. Prefer the applicant's company, then the offer being
  // edited or cloned, and only then fall back to the prop.
  const offerCompanyId = (o?: JobOffer | null): string | undefined => {
    const c = o?.companyId as unknown;
    if (!c) return undefined;
    return typeof c === 'object' ? (c as { _id?: string })._id : String(c);
  };
  const resolvedCompanyIdForAi =
    form.selectedApplicantObject?.jobPositionId?.companyId?._id ||
    Object.keys(groupedByCompany)[0] ||
    offerCompanyId(editing) ||
    offerCompanyId(cloneFrom) ||
    (Array.isArray(companyId) ? companyId[0] : companyId);

  const applyAiDraft = (draft: DraftOfferResult) => {
    setForm((prev) => ({
      ...prev,
      position: draft.position,
      workType: draft.workType,
      workHours: draft.workHours,
      commissions: draft.commissions.map((c) => ({ _id: uid(), ...c })),
      sections: draft.sections.map((s) => ({
        _id: uid(),
        title: s.title,
        items: s.items.map((i) => ({ _id: uid(), ...i })),
        displayOrder: s.displayOrder,
      })),
      notes: draft.notes,
      // salaryBasic/salaryCurrency deliberately untouched
    }));
    setAiPanelOpen(false);
    setAiJobTitle('');
    setAiJobDescription('');
    setAiPrompt('');
  };

  const handleAiPanelSubmit = async () => {
    if (!jobPositionId && !aiJobTitle.trim()) {
      setAiTitleError(true);
      return;
    }
    setAiTitleError(false);

    const result = await draftOfferMutation.mutateAsync({
      companyId: resolvedCompanyIdForAi!,
      ...(jobPositionId
        ? { jobPositionId }
        : {
            jobTitle: aiJobTitle.trim(),
            jobDescription: aiJobDescription.trim() || undefined,
          }),
      prompt: aiPrompt.trim() || undefined,
    });
    applyAiDraft(result);
  };

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

  // ── Init form ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ids = applicantObjects?.map((a) => a._id) ?? [];
    const bulk = ids.length > 0;

    let initial: FormState;
    if (editing) {
      initial = { ...offerToForm(editing), senderByCompany: {} };
    } else if (cloneFrom) {
      initial = {
        ...offerToForm(cloneFrom),
        applicantId: null,
        applicantIds: [],
        isBulk: bulk,
        sendAsEmail: false,
        senderByCompany: {},
      };
    } else {
      initial = {
        ...emptyForm(),
        applicantIds: ids,
        isBulk: bulk,
        bulkOverrideMap: bulk
          ? seedBulkOverrideMap(applicantObjects ?? [])
          : {},
      };
    }
    setForm(initial);
    setStartForm(initial);
    setTimeout(() => firstInputRef.current?.focus(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, cloneFrom]);

  // ── Unsaved-draft persistence ──────────────────────────────────────────────
  // Keyed per record so drafts for different offers/applicants don't collide.
  const draftKey = (() => {
    const kind = mode === 'template' ? 'offerTemplate' : 'offer';
    if (editing) return `${kind}:edit:${editing._id}`;
    if (cloneFrom) return `${kind}:clone:${cloneFrom._id}`;
    const ids = (applicantObjects ?? []).map((a) => a._id).sort();
    if (ids.length) return `${kind}:new:bulk:${ids.join(',')}`;
    if (applicantId) return `${kind}:new:${applicantId}`;
    return `${kind}:new:${jobPositionId || 'blank'}`;
  })();
  const isCreate = !editing && !cloneFrom;
  // The sender is auto-picked once the company loads; that alone isn't an edit.
  const draftBaseline = useMemo(
    () =>
      startForm ? { ...startForm, senderByCompany: form.senderByCompany } : undefined,
    [startForm, form.senderByCompany]
  );
  const offerDraft = useFormDraft<FormState>({
    key: draftKey,
    value: form,
    baseline: draftBaseline,
    ready: startForm !== null,
    isEmpty: isCreate
      ? (f) =>
          allBlank(
            f.position,
            f.workHours,
            f.salaryBasic,
            f.commissions,
            f.sections,
            f.notes
          ) && !hasCustomBulkValues(f.bulkOverrideMap)
      : undefined,
    onRestore: (saved) => setForm(saved),
  });
  const discardDraft = () => {
    if (startForm)
      setForm((prev) => ({ ...startForm, senderByCompany: prev.senderByCompany }));
  };

  // ── Company + fixed applicant shown on the sheet ───────────────────────────
  const { data: companies = [] } = useCompanies();
  const sheetCompanyId =
    form.selectedApplicantObject?.jobPositionId?.companyId?._id ??
    (Array.isArray(companyId) ? companyId[0] : companyId);
  const sheetCompanyLogo = letterLogoUrl(
    companies.find((c) => c._id === sheetCompanyId)?.logoPath
  );
  const sheetCompanyName =
    propCompany ||
    bilingualName(
      companies.find((c) => c._id === sheetCompanyId)?.name as
        | string
        | { en?: string; ar?: string }
        | undefined,
      docLang
    );

  const { data: fixedApplicant } = useApplicant(applicantId ?? '', {
    enabled: !!applicantId,
  });

  // ── Patch helpers ──────────────────────────────────────────────────────────

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

  const patchCommission = (id: string, patch: Partial<FormCommission>) =>
    set(
      'commissions',
      form.commissions.map((c) => (c._id === id ? { ...c, ...patch } : c))
    );

  const removeCommission = (id: string) =>
    removeWithUndo(t('undoEntryRemoved', 'common'), ['commissions'], (prev) => ({
      ...prev,
      commissions: prev.commissions.filter((c) => c._id !== id),
    }));

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
      const wh = await smartTranslate(form.workHours.en, form.workHours.ar);
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

      const commissionResults = await Promise.all(
        form.commissions.map(async (c) => {
          const label = await smartTranslate(c.label.en, c.label.ar);
          const condition = await smartTranslate(
            c.condition.en,
            c.condition.ar
          );
          return { _id: c._id, label, condition };
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
        workHours:
          wh && wh.target === 'ar'
            ? { ...prev.workHours, ar: wh.text }
            : wh && wh.target === 'en'
              ? { ...prev.workHours, en: wh.text }
              : prev.workHours,
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
        commissions: prev.commissions.map((c) => {
          const r = commissionResults.find((x) => x._id === c._id);
          if (!r) return c;
          return {
            ...c,
            label:
              r.label?.target === 'ar'
                ? { ...c.label, ar: r.label.text }
                : r.label?.target === 'en'
                  ? { ...c.label, en: r.label.text }
                  : c.label,
            condition:
              r.condition?.target === 'ar'
                ? { ...c.condition, ar: r.condition.text }
                : r.condition?.target === 'en'
                  ? { ...c.condition, en: r.condition.text }
                  : c.condition,
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
      Swal.fire(
        t('validation', 'modals'),
        t('validationPositionRequired', 'modals'),
        'warning'
      );
      return;
    }
    const willSendEmail = form.sendAsEmail && mode === 'offer';
    // Decided here and sent after saving; the server then leaves the offer alone.
    const whatsAppChoice = willSendEmail && whatsAppOffered;
    const sendWhatsApp = whatsAppChoice && notifyWhatsApp && Boolean(waOfferEvent?.allowedByPlan);
    let savedApplicantIds: string[] = [];

    if (willSendEmail) {
      const missingSender = Object.keys(groupedByCompany).find(
        (cid) => !form.senderByCompany[cid]
      );
      if (missingSender) {
        Swal.fire(
          t('validation', 'modals'),
          t('validationSenderRequired', 'modals'),
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
      ...(whatsAppChoice ? { notifyWhatsApp: sendWhatsApp } : {}),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, payload: base });
        const editedApplicant = (editing as { applicantId?: string | { _id?: string } | null }).applicantId;
        savedApplicantIds = [typeof editedApplicant === 'string' ? editedApplicant : editedApplicant?._id || ''];
        if (willSendEmail) await sendSingleOfferEmail();
      } else if (form.isBulk && form.applicantIds?.length) {
        await bulkMutation.mutateAsync({
          ...base,
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
        savedApplicantIds = applicantObjects!.map((a) => a._id!);
        if (willSendEmail) await sendBulkOfferEmail();
      } else {
        const singleApplicantId = applicantId ?? form.applicantId;
        const resolvedCompanyId =
          form.selectedApplicantObject?.jobPositionId?.companyId._id ??
          (Array.isArray(companyId) ? companyId[0] : companyId); // ← fallback to prop
        await createMutation.mutateAsync({
          ...base,
          companyId: resolvedCompanyId!,
          ...(mode === 'offer' && singleApplicantId
            ? { applicantId: singleApplicantId }
            : {}),
        });
        savedApplicantIds = singleApplicantId ? [singleApplicantId] : [];
        if (willSendEmail) await sendSingleOfferEmail();
      }
      offerDraft.clear();
      onClose();
      if (sendWhatsApp) {
        // The offers are saved; send the WhatsApp updates and only report the misses.
        const ids = savedApplicantIds.filter(Boolean);
        void Promise.allSettled(ids.map((id) => applicantsService.sendWhatsAppUpdate(id, 'offerSent'))).then(
          (results) => {
            const reasons = results
              .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
              .map((r) => (r.reason as { message?: string })?.message);
            if (reasons.length) warnWhatsAppNotSent('offer', reasons);
          }
        );
      }
    } catch {
      // errors handled inside individual mutation hooks
    }
  };

  // ── Derived labels ─────────────────────────────────────────────────────────
  const isTemplate = mode === 'template';

  const title = editing
    ? isTemplate
      ? t('editOfferTemplate', 'modals')
      : t('editJobOffer', 'modals')
    : isTemplate
      ? t('newOfferTemplate', 'modals')
      : t('newJobOffer', 'modals');

  const submitLabel = editing
    ? form.sendAsEmail && mode === 'offer'
      ? t('saveResend', 'modals')
      : t('saveChanges', 'modals')
    : isTemplate
      ? t('createTemplate', 'modals')
      : form.sendAsEmail
        ? t('createSend', 'modals')
        : t('createOffer', 'modals');

  // ── Render ─────────────────────────────────────────────────────────────────
  const L = (en: string, ar: string) => (docLang === 'ar' ? ar : en);
  const rtl = docLang === 'ar';
  const cur = form.salaryCurrency;
  // Bulk offers are addressed to each applicant when they are created.
  const addressee =
    (form.isBulk
      ? ''
      : editing
        ? form.selectedApplicantObject?.fullName
        : applicantId
          ? fixedApplicant?.fullName
          : form.selectedApplicantObject?.fullName) ||
    letterText('candidatePlaceholder', docLang);

  const candidate = (() => {
    if (mode !== 'offer') return null;
    if (editing) {
      const a = form.selectedApplicantObject;
      return a ? (
        <>
          <div style={{ fontWeight: 600 }}>{a.fullName}</div>
          {a.email && (
            <div style={{ color: LETTER.muted }}>
              {a.email}
            </div>
          )}
        </>
      ) : null;
    }
    if (form.isBulk) {
      return (
        <div style={{ fontWeight: 600 }}>
          {(applicantObjects ?? []).map((a) => a.fullName).join(L(', ', '، '))}
        </div>
      );
    }
    if (applicantId) {
      return fixedApplicant ? (
        <>
          <div style={{ fontWeight: 600 }}>{fixedApplicant.fullName}</div>
          {fixedApplicant.email && (
            <div style={{ color: LETTER.muted }}>
              {fixedApplicant.email}
            </div>
          )}
        </>
      ) : null;
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

      {mode === 'offer' && <TemplateSelector onSelect={applyTemplate} />}

      {mode === 'offer' && (
        <SideCard
          icon={<Sparkles className="size-4 text-indigo-500" />}
          title={t('generateOfferWithAi', 'modals')}
        >
          {!aiPanelOpen ? (
            <button
              type="button"
              onClick={() => setAiPanelOpen(true)}
              disabled={draftOfferMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 dark:border-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <Sparkles className="size-3.5" />
              {t('generateOfferWithAi', 'modals')}
            </button>
          ) : (
            <div className="space-y-3">
              {jobPositionId ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('aiOfferUsingJobPosition', 'modals')}
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
                      placeholder={t('aiOfferJobTitlePlaceholder', 'modals')}
                    />
                    {aiTitleError && (
                      <p className="mt-1 text-xs text-red-500">
                        {t('aiOfferValidationTitleRequired', 'modals')}
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
                      placeholder={t('aiOfferJobDescriptionPlaceholder', 'modals')}
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
                  placeholder={t('aiOfferPromptPlaceholder', 'modals')}
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
                  disabled={draftOfferMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                >
                  {draftOfferMutation.isPending && (
                    <div className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {t('generate', 'modals')}
                </button>
              </div>
            </div>
          )}
        </SideCard>
      )}

      {mode === 'offer' && !editing && form.isBulk && (
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
            <span>{t('configureSalariesOffer', 'modals')}</span>
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
                onChange={(map) => set('bulkOverrideMap', map)}
                formSalary={form.salaryBasic}
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

      {mode === 'offer' && (
        <SideCard
          icon={<Mail className="size-4 text-brand-500" />}
          title={t('sendAsEmail', 'modals')}
        >
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
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('sendAsEmail', 'modals')}
            </span>
            {editing && editing.lastEmailSentAt && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {t('lastSent', 'modals', {
                  date: new Date(editing.lastEmailSentAt).toLocaleDateString(
                    undefined,
                    { day: 'numeric', month: 'short', year: 'numeric' }
                  ),
                })}
              </span>
            )}
          </label>
          {form.sendAsEmail && (
            <div className="mt-3">
              <EmailSettingsPanel
                form={form}
                isBulk={!!form.isBulk}
                sendersByCompany={sendersByCompany}
                groupedByCompany={groupedByCompany}
                onSenderChange={(senderByCompany) =>
                  set('senderByCompany', senderByCompany)
                }
                onLangChange={(lang) => set('emailLang', lang)}
              />
            </div>
          )}
          {form.sendAsEmail && whatsAppOffered && waOfferEvent && (
            <label
              className={`mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 ${
                waOfferEvent.allowedByPlan ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={notifyWhatsApp && waOfferEvent.allowedByPlan}
                disabled={!waOfferEvent.allowedByPlan}
                onChange={(e) => {
                  notifyWhatsAppTouched.current = true;
                  setNotifyWhatsApp(e.target.checked);
                }}
                className="mt-0.5 size-4 shrink-0 accent-brand-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                  {t('notifyWhatsAppOffer', 'modals')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {waOfferEvent.allowedByPlan
                    ? t('notifyWhatsAppOfferHint', 'modals')
                    : t('waNotOnPlan', 'companies')}
                </span>
              </span>
            </label>
          )}
        </SideCard>
      )}
    </>
  );

  return (
    <EditorShell
      icon={<FileText className="size-5" />}
      title={title}
      subtitle={
        isTemplate ? t('templateOfferDesc', 'modals') : t('offerDesc', 'modals')
      }
      onBack={onClose}
      lang={docLang}
      onLangChange={setDocLang}
      onTranslateAll={translateAll}
      translating={translatingAll}
      onSave={handleSubmit}
      saving={isSaving}
      saveLabel={submitLabel}
      saveIcon={
        form.sendAsEmail && mode === 'offer' ? (
          <Send className="size-4" />
        ) : (
          <FileText className="size-4" />
        )
      }
      side={side}
    >
      <DraftBanner
        draft={offerDraft}
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
          title={letterText('title', docLang)}
        />

        <div style={{ color: LETTER.muted }}>{letterText('to', docLang)}</div>
        {candidate ?? (
          <div style={{ fontWeight: 600 }}>{letterText('candidatePlaceholder', docLang)}</div>
        )}

        <div style={{ marginTop: 18 }}>
          {letterText('dear', docLang)} {addressee}
          {rtl ? '،' : ','}
        </div>
        <p style={{ marginTop: 6, textAlign: 'justify' }}>
          {letterIntro(form.position[docLang].trim(), sheetCompanyName, docLang)}
        </p>

        <LetterHeading>{letterText('positionDetails', docLang)}</LetterHeading>
        <LetterRow label={letterText('jobTitle', docLang)}>
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
        <LetterRow label={letterText('employmentType', docLang)}>
          <InlineSelect
            value={form.workType}
            onChange={(v) => set('workType', v as WorkType)}
            options={WORK_TYPE_VALUES.map((v) => ({
              value: v,
              label: workTypeLabel(v, docLang),
            }))}
            className="-mx-1"
          />
        </LetterRow>
        <LetterRow label={letterText('workingHours', docLang)}>
          <div className="min-w-0 flex-1">
            <BiField
              value={form.workHours}
              lang={docLang}
              onChange={(workHours) => set('workHours', workHours)}
              placeholder={t('workHoursEnPlaceholder', 'modals')}
            />
          </div>
        </LetterRow>

        <LetterHeading>{letterText('compensation', docLang)}</LetterHeading>
        <LetterRow label={letterText('basicSalary', docLang)}>
          <InlineSelect
            value={cur}
            onChange={(v) => set('salaryCurrency', v)}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            className="-mx-1"
          />
          <InlineField
            type="number"
            min={0}
            value={form.salaryBasic}
            placeholder="0"
            onChange={(v) =>
              set('salaryBasic', v === '' ? '' : Math.max(0, Math.round(Number(v))))
            }
            className="!w-28"
            style={{ fontWeight: 600 }}
          />
        </LetterRow>
        {form.commissions.length > 0 && (
          <>
            <div style={{ padding: '2px 0', color: LETTER.muted }}>
              {letterText('commission', docLang)}:
            </div>
            <SortableList
              items={form.commissions}
              onReorder={(next) => set('commissions', next)}
            >
              {form.commissions.map((c) => (
                <SortableRow
                  key={c._id}
                  id={c._id}
                  onDuplicate={() => duplicateCommission(c._id)}
                  onRemove={() => removeCommission(c._id)}
                >
                  <div
                    className="flex items-baseline gap-2"
                    style={{ padding: '2px 0', paddingInlineStart: 6 }}
                  >
                    <span>•</span>
                    <div className="min-w-0 flex-1">
                      {/* Reads like the printed line: "Closed deals: 5%". The
                          label grows with its text so the value sits beside it. */}
                      <div className="flex items-baseline">
                        <div className="min-w-0">
                          <BiField
                            value={c.label}
                            lang={docLang}
                            onChange={(label) => patchCommission(c._id, { label })}
                            placeholder={t('commissionLabelPlaceholder', 'modals')}
                            className="!mx-0 !w-auto"
                            style={
                              {
                                fieldSizing: 'content',
                                minWidth: '9ch',
                                maxWidth: '60ch',
                              } as CSSProperties
                            }
                          />
                        </div>
                        <span>:</span>
                        <InlineField
                          type="number"
                          min={0}
                          value={c.value}
                          placeholder="0"
                          onChange={(v) =>
                            patchCommission(c._id, {
                              value: v === '' ? '' : Number(v),
                            })
                          }
                          className="!mx-0 !w-auto"
                          style={
                            {
                              fieldSizing: 'content',
                              minWidth: '2ch',
                              marginInlineStart: 4,
                              fontWeight: 600,
                            } as CSSProperties
                          }
                        />
                        <InlineSelect
                          value={c.type}
                          onChange={(v) =>
                            patchCommission(c._id, { type: v as CommissionType })
                          }
                          options={[
                            { value: 'percentage', label: '%' },
                            { value: 'fixed', label: cur },
                          ]}
                          style={{ fontWeight: 600 }}
                        />
                      </div>
                      <div style={{ fontSize: '9pt', color: LETTER.muted }}>
                        <BiField
                          value={c.condition}
                          lang={docLang}
                          onChange={(condition) =>
                            patchCommission(c._id, { condition })
                          }
                          placeholder={t('conditionPlaceholder', 'modals')}
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
          <AddButton onClick={addCommission}>
            {t('addCommissionTier', 'modals')}
          </AddButton>
        </div>

        <SectionsEditor
          sections={form.sections}
          onChange={changeSections}
          lang={docLang}
          docType="offer"
          variant="offer"
        />

        <LetterHeading>{letterText('acceptance', docLang)}</LetterHeading>
        <p style={{ textAlign: 'justify' }}>
          {letterAcceptance(
            editing?.expiresAt ? formatLetterDate(editing.expiresAt, docLang) : '',
            docLang
          )}
        </p>

        <LetterSignatures
          left={{
            caption: letterText('sincerely', docLang),
            name: sheetCompanyName,
            sub: letterText('hr', docLang),
          }}
          right={{
            caption: letterText('acceptedBy', docLang),
            name: addressee,
            sub: `${letterText('date', docLang)} ____________`,
          }}
        />
      </Paper>

      {/* Internal notes stay off the printed letter: they are for HR. */}
      <div
        className="mx-auto mt-4 max-w-[210mm] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          {locale === 'ar'
            ? 'ملاحظات داخلية (لا تظهر في الخطاب)'
            : 'Internal notes (not printed on the letter)'}
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
