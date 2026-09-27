/**
 * OfferActions.tsx
 *
 * Two action buttons for an existing JobOffer:
 *   1. Resend as email  — mini modal with per-company sender picker
 *   2. Download as PDF  — real .pdf file download via jsPDF (no print dialog)
 *
 * Install once:  npm install jspdf
 */

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
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
import { Button, Dialog, Field, IconButton, Segmented, selectClass } from '../../../components/ui/kit';
import { PdfDownloadButton } from '../../../components/documents/DocumentUi';

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
    });

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

  const positionLabel = locale === 'ar' ? (offer.position?.ar || offer.position?.en) : (offer.position?.en || offer.position?.ar);

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={t('resendModalTitle', 'jobOffers')}
      description={positionLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel', 'jobOffers')}
          </Button>
          <Button
            variant="primary"
            icon={<Send className="size-4" />}
            loading={isSending}
            disabled={!applicant?.email || !resolvedSender}
            onClick={handleSend}
          >
            {isSending ? t('sending', 'jobOffers') : t('send', 'jobOffers')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('to', 'jobOffers')}>
          {applicant?.email ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                {applicant.fullName?.[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{applicant.fullName}</p>
                <p dir="ltr" className="truncate text-start text-xs text-slate-500 dark:text-slate-400">{applicant.email}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {t('noEmailWarning', 'jobOffers')}
            </p>
          )}
        </Field>

        <Field label={t('emailLanguage', 'jobOffers')}>
          <Segmented
            ariaLabel={t('emailLanguage', 'jobOffers')}
            value={emailLang}
            onChange={setEmailLang}
            options={[
              { value: 'en', label: t('english', 'jobOffers') },
              { value: 'ar', label: t('arabic', 'jobOffers') },
            ]}
          />
        </Field>

        <Field label={t('from', 'jobOffers')} htmlFor="resend-from">
          {availableSenders.length > 0 ? (
            <select
              id="resend-from"
              className={selectClass}
              value={resolvedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
            >
              {availableSenders.map((addr) => (
                <option key={addr} value={addr}>
                  {addr}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {t('noSenderWarning', 'jobOffers')}
            </p>
          )}
        </Field>

        {(offer as any).lastEmailSentAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('previouslySentOn', 'jobOffers')}{' '}
            {new Date((offer as any).lastEmailSentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </Dialog>
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
  const { t } = useLocale();
  const { hasPermission } = useAuth();
  const canSendEmail = hasPermission('Mail Management', 'create');

  const handleDownloadPdf = async (lang: 'en' | 'ar') => {
    try {
      await downloadJobOfferAsPdf(offer, lang);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  return (
    <>
      {canSendEmail && (
        <IconButton label={t('resendBtnTitle', 'jobOffers')} onClick={() => setResendOpen(true)}>
          <Mail className="size-4" />
        </IconButton>
      )}
      <PdfDownloadButton
        label={t('downloadPdf', 'jobOffers')}
        languageLabel={t('pdfLanguage', 'jobOffers')}
        englishLabel={t('english', 'jobOffers')}
        arabicLabel={t('arabic', 'jobOffers')}
        onDownload={handleDownloadPdf}
      />
    </>
  );
}
