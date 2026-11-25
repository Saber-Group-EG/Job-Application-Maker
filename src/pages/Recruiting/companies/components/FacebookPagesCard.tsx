import { useState } from 'react';
import { ExternalLink, Lock, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import { useDisconnectMeta, useMetaPages, useUpdateMetaPage } from '../../../../hooks/queries/useJobDistribution';
import { jobDistributionService } from '../../../../services/jobDistributionService';
import { Badge, Button, Card, CardToolbar, SectionTitle, Switch } from '../../../../components/ui/kit';

type Props = {
  companyId?: string;
  canEdit: boolean;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

/** Where Facebook sends people back after they log in (listed in the Meta app). */
const metaRedirectUri = () => `${window.location.origin}/integrations/meta/callback`;

const FacebookMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8Z" />
  </svg>
);

/**
 * Facebook Pages and their Instagram accounts that jobs are posted to. The
 * company connects with Facebook Login (which proves they manage the Page),
 * then turns auto-posting on per Page and per Instagram account.
 */
export default function FacebookPagesCard({ companyId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: state, isLoading } = useMetaPages(companyId);
  const update = useUpdateMetaPage();
  const disconnect = useDisconnectMeta();
  const [starting, setStarting] = useState(false);

  if (!companyId) return null;
  const usable = Boolean(state?.configured && state?.allowedByPlan);

  const connect = async () => {
    setStarting(true);
    try {
      const { url } = await jobDistributionService.metaConnectUrl({ companyId, redirectUri: metaRedirectUri() });
      window.location.assign(url);
    } catch (err) {
      setStarting(false);
      Swal.fire({ icon: 'error', title: t('fbConnectFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const toggle = async (pageId: string, field: 'facebookAutoPost' | 'instagramAutoPost', value: boolean) => {
    try {
      await update.mutateAsync({ companyId, pageId, [field]: value });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const onDisconnect = async () => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: t('fbDisconnectTitle', 'companies'),
      text: t('fbDisconnectText', 'companies'),
      showCancelButton: true,
      confirmButtonText: t('fbDisconnect', 'companies'),
      cancelButtonText: t('cancel', 'common'),
    });
    if (!confirm.isConfirmed) return;
    try {
      await disconnect.mutateAsync(companyId);
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('tgSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<FacebookMark className="size-4" />}>{t('fbTitle', 'companies')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('fbSubtitle', 'companies')}</p>
        </div>
        {state?.connected && state.userName && (
          <span className="self-start text-xs text-slate-500 dark:text-slate-400">
            {t('fbConnectedAs', 'companies', { name: state.userName })}
          </span>
        )}
      </CardToolbar>

      <div className="space-y-4 p-4">
        {isLoading && <p className="text-sm text-slate-500">{t('loading', 'common')}</p>}
        {state && !state.configured && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('fbNotSetUp', 'companies')}</p>
        )}
        {state && !state.allowedByPlan && (
          <Badge tone="slate">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" />
              {t('tgNotOnPlan', 'companies')}
            </span>
          </Badge>
        )}

        {usable && !state!.connected && (
          <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('fbHowTitle', 'companies')}</p>
            <ol className="list-decimal space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-300">
              <li>{t('fbStep1', 'companies')}</li>
              <li>{t('fbStep2', 'companies')}</li>
              <li>{t('fbStep3', 'companies')}</li>
            </ol>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('fbInstagramNote', 'companies')}</p>
            {canEdit && (
              <Button variant="primary" icon={<FacebookMark className="size-4" />} loading={starting} onClick={connect}>
                {t('fbConnect', 'companies')}
              </Button>
            )}
          </div>
        )}

        {usable && state!.connected && (
          <>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {state!.pages.map((p) => (
                <li key={p.pageId} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <span className="truncate">{p.name}</span>
                      <a
                        href={`https://www.facebook.com/${p.pageId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={t('fbOpenPage', 'companies')}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.lastError ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <TriangleAlert className="size-3.5" />
                          {p.lastError}
                        </span>
                      ) : p.lastPostAt ? (
                        t('tgLastPost', 'companies', { date: new Date(p.lastPostAt).toLocaleString() })
                      ) : (
                        t('tgNoPostsYet', 'companies')
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Switch
                        checked={p.facebookAutoPost}
                        label={t('fbAutoFacebook', 'companies')}
                        disabled={!canEdit || update.isPending}
                        onChange={(next) => toggle(p.pageId, 'facebookAutoPost', next)}
                      />
                      {t('fbAutoFacebook', 'companies')}
                    </label>
                    {p.instagram ? (
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Switch
                          checked={p.instagramAutoPost}
                          label={t('fbAutoInstagram', 'companies', { account: `@${p.instagram.username}` })}
                          disabled={!canEdit || update.isPending}
                          onChange={(next) => toggle(p.pageId, 'instagramAutoPost', next)}
                        />
                        <span dir="auto">{t('fbAutoInstagram', 'companies', { account: `@${p.instagram.username}` })}</span>
                      </label>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t('fbNoInstagram', 'companies')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('fbAutoHint', 'companies')}</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={<RefreshCw className="size-4" />} loading={starting} onClick={connect}>
                  {t('fbReconnect', 'companies')}
                </Button>
                <Button size="sm" variant="secondary" icon={<LogOut className="size-4" />} loading={disconnect.isPending} onClick={onDisconnect}>
                  {t('fbDisconnect', 'companies')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
