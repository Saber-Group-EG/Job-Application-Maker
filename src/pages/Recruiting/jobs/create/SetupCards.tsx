// The top of the job form: start from an existing job, pick the company and
// department, and optionally draft fields with AI.
import { Building2, Copy, Loader2, Sparkles } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { toPlainString } from '../../../../utils/strings';
import type { JobPosition } from '../../../../types/jobPositions';
import { Button, Card, CardToolbar, Field, SectionTitle, inputClass, selectClass } from '../../../../components/ui/kit';

type Option = { value: string; label: string };

export function DuplicateJobCard({
  jobs,
  value,
  onChange,
  loading,
}: {
  jobs: JobPosition[];
  value: string;
  onChange: (jobId: string) => void;
  loading: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Copy className="size-4" />}>{t('createQuickStart', 'jobs')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('cjQuickStartHint', 'jobs')}</p>
        </div>
      </CardToolbar>
      <div className="space-y-2 p-4">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t('createQuickStart', 'jobs')}
          className={`${selectClass} max-w-2xl`}
          disabled={loading}
        >
          <option value="">{t('createStartScratch', 'jobs')}</option>
          {jobs.map((job) => {
            const company = typeof job.companyId === 'object' ? job.companyId?.name : '';
            return (
              <option key={job._id} value={job._id}>
                {`${toPlainString(job.title)} - ${toPlainString(company || '')}`}
              </option>
            );
          })}
        </select>
        {loading && (
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="size-3.5 animate-spin" />
            {t('createLoadingJobs', 'jobs')}
          </p>
        )}
        {value && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('createTemplatesLoaded', 'jobs')}</p>}
      </div>
    </Card>
  );
}

export function CompanyDepartmentCard({
  isEditMode,
  companies,
  departments,
  companyId,
  departmentId,
  onCompanyChange,
  onDepartmentChange,
  departmentDisabled,
  departmentPlaceholder,
}: {
  isEditMode: boolean;
  companies: Option[];
  departments: Option[];
  companyId: string;
  departmentId: string;
  onCompanyChange: (companyId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  departmentDisabled: boolean;
  departmentPlaceholder: string;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Building2 className="size-4" />}>{t('createCompanyOrg', 'jobs')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isEditMode ? t('createCompanyOrgDescEdit', 'jobs') : t('createCompanyOrgDescCreate', 'jobs')}
          </p>
        </div>
      </CardToolbar>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <Field label={t('createTargetCompany', 'jobs')} htmlFor="cj-company">
          {companies.length > 0 ? (
            <select
              id="cj-company"
              required
              value={companyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{t('createSelectCompany', 'jobs')}</option>
              {companies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={`${inputClass} text-slate-500`}>{t('createNoCompanies', 'jobs')}</p>
          )}
        </Field>
        <Field label={t('createDepartment', 'jobs')} htmlFor="cj-department">
          <select
            id="cj-department"
            required
            value={departmentId}
            disabled={departmentDisabled}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className={selectClass}
          >
            <option value="">{departmentPlaceholder}</option>
            {departments.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Card>
  );
}

export function AiGenerateCard({
  prompt,
  onPromptChange,
  onGenerate,
  pending,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  pending: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card className="border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="space-y-3 p-4">
        <div>
          <SectionTitle icon={<Sparkles className="size-4 text-brand-500" />}>{t('createAiGenerateLabel', 'jobs')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('createAiGenerateDesc', 'jobs')}</p>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t('createAiGeneratePlaceholder', 'jobs')}
          aria-label={t('createAiGenerateLabel', 'jobs')}
          rows={3}
          className={`${inputClass} resize-y`}
        />
        <Button
          variant="primary"
          onClick={onGenerate}
          loading={pending}
          disabled={!prompt.trim()}
          icon={<Sparkles className="size-4" />}
        >
          {pending ? t('createAiGenerating', 'jobs') : t('createAiGenerateButton', 'jobs')}
        </Button>
      </div>
    </Card>
  );
}
