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

// ─── PDF generator (jsPDF, no html2canvas, no print dialog) ──────────────────

async function downloadOfferAsPdf(
  offer: JobOffer,
  lang: 'en' | 'ar' = 'en'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // helper: pick the right lang from a BilingualField, fallback to the other
  const pick = (
    field: { en?: string; ar?: string } | string | null | undefined
  ): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return (lang === 'ar' ? field.ar || field.en : field.en || field.ar) ?? '';
  };

  // ── Brand accent bar ─────────────────────────────────────────────────────
  doc.setFillColor(239, 68, 68);
  doc.rect(0, 0, pageW, 6, 'F');
  y += 4;

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  doc.text(lang === 'ar' ? 'عرض عمل' : 'Job Offer', margin, (y += 14));

  doc.setFontSize(13);
  doc.setTextColor(99, 102, 241);
  doc.text(pick(offer.position), margin, (y += 9));

  // ── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, (y += 5), pageW - margin, y);

  // ── Applicant block ──────────────────────────────────────────────────────
  const applicantName =
    typeof offer.applicantId === 'object' && offer.applicantId !== null
      ? offer.applicantId.fullName
      : null;
  const applicantEmail =
    typeof offer.applicantId === 'object' && offer.applicantId !== null
      ? offer.applicantId.email
      : null;

  if (applicantName) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(lang === 'ar' ? 'مُعَدّ لـ' : 'PREPARED FOR', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(applicantName, margin, (y += 5));
    if (applicantEmail) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(applicantEmail, margin, (y += 5));
    }
  }

  // ── Core details table ───────────────────────────────────────────────────
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(lang === 'ar' ? 'تفاصيل العرض' : 'Offer Details', margin, y);
  y += 4;

  const workHoursText = pick(offer.workHours);
  const details: [string, string][] = [
    [
      lang === 'ar' ? 'نوع العمل' : 'Work Type',
      offer.workType.replace('-', ' '),
    ],
    ...(workHoursText
      ? ([[lang === 'ar' ? 'ساعات العمل' : 'Work Hours', workHoursText]] as [
          string,
          string,
        ][])
      : []),
    ...(offer.salary.basic != null
      ? ([
          [
            lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary',
            `${offer.salary.basic.toLocaleString()} ${offer.salary.currency}`,
          ],
        ] as [string, string][])
      : []),
  ];

  const rowH = 8;
  const labelW = 50;

  details.forEach(([label, value], i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentW, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 3, rowY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(value, margin + labelW, rowY + 5.5);
  });

  y += details.length * rowH + 10;

  // ── Commission tiers ─────────────────────────────────────────────────────
  if (offer.commissions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(
      lang === 'ar' ? 'هيكل العمولات' : 'Commission Structure',
      margin,
      y
    );
    y += 5;

    offer.commissions.forEach((c, i) => {
      if (y > pageH - 30) {
        doc.addPage();
        y = margin;
      }

      const rowY = y + i * rowH;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, contentW, rowH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(pick(c.label), margin + 3, rowY + 5.5);

      const conditionText = pick(c.condition);
      if (conditionText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(conditionText, margin + 3, rowY + 5.5 + 3.5);
      }

      const valStr = `${c.value}${c.type === 'percentage' ? '%' : ` ${offer.salary.currency}`}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(valStr, pageW - margin - 3, rowY + 5.5, { align: 'right' });
    });

    y += offer.commissions.length * rowH + 10;
  }

  // ── Offer sections ───────────────────────────────────────────────────────
  const sorted = [...offer.sections].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  for (const section of sorted) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(pick(section.title).toUpperCase(), margin + 3, y + 5);
    y += 10;

    for (const item of section.items) {
      if (y > pageH - 20) {
        doc.addPage();
        y = margin;
      }
      const text =
        (lang === 'ar' ? item.ar || item.en : item.en || item.ar) ?? '';
      const lines = doc.splitTextToSize(`• ${text}`, contentW - 6) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(lines, margin + 3, y);
      y += lines.length * 5 + 1;
    }
    y += 5;
  }

  // ── Internal notes ───────────────────────────────────────────────────────
  const notesText = pick(offer.notes);
  if (notesText) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 5, 'F');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      lang === 'ar' ? 'ملاحظات داخلية' : 'Internal Notes',
      margin + 3,
      y + 3.5
    );
    y += 7;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(notesText, contentW - 6) as string[];
    doc.text(noteLines, margin + 3, y);
    y += noteLines.length * 5 + 5;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(239, 68, 68);
    doc.rect(0, pageH - 4, pageW, 4, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${p} of ${totalPages}  ·  Generated ${new Date().toLocaleDateString()}`,
      pageW / 2,
      pageH - 7,
      { align: 'center' }
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const positionSlug = pick(offer.position)
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const applicantSlug = applicantName
    ? `_${applicantName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    : '';
  doc.save(`job_offer_${positionSlug}${applicantSlug}.pdf`);
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
        aria-label="Resend offer email"
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
                  Resend Offer Email
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {offer.position.en} {offer.position.ar && ` / ${offer.position.ar}`}
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
                To
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
                  ⚠️ No email address on record for this applicant.
                </p>
              )}
            </div>
            {/* Language */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                Email Language
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
                    {lang === 'en' ? 'English' : 'Arabic'}
                  </button>
                ))}
              </div>
            </div>
            {/* Sender */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
                From
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
                  ⚠️ No sender addresses configured for this company.
                </p>
              )}
            </div>

            {/* Last sent note */}
            {(offer as any).lastEmailSentAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Previously sent on{' '}
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
              Cancel
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
              {isSending ? 'Sending…' : 'Send'}
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
    setPdfPopoverOpen(false);
    setPdfLoading(true);
    try {
      await downloadOfferAsPdf(offer, lang); // pass lang
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      {/* Resend email */}
      {canSendEmail && (
        <button
          onClick={() => setResendOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          title="Resend offer email"
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
          title="Download as PDF"
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
              PDF Language
            </p>
            {(['en', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleDownloadPdf(lang)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span>{lang === 'en' ? 'English' : 'Arabic'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
