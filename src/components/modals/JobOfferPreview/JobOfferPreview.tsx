import { X, FileText } from 'lucide-react';
import type { JobOffer } from '../../../services/jobOffersService';
import { useLocale } from '../../../context/LocaleContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  offer: JobOffer | null;
};

export default function JobOfferPreview({ isOpen, onClose, offer }: Props) {
  if (!isOpen) return null;

  const { t } = useLocale();
  const workTypeMap: Record<string, string> = {
    'full-time': 'fullTime',
    'part-time': 'partTime',
    contract: 'contract',
    internship: 'internship',
  };
  const salaryBasic = offer?.salary?.basic ?? null;
  const salaryCurrency = offer?.salary?.currency ?? 'EGP';
  const companyName = (() => {
    if (!offer || typeof offer.companyId === 'string') return '';
    const name = (offer.companyId as any)?.name;
    if (typeof name === 'string') return name;
    return name?.en || name?.ar || '';
  })();
  const applicant = offer?.applicantId ?? null;
  const commissions = Array.isArray(offer?.commissions)
    ? offer?.commissions
    : [];
  const sections = Array.isArray(offer?.sections) ? offer?.sections : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 my-12 mx-4 w-full max-w-4xl h-[80vh] overflow-hidden rounded-lg bg-white dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {offer?.position.en || offer?.position.ar || t('jobOffer', 'modals')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {companyName || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {!offer && (
              <div className="mb-4 rounded border border-dashed border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {t('offerLoading', 'modals')}
              </div>
            )}

            <div className="mb-4 flex items-center gap-4">
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                <FileText className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('position', 'modals')}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {offer?.position.en || offer?.position.ar || '—'}
                </p>
              </div>
              <div className="ml-6">
                <p className="text-sm text-slate-500">{t('basicSalary', 'modals')}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {salaryBasic != null
                    ? `${salaryBasic.toLocaleString()} ${salaryCurrency}`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  {t('applicantInfo', 'modals')}
                </p>
                <div className="rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                  <p className="font-medium">{applicant?.fullName || '—'}</p>
                  <p className="text-sm text-slate-500">
                    {applicant?.email || '—'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {applicant?.phone || '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  {t('details', 'modals')}
                </p>
                <div className="rounded-lg border border-slate-100 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-semibold">{t('workTypeLabel', 'modals')}</span>{' '}
                    {t(workTypeMap[offer?.workType || ''] || '', 'modals') || offer?.workType || '—'}
                  </p>
                  {offer?.workHours && (
                    <p>
                      <span className="font-semibold">{t('workHoursLabel', 'modals')}</span>{' '}
                      {offer.workHours?.ar || offer.workHours?.en || '—'}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">{t('status', 'modals')}</span>{' '}
                    {offer?.status || '—'}
                  </p>
                  {offer?.sentAt && (
                    <p>
                      <span className="font-semibold">{t('sent', 'modals')}</span>{' '}
                      {new Date(offer.sentAt).toLocaleString()}
                    </p>
                  )}
                  {offer?.respondedAt && (
                    <p>
                      <span className="font-semibold">{t('responded', 'modals')}</span>{' '}
                      {new Date(offer.respondedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                {t('commissions', 'modals')}
              </p>
              {commissions.length > 0 ? (
                <div className="space-y-2">
                  {commissions.map((c, i) => (
                    <div
                      key={c._id || i}
                      className="rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{c.label?.en || c.label?.ar || '—'}</p>
                          {c.condition && (
                            <p className="text-sm text-slate-500">
                              {c.condition?.en || c.condition?.ar || '—'}
                            </p>
                          )}
                        </div>
                        <div className="text-sm font-semibold">
                          {c.type === 'percentage'
                            ? `${c.value}%`
                            : `${c.value} ${salaryCurrency}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  {t('noCommissions', 'modals')}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                {t('offerSections', 'modals')}
              </p>
              {sections.length > 0 ? (
                <div className="space-y-4">
                  {sections.map((s, idx) => (
                    <div
                      key={s._id || idx}
                      className="rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                    >
                      <p className="font-semibold">
                        {s.title?.en || s.title?.ar}
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                        {s.items?.map((it, j) => (
                          <li key={it._id || j}>{it.en || it.ar}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  {t('noSections', 'modals')}
                </p>
              )}
            </div>

            {offer?.notes && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  {t('notes', 'modals')}
                </p>
                <div className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-700">
                  {offer.notes?.en || offer.notes?.ar || '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
