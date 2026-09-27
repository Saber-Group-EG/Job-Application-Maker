import { useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import {
  useCompanyUsageDetail,
  useCompRequestQuota,
  useCompAiCredits,
  useToggleAiFeature,
  useToggleAiEnabled,
  useToggleBypassPlanLimits,
} from '../../hooks/queries/useSystemSettings';
import { Button, Sheet, Switch, inputClass } from '../ui/kit';

function ToggleRow({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function CompRow({
  label,
  buttonLabel,
  value,
  onChange,
  onSubmit,
  pending,
}: {
  label: string;
  buttonLabel: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="number"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} tabular-nums`}
      />
      <Button disabled={!value} loading={pending} onClick={onSubmit}>
        {buttonLabel}
      </Button>
    </div>
  );
}

export default function CompanyUsageDetailDrawer({
  companyId,
  onClose,
}: {
  companyId: string | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { data, isLoading } = useCompanyUsageDetail(companyId);
  const compQuota = useCompRequestQuota();
  const compCredits = useCompAiCredits();
  const toggleFeature = useToggleAiFeature();
  const toggleAiEnabled = useToggleAiEnabled();
  const toggleBypass = useToggleBypassPlanLimits();

  const [quotaAmount, setQuotaAmount] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');

  const FEATURE_LABELS: Record<string, string> = {
    jobFieldGenerator: t('featureJobFieldGenerator', 'systemSettings'),
    matchScore: t('featureMatchScore', 'systemSettings'),
    candidateSummary: t('featureCandidateSummary', 'systemSettings'),
    emailDrafting: t('featureEmailDrafting', 'systemSettings'),
    nlFilters: t('featureNlFilters', 'systemSettings'),
    interviewQuestionGen: t('featureInterviewQuestionGen', 'systemSettings'),
    offerGenerator: t('featureOfferGenerator', 'systemSettings'),
    contractGenerator: t('featureContractGenerator', 'systemSettings'),
    cvParse: t('featureCvParse', 'systemSettings'),
  };

  const sectionClass = 'border-t border-slate-200 pt-5 dark:border-slate-800';

  return (
    <Sheet
      open={!!companyId}
      onClose={onClose}
      title={data?.subscription?.companyId?.name.en ?? t('drawerAriaLabel', 'systemSettings')}
      description={data?.subscription?.planName}
    >
      {isLoading || !data ? (
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
          <Loader2 className="size-4 animate-spin" />
        </p>
      ) : (
        <div className="space-y-5">
          <ToggleRow title={t('drawerBypassPlanLimits', 'systemSettings')} hint={t('drawerBypassPlanLimitsHelp', 'systemSettings')}>
            <Switch
              label={t('drawerBypassPlanLimits', 'systemSettings')}
              checked={!!data.bypassPlanLimits}
              disabled={toggleBypass.isPending}
              onChange={(checked) => companyId && toggleBypass.mutate({ companyId, enabled: checked })}
            />
          </ToggleRow>

          <div className={sectionClass}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t('drawerRequestQuota', 'systemSettings')}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t('drawerUsedThisCycle', 'systemSettings', { count: data.requestUsage?.count ?? 0 })}
            </p>
            <CompRow
              label={t('drawerCompAmount', 'systemSettings')}
              buttonLabel={t('drawerCompButton', 'systemSettings')}
              value={quotaAmount}
              onChange={setQuotaAmount}
              pending={compQuota.isPending}
              onSubmit={() =>
                companyId && compQuota.mutate({ companyId, amount: Number(quotaAmount) }, { onSuccess: () => setQuotaAmount('') })
              }
            />
          </div>

          <div className={sectionClass}>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t('drawerAiCredits', 'systemSettings')}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t('drawerUsedAmount', 'systemSettings', { amount: data.aiUsage?.currentUsage?.toFixed(2) ?? '0.00' })}
              {data.aiUsage?.compedCredits ? ` ${t('drawerComped', 'systemSettings', { count: data.aiUsage.compedCredits })}` : ''}
            </p>
            <CompRow
              label={t('drawerCompAmount', 'systemSettings')}
              buttonLabel={t('drawerCompButton', 'systemSettings')}
              value={creditsAmount}
              onChange={setCreditsAmount}
              pending={compCredits.isPending}
              onSubmit={() =>
                companyId && compCredits.mutate({ companyId, amount: Number(creditsAmount) }, { onSuccess: () => setCreditsAmount('') })
              }
            />
          </div>

          <div className={`${sectionClass} space-y-4`}>
            <ToggleRow title={t('drawerAiEnabled', 'systemSettings')} hint={t('drawerAiEnabledHelp', 'systemSettings')}>
              <Switch
                label={t('drawerAiEnabled', 'systemSettings')}
                checked={!!data.aiSettings?.enabled}
                disabled={toggleAiEnabled.isPending}
                onChange={(checked) => companyId && toggleAiEnabled.mutate({ companyId, enabled: checked })}
              />
            </ToggleRow>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('drawerAiFeatures', 'systemSettings')}</p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {Object.entries(data.aiSettings?.featureToggles ?? {}).map(([key, enabled]) => (
                  <li key={key} className="flex items-center justify-between gap-4 px-3 py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{FEATURE_LABELS[key] ?? key}</span>
                    <Switch
                      label={FEATURE_LABELS[key] ?? key}
                      checked={!!enabled}
                      disabled={toggleFeature.isPending}
                      onChange={(checked) => companyId && toggleFeature.mutate({ companyId, feature: key, enabled: checked })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
