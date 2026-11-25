import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, Lock, Send, Trash2, TriangleAlert } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import {
  useAddTelegramChannel,
  useCancelTelegramPending,
  useCheckTelegramPending,
  useRemoveTelegramChannel,
  useTelegramChannels,
  useUpdateTelegramChannel,
} from '../../../../hooks/queries/useJobDistribution';
import { Badge, Button, Card, CardToolbar, IconButton, SectionTitle, Switch, inputClass } from '../../../../components/ui/kit';

type Props = {
  companyId?: string;
  canEdit: boolean;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

// While a code is waiting, ask the server to look for it this often.
const CHECK_EVERY_MS = 5000;

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    window.prompt('Copy:', value);
    return false;
  }
};

function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

/** One numbered step of the connect guide: done, current, or still ahead. */
function Step({
  n,
  state,
  title,
  children,
}: {
  n: number;
  state: 'done' | 'current' | 'upcoming';
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          state === 'done'
            ? 'bg-emerald-500 text-white'
            : state === 'current'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}
      >
        {state === 'done' ? <Check className="size-4" /> : n}
      </span>
      <div className={`min-w-0 flex-1 pb-1 ${state === 'upcoming' ? 'opacity-60' : ''}`}>
        <p className="pt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {state !== 'upcoming' && children && <div className="mt-2 space-y-2">{children}</div>}
      </div>
    </li>
  );
}

/**
 * Telegram channels/groups the platform bot posts this company's jobs to.
 * Connecting is three steps: make the bot an admin of the channel, enter the
 * channel, then post a one-time code in it — the code proves the company runs
 * the channel, so nobody can connect someone else's.
 */
