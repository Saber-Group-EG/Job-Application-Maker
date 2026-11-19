import { Lock, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import Swal from '../../../../utils/swal';
import { useLocale } from '../../../../context/LocaleContext';
import { useApplicantVerification, useUpdateApplicantVerification } from '../../../../hooks/queries/useCompanies';
import type { ApplicantVerificationChannel } from '../../../../types/companies';
import { Badge, Card, CardToolbar, SectionTitle, Switch } from '../../../../components/ui/kit';

type Props = {
  companyId?: string;
  canEdit: boolean;
};

const errorMessage = (err: unknown) => (err as { message?: string })?.message || String(err);

/**
 * Applicant verification for one company: applicants confirm their email or
 * WhatsApp number with a code before applying. Each channel is its own switch
 * and only available when the company's plan includes it. The card is hidden
 * when the plan has neither.
 */
export default function ApplicantVerificationCard({ companyId, canEdit }: Props) {
  const { t } = useLocale();
  const { data: settings, isLoading } = useApplicantVerification(companyId);
  const update = useUpdateApplicantVerification();

  if (!companyId || isLoading || !settings) return null;
  if (!settings.email.planAllowed && !settings.whatsapp.planAllowed) return null;

  const toggle = async (channel: ApplicantVerificationChannel, enabled: boolean) => {
    try {
      await update.mutateAsync({ companyId, channels: { [channel]: enabled } });
    } catch (err) {
      Swal.fire({ icon: 'error', title: t('avSaveFailed', 'companies'), text: errorMessage(err) });
    }
  };

  const rows: { channel: ApplicantVerificationChannel; icon: JSX.Element; unavailable?: string }[] = [
    { channel: 'email', icon: <Mail className="size-4 text-slate-400" /> },
    {
      channel: 'whatsapp',
      icon: <MessageCircle className="size-4 text-slate-400" />,
      unavailable: settings.whatsappAvailable ? undefined : t('avWhatsappUnavailable', 'companies'),
    },
  ];

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<ShieldCheck className="size-4" />}>{t('avTitle', 'companies')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('avSubtitle', 'companies')}</p>
        </div>
      </CardToolbar>
      <div className="space-y-3 p-4">
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {rows.map(({ channel, icon, unavailable }) => {
            const state = settings[channel];
            const label = t(channel === 'email' ? 'avEmail' : 'avWhatsapp', 'companies');
            return (
              <li key={channel} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {unavailable ?? t(channel === 'email' ? 'avEmailHint' : 'avWhatsappHint', 'companies')}
                    </p>
                  </div>
                </div>
                {state.planAllowed ? (
                  <Switch
                    checked={state.enabled}
                    onChange={(checked) => canEdit && !update.isPending && toggle(channel, checked)}
                    label={label}
                  />
                ) : (
                  <Badge tone="slate">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-3" />
                      {t('avNotOnPlan', 'companies')}
                    </span>
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('avOnlyOneNote', 'companies')}</p>
      </div>
    </Card>
  );
}
