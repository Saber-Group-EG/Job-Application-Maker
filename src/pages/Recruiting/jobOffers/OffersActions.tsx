/**
 * OfferActions.tsx
 *
 * Two action buttons for an existing JobOffer:
 *   1. Resend as email  — mini modal with per-company sender picker
 *   2. Download as PDF  — real .pdf file download via jsPDF (no print dialog)
 *
 * Install once:  npm install jspdf
 */

import { useState, useEffect, useRef } from 'react';
import { Mail, FileDown, X, Send, Loader2 } from 'lucide-react';
import { JobOffer } from '../../../services/jobOffersService';
import { Company } from '../../../types';
import {
  buildOfferHtml,
  cleanFrom,
  resolveSendersByCompany,
} from '../../../components/modals/JobOffersModal/EmailModule';
import { useSendEmail } from '../../../hooks/queries/useSendEmail';
import { useUpdateJobOffer } from '../../../hooks/queries/useJobOffers';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { downloadJobOfferAsPdf } from '../../../utils/jobOfferPdfGenerator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal FormState-compatible shape from a JobOffer for buildOfferHtml */
function offerToFormLike(offer: JobOffer) {
  return {
    position: offer.position, // already BilingualField
    workType: offer.workType,
    workHours:
      typeof offer.workHours === 'object' && offer.workHours !== null
        ? offer.workHours
        : { en: offer.workHours ?? '', ar: '' },
    salaryBasic: offer.salary.basic ?? '',
    salaryCurrency: offer.salary.currency ?? 'EGP',
    commissions: offer.commissions.map((c) => ({
      _id: '',
      label: {
        en:
          (c.label as any)?.en ?? (typeof c.label === 'string' ? c.label : ''),
        ar: (c.label as any)?.ar ?? '',
      },
      value: c.value,
      type: c.type,
      condition: {
        en:
          (c.condition as any)?.en ??
          (typeof c.condition === 'string' ? c.condition : ''),
        ar: (c.condition as any)?.ar ?? '',
      },
    })),
    sections: offer.sections.map((s, idx) => ({
      _id: '',
      title: s.title,
      items: s.items.map((i) => ({ _id: '', en: i.en, ar: i.ar })),
      displayOrder: idx,
    })),
    notes: offer.notes ?? { en: '', ar: '' },
    applicantId: null,
    applicantIds: [],
    isBulk: false,
    sendAsEmail: false,
    senderByCompany: {},
    selectedApplicantObject: null,
    emailLang: 'en',
  } as any;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

// ─── Resend Modal ─────────────────────────────────────────────────────────────

export function ResendModal({
  offer,
  companies,
  onClose,
}: {
  offer: JobOffer;
  companies: Company[];
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const sendEmailMutation = useSendEmail();
  const updateMutation = useUpdateJobOffer();
  const [emailLang, setEmailLang] = useState<'en' | 'ar'>('en');

  const isSending = sendEmailMutation.isPending || updateMutation.isPending;

  const sendersByCompany = resolveSendersByCompany(companies);

  const applicant =
    typeof offer.applicantId === 'object' && offer.applicantId !== null
      ? offer.applicantId
      : null;

  const companyId =
    typeof offer.companyId === 'object' && offer.companyId !== null
      ? ((offer.companyId as any)._id ?? String(offer.companyId))
      : String(offer.companyId);

  const availableSenders = sendersByCompany[companyId] ?? [];

  const [selectedSender, setSelectedSender] = useState('');
  const resolvedSender = selectedSender || availableSenders[0] || '';

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSend = async () => {
    if (!applicant?.email || !resolvedSender) return;

    const now = new Date();
    const formLike = offerToFormLike(offer);

    await sendEmailMutation.mutateAsync({
      company: companyId,
      applicant: applicant._id,
      to: applicant.email,
      from: cleanFrom(resolvedSender),
      subject: `Job Offer – ${
        emailLang === 'ar'
          ? offer.position.ar || offer.position.en
          : offer.position.en || offer.position.ar
      }`,
      html: buildOfferHtml(
        formLike,
        applicant.fullName ?? 'Applicant',
        emailLang
      ),
      ...(offer.applicantId?.jobPositionId?._id
        ? {
            jobPosition: offer.applicantId?.jobPositionId?._id,
          }
        : {}),
      metadata: { offerId: offer._id, type: 'job-offer' },
    } as any);

    await updateMutation.mutateAsync({
      id: offer._id,
      payload: {
        status: 'sent',
        emailSent: true,
        sentAt: (offer as any).sentAt ?? now, // preserve first sentAt
        lastEmailSentAt: now,
      } as any,
    });

    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm h-screen w-full"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('resendModalLabel', 'jobOffers')}
        className="fixed inset-0 z-60 flex items-center justify-center p-4 h-screen w-full"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Mail className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('resendModalTitle', 'jobOffers')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'ar' ? (offer.position?.ar || offer.position?.en) : (offer.position?.en || offer.position?.ar)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5">
            {/* Recipient */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                {t('to', 'jobOffers')}
              </label>
              {applicant?.email ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                    {applicant.fullName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {applicant.fullName}
                    </p>
                    <p className="text-xs text-slate-500">{applicant.email}</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                  {t('noEmailWarning', 'jobOffers')}
                </p>
              )}
            </div>
            {/* Language */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                {t('emailLanguage', 'jobOffers')}
              </label>
              <div className="flex gap-2">
                {(['en', 'ar'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setEmailLang(lang)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition
          ${
            emailLang === lang
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
                  >
                    {lang === 'en' ? t('english', 'jobOffers') : t('arabic', 'jobOffers')}
                  </button>
                ))}
              </div>
            </div>
            {/* Sender */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                {t('from', 'jobOffers')}
              </label>
              {availableSenders.length > 0 ? (
                <div className="relative">
                  <select
                    className={selectCls}
                    value={resolvedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                  >
                    {availableSenders.map((addr) => (
                      <option key={addr} value={addr}>
                        {addr}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                  {t('noSenderWarning', 'jobOffers')}
                </p>
              )}
            </div>

            {/* Last sent note */}
            {(offer as any).lastEmailSentAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t('previouslySentOn', 'jobOffers')}{' '}
                {new Date((offer as any).lastEmailSentAt).toLocaleDateString(
                  undefined,
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t('cancel', 'jobOffers')}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !applicant?.email || !resolvedSender}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="size-4" />
              )}
              {isSending ? t('sending', 'jobOffers') : t('send', 'jobOffers')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function OfferActions({
  offer,
  setResendOpen,
}: {
  offer: JobOffer;
  setResendOpen: (open: boolean) => void;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPopoverOpen, setPdfPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();
  const { hasPermission } = useAuth();
  const canSendEmail = hasPermission('Mail Management', 'create');
  
  // Close popover on outside click:
  useEffect(() => {
    if (!pdfPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPdfPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pdfPopoverOpen]);

  const handleDownloadPdf = async (lang: 'en' | 'ar') => {
    setPdfLoading(true);
    try {
      await downloadJobOfferAsPdf(offer, lang);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setPdfLoading(false);
      setPdfPopoverOpen(false);
    }
  };

  return (
    <>
      {/* Resend email */}
      {canSendEmail && (
        <button
          onClick={() => setResendOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          title={t('resendBtnTitle', 'jobOffers')}
        >
          <Mail className="size-3.5" />
        </button>
      )}

      {/* Download PDF with language popover */}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setPdfPopoverOpen((v) => !v)}
          disabled={pdfLoading}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
          title={t('downloadPdf', 'jobOffers')}
        >
          {pdfLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileDown className="size-3.5" />
          )}
        </button>

        {pdfPopoverOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-max w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t('pdfLanguage', 'jobOffers')}
            </p>
            {(['en', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleDownloadPdf(lang)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>{lang === 'en' ? t('english', 'jobOffers') : t('arabic', 'jobOffers')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
