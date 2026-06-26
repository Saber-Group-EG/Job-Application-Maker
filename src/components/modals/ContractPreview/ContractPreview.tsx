import { X, FileText } from 'lucide-react';
import { toPlainString } from '../../../utils/strings';
import { useLocale } from '../../../context/LocaleContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  contract: any | null;
};

const renderValue = (val: any) => toPlainString(val) || '—';

export default function ContractPreview({ isOpen, onClose, contract }: Props) {
  if (!isOpen) return null;

  const { t, locale } = useLocale();
  const companyName = typeof contract?.companyId === 'string'
    ? contract?.companyId
    : toPlainString(contract?.companyId?.name);
  const salaryBasic = contract?.salary?.basic ?? null;
  const salaryCurrency = contract?.salary?.currency ?? 'EGP';
  const sections = Array.isArray(contract?.sections) ? contract?.sections : [];
  const benefits = Array.isArray(contract?.benefits) ? contract?.benefits : [];

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
                {renderValue(contract?.position) || t('jobContract', 'modals')}
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
            {!contract && (
              <div className="mb-4 rounded border border-dashed border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {t('contractLoading', 'modals')}
              </div>
            )}

            <div className="mb-4 flex items-center gap-4">
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                <FileText className="h-6 w-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('position', 'modals')}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {renderValue(contract?.position)}
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
                  <p className="font-medium">{contract?.applicantId?.fullName || '—'}</p>
                  <p className="text-sm text-slate-500">
                    {contract?.applicantId?.email || '—'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {contract?.applicantId?.phone || '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  {t('details', 'modals')}
                </p>
                <div className="rounded-lg border border-slate-100 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-semibold">{t('type', 'modals')}</span>{' '}
                    {contract?.contractType ? t(contract.contractType.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), 'modals') : '—'}
                  </p>
                  <p>
                    <span className="font-semibold">{t('status', 'modals')}</span>{' '}
                    {contract?.status ? t(`status${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}`, 'jobContracts') : '—'}
                  </p>
                  {contract?.startDate && (
                    <p>
                      <span className="font-semibold">{t('start', 'modals')}</span>{' '}
                      {new Date(contract.startDate).toLocaleDateString(locale)}
                    </p>
                  )}
                  {contract?.endDate && (
                    <p>
                      <span className="font-semibold">{t('end', 'modals')}</span>{' '}
                      {new Date(contract.endDate).toLocaleDateString(locale)}
                    </p>
                  )}
                  {contract?.signedAt && (
                    <p>
                      <span className="font-semibold">{t('signed', 'modals')}</span>{' '}
                      {new Date(contract.signedAt).toLocaleString(locale)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                {t('benefits', 'modals')}
              </p>
              {benefits.length > 0 ? (
                <div className="space-y-2">
                  {benefits.map((b: any, i: number) => (
                    <div
                      key={b._id || i}
                      className="rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{renderValue(b.label)}</p>
                          {b.value && (
                            <p className="text-sm text-slate-500">
                              {renderValue(b.value)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  {t('noBenefits', 'modals')}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                {t('contractSections', 'modals')}
              </p>
              {sections.length > 0 ? (
                <div className="space-y-4">
                  {sections.map((s: any, idx: number) => (
                    <div
                      key={s._id || idx}
                      className="rounded-lg border border-slate-100 p-3 dark:border-slate-700"
                    >
                      <p className="font-semibold">{renderValue(s.title)}</p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                        {s.items?.map((it: any, j: number) => (
                          <li key={it._id || j}>{renderValue(it)}</li>
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

            {contract?.notes && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                  {t('notes', 'modals')}
                </p>
                <div className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-700">
                  {renderValue(contract.notes)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
