import { useState, useEffect, useRef } from 'react';
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
  WORK_TYPE_VALUES,
  workTypeLabel,
} from '../../../utils/documentLabels';

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

const STATUS_BADGE: Record<
  string,
  { en: string; ar: string; color: string; bg: string }
> = {
  draft: { en: 'Draft', ar: 'مسودة', color: '#64748b', bg: '#f1f5f9' },
  sent: { en: 'Sent', ar: 'مرسل', color: '#3b82f6', bg: '#eff6ff' },
  accepted: { en: 'Accepted', ar: 'مقبول', color: '#10b981', bg: '#f0fdf4' },
  rejected: { en: 'Rejected', ar: 'مرفوض', color: '#ef4444', bg: '#fef2f2' },
  expired: { en: 'Expired', ar: 'منتهي', color: '#f59e0b', bg: '#fffbeb' },
};

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
    hour: '2-digit',
    minute: '2-digit',
  });

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

  const resolvedCompanyIdForAi = Array.isArray(companyId)
    ? companyId[0]
    : companyId;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, cloneFrom]);

  // ── Company + fixed applicant shown on the sheet ───────────────────────────
  const { data: companies = [] } = useCompanies();
  const sheetCompanyId =
    form.selectedApplicantObject?.jobPositionId?.companyId?._id ??
    (Array.isArray(companyId) ? companyId[0] : companyId);
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
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, payload: base });
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
  const status = STATUS_BADGE[editing?.status ?? 'draft'] ?? STATUS_BADGE.draft;
  const cur = form.salaryCurrency;

  const candidate = (() => {
    if (mode !== 'offer') return null;
    if (editing) {
      const a = form.selectedApplicantObject;
      return a ? (
        <>
          <div style={{ fontSize: '11pt', fontWeight: 500 }}>{a.fullName}</div>
          {a.email && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 4 }}>
              {a.email}
            </div>
          )}
        </>
      ) : null;
    }
    if (form.isBulk) {
      return (
        <div style={{ fontSize: '10pt', color: '#555' }}>
          {(applicantObjects ?? []).map((a) => a.fullName).join(L(', ', '، '))}
        </div>
      );
    }
    if (applicantId) {
      return fixedApplicant ? (
        <>
          <div style={{ fontSize: '11pt', fontWeight: 500 }}>
            {fixedApplicant.fullName}
          </div>
          {fixedApplicant.email && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 4 }}>
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
              setForm((prev) => ({ ...prev, isBulk: false, applicantIds: [] }))
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
      <Paper lang={docLang}>
        <PaperHeader
          lang={docLang}
          company={sheetCompanyName}
          title={L('JOB OFFER', 'عرض وظيفي')}
          date={formatDocDate(new Date(), docLang)}
        />

        <PaperTitle>
          <div className="flex items-center justify-center gap-3">
            <div className="min-w-0 max-w-[75%] flex-1">
              <BiField
                value={form.position}
                lang={docLang}
                onChange={(position) => set('position', position)}
                placeholder={t('positionPlaceholder', 'modals')}
                inputRef={firstInputRef}
                style={{ textAlign: 'center' }}
              />
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '9pt',
                fontWeight: 600,
                background: status.bg,
                color: status.color,
              }}
            >
              {status[docLang]}
            </span>
          </div>
        </PaperTitle>

        {candidate && (
          <PaperBox label={L('Candidate', 'المرشح')} lang={docLang}>
            {candidate}
          </PaperBox>
        )}

        <DetailsGrid>
          <DetailRow label={L('Work Type', 'نوع العمل')} lang={docLang}>
            <InlineSelect
              value={form.workType}
              onChange={(v) => set('workType', v as WorkType)}
              options={WORK_TYPE_VALUES.map((v) => ({
                value: v,
                label: workTypeLabel(v, docLang),
              }))}
              style={{ textAlign: rtl ? 'left' : 'right' }}
            />
          </DetailRow>
          <DetailRow label={L('Work Hours', 'ساعات العمل')} lang={docLang}>
            <BiField
              value={form.workHours}
              lang={docLang}
              onChange={(workHours) => set('workHours', workHours)}
              placeholder={t('workHoursEnPlaceholder', 'modals')}
              style={{ textAlign: rtl ? 'left' : 'right' }}
            />
          </DetailRow>
          <DetailRow label={L('Basic Salary', 'الراتب الأساسي')} lang={docLang}>
            <InlineSelect
              value={cur}
              onChange={(v) => set('salaryCurrency', v)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              style={{ fontSize: '11pt', fontWeight: 700, color: '#059669' }}
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
              style={{
                fontSize: '11pt',
                fontWeight: 700,
                color: '#059669',
                textAlign: rtl ? 'left' : 'right',
              }}
            />
          </DetailRow>
          <DetailRow label={L('Date Created', 'تاريخ الإنشاء')} lang={docLang}>
            <span>{formatDocDate(editing?.createdAt ?? new Date(), docLang)}</span>
          </DetailRow>
          {editing?.sentAt && (
            <DetailRow label={L('Date Sent', 'تاريخ الإرسال')} lang={docLang}>
              <span>{formatDocDate(editing.sentAt, docLang)}</span>
            </DetailRow>
          )}
        </DetailsGrid>

        {/* Commission structure */}
        <div style={{ margin: '20px 0' }}>
          <PaperHeading>{L('Commission Structure', 'هيكل العمولات')}</PaperHeading>
          {form.commissions.length > 0 && (
            <div style={{ margin: '20px 0 12px', fontSize: '9pt' }}>
              <TableHead
                cols={[L('Commission', 'العمولة'), L('Value', 'القيمة')]}
              />
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
                      className="grid grid-cols-[1fr_auto]"
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      <div style={{ padding: '10px 8px' }}>
                        <BiField
                          value={c.label}
                          lang={docLang}
                          onChange={(label) => patchCommission(c._id, { label })}
                          placeholder={t('commissionLabelPlaceholder', 'modals')}
                          style={{ fontWeight: 700 }}
                        />
                        <div
                          className="flex items-start gap-1"
                          style={{ fontSize: '8pt', color: '#666', marginTop: 4 }}
                        >
                          <span>📌</span>
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
                      <div
                        className="flex items-start justify-end gap-1"
                        style={{
                          padding: '10px 8px',
                          minWidth: 130,
                          fontWeight: 700,
                          color: '#059669',
                        }}
                      >
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
                          className="!w-16"
                          style={{ textAlign: 'end' }}
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
                        />
                      </div>
                    </div>
                  </SortableRow>
                ))}
              </SortableList>
            </div>
          )}
          <AddButton onClick={addCommission}>
            {t('addCommissionTier', 'modals')}
          </AddButton>
        </div>

        {/* Additional sections */}
        <div style={{ margin: '20px 0' }}>
          {form.sections.length > 0 && (
            <PaperHeading>{L('Additional Details', 'تفاصيل إضافية')}</PaperHeading>
          )}
          <SectionsEditor
            sections={form.sections}
            onChange={(sections) => set('sections', sections)}
            lang={docLang}
            docType="offer"
            variant="offer"
          />
        </div>

        {editing?.expiresAt && (
          <div
            style={{
              margin: '20px 0',
              padding: '10px 15px',
              background: '#fff3e0',
              borderRadius: 4,
              textAlign: 'center',
              fontSize: '9pt',
              border: '1px solid #ffe0b2',
            }}
          >
            <strong style={{ color: '#e65100' }}>
              {L('Valid Until:', 'صالح حتى:')}
            </strong>{' '}
            {formatDocDate(editing.expiresAt, docLang)}
          </div>
        )}

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
