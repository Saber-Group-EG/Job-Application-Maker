import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Inbox,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  Unplug,
} from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import { companiesService } from '../../../../services/companiesService';
import {
  companiesKeys,
  useConnectGmail,
  useDisconnectGmail,
  useGmailStatus,
  useSendGmailTest,
  useSyncGmailInbox,
  useUpdateGmailOptions,
} from '../../../../hooks/queries/useCompanies';

const TWO_STEP_URL = 'https://myaccount.google.com/signinoptions/twosv';
const APP_PASSWORDS_URL = 'https://myaccount.google.com/apppasswords';

type Props = {
  settingsId?: string;
  canEdit: boolean;
  defaultSenderName?: string;
};

const errorMessage = (err: unknown) =>
  (err as { message?: string })?.message || String(err);

export default function GmailConnectionCard({
  settingsId,
  canEdit,
  defaultSenderName,
}: Props) {
  const { t, locale } = useLocale();
  const { data: status, isLoading } = useGmailStatus(settingsId);
  const connectMutation = useConnectGmail();
  const optionsMutation = useUpdateGmailOptions();
  const disconnectMutation = useDisconnectGmail();
  const testMutation = useSendGmailTest();
  const syncMutation = useSyncGmailInbox();

  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receiveEnabled, setReceiveEnabled] = useState(true);
  const [googleStarting, setGoogleStarting] = useState(false);
  const queryClient = useQueryClient();

  // Back from Google's consent screen: show the outcome once, then drop the
  // query parameters so a reload doesn't show it again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('gmail') === 'connected';
    const failure = params.get('gmail_error');
    if (!connected && !failure) return;
    params.delete('gmail');
    params.delete('gmail_error');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    if (settingsId) queryClient.invalidateQueries({ queryKey: companiesKeys.gmailStatus(settingsId) });
    Swal.fire(
      connected
        ? { icon: 'success', title: t('gmailConnectedTitle', 'companies'), text: t('gmailGoogleConnectedDesc', 'companies') }
        : { icon: 'error', title: t('gmailConnectFailed', 'companies'), text: failure || '' }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsId]);

  // Keep the sender-name field in sync with the saved value once connected.
  useEffect(() => {
    if (status?.connected) setSenderName(status.senderName || '');
    else if (!senderName && defaultSenderName) setSenderName(defaultSenderName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.senderName, defaultSenderName]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale]
  );
  const formatDate = (iso: string | null) =>
    iso ? dateFormatter.format(new Date(iso)) : '—';

  if (!settingsId) return null;

  const handleConnect = async () => {
    if (!email.trim() || !appPassword.trim()) return;
    try {
      const res = await connectMutation.mutateAsync({
        settingsId,
        email: email.trim(),
        appPassword,
        senderName: senderName.trim() || undefined,
        receiveEnabled,
      });
      setAppPassword('');
      await Swal.fire({
        icon: res.warning ? 'warning' : 'success',
        title: t('gmailConnectedTitle', 'companies'),
        text: res.warning
          ? `${t('gmailConnectedSendOnly', 'companies')} ${res.warning}`
          : t('gmailConnectedDesc', 'companies', { email: email.trim() }),
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('gmailConnectFailed', 'companies'),
        text: errorMessage(err),
      });
    }
  };

  // Sends the browser to Google; Google returns it to this page.
  const handleGoogleSignIn = async () => {
    setGoogleStarting(true);
    try {
      const { url } = await companiesService.getGmailOAuthUrl(settingsId, {
        returnTo: window.location.href,
        email: email.trim() || undefined,
        senderName: senderName.trim() || undefined,
        receiveEnabled,
      });
      window.location.assign(url);
    } catch (err) {
      setGoogleStarting(false);
      Swal.fire({ icon: 'error', title: t('gmailConnectFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const handleSaveSenderName = async () => {
    try {
      await optionsMutation.mutateAsync({
        settingsId,
        senderName: senderName.trim() || null,
      });
      Swal.fire({
        icon: 'success',
        title: t('gmailSaved', 'companies'),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('failure', 'companies'), text: errorMessage(err) });
    }
  };

  const handleToggleReceive = async (next: boolean) => {
    try {
      await optionsMutation.mutateAsync({ settingsId, receiveEnabled: next });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('failure', 'companies'), text: errorMessage(err) });
    }
  };

  const handleTest = async () => {
    try {
      const res = await testMutation.mutateAsync({ settingsId });
      Swal.fire({
        icon: 'success',
        title: t('gmailTestSentTitle', 'companies'),
        text: t('gmailTestSentDesc', 'companies', { to: res.data.to }),
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('gmailTestFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const handleSync = async () => {
    try {
      const res = await syncMutation.mutateAsync(settingsId);
      Swal.fire({
        icon: res.skipped ? 'info' : 'success',
        title: t('gmailSyncDoneTitle', 'companies'),
        text: res.skipped
          ? res.skipped
          : t('gmailSyncDoneDesc', 'companies', {
              stored: res.stored ?? 0,
              scanned: res.scanned ?? 0,
            }),
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('gmailSyncFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const handleDisconnect = async () => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: t('gmailDisconnectConfirmTitle', 'companies'),
      text: t('gmailDisconnectConfirmDesc', 'companies'),
      showCancelButton: true,
      confirmButtonText: t('gmailDisconnect', 'companies'),
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;
    try {
      await disconnectMutation.mutateAsync(settingsId);
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('failure', 'companies'), text: errorMessage(err) });
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800';
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <Mail className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('gmailTitle', 'companies')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('gmailSubtitle', 'companies')}
            </p>
          </div>
        </div>
        {status?.connected ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
            <CheckCircle2 className="size-3.5" />
            {t('gmailConnectedBadge', 'companies')}
          </span>
        ) : (
          <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t('gmailFreeBadge', 'companies')}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">{t('loading', 'common')}</div>
      ) : status?.connected ? (
        <div className="space-y-5 p-6">
          <div className="flex flex-col gap-1 rounded-xl border border-green-200 bg-green-50/60 p-4 dark:border-green-500/30 dark:bg-green-500/10">
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">
              {t('gmailSendingFrom', 'companies', { email: status.email ?? '' })}
            </p>
            <p className="text-xs text-green-900/70 dark:text-green-200/70">
              {t('gmailConnectedSince', 'companies', {
                date: formatDate(status.connectedAt),
              })}
              {' · '}
              {status.authType === 'oauth'
                ? t('gmailViaGoogle', 'companies')
                : t('gmailViaAppPassword', 'companies')}
            </p>
          </div>

          {status.lastError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <p className="font-semibold">{t('gmailLastError', 'companies')}</p>
                <p className="mt-0.5">{status.lastError}</p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t('gmailSenderName', 'companies')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={t('gmailSenderNamePlaceholder', 'companies')}
                  disabled={!canEdit}
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleSaveSenderName}
                disabled={
                  !canEdit ||
                  optionsMutation.isPending ||
                  (senderName.trim() || null) === (status.senderName || null)
                }
                className={secondaryBtn}
              >
                {t('gmailSave', 'companies')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Inbox className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold">{t('gmailReceiveTitle', 'companies')}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {status.receiveAllowedByPlan
                      ? t('gmailReceiveDesc', 'companies')
                      : t('gmailReceiveNotInPlan', 'companies')}
                  </p>
                  {status.receiveAllowedByPlan && status.receiveEnabled && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t('gmailLastChecked', 'companies', {
                        date: formatDate(status.lastSyncAt),
                      })}
                    </p>
                  )}
                </div>
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={status.receiveEnabled && status.receiveAllowedByPlan}
                  disabled={!canEdit || !status.receiveAllowedByPlan || optionsMutation.isPending}
                  onChange={(e) => handleToggleReceive(e.target.checked)}
                  aria-label={t('gmailReceiveTitle', 'companies')}
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-500 peer-disabled:opacity-50 dark:bg-slate-700" />
                <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTest}
              disabled={!canEdit || testMutation.isPending}
              className={secondaryBtn}
            >
              <Send className="size-4" />
              {testMutation.isPending ? t('gmailSending', 'companies') : t('gmailSendTest', 'companies')}
            </button>
            {status.receiveAllowedByPlan && status.receiveEnabled && (
              <button
                onClick={handleSync}
                disabled={!canEdit || syncMutation.isPending}
                className={secondaryBtn}
              >
                <RefreshCw className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {t('gmailSyncNow', 'companies')}
              </button>
            )}
            <button
              onClick={handleDisconnect}
              disabled={!canEdit || disconnectMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <Unplug className="size-4" />
              {t('gmailDisconnect', 'companies')}
            </button>
          </div>
        </div>
      ) : (
        <div>
        {status?.oauthAvailable && (
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <p className="text-sm font-semibold">{t('gmailGoogleTitle', 'companies')}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t('gmailGoogleDesc', 'companies')}
            </p>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!canEdit || googleStarting}
              className="mt-4 inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {googleStarting ? (
                <div className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              ) : (
                <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
              )}
              {t('gmailGoogleButton', 'companies')}
            </button>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {t('gmailOrAppPassword', 'companies')}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
          <ol className="space-y-4">
            {[
              { n: 1, title: 'gmailStep1Title', desc: 'gmailStep1Desc', href: TWO_STEP_URL, link: 'gmailStep1Link' },
              { n: 2, title: 'gmailStep2Title', desc: 'gmailStep2Desc', href: APP_PASSWORDS_URL, link: 'gmailStep2Link' },
              { n: 3, title: 'gmailStep3Title', desc: 'gmailStep3Desc' },
            ].map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-300">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t(step.title, 'companies')}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {t(step.desc, 'companies')}
                  </p>
                  {step.href && (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
                    >
                      {t(step.link!, 'companies')}
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleConnect();
            }}
          >
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('gmailEmailPlaceholder', 'companies')}
                autoComplete="off"
                disabled={!canEdit}
                className={inputClass}
                required
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder={t('gmailAppPasswordPlaceholder', 'companies')}
                autoComplete="new-password"
                disabled={!canEdit}
                className={inputClass}
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t('gmailSenderNamePlaceholder', 'companies')}
                disabled={!canEdit}
                className={inputClass}
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={receiveEnabled}
                onChange={(e) => setReceiveEnabled(e.target.checked)}
                disabled={!canEdit}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand-500"
              />
              {t('gmailReceiveCheckbox', 'companies')}
            </label>
            <button
              type="submit"
              disabled={!canEdit || connectMutation.isPending || !email.trim() || !appPassword.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connectMutation.isPending ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {connectMutation.isPending
                ? t('gmailConnecting', 'companies')
                : t('gmailConnect', 'companies')}
            </button>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('gmailSecurityNote', 'companies')}
            </p>
          </form>
        </div>
        </div>
      )}
    </div>
  );
}
