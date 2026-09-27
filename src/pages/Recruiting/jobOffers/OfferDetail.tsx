// Offer detail view: overview, commissions, sections, notes, status and timeline.
import { Briefcase, Clock3, Copy, DollarSign, FileSignature, FileText, Pencil, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { JobOffer, OfferStatus } from '../../../services/jobOffersService';
import { useLocale } from '../../../context/LocaleContext';
import { BackLink, Badge, Button, Card, CardToolbar, IconButton, PageShell, SectionTitle, focusRing, selectClass } from '../../../components/ui/kit';
import { DocCard, DocTimeline, Meta } from '../../../components/documents/DocumentUi';
import { OfferActions } from './OffersActions';
import { OFFER_STATUSES, OFFER_STATUS_TONE, WORK_TYPE_TONE, offerStatusKey, workTypeKey } from './offerMeta';

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
  const pick = (v?: { en?: string | null; ar?: string | null } | null) => (locale === 'ar' ? v?.ar || v?.en : v?.en || v?.ar) || '';
  const applicantName = offer.applicantId?.fullName;
  const applicantEmail = offer.applicantId?.email;
  const applicantId = offer.applicantId?._id;
  const companyName = pick((offer.companyId as any)?.name);
  const dateFmt: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };

  return (
    <PageShell
      back={<BackLink onClick={onBack}>{t('backToOffers', 'jobOffers')}</BackLink>}
      title={pick(offer.position)}
      subtitle={
        showCompany && companyName ? (
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-3.5" />
            {companyName}
          </span>
        ) : undefined
      }
      actions={
        <>
          <OfferActions offer={offer} setResendOpen={setResendOpen} />
          {canWrite && (
            <>
              <IconButton label={t('edit', 'jobOffers')} onClick={() => onEdit(offer)}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton label={t('clone', 'jobOffers')} onClick={() => onClone(offer)}>
                <Copy className="size-4" />
              </IconButton>
              <IconButton tone="danger" label={t('delete', 'jobOffers')} onClick={() => onDelete(offer._id)}>
                <Trash2 className="size-4" />
              </IconButton>
            </>
          )}
          {canCreateContract && (
            <Button icon={<FileSignature className="size-4" />} onClick={() => onConvertToContract(offer)}>
              {t('convertToContract', 'jobOffers')}
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardToolbar>
              <SectionTitle icon={<UserRound className="size-4" />}>
                {applicantId ? (
                  <Link to={`/applicant-details/${applicantId}`} className={`rounded hover:text-brand-600 hover:underline ${focusRing}`}>
                    {applicantName}
                  </Link>
                ) : (
                  applicantName ?? '—'
                )}
              </SectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={WORK_TYPE_TONE[offer.workType] ?? 'slate'}>{t(workTypeKey(offer.workType), 'modals')}</Badge>
                <Badge tone={OFFER_STATUS_TONE[offer.status]}>{t(offerStatusKey(offer.status), 'jobOffers')}</Badge>
              </div>
            </CardToolbar>
            <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {applicantEmail && (
                <Meta label={t('to', 'jobOffers')}>
                  <span dir="ltr">{applicantEmail}</span>
                </Meta>
              )}
              {offer.salary.basic != null && (
                <Meta label={t('salary', 'jobOffers')}>
                  <span className="tabular-nums">{offer.salary.basic.toLocaleString()} {offer.salary.currency}</span>
                </Meta>
              )}
              {offer.workHours && pick(offer.workHours) && <Meta label={t('workHours', 'jobOffers')}>{pick(offer.workHours)}</Meta>}
              <Meta label={t('createdBy', 'jobOffers')}>{offer.createdBy?.fullName ?? '—'}</Meta>
              <Meta label={t('timelineCreated', 'jobOffers')}>{new Date(offer.createdAt).toLocaleDateString(locale, dateFmt)}</Meta>
              {offer.lastEmailSentAt && (
                <Meta label={t('timelineLastEmailed', 'jobOffers')}>{new Date(offer.lastEmailSentAt).toLocaleDateString(locale, dateFmt)}</Meta>
              )}
            </dl>
          </Card>

          {offer.commissions.length > 0 && (
            <DocCard icon={<DollarSign className="size-4" />} title={t('commissionTiers', 'jobOffers')}>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {offer.commissions.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{pick(c.label as any)}</p>
                      {c.condition && <p className="text-xs text-slate-500 dark:text-slate-400">{pick(c.condition as any)}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {c.value}
                      {c.type === 'percentage' ? '%' : ` ${offer.salary.currency}`}
                    </span>
                  </li>
                ))}
              </ul>
            </DocCard>
          )}

          {offer.sections.length > 0 && (
            <DocCard icon={<FileText className="size-4" />} title={t('offerSections', 'jobOffers')}>
              <div className="space-y-5">
                {offer.sections
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((section, i) => (
                    <div key={i}>
                      <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{pick(section.title)}</h3>
                      <ul className="space-y-1.5">
                        {section.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                            {pick(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </DocCard>
          )}

          {(offer.notes?.en || offer.notes?.ar) && (
            <DocCard icon={<Clock3 className="size-4" />} title={t('internalNotes', 'jobOffers')}>
              <div className="space-y-3">
                {offer.notes?.en && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('internalNotesEn', 'jobOffers')}</p>
                    <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{offer.notes.en}</p>
                  </div>
                )}
                {offer.notes?.ar && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('internalNotesAr', 'jobOffers')}</p>
                    <p dir="rtl" className="mt-0.5 whitespace-pre-line text-start text-sm text-slate-700 dark:text-slate-300">{offer.notes.ar}</p>
                  </div>
                )}
              </div>
            </DocCard>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <label htmlFor="offer-status" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('status', 'jobOffers')}
            </label>
            <select
              id="offer-status"
              className={selectClass}
              value={offer.status}
              disabled={!canWrite}
              onChange={(e) => onStatusChange(offer._id, e.target.value as OfferStatus)}
            >
              {OFFER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(offerStatusKey(s), 'jobOffers')}
                </option>
              ))}
            </select>
          </Card>

          <DocCard icon={<Clock3 className="size-4" />} title={t('timeline', 'jobOffers')}>
            <DocTimeline
              locale={locale}
              events={[
                { label: t('timelineCreated', 'jobOffers'), date: offer.createdAt },
                { label: t('timelineSent', 'jobOffers'), date: offer.sentAt },
                { label: t('timelineLastEmailed', 'jobOffers'), date: offer.lastEmailSentAt },
                { label: t('timelineResponded', 'jobOffers'), date: offer.respondedAt },
                { label: t('timelineExpires', 'jobOffers'), date: offer.expiresAt },
              ]}
            />
          </DocCard>
        </div>
      </div>
    </PageShell>
  );
}
