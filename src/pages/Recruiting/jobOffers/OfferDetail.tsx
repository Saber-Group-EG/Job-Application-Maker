// ─── Detail Panel ─────────────────────────────────────────────────────────────

import {
  ArrowLeft,
  Briefcase,
  Clock,
  Clock3,
  Copy,
  DollarSign,
  FileSignature,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { JobOffer, OfferStatus } from '../../../services/jobOffersService';
import { STATUS_CHIP, WORK_TYPE_COLORS } from './JobOffersPage';
import { useLocale } from '../../../context/LocaleContext';
import { OfferActions } from './OffersActions';
import { Link } from 'react-router';

export function OfferDetail({
  offer,
  canWrite,
  onBack,
  onEdit,
  onDelete,
  onClone,
  onStatusChange,
  showCompany,
  setResendOpen,
  onConvertToContract,
  canCreateContract,
}: {
  offer: JobOffer;
  canWrite: boolean;
  setResendOpen: (open: boolean) => void;
  onBack: () => void;
  onEdit: (o: JobOffer) => void;
  onDelete: (id: string) => void;
  onClone: (offer: JobOffer) => void;
  showCompany: boolean;
  onStatusChange: (id: string, status: OfferStatus) => void;
  onConvertToContract: (offer: JobOffer) => void;
  canCreateContract: boolean;
}) {
  const { t, locale } = useLocale();
  const chip = STATUS_CHIP[offer.status];
  const applicantName = offer.applicantId?.fullName;
  const applicantEmail = offer.applicantId?.email;
  const applicantId = offer.applicantId?._id;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToOffers', 'jobOffers')}
          </button>

          <div className="flex items-center gap-2">
            {/* PDF + resend */}
            <OfferActions offer={offer} setResendOpen={setResendOpen} />

            {/* Convert to Contract — always visible, not write-gated
                since viewing an offer and creating a contract are separate permissions */}
            {canCreateContract && <button
              onClick={() => onConvertToContract(offer)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              title={t('convertToContract', 'jobOffers')}
            >
              <FileSignature className="size-3.5" />
            </button>}

            {/* Write-gated: edit / clone / delete */}
            {canWrite && (
              <>
                <button
                  onClick={() => onEdit(offer)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700"
                  title={t('edit', 'jobOffers')}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => onClone(offer)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700"
                  title={t('clone', 'jobOffers')}
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(offer._id)}
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700"
                  title={t('delete', 'jobOffers')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Offer header */}
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {locale === 'ar' ? (offer.position?.ar || offer.position?.en) : (offer.position?.en || offer.position?.ar)}
            </h2>
            {showCompany && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Briefcase className="size-3.5" />
                <span className="font-medium">
                  {locale === 'ar'
                    ? ((offer.companyId as any)?.name?.ar || (offer.companyId as any)?.name?.en || '')
                    : ((offer.companyId as any)?.name?.en || (offer.companyId as any)?.name?.ar || '')}
                </span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${WORK_TYPE_COLORS[offer.workType]}`}
              >
                {t(
                  offer.workType === 'full-time'
                    ? 'fullTime'
                    : offer.workType === 'part-time'
                      ? 'partTime'
                      : offer.workType || '',
                  'modals',
                )}
              </span>
              {offer.workHours && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="size-3.5" />
                  {locale === 'ar' ? (offer.workHours?.ar || offer.workHours?.en) : (offer.workHours?.en || offer.workHours?.ar)}
                </span>
              )}
              {offer.salary.basic != null && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <DollarSign className="size-3.5" />
                  {offer.salary.basic.toLocaleString()} {offer.salary.currency}
                </span>
              )}
            </div>
          </div>

          {/* Status selector */}
          <select
            className={`rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none ${chip.bg} ${chip.text} ${canWrite ? 'cursor-pointer' : 'cursor-default'}`}
            value={offer.status}
            disabled={!canWrite}
            onChange={(e) =>
              onStatusChange(offer._id, e.target.value as OfferStatus)
            }
          >
            {(
              [
                'draft',
                'sent',
                'accepted',
                'rejected',
                'expired',
              ] as OfferStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {t(
                  `status${s.charAt(0).toUpperCase() + s.slice(1)}` as const,
                  'jobOffers',
                )}
              </option>
            ))}
          </select>
        </div>

        {/* Applicant info */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <Link
              to={`/applicant-details/${applicantId}`}
              className="text-sm font-semibold text-slate-900 dark:text-white"
            >
              {applicantName}
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {applicantEmail}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p>
              {t('createdBy', 'jobOffers')}{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {offer.createdBy?.fullName ?? '—'}
              </span>
            </p>
            <p className="mt-0.5">
              {new Date(offer.createdAt).toLocaleDateString(locale, {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {offer.lastEmailSentAt && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {t('lastEmailed', 'jobOffers')}{' '}
            {new Date(offer.lastEmailSentAt!).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Commissions */}
      {offer.commissions.length > 0 && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <DollarSign className="h-4 w-4" />
            {t('commissionTiers', 'jobOffers')}
          </h3>
          <div className="space-y-2">
            {offer.commissions.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {locale === 'ar' ? (c.label?.ar || c.label?.en) : (c.label?.en || c.label?.ar)}
                  </p>
                  {c.condition && (
                    <p className="text-xs text-slate-400">{locale === 'ar' ? (c.condition?.ar || c.condition?.en) : (c.condition?.en || c.condition?.ar)}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {c.value}
                  {c.type === 'percentage' ? '%' : ` ${offer.salary.currency}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {offer.sections.length > 0 && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4" />
            {t('offerSections', 'jobOffers')}
          </h3>
          <div className="space-y-4">
            {offer.sections
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section, i) => (
                <div key={i}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? (section.title?.ar || section.title?.en) : (section.title?.en || section.title?.ar)}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {locale === 'ar' ? (item.ar || item.en) : (item.en || item.ar)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {offer.notes?.en && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock3 className="h-4 w-4" />
            {t('internalNotesEn', 'jobOffers')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {offer.notes.en}
          </p>
        </div>
      )}

      {offer.notes?.ar && (
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock3 className="h-4 w-4" />
            {t('internalNotesAr', 'jobOffers')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {offer.notes.ar}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Clock3 className="h-4 w-4" />
          {t('timeline', 'jobOffers')}
        </h3>
        <div className="space-y-4">
          {[
            { label: t('timelineCreated', 'jobOffers'), date: offer.createdAt },
            { label: t('timelineSent', 'jobOffers'), date: offer.sentAt },
            { label: t('timelineLastEmailed', 'jobOffers'), date: offer.lastEmailSentAt },
            { label: t('timelineResponded', 'jobOffers'), date: offer.respondedAt },
            { label: t('timelineExpires', 'jobOffers'), date: offer.expiresAt },
          ]
            .filter((e) => e.date)
            .map((event, idx, arr) => (
              <div key={idx} className="flex gap-3">
                <div className="relative flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-brand-500" />
                  {idx !== arr.length - 1 && (
                    <div className="absolute top-2 h-full w-px bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {event.label}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(event.date!).toLocaleString(locale, {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
