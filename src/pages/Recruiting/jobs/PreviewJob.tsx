import { describeError } from '../../../lib/userErrors';
import { useMemo, useState, useEffect } from "react";
import { useLocale } from '../../../context/LocaleContext';
import Swal from '../../../utils/swal';
import { Link, useParams, useNavigate, useLocation } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CircleCheck,
  FileText,
  ListChecks,
  Pencil,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  PageShell,
  SectionTitle,
  Table,
  Td,
  Th,
  focusRing,
  rowClass,
} from "../../../components/ui/kit";
import type { BadgeTone } from "../../../components/ui/kit";
import {
  useCompany,
  useDepartment,
  useDeleteJobPosition,
  useJobPosition,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import { normalizeFieldConfig } from "../../../utils/jobUtils";
import type { JobFieldConfig } from "../../../utils/jobUtils";

// Helper to handle multilingual objects or strings and always return plain text
const getTranslation = (value: any, defaultValue = "", locale?: string): string => {
  const plain = toPlainString(value, locale);
  return plain || defaultValue;
};

export default function PreviewJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get job data from navigation state
  const jobFromState = location.state?.job;
  
  // Fallback: Fetch job by ID only if no data in state
  const {
    data: jobFromApi,
    isPending: isLoadingJob,
    isFetching: isJobFetching,
    isFetched: isJobFetched,
    refetch: refetchJob
  } = useJobPosition(jobId || "", { enabled: !jobFromState && !!jobId });
  
  // Use data from state if available, otherwise use fetched data
  const job = jobFromState || jobFromApi;

  const normalizedFieldConfig = useMemo(
    () =>
      normalizeFieldConfig(
        (job as any)?.fieldConfig,
        typeof (job as any)?.salaryFieldVisible === "boolean"
          ? (job as any).salaryFieldVisible
          : undefined
      ),
    [job]
  );

  const { t, locale } = useLocale();

  const previewFieldConfigItems: Array<{ key: keyof JobFieldConfig; label: string }> = [
    { key: "fullName", label: t('previewFieldFullName', 'jobs') },
    { key: "email", label: t('previewFieldEmail', 'jobs') },
    { key: "phone", label: t('previewFieldPhone', 'jobs') },
    { key: "gender", label: t('previewFieldGender', 'jobs') },
    { key: "birthDate", label: t('previewFieldBirthDate', 'jobs') },
    { key: "address", label: t('previewFieldAddress', 'jobs') },
    { key: "profilePhoto", label: t('previewFieldPhoto', 'jobs') },
    { key: "cvFilePath", label: t('previewFieldCv', 'jobs') },
    { key: "expectedSalary", label: t('previewFieldSalary', 'jobs') },
  ];

  const visibleBaseFieldCount = useMemo(
    () => previewFieldConfigItems.filter((item) => normalizedFieldConfig[item.key].visible).length,
    [normalizedFieldConfig]
  );

  // Extract company and department data or IDs
  const { companyId, companyData, departmentId, departmentData } = useMemo(() => {
    if (!job) return { companyId: undefined, companyData: undefined, departmentId: undefined, departmentData: undefined };
    
    // Check if company is already populated
    const companyIsObject = typeof job.companyId === "object" && job.companyId !== null;
    const companyId = companyIsObject ? (job.companyId as any)?._id : job.companyId as string;
    const companyData = companyIsObject ? job.companyId as any : undefined;
    
    // Check if department is already populated
    const departmentIsObject = typeof job.departmentId === "object" && job.departmentId !== null;
    const departmentId = departmentIsObject ? (job.departmentId as any)?._id : job.departmentId as string;
    const departmentData = departmentIsObject ? job.departmentId as any : undefined;
    
    return { companyId, companyData, departmentId, departmentData };
  }, [job]);

  // Fetch company and department names ONLY if not already populated
  const { data: companyFromApi, isFetched: isCompanyFetched, isFetching: isCompanyFetching, refetch: refetchCompany } = useCompany(companyId || "", { enabled: !companyData && !!companyId });
  const { data: departmentFromApi, isFetched: isDepartmentFetched, isFetching: isDepartmentFetching, refetch: refetchDepartment } = useDepartment(departmentId || "", { enabled: !departmentData && !!departmentId });
  
  // Use populated data if available, otherwise use fetched data
  const company = companyData || companyFromApi;
  const department = departmentData || departmentFromApi;

  // Mutations
  const deleteJobMutation = useDeleteJobPosition();

  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [lastRefetch, setLastRefetch] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingJob && lastRefetch === null && (isJobFetched || isCompanyFetched || isDepartmentFetched)) {
      setLastRefetch(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingJob]);

  useEffect(() => {
    if (!lastRefetch) {
      setElapsed(null);
      return;
    }
    const formatRelative = (d: Date) => {
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return t('previewJustNow', 'jobs');
      const mins = Math.floor(diffSec / 60);
      if (mins < 60) return t('previewMinAgo', 'jobs', { mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return t('previewHourAgo', 'jobs', { hours });
      return d.toLocaleDateString(locale);
    };

    const update = () => setElapsed(formatRelative(lastRefetch));
    update();
    const id = setInterval(update, 30 * 1000);
    return () => clearInterval(id);
  }, [lastRefetch]);

  const getErrorMessage = (err: unknown): string => describeError(err).message;

  const handleEdit = () => {
    navigate(`/create-job?id=${jobId}`, { state: { job } });
  };

  const handleUpdate = async () => {
    try {
      const promises: Promise<any>[] = [];
      if (refetchJob) promises.push(refetchJob());
      if (refetchCompany) promises.push(refetchCompany());
      if (refetchDepartment) promises.push(refetchDepartment());
      if (promises.length === 0) return;
      await Promise.all(promises);
      setLastRefetch(new Date());
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!jobId) return;
    const result = await Swal.fire({
      title: t('previewDeleteTitle', 'jobs'),
      text: t('previewDeleteText', 'jobs'),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: t('previewDeleteConfirm', 'jobs'),
    });
    if (!result.isConfirmed) return;
    try {
      setIsDeletingJob(true);
      await deleteJobMutation.mutateAsync(jobId);
      await Swal.fire({
        title: t('previewDeletedTitle', 'jobs'),
        text: t('previewDeletedText', 'jobs'),
        icon: "success",
        position: "center",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/jobs");
    } catch (err) {
      Swal.fire({
        title: t('previewErrorTitle', 'jobs'),
        text: getErrorMessage(err),
        icon: "error",
      });
    } finally {
      setIsDeletingJob(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('previewNa', 'jobs');
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatEmploymentType = (val: any) => {
    if (!val) return t('previewNa', 'jobs');
    const s = String(val).toLowerCase();
    if (s.includes("full")) return t('createFullTime', 'jobs');
    if (s.includes("part")) return t('createPartTime', 'jobs');
    if (s.includes("contract")) return t('createContract', 'jobs');
    if (s.includes("intern")) return t('createInternship', 'jobs');
    return String(val);
  };

  const formatInputType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      text: t('previewInputTypeText', 'jobs'),
      textarea: t('previewInputTypeTextarea', 'jobs'),
      number: t('previewInputTypeNumber', 'jobs'),
      email: t('previewInputTypeEmail', 'jobs'),
      date: t('previewInputTypeDate', 'jobs'),
      radio: t('previewInputTypeRadio', 'jobs'),
      dropdown: t('previewInputTypeDropdown', 'jobs'),
      checkbox: t('previewInputTypeCheckbox', 'jobs'),
      url: t('previewInputTypeUrl', 'jobs'),
      tags: t('previewInputTypeTags', 'jobs'),
      repeatable_group: t('previewInputTypeGroup', 'jobs'),
    };
    return typeMap[type] || type;
  };

  const back = (
    <Link
      to="/jobs"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('previewBackToList', 'jobs')}
    </Link>
  );

  if (isLoadingJob && !job) {
    return (
      <>
        <PageMeta title={t('previewLoadingTitle', 'jobs')} description={t('previewLoadingDesc', 'jobs')} />
        <LoadingSpinner fullPage message={t('previewLoadingMsg', 'jobs')} />
      </>
    );
  }

  if (!job) {
    return (
      <>
        <PageMeta title={t('previewNotFoundTitle', 'jobs')} description={t('previewNotFoundDesc', 'jobs')} />
        <PageShell back={back} title={t('previewNotFoundTitle', 'jobs')}>
          <Card>
            <EmptyState
              icon={<Briefcase className="size-6" />}
              title={t('previewNotFoundTitle', 'jobs')}
              text={t('previewNotFoundText', 'jobs')}
              action={<Button onClick={() => navigate("/jobs")}>{t('previewGoBack', 'jobs')}</Button>}
            />
          </Card>
        </PageShell>
      </>
    );
  }

  const title = getTranslation(job.title, t('previewUntitledPosition', 'jobs'), locale);
  const companyName = getTranslation((company as any)?.name, t('previewCorporate', 'jobs'), locale);
  const departmentName = toPlainString((department as any)?.name, locale) || t('previewCrossFunctional', 'jobs');
  const syncing = isJobFetching || isCompanyFetching || isDepartmentFetching;
  const expired = (() => {
    if (!job.registrationEnd) return false;
    const end = new Date(job.registrationEnd).getTime();
    return !Number.isNaN(end) && end + 24 * 60 * 60 * 1000 - 1 < Date.now();
  })();
  const status: { tone: BadgeTone; label: string } = expired
    ? { tone: "red", label: t('jobsExpiredBadge', 'jobs') }
    : job.isActive !== false
      ? { tone: "green", label: t('jobsActiveBadge', 'jobs') }
      : { tone: "slate", label: t('jobsDeprioritizedBadge', 'jobs') };

  return (
    <>
      <PageMeta
        title={`${title} | ${t('previewBreadcrumb', 'jobs')}`}
        description={t('previewDetailsFor', 'jobs', { title })}
      />
      <PageShell
        back={back}
        title={title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {job.jobCode && (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {job.jobCode}
              </span>
            )}
            <span>{companyName} · {departmentName}</span>
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleUpdate}
              title={t('previewUpdateData', 'jobs')}
              className={`inline-flex items-center gap-1.5 rounded-md px-1 text-xs text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? t('previewSyncing', 'jobs') : elapsed ? t('previewSyncedAgo', 'jobs', { time: elapsed }) : t('previewSynced', 'jobs')}
            </button>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={handleDelete} loading={isDeletingJob}>
              {isDeletingJob ? t('previewDeleting', 'jobs') : t('previewDeleteJob', 'jobs')}
            </Button>
            <Button variant="primary" icon={<Pencil className="size-4" />} onClick={handleEdit}>
              {t('previewEditJob', 'jobs')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardToolbar>
                <SectionTitle icon={<FileText className="size-4" />}>{t('previewRoleOverview', 'jobs')}</SectionTitle>
              </CardToolbar>
              <p dir="auto" className="whitespace-pre-wrap p-4 text-start text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {getTranslation(job.description, t('previewDescComingSoon', 'jobs'), locale)}
              </p>
            </Card>

            {((job.requirements && job.requirements.length > 0) || (job.termsAndConditions && job.termsAndConditions.length > 0)) && (
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                {job.requirements && job.requirements.length > 0 && (
                  <BulletCard title={t('previewRequirements', 'jobs')} items={job.requirements.map((req: any) => getTranslation(req, '', locale))} />
                )}
                {job.termsAndConditions && job.termsAndConditions.length > 0 && (
                  <BulletCard title={t('previewTerms', 'jobs')} items={job.termsAndConditions.map((term: any) => getTranslation(term, '', locale))} />
                )}
              </div>
            )}

            <Card>
              <CardToolbar>
                <div>
                  <SectionTitle icon={<ListChecks className="size-4" />}>{t('previewBaseFields', 'jobs')}</SectionTitle>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('previewBaseFieldsDesc', 'jobs')}</p>
                </div>
              </CardToolbar>
              <dl className="grid grid-cols-2 divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
                <MiniStat label={t('previewOpenSeats', 'jobs')} value={job.openPositions || 0} />
                <MiniStat label={t('previewBaseFieldsVisible', 'jobs')} value={visibleBaseFieldCount} />
                <MiniStat label={t('previewCustomInputs', 'jobs')} value={job.customFields?.length || 0} />
                <MiniStat label={t('previewScoringFactors', 'jobs')} value={job.jobSpecs?.length || 0} />
              </dl>
              <ul className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-y-0">
                {previewFieldConfigItems.map((item) => {
                  const config = normalizedFieldConfig[item.key];
                  return (
                    <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:border-b sm:border-slate-100 sm:dark:border-slate-800">
                      <span className={`text-sm ${config.visible ? "text-slate-900 dark:text-white" : "text-slate-400 line-through decoration-slate-300"}`}>
                        {item.label}
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        {config.visible ? (
                          <Badge tone={config.required ? "amber" : "slate"}>
                            {config.required ? t('createRequired', 'jobs') : t('previewFieldOptional', 'jobs')}
                          </Badge>
                        ) : (
                          <Badge tone="slate">{t('previewFieldHidden', 'jobs')}</Badge>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {job.customFields && job.customFields.length > 0 && (
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<SlidersHorizontal className="size-4" />}>
                    {t('previewDynamicFields', 'jobs')}
                    <span className="ms-1 font-normal text-slate-400">({job.customFields.length})</span>
                  </SectionTitle>
                </CardToolbar>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {job.customFields.map((field: any, idx: number) => (
                    <li key={field.fieldId ?? idx} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          <bdi>{getTranslation(field.label, t('previewCustomInput', 'jobs'), locale)}</bdi>
                        </p>
                        <span className="flex items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {formatInputType(field.inputType)}
                          </span>
                          {field.isRequired && <Badge tone="amber">{t('createRequiredBadge', 'jobs')}</Badge>}
                        </span>
                      </div>
                      {field.choices && field.choices.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {field.choices.slice(0, 6).map((c: any, i: number) => (
                            <span key={i} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                              <bdi>{getTranslation(c, '', locale)}</bdi>
                            </span>
                          ))}
                          {field.choices.length > 6 && (
                            <span className="px-1 py-0.5 text-xs text-slate-400">{t('previewMoreChoices', 'jobs', { count: field.choices.length - 6 })}</span>
                          )}
                        </div>
                      )}
                      {(field.minValue !== undefined || field.maxValue !== undefined) && (
                        <p className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {field.minValue !== undefined && <span>{t('previewMin', 'jobs', { value: field.minValue })}</span>}
                          {field.maxValue !== undefined && <span>{t('previewMax', 'jobs', { value: field.maxValue })}</span>}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {job.jobSpecs && job.jobSpecs.length > 0 && (
              <Card className="overflow-hidden">
                <CardToolbar>
                  <div>
                    <SectionTitle icon={<Scale className="size-4" />}>{t('previewEvalMatrix', 'jobs')}</SectionTitle>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('previewEvalMatrixDesc', 'jobs')}</p>
                  </div>
                </CardToolbar>
                <Table minWidth={420}>
                  <thead>
                    <tr>
                      <Th>{t('previewAssessmentFactor', 'jobs')}</Th>
                      <Th align="end">{t('previewRelativeWeight', 'jobs')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.jobSpecs.map((spec: any, i: number) => (
                      <tr key={i} className={rowClass}>
                        <Td className="font-medium text-slate-900 dark:text-white">
                          <bdi>{getTranslation(spec.spec, t('previewCriterion', 'jobs'), locale)}</bdi>
                        </Td>
                        <Td align="end">
                          <span className="inline-flex items-center gap-3">
                            <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:block">
                              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(Number(spec.weight) || 0, 100)}%` }} />
                            </span>
                            <span className="w-10 tabular-nums">{spec.weight}%</span>
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                      <Td className="font-semibold text-slate-900 dark:text-white">{t('previewOverallScore', 'jobs')}</Td>
                      <Td align="end" className="font-semibold tabular-nums text-slate-900 dark:text-white">
                        {job.jobSpecs.reduce((sum: number, spec: any) => sum + spec.weight, 0)}%
                      </Td>
                    </tr>
                  </tfoot>
                </Table>
              </Card>
            )}

            {job.allowedStatuses && job.allowedStatuses.length > 0 && company?.settings?.statuses && (
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<CircleCheck className="size-4" />}>{t('previewAllowedStatuses', 'jobs')}</SectionTitle>
                </CardToolbar>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    {job.allowedStatuses.map((statusId: string) => {
                      const st = company.settings.statuses.find((s: any) => s._id === statusId || s.id === statusId);
                      if (!st) return null;
                      return (
                        <span
                          key={statusId}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          <span className="size-2 rounded-full" style={{ backgroundColor: st.color || '#94a3b8' }} />
                          {toPlainString(st.name, locale)}
                        </span>
                      );
                    })}
                  </div>
                  {job.allowedStatuses.some((statusId: string) => !company.settings.statuses.find((s: any) => s._id === statusId || s.id === statusId)) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('previewStatusesNote', 'jobs')}</p>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardToolbar>
                <SectionTitle icon={<Briefcase className="size-4" />}>{t('previewManagePosition', 'jobs')}</SectionTitle>
              </CardToolbar>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <DetailRow label={t('previewCompany', 'jobs')} value={companyName} />
                <DetailRow label={t('previewDepartment', 'jobs')} value={departmentName} />
                <DetailRow label={t('previewType', 'jobs')} value={formatEmploymentType(job?.employmentType)} />
                <DetailRow label={t('previewOpenSeats', 'jobs')} value={job.openPositions || 0} />
                {job.salary && typeof job.salary === "number" && (
                  <DetailRow
                    label={t('previewAnnualComp', 'jobs')}
                    value={
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <span className="tabular-nums">${job.salary.toLocaleString()}</span>
                        <Badge tone={job.salaryVisible ? "blue" : "slate"}>
                          {job.salaryVisible ? t('previewPublic', 'jobs') : t('previewConfidential', 'jobs')}
                        </Badge>
                      </span>
                    }
                  />
                )}
              </dl>
            </Card>

            <Card>
              <CardToolbar>
                <SectionTitle icon={<CalendarDays className="size-4" />}>{t('previewApplicationPeriod', 'jobs')}</SectionTitle>
              </CardToolbar>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <DetailRow label={t('previewStarts', 'jobs')} value={formatDate(job.registrationStart)} />
                <DetailRow label={t('previewCloses', 'jobs')} value={formatDate(job.registrationEnd)} />
              </dl>
            </Card>
          </div>
        </div>
      </PageShell>
    </>
  );
}

function BulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardToolbar>
        <SectionTitle>{title}</SectionTitle>
      </CardToolbar>
      <ul className="space-y-2 p-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            <span dir="auto">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-end font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
