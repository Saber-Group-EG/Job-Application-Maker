import { CheckCircle2, Lock, MessageCircle, TriangleAlert } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import {
  useUpdateWhatsAppNotifications,
  useWhatsAppNotifications,
  useWhatsAppStatus,
} from '../../../../hooks/queries/useCompanies';
import type { WhatsAppEventKey } from '../../../../types/companies';
import { Badge, Card, CardToolbar, SectionTitle, Segmented } from '../../../../components/ui/kit';

type Props = {
  companyId?: string;
  canEdit: boolean;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

/**
 * WhatsApp applicant updates for one company. Every message is sent from the
 * platform's own number ("SG Hiring"); the company's name appears in the text.
 * The plan decides which updates are available; the company decides whether
 * each goes out automatically or only when someone presses send.
 */
export default function WhatsAppConnectionCard({ companyId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: status } = useWhatsAppStatus(companyId);
  const { data: settings, isLoading } = useWhatsAppNotifications(companyId);
  const update = useUpdateWhatsAppNotifications();

  if (!companyId) return null;

  const setMode = async (key: WhatsAppEventKey, mode: 'auto' | 'manual') => {
    try {
      await update.mutateAsync({ companyId, modes: { [key]: mode } });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('waSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<MessageCircle className="size-4" />}>{t('waTitle', 'companies')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('waSubtitle', 'companies')}</p>
        </div>
        {status?.connected && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
            <CheckCircle2 className="size-3.5" />
            <span dir="ltr">{status.sender?.verifiedName || status.sender?.displayPhone}</span>
          </span>
        )}
      </CardToolbar>

      <div className="space-y-3 p-4">
        {status && !status.configured && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('waNotSetUp', 'companies')}</p>
        )}
        {status?.configured && status.error && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {t('waConnectionError', 'companies')}: {status.error}
            </span>
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">{t('loading', 'common')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {(settings?.events || []).map((ev) => (
              <li key={ev.key} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t(`waEvent_${ev.key}`, 'companies')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t(`waEventHint_${ev.key}`, 'companies')}</p>
                </div>
                {ev.allowedByPlan ? (
                  <Segmented
                    ariaLabel={t(`waEvent_${ev.key}`, 'companies')}
                    value={ev.mode}
                    onChange={(mode) => canEdit && !update.isPending && setMode(ev.key, mode)}
                    options={[
                      { value: 'auto', label: t('waModeAuto', 'companies') },
                      { value: 'manual', label: t('waModeManual', 'companies') },
                    ]}
                  />
                ) : (
                  <Badge tone="slate">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-3" />
                      {t('waNotOnPlan', 'companies')}
                    </span>
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('waModesHint', 'companies')}</p>
      </div>
    </Card>
  );
}
