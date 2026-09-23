import { useState } from 'react';
import { Check } from 'lucide-react';
import Switch from '../../../components/form/switch/Switch';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import { useLocale } from '../../../context/LocaleContext';
import { useAdminPlans, useUpdatePlanFeature } from '../../../hooks/queries/usePlansAdmin';
import type { Plan, PlanBooleanFeature, PlanLimitFeature } from '../../../types/companies';

type Row =
  | { kind: 'section'; label: string }
  | { kind: 'boolean'; label: string; path: string }
  | { kind: 'limit'; label: string; path: string }
  | { kind: 'readonly'; label: string; getValue: (f: NonNullable<Plan['features']>) => string };

function getNode(features: NonNullable<Plan['features']>, path: string): any {
  return path.split('.').reduce((node: any, key) => node?.[key], features);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function LimitCell({
  node,
  disabled,
  onChangeAllowed,
  onChangeLimit,
}: {
  node: PlanLimitFeature;
  disabled: boolean;
  onChangeAllowed: (allowed: boolean) => void;
  onChangeLimit: (limit: number | null) => void;
}) {
  const { t } = useLocale();
  const [limitText, setLimitText] = useState(
    node.limit == null ? '' : String(node.limit)
  );

  const commitLimit = () => {
    const trimmed = limitText.trim();
    if (trimmed === '') {
      onChangeLimit(0);
      setLimitText('0');
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onChangeLimit(Math.floor(parsed));
    } else {
      setLimitText(node.limit == null ? '' : String(node.limit));
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Switch
        label=""
        checked={node.allowed}
        disabled={disabled}
        onChange={onChangeAllowed}
      />
      {node.allowed && (
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={node.limit == null}
              disabled={disabled}
              onChange={(e) => onChangeLimit(e.target.checked ? null : 0)}
            />
            {t('unlimitedCheckbox', 'adminPlans')}
          </label>
          {node.limit != null && (
            <input
              type="number"
              min={0}
              value={limitText}
              disabled={disabled}
              onChange={(e) => setLimitText(e.target.value)}
              onBlur={commitLimit}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPlansPage() {
  const { t } = useLocale();
  const { data: plans = [], isLoading } = useAdminPlans();
  const updateFeature = useUpdatePlanFeature();
  const mutating = updateFeature.isPending;

  const setAllowed = (planId: string, path: string, allowed: boolean) =>
    updateFeature.mutate({ planId, path, allowed });
  const setLimit = (planId: string, path: string, limit: number | null) =>
    updateFeature.mutate({ planId, path, limit });

  const rows: Row[] = [
    { kind: 'section', label: t('sectionApplicants', 'adminPlans') },
    { kind: 'limit', label: t('applicantsTotal', 'adminPlans'), path: 'applicants.total' },
    {
      kind: 'limit',
      label: t('applicantsBulkInsert', 'adminPlans'),
      path: 'applicants.bulkInsert',
    },
    {
      kind: 'limit',
      label: t('applicantsInterviews', 'adminPlans'),
      path: 'applicants.interviews',
    },
    { kind: 'section', label: t('sectionCompanySettings', 'adminPlans') },
    {
      kind: 'limit',
      label: t('csRejectionReasons', 'adminPlans'),
      path: 'companySettings.rejectionReasons',
    },
    {
      kind: 'limit',
      label: t('csInterviewQuestionGroups', 'adminPlans'),
      path: 'companySettings.interviewQuestionGroups',
    },
    {
      kind: 'limit',
      label: t('csApplicantPages', 'adminPlans'),
      path: 'companySettings.applicantPages',
    },
    {
      kind: 'boolean',
      label: t('csCustomStatusManagement', 'adminPlans'),
      path: 'companySettings.customStatusManagement',
    },
    {
      kind: 'limit',
      label: t('csEmailTemplates', 'adminPlans'),
      path: 'companySettings.emailTemplates',
    },
    {
      kind: 'limit',
      label: t('csOfferTemplates', 'adminPlans'),
      path: 'companySettings.offerTemplates',
    },
    {
      kind: 'limit',
      label: t('csContractTemplates', 'adminPlans'),
      path: 'companySettings.contractTemplates',
    },
    { kind: 'section', label: t('sectionDepartments', 'adminPlans') },
    { kind: 'limit', label: t('departmentsLabel', 'adminPlans'), path: 'departments' },
    { kind: 'section', label: t('sectionEmails', 'adminPlans') },
    { kind: 'limit', label: t('emailsSendLimit', 'adminPlans'), path: 'emails.sendLimit' },
    {
      kind: 'readonly',
      label: t('emailsEmailType', 'adminPlans'),
      getValue: (f) => f.emails.emailType,
    },
    {
      kind: 'readonly',
      label: t('emailsSendReceive', 'adminPlans'),
      getValue: (f) => f.emails.sendReceive,
    },
    { kind: 'section', label: t('sectionContracts', 'adminPlans') },
    { kind: 'boolean', label: t('contractsLabel', 'adminPlans'), path: 'contracts' },
    { kind: 'section', label: t('sectionOffers', 'adminPlans') },
    { kind: 'boolean', label: t('offersLabel', 'adminPlans'), path: 'offers' },
    { kind: 'section', label: t('sectionJobs', 'adminPlans') },
    { kind: 'limit', label: t('jobsPostLimit', 'adminPlans'), path: 'jobs.postLimit' },
    {
      kind: 'boolean',
      label: t('jobsUseSavedFields', 'adminPlans'),
      path: 'jobs.useSavedFields',
    },
    { kind: 'section', label: t('sectionUsers', 'adminPlans') },
    { kind: 'limit', label: t('usersTotal', 'adminPlans'), path: 'users.total' },
    {
      kind: 'readonly',
      label: t('usersDepartmentLevelAccess', 'adminPlans'),
      getValue: (f) =>
        f.users.departmentLevelAccess.allowed
          ? t('allowedLabel', 'adminPlans')
          : t('activeNo', 'adminPlans'),
    },
    { kind: 'section', label: t('sectionAi', 'adminPlans') },
    ...([
      'jobFieldGenerator',
      'matchScore',
      'candidateSummary',
      'emailDrafting',
      'nlFilters',
      'interviewQuestionGen',
      'offerGenerator',
      'contractGenerator',
      'cvParse',
    ] as const).map(
      (key): Row => ({
        kind: 'boolean',
        label: t(`feature${key.charAt(0).toUpperCase()}${key.slice(1)}`, 'adminPlans'),
        path: `ai.${key}`,
      })
    ),
  ];

  return (
    <div className="space-y-6 p-6">
      <PageBreadCrumb pageTitle={t('listPageTitle', 'adminPlans')} />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr>
                  <th className="sticky start-0 z-10 w-64 bg-white p-4 text-start text-sm font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400" />
                  {plans.map((p) => (
                    <th key={p._id} className="min-w-[220px] p-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {p.name}
                          </span>
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              <Check className="size-3" />
                              {t('activeYes', 'adminPlans')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {t('activeNo', 'adminPlans')}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(p.priceCents, p.currency)}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {t('colRequestQuota', 'adminPlans')}: {p.requestQuota}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  if (row.kind === 'section') {
                    return (
                      <tr key={`section-${idx}`} className="border-t border-slate-200 dark:border-slate-800">
                        <td
                          colSpan={plans.length + 1}
                          className="sticky start-0 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                        >
                          {row.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={row.kind === 'readonly' ? row.label : row.path}
                      className="border-t border-slate-100 dark:border-slate-800/60"
                    >
                      <td className="sticky start-0 z-10 w-64 min-h-[64px] bg-white p-4 text-sm font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                        <div className="flex min-h-[36px] items-center">{row.label}</div>
                      </td>
                      {plans.map((p) => {
                        if (!p.features)
                          return <td key={p._id} className="p-4 min-h-[64px]" />;

                        if (row.kind === 'readonly') {
                          return (
                            <td key={p._id} className="min-h-[64px] p-4">
                              <div className="flex min-h-[36px] items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                                {row.getValue(p.features)}
                              </div>
                            </td>
                          );
                        }

                        if (row.kind === 'boolean') {
                          const node = getNode(p.features, row.path) as PlanBooleanFeature;
                          return (
                            <td key={p._id} className="min-h-[64px] p-4">
                              <div className="flex min-h-[36px] items-center justify-center">
                                <Switch
                                  label=""
                                  checked={node.allowed}
                                  disabled={mutating}
                                  onChange={(v) => setAllowed(p._id, row.path, v)}
                                />
                              </div>
                            </td>
                          );
                        }

                        const node = getNode(p.features, row.path) as PlanLimitFeature;
                        return (
                          <td key={p._id} className="min-h-[64px] p-4">
                            <div className="flex min-h-[36px] items-center justify-center">
                              <LimitCell
                                node={node}
                                disabled={mutating}
                                onChangeAllowed={(v) => setAllowed(p._id, row.path, v)}
                                onChangeLimit={(v) => setLimit(p._id, row.path, v)}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
