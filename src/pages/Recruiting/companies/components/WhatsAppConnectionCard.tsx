import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, MessageCircle, RefreshCw, Unplug } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import {
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useRefreshWhatsAppNumbers,
  useUpdateWhatsAppOptions,
  useWhatsAppStatus,
} from '../../../../hooks/queries/useCompanies';

type Props = {
  settingsId?: string;
  canEdit: boolean;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <div className="flex gap-2">
        <input readOnly dir="ltr" value={value} className={inputClass} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className={secondaryBtn}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked: the field is selectable */
            }
          }}
        >
          <Copy className="size-4" />
          {copied ? t('waCopied', 'companies') : t('waCopy', 'companies')}
        </button>
      </div>
    </div>
  );
}

/**
 * Connect a company's own WhatsApp Business account (WhatsApp Cloud API) so the
 * ATS can send messages from the company's numbers.
 */
export default function WhatsAppConnectionCard({ settingsId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: status, isLoading } = useWhatsAppStatus(settingsId);
  const connect = useConnectWhatsApp();
  const update = useUpdateWhatsAppOptions();
  const refresh = useRefreshWhatsAppNumbers();
  const disconnect = useDisconnectWhatsApp();

  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status?.senders) {
      setLabels(Object.fromEntries(status.senders.map((s) => [s.phoneNumberId, s.label || ''])));
    }
  }, [status?.senders]);

  if (!settingsId) return null;

  const fail = (title: string, err: unknown) => Swal.fire({ icon: 'error', title, text: errorMessage(err) });

  const handleConnect = async () => {
    if (!wabaId.trim() || !accessToken.trim()) return;
    try {
      await connect.mutateAsync({
        settingsId,
        wabaId: wabaId.trim(),
        accessToken: accessToken.trim(),
        appSecret: appSecret.trim() || undefined,
      });
      setAccessToken('');
      setAppSecret('');
      Swal.fire({ icon: 'success', title: t('waConnectedTitle', 'companies'), text: t('waConnectedDesc', 'companies') });
    } catch (err) {
      fail(t('waConnectFailed', 'companies'), err);
    }
  };

  const handleDisconnect = async () => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: t('waDisconnectTitle', 'companies'),
      text: t('waDisconnectDesc', 'companies'),
      showCancelButton: true,
      confirmButtonText: t('waDisconnect', 'companies'),
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;
    try {
      await disconnect.mutateAsync(settingsId);
    } catch (err) {
      fail(t('failure', 'companies'), err);
    }
  };

  const handleSaveLabels = async () => {
    try {
      await update.mutateAsync({ settingsId, labels });
    } catch (err) {
      fail(t('failure', 'companies'), err);
    }
  };

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

      <div className="space-y-6 p-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">{t('loading', 'common')}</p>
        ) : status && !status.configAvailable ? (
          <p className="text-sm text-amber-700">{t('waNotAvailable', 'companies')}</p>
        ) : !status?.connected ? (
          <>
            <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-300">
              <li>{t('waStep1', 'companies')}</li>
              <li>{t('waStep2', 'companies')}</li>
              <li>{t('waStep3', 'companies')}</li>
            </ol>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('waWabaId', 'companies')}</label>
                <input dir="ltr" value={wabaId} onChange={(e) => setWabaId(e.target.value)} disabled={!canEdit} className={inputClass} placeholder="123456789012345" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('waAccessToken', 'companies')}</label>
                <input dir="ltr" type="password" autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} disabled={!canEdit} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('waAppSecret', 'companies')}</label>
                <input dir="ltr" type="password" autoComplete="off" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} disabled={!canEdit} className={inputClass} />
              </div>
            </div>
            <div>
              <button type="button" className={primaryBtn} disabled={!canEdit || connect.isPending || !wabaId.trim() || !accessToken.trim()} onClick={handleConnect}>
                {connect.isPending ? t('waConnecting', 'companies') : t('waConnect', 'companies')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="mb-1 text-sm font-semibold">{status.accountName || t('waAccount', 'companies')}</h3>
              <p className="mb-3 text-xs text-slate-500" dir="ltr">WABA {status.wabaId}</p>
              <ul className="space-y-2">
                {status.senders.map((s) => (
                  <li key={s.phoneNumberId} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="wa-default-sender"
                        checked={status.defaultSenderId === s.phoneNumberId}
                        disabled={!canEdit}
                        onChange={() => update.mutate({ settingsId, defaultSenderId: s.phoneNumberId })}
                      />
                      <span dir="ltr" className="font-medium">{s.displayPhone}</span>
                    </label>
                    <span className="text-xs text-slate-500">{s.verifiedName}</span>
                    <input
                      value={labels[s.phoneNumberId] ?? ''}
                      onChange={(e) => setLabels((prev) => ({ ...prev, [s.phoneNumberId]: e.target.value }))}
                      placeholder={t('waLabelPlaceholder', 'companies')}
                      disabled={!canEdit}
                      className={`${inputClass} max-w-xs`}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">{t('waDefaultHint', 'companies')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={secondaryBtn} disabled={!canEdit || update.isPending} onClick={handleSaveLabels}>
                  {t('waSaveLabels', 'companies')}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={!canEdit || refresh.isPending}
                  onClick={() => refresh.mutate(settingsId, { onError: (err) => fail(t('failure', 'companies'), err) })}
                >
                  <RefreshCw className={`size-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
                  {t('waRefreshNumbers', 'companies')}
                </button>
              </div>
            </div>

            {status.webhookUrl && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold">{t('waWebhookTitle', 'companies')}</h3>
                <p className="text-xs text-slate-500">{t('waWebhookHelp', 'companies')}</p>
                <CopyField label={t('waWebhookUrl', 'companies')} value={status.webhookUrl} />
                {status.verifyToken && <CopyField label={t('waVerifyToken', 'companies')} value={status.verifyToken} />}
              </div>
            )}

            {canEdit && (
              <div>
                <button type="button" className={`${secondaryBtn} text-red-600`} disabled={disconnect.isPending} onClick={handleDisconnect}>
                  <Unplug className="size-4" />
                  {t('waDisconnect', 'companies')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
