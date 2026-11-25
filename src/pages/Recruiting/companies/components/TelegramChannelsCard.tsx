import { useState } from 'react';
import { CheckCircle2, ExternalLink, Lock, Send, Trash2, TriangleAlert } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import {
  useAddTelegramChannel,
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

/**
 * Telegram channels/groups the platform bot posts this company's jobs to.
 * The company adds the bot as an admin of its channel, then connects it here;
 * with auto-posting on, every job is posted when it opens for applications.
 */
export default function TelegramChannelsCard({ companyId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: state, isLoading } = useTelegramChannels(companyId);
  const add = useAddTelegramChannel();
  const update = useUpdateTelegramChannel();
  const remove = useRemoveTelegramChannel();
  const [chat, setChat] = useState('');

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

        {usable && (
          <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-300">
            <li>{t('tgStep1', 'companies', { bot: botHandle })}</li>
            <li>{t('tgStep2', 'companies')}</li>
          </ol>
        )}

        {usable && canEdit && (
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
              {t('tgConnect', 'companies')}
            </Button>
          </form>
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