export default function TelegramChannelsCard({ companyId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: state, isLoading } = useTelegramChannels(companyId);
  const add = useAddTelegramChannel();
  const check = useCheckTelegramPending();
  const cancel = useCancelTelegramPending();
  const update = useUpdateTelegramChannel();
  const remove = useRemoveTelegramChannel();
  const [chat, setChat] = useState('');
  const [botAdded, setBotAdded] = useState(false);

  const pending = state?.pending ?? null;
  const pendingCode = pending?.code;

  // Look for the posted code every few seconds while one is waiting.
  const checkRef = useRef(check.mutate);
  checkRef.current = check.mutate;
  useEffect(() => {
    if (!companyId || !pendingCode) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') checkRef.current(companyId);
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [companyId, pendingCode]);

  // The code was found: the waiting channel is now in the list.
  const waitingFor = useRef<{ chatId: string; title: string } | null>(null);
  useEffect(() => {
    if (pending) {
      waitingFor.current = { chatId: pending.chatId, title: pending.title };
      return;
    }
    const was = waitingFor.current;
    waitingFor.current = null;
    if (was && state?.channels.some((c) => c.chatId === was.chatId)) {
      setBotAdded(false);
      Swal.fire({
        icon: 'success',
        title: t('tgConnectedTitle', 'companies'),
        text: t('tgConnectedText', 'companies', { name: was.title }),
      });
    }
  }, [pending, state?.channels, t]);

  if (!companyId) return null;

  const botHandle = state?.bot?.username ? `@${state.bot.username}` : '';
  const usable = Boolean(state?.configured && state?.bot && state?.allowedByPlan);

  const connect = async () => {
    if (!chat.trim()) return;
    try {
      await add.mutateAsync({ companyId, chat: chat.trim() });
      setChat('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgConnectFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const checkNow = async () => {
    try {
      const next = await check.mutateAsync(companyId);
      if (next.pending) {
        Swal.fire({
          icon: 'info',
          title: t('tgNotSeenTitle', 'companies'),
          text: t('tgNotSeenText', 'companies', { code: next.pending.code, name: next.pending.title }),
        });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgConnectFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const cancelPending = async () => {
    try {
      await cancel.mutateAsync(companyId);
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const toggleAuto = async (channelId: string, autoPost: boolean) => {
    try {
      await update.mutateAsync({ companyId, channelId, autoPost });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const disconnect = async (channelId: string, title: string) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: t('tgRemoveTitle', 'companies', { name: title }),
      text: t('tgRemoveText', 'companies'),
      showCancelButton: true,
      confirmButtonText: t('tgRemoveConfirm', 'companies'),
      cancelButtonText: t('cancel', 'common'),
    });
    if (!confirm.isConfirmed) return;
    try {
      await remove.mutateAsync({ companyId, channelId });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const step1: 'done' | 'current' = pending || botAdded ? 'done' : 'current';
  const step2: 'done' | 'current' | 'upcoming' = pending ? 'done' : botAdded ? 'current' : 'upcoming';
  const step3: 'current' | 'upcoming' = pending ? 'current' : 'upcoming';

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Send className="size-4" />}>{t('tgTitle', 'companies')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('tgSubtitle', 'companies')}</p>
        </div>
        {botHandle && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <CheckCircle2 className="size-3.5" />
            <span dir="ltr">{botHandle}</span>
          </span>
        )}
      </CardToolbar>

      <div className="space-y-4 p-4">
        {isLoading && <p className="text-sm text-slate-500">{t('loading', 'common')}</p>}

        {state && !state.configured && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('tgNotSetUp', 'companies')}</p>
        )}
        {state?.configured && state.error && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('tgConnectionError', 'companies')}: {state.error}
            </span>
          </p>
        )}
        {state && !state.allowedByPlan && (
          <Badge tone="slate">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" />
              {t('tgNotOnPlan', 'companies')}
            </span>
          </Badge>
        )}

        {usable && canEdit && (
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('tgConnectTitle', 'companies')}
            </p>
            <ol className="space-y-4">
              <Step n={1} state={step1} title={t('tgStep1Title', 'companies', { bot: botHandle })}>
                <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-300">
                  <li>{t('tgStep1a', 'companies')}</li>
                  <li>{t('tgStep1b', 'companies')}</li>
                  <li>{t('tgStep1c', 'companies', { bot: botHandle })}</li>
                  <li>{t('tgStep1d', 'companies')}</li>
                </ol>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('tgStep1Group', 'companies')}</p>
                {step1 === 'current' && (
                  <div className="flex flex-wrap gap-2">
                    <CopyButton
                      value={botHandle}
                      label={t('tgCopyBot', 'companies', { bot: botHandle })}
                      copiedLabel={t('tgCopied', 'companies')}
                    />
                    <Button type="button" size="sm" variant="primary" onClick={() => setBotAdded(true)}>
                      {t('tgStep1Done', 'companies')}
                    </Button>
                  </div>
                )}
              </Step>

              <Step
                n={2}
                state={step2}
                title={
                  pending
                    ? t('tgStep2DoneTitle', 'companies', { name: pending.title || pending.username || pending.chatId })
                    : t('tgStep2Title', 'companies')
                }
              >
                {step2 === 'current' && (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('tgStep2Hint', 'companies')}</p>
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        connect();
                      }}
                    >
                      <input
                        dir="ltr"
                        value={chat}
                        onChange={(e) => setChat(e.target.value)}
                        placeholder="@your_channel"
                        aria-label={t('tgChannelLabel', 'companies')}
                        className={`${inputClass} sm:flex-1`}
                      />
                      <Button type="submit" variant="primary" loading={add.isPending} disabled={!chat.trim()}>
                        {t('tgContinue', 'companies')}
                      </Button>
                    </form>
                    <button
                      type="button"
                      className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                      onClick={() => setBotAdded(false)}
                    >
                      {t('tgBack', 'companies')}
                    </button>
                  </>
                )}
              </Step>

              <Step n={3} state={step3} title={t('tgStep3Title', 'companies')}>
                {pending && (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {t('tgStep3Hint', 'companies', { name: pending.title || pending.username || pending.chatId })}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <code
                        dir="ltr"
                        className="rounded-lg border-2 border-dashed border-sky-300 bg-sky-50 px-4 py-2 font-mono text-xl font-bold tracking-widest text-sky-800 dark:border-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
                      >
                        {pending.code}
                      </code>
                      <CopyButton
                        value={pending.code}
                        label={t('tgCopyCode', 'companies')}
                        copiedLabel={t('tgCopied', 'companies')}
                      />
                      {pending.username && (
                        <a
                          href={`https://t.me/${pending.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
                        >
                          {t('tgOpenChannel', 'companies')}
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="size-4 animate-spin" />
                      {t('tgWaiting', 'companies')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('tgCodeExpires', 'companies', {
                        time: new Date(pending.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="primary" loading={check.isPending} onClick={checkNow}>
                        {t('tgCheckNow', 'companies')}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" loading={cancel.isPending} onClick={cancelPending}>
                        {t('cancel', 'common')}
                      </Button>
                    </div>
                  </>
                )}
              </Step>
            </ol>
          </div>
        )}

        {(state?.channels.length ?? 0) > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {state!.channels.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <span className="truncate">{c.title || c.username || c.chatId}</span>
                    {c.username && (
                      <a
                        href={`https://t.me/${c.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={t('tgOpenChannel', 'companies')}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.lastError ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {t('tgLastError', 'companies')}: {c.lastError}
                      </span>
                    ) : c.lastPostAt ? (
                      t('tgLastPost', 'companies', { date: new Date(c.lastPostAt).toLocaleString() })
                    ) : (
                      t('tgNoPostsYet', 'companies')
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Switch
                      checked={c.autoPost}
                      label={t('tgAutoPost', 'companies')}
                      disabled={!canEdit || update.isPending}
                      onChange={(next) => toggleAuto(c._id, next)}
                    />
                    {t('tgAutoPost', 'companies')}
                  </label>
                  {canEdit && (
                    <IconButton
                      tone="danger"
                      label={t('tgRemove', 'companies')}
                      onClick={() => disconnect(c._id, c.title || c.chatId)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('tgAutoHint', 'companies')}</p>
      </div>
    </Card>
  );
}
