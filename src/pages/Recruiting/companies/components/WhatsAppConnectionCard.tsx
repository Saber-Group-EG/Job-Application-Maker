import { CheckCircle2, MessageCircle, TriangleAlert } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { useWhatsAppStatus } from '../../../../hooks/queries/useCompanies';

/**
 * Read-only status of the app's WhatsApp Business connection. The connection is
 * shared by every company and is configured on the server, not per company.
 */
export default function WhatsAppConnectionCard() {
  const { t } = useLocale();
  const { data: status, isLoading } = useWhatsAppStatus();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <MessageCircle className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('waTitle', 'companies')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('waSubtitle', 'companies')}</p>
          </div>
        </div>
        {status?.connected && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
            <CheckCircle2 className="size-3.5" />
            {t('waConnectedBadge', 'companies')}
          </span>
        )}
      </div>

      <div className="space-y-4 p-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">{t('loading', 'common')}</p>
        ) : !status?.configured ? (
          <p className="text-sm text-slate-500">{t('waNotSetUp', 'companies')}</p>
        ) : !status.connected ? (
          <p className="flex items-start gap-2 text-sm text-amber-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('waConnectionError', 'companies')}
              {status.error ? `: ${status.error}` : ''}
            </span>
          </p>
        ) : (
          <>
            <div>
              <h3 className="mb-1 text-sm font-semibold">{status.accountName || t('waAccount', 'companies')}</h3>
              <ul className="mt-2 space-y-2">
                {status.senders.map((s) => (
                  <li
                    key={s.phoneNumberId}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    <span dir="ltr" className="font-medium">{s.displayPhone}</span>
                    {s.verifiedName && <span className="text-xs text-slate-500">{s.verifiedName}</span>}
                    {status.defaultSenderId === s.phoneNumberId && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t('waDefault', 'companies')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">{t('waSharedHint', 'companies')}</p>
            </div>
            {!status.webhookReady && (
              <p className="text-xs text-amber-700">{t('waWebhookPending', 'companies')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
