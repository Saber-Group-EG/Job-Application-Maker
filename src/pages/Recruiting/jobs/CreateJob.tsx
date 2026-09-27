import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Swal from '../../../utils/swal';
import PageMeta from '../../../components/common/PageMeta';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { ValidationErrorAlert } from '../../../components/common/ValidationErrorAlert';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { jobPositionsService } from '../../../services/jobPositionsService';
import { useCompanies, useDepartments, useGenerateJobFields, useSavedFields } from '../../../hooks/queries';
import { useRecommendedFields } from '../../../hooks/queries/useSystemSettings';
import { useCreateJobPosition, useJobPositions, useUpdateJobPosition } from '../../../hooks/queries/useJobPositions';
import { toPlainString } from '../../../utils/strings';
import { translateText } from '../../../utils/translate';
import { Button, PageShell, focusRing } from '../../../components/ui/kit';
import type { JobPosition } from '../../../types/jobPositions';
import { AiGenerateCard, CompanyDepartmentCard, DuplicateJobCard } from './create/SetupCards';
import { ApplicantFieldsCard, ApplicationWindowCard, CompensationCard, JobDetailsCard } from './create/DetailsCards';
import TermsCard from './create/TermsCard';
import JobSpecsCard from './create/JobSpecsCard';
import CustomFieldsCard from './create/CustomFieldsCard';
import {
  appendLibraryFields,
  buildJobPayload,
  duplicateJobToForm,
  editJobToForm,
  emptyJobForm,
  generateJobCode,
  getJobErrorMessage,
  mergeGeneratedFields,
  nextCompanyOrder as computeNextCompanyOrder,
  normalizeAllowedStatuses,
  patchField,
  patchSpec,
  patchSubField,
  refId,
} from './create/jobFormUtils';
import type { CompanyStatusOption, CustomFieldDraft, JobForm, LibraryField } from './create/types';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin', 'superadmin', 'super admin']);
const SUPER_ADMIN_ROLE_NAMES = new Set(['super admin', 'superadmin', 'super_admin']);

export default function CreateJob() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const editJobId = searchParams.get('id');
  const jobFromState = (location.state as { job?: JobPosition } | null)?.job;
  const { user } = useAuth();
  const { t } = useLocale();

  // ─── Who is editing ────────────────────────────────────────────────────────
  const roleName = String(user?.roleId?.name || user?.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLE_NAMES.has(String(user?.role || '').toLowerCase()) || ADMIN_ROLE_NAMES.has(roleName);
  const isSuperAdmin = !!user && SUPER_ADMIN_ROLE_NAMES.has(roleName);
  const hasMultipleCompanies = (user?.companies?.length || 0) > 1;

  // Company scope for queries: undefined = all companies (super admin).
  const userCompanyIds = useMemo(() => {
    if (!user || isSuperAdmin) return undefined;
    const ids = user.companies?.map((c) => refId(c.companyId));
    return ids && ids.length ? ids : undefined;
  }, [user, isSuperAdmin]);
  // Jobs for "Quick start"; the sentinel stops users without companies from fetching everything.
  const jobsScope = useMemo(
    () => (isSuperAdmin ? undefined : (userCompanyIds ?? ['__NO_COMPANY__'])),
    [isSuperAdmin, userCompanyIds]
  );

  // ─── State ─────────────────────────────────────────────────────────────────
  const [jobForm, setJobForm] = useState<JobForm>(() => emptyJobForm());
  // Collapsed custom-field cards, by fieldId.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [jobStatus, setJobStatus] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [translatingAll, setTranslatingAll] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const companyAutoSet = useRef(false);
  const jobDataLoaded = useRef(false);

  const collapseAll = (fields: CustomFieldDraft[]) => setCollapsed(new Set(fields.map((f) => f.fieldId)));

  // ─── Data ──────────────────────────────────────────────────────────────────
  const { data: allCompanies = [], isLoading: companiesLoading } = useCompanies(userCompanyIds);
  const { data: allJobs = [], isLoading: jobsLoading } = useJobPositions(jobsScope, false);
  const { data: savedFields = [], isLoading: savedFieldsLoading } = useSavedFields();
  const { data: recommendedFields = [], isLoading: recommendedLoading } = useRecommendedFields();
  const createJobMutation = useCreateJobPosition();
  const updateJobMutation = useUpdateJobPosition();
  const generateFieldsMutation = useGenerateJobFields();

  // Admins and multi-company users load every department and filter by the
  // selected company; others load their one company's departments.
  const shouldFetchAllDepartments = isAdmin || hasMultipleCompanies;
  const { data: allDepartments = [], isLoading: departmentsLoading } = useDepartments(
    shouldFetchAllDepartments ? undefined : jobForm.companyId || undefined,
    { enabled: !companiesLoading && (shouldFetchAllDepartments || !!jobForm.companyId) }
  );

  const companies = useMemo(() => {
    if (isAdmin) {
      return allCompanies.map((company) => ({ value: company._id, label: toPlainString(company.name) }));
    }
    return (
      user?.companies?.map((c) => ({
        value: refId(c.companyId),
        label: typeof c.companyId === 'string' ? c.companyId : toPlainString(c.companyId.name),
      })) || []
    );
  }, [allCompanies, isAdmin, user?.companies]);

  // Departments the user is confined to within the selected company, mirroring
  // the backend's per-membership restriction (companies[].departments; empty
  // means unrestricted, system roles are never restricted). null = no limit.
  const allowedDepartmentIds = useMemo(() => {
    if (isAdmin || user?.roleId?.isSystemRole) return null;
    const membership = user?.companies?.find((c) => refId(c.companyId) === jobForm.companyId);
    const ids = (membership?.departments ?? []).map((d) => refId(d));
    return ids.length > 0 ? new Set<string>(ids) : null;
  }, [isAdmin, user, jobForm.companyId]);

  const departments = useMemo(() => {
    let visible = allDepartments;
    if (shouldFetchAllDepartments) {
      if (!jobForm.companyId) return [];
      visible = allDepartments.filter((dept) => refId(dept.companyId) === jobForm.companyId);
    }
    if (allowedDepartmentIds) visible = visible.filter((dept) => allowedDepartmentIds.has(dept._id));
    return visible.map((dept) => ({ value: dept._id, label: toPlainString(dept.name) }));
  }, [allDepartments, shouldFetchAllDepartments, jobForm.companyId, allowedDepartmentIds]);

  const departmentSelectDisabled = departmentsLoading || (!jobForm.companyId && shouldFetchAllDepartments);
  const departmentPlaceholder = departmentsLoading
    ? t('createLoadingDepts', 'jobs')
    : !jobForm.companyId && shouldFetchAllDepartments
      ? t('createSelectCompanyFirst', 'jobs')
      : departments.length === 0
        ? t('createNoDepts', 'jobs')
        : t('createSelectDept', 'jobs');

  const selectedCompany = useMemo(
    () => (jobForm.companyId ? allCompanies.find((c) => c._id === jobForm.companyId) || null : null),
    [allCompanies, jobForm.companyId]
  );
  const companyStatuses = useMemo<CompanyStatusOption[]>(
    () => (Array.isArray(selectedCompany?.settings?.statuses) ? selectedCompany.settings.statuses : []),
    [selectedCompany]
  );

  const nextCompanyOrder = useMemo(
    () => computeNextCompanyOrder(allJobs, jobForm.companyId, editJobId),
    [allJobs, editJobId, jobForm.companyId]
  );

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Load the job being edited once the company list is known.
  useEffect(() => {
    if (!editJobId || jobDataLoaded.current || companies.length === 0) return;
    (async () => {
      try {
        setIsEditMode(true);
        const job = jobFromState || (await jobPositionsService.getJobPositionById(editJobId));
        const next = editJobToForm(job);
        setJobForm(next);
        collapseAll(next.customFields);
        jobDataLoaded.current = true;
      } catch (err) {
        console.error('Failed to load job data:', err);
        const errorMsg = getJobErrorMessage(err, t('createErrorOccurred', 'jobs'));
        setFormError(errorMsg);
        setJobStatus(`Error: ${errorMsg}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editJobId, companies, jobFromState]);

  // Map stored allowed statuses (ids or names) onto the company's status ids.
  useEffect(() => {
    if (!jobForm.companyId) return;
    setJobForm((prev) => {
      const normalized = normalizeAllowedStatuses(prev.allowedStatuses, companyStatuses);
      const same =
        normalized.length === prev.allowedStatuses.length &&
        normalized.every((value, index) => value === prev.allowedStatuses[index]);
      return same ? prev : { ...prev, allowedStatuses: normalized };
    });
  }, [jobForm.companyId, companyStatuses]);

  // Users with a single company get it preselected.
  useEffect(() => {
    if (!user || isAdmin || hasMultipleCompanies || companies.length === 0 || companyAutoSet.current || editJobId) return;
    const onlyCompanyId = refId(user.companies?.[0]?.companyId);
    if (onlyCompanyId) {
      setJobForm((prev) => ({ ...prev, companyId: onlyCompanyId }));
      companyAutoSet.current = true;
    }
  }, [user, isAdmin, hasMultipleCompanies, companies, editJobId]);

  // New jobs get a fresh code whenever the company changes.
  useEffect(() => {
    if (isEditMode || !jobForm.companyId || allCompanies.length === 0) return;
    const company = allCompanies.find((c) => c._id === jobForm.companyId);
    if (company) {
      const code = generateJobCode(toPlainString(company.name) || 'COMP');
      setJobForm((prev) => ({ ...prev, jobCode: code }));
    }
  }, [jobForm.companyId, allCompanies, isEditMode]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) {
      setJobForm(emptyJobForm(jobForm.companyId || ''));
      return;
    }
    const selectedJob = allJobs.find((j) => j._id === jobId);
    if (!selectedJob) return;
    const next = duplicateJobToForm(selectedJob);
    setJobForm(next);
    if (next.customFields.length > 0) collapseAll(next.customFields);
  };

  // Changing company clears the department and allows all its statuses.
  const handleCompanyChange = (companyId: string) => {
    const company = allCompanies.find((c) => c._id === companyId);
    const statusIds = (Array.isArray(company?.settings?.statuses) ? company.settings.statuses : [])
      .map((s: CompanyStatusOption) => String(s?._id || s?.id || '').trim())
      .filter(Boolean);
    setJobForm((prev) => ({ ...prev, companyId, departmentId: '', allowedStatuses: statusIds }));
  };

  const failValidation = async (message: string, info = false) => {
    setFormError(message);
    setJobStatus(t('createErrorPrefix', 'jobs', { msg: message }));
    setIsSubmitting(false);
    await Swal.fire({
      title: info ? t('createPleaseWait', 'jobs') : t('createValidationError', 'jobs'),
      text: message,
      icon: info ? 'info' : 'error',
      confirmButtonText: t('createOk', 'jobs'),
    });
  };

  const handleGenerateWithAI = async () => {
    if (!jobForm.companyId) {
      await Swal.fire({
        title: t('createValidationError', 'jobs'),
        text: t('createValSelectCompany', 'jobs'),
        icon: 'error',
        confirmButtonText: t('createOk', 'jobs'),
      });
      return;
    }
    if (!aiPrompt.trim()) return;
    generateFieldsMutation.mutate(
      { companyId: jobForm.companyId, jobTitle: jobForm.title, prompt: aiPrompt },
      {
        onSuccess: (res) => {
          setJobForm((prev) => mergeGeneratedFields(prev, res));
          // AI-added fields start collapsed, like duplicated/library ones.
          if (res.customFields?.length) {
            setCollapsed((prev) => new Set([...prev, ...res.customFields.map((cf) => cf.fieldId)]));
          }
        },
      }
    );
  };

  const handleAddBlankField = () => {
    setJobForm((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { fieldId: `temp_${Date.now()}`, label: '', inputType: 'text', isRequired: false, displayOrder: prev.customFields.length + 1 },
      ],
    }));
  };

  const handleRemoveField = (index: number) =>
    setJobForm((prev) => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== index) }));

  const handleAddLibrary = (ids: string[], source: 'saved' | 'recommended') => {
    const library = (source === 'saved' ? savedFields : recommendedFields) as LibraryField[];
    const before = new Set(jobForm.customFields.map((f) => f.fieldId));
    const next = appendLibraryFields(jobForm.customFields, library, ids, source);
    setJobForm((prev) => ({ ...prev, customFields: appendLibraryFields(prev.customFields, library, ids, source) }));
    // Newly added library fields start collapsed.
    setCollapsed((prev) => new Set([...prev, ...next.filter((f) => !before.has(f.fieldId)).map((f) => f.fieldId)]));
  };

  const toggleCollapse = (fieldId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });

  // Fill the empty side of every EN/AR pair in the form.
  const translateAll = async () => {
    setTranslatingAll(true);
    const form = jobForm;
    const one = (en: string, ar: string) =>
      en.trim() ? translateText(en, 'en', 'ar') : ar.trim() ? translateText(ar, 'ar', 'en') : Promise.resolve('');
    // Missing Arabic for choices only (English is required for choices).
    const arOnly = (en: string[] = [], ar: string[] = []) =>
      Promise.all(en.map((e, i) => (e.trim() && !(ar[i] || '').trim() ? translateText(e, 'en', 'ar') : Promise.resolve(''))));
    const mergeAr = (ar: string[] = [], results: string[]) => {
      const next = [...ar];
      results.forEach((r, i) => {
        if (r) next[i] = r;
      });
      return next;
    };
    try {
      const title = await one(form.title, form.titleAr);
      if (title) setJobForm((p) => (form.title.trim() ? { ...p, titleAr: title } : { ...p, title }));

      const desc = await one(form.description, form.descriptionAr);
      if (desc) setJobForm((p) => (form.description.trim() ? { ...p, descriptionAr: desc } : { ...p, description: desc }));

      if (form.termsAndConditions.length > 0) {
        const results = await Promise.all(form.termsAndConditions.map((en, i) => one(en, form.termsAndConditionsAr[i] || '')));
        setJobForm((prev) => {
          const terms = [...prev.termsAndConditions];
          const termsAr = [...prev.termsAndConditionsAr];
          results.forEach((result, i) => {
            if (!result) return;
            if ((prev.termsAndConditions[i] || '').trim()) termsAr[i] = result;
            else terms[i] = result;
          });
          return { ...prev, termsAndConditions: terms, termsAndConditionsAr: termsAr };
        });
      }

      if (form.jobSpecs.length > 0) {
        const results = await Promise.all(form.jobSpecs.map((s) => one(s.spec, s.specAr || '')));
        results.forEach((result, i) => {
          if (!result) return;
          setJobForm((p) => patchSpec(p, i, form.jobSpecs[i].spec.trim() ? { specAr: result } : { spec: result }));
        });
      }

      for (let fi = 0; fi < form.customFields.length; fi++) {
        const cf = form.customFields[fi];
        const label = await one(cf.label, cf.labelAr || '');
        if (label) setJobForm((p) => patchField(p, fi, cf.label.trim() ? { labelAr: label } : { label }));

        if (cf.choices?.length) {
          const results = await arOnly(cf.choices, cf.choicesAr);
          if (results.some(Boolean)) setJobForm((p) => patchField(p, fi, { choicesAr: mergeAr(cf.choicesAr, results) }));
        }

        for (let si = 0; si < (cf.subFields?.length || 0); si++) {
          const sf = cf.subFields![si];
          const sfLabel = await one(sf.label, sf.labelAr || '');
          if (sfLabel) setJobForm((p) => patchSubField(p, fi, si, sf.label.trim() ? { labelAr: sfLabel } : { label: sfLabel }));
          if (sf.choices?.length) {
            const results = await arOnly(sf.choices, sf.choicesAr);
            if (results.some(Boolean)) setJobForm((p) => patchSubField(p, fi, si, { choicesAr: mergeAr(sf.choicesAr, results) }));
          }
        }
      }
    } finally {
      setTranslatingAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!jobForm.companyId) return failValidation(t('createValSelectCompany', 'jobs'));
      if (!jobForm.departmentId) return failValidation(t('createValSelectDept', 'jobs'));
      if (!isEditMode && !jobForm.jobCode?.trim()) return failValidation(t('createValCodeRequired', 'jobs'));
      if (!jobForm.title?.trim() || (jobForm.bilingual && !jobForm.titleAr?.trim())) {
        return failValidation(jobForm.bilingual ? t('createValTitleBilingual', 'jobs') : t('createValTitleRequired', 'jobs'));
      }
      if (!jobForm.employmentType) return failValidation(t('createValEmploymentType', 'jobs'));
      if (!jobForm.workArrangement) return failValidation(t('createValWorkArrangement', 'jobs'));
      if (!isEditMode && jobsLoading) return failValidation(t('createValWaitLoading', 'jobs'), true);
      if (!jobForm.registrationStart) return failValidation(t('createValStartDate', 'jobs'));
      if (!jobForm.registrationEnd) return failValidation(t('createValEndDate', 'jobs'));
      const unnamedGroup = jobForm.customFields.findIndex((f) => f.inputType === 'repeatable_group' && !f.label.trim());
      if (unnamedGroup !== -1) {
        return failValidation(t('createValGroupFieldLabel', 'jobs', { number: unnamedGroup + 1 }));
      }

      const payload = buildJobPayload(jobForm, {
        isEditMode,
        nextOrder: nextCompanyOrder,
        createdBy: user?._id ?? user?.id ?? undefined,
      });

      if (isEditMode && editJobId) {
        await updateJobMutation.mutateAsync({ id: editJobId, data: payload });
      } else {
        await createJobMutation.mutateAsync(payload);
      }
      const doneText = isEditMode ? t('createUpdatedSuccess', 'jobs') : t('createCreatedSuccess', 'jobs');
      setJobStatus(doneText);

      await queryClient.invalidateQueries({ queryKey: ['jobPositions'] });
      await queryClient.refetchQueries({ queryKey: ['jobPositions'] });

      Swal.fire({
        title: t('createSuccess', 'jobs'),
        text: doneText,
        icon: 'success',
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        customClass: { container: '!mt-16' },
      });
      setTimeout(() => navigate('/jobs'), 500);
    } catch (err) {
      const errorMsg = getJobErrorMessage(err, t('createErrorOccurred', 'jobs'));
      setFormError(errorMsg);
      setJobStatus(t('createErrorPrefix', 'jobs', { msg: errorMsg }));
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} job:`, err);
      await Swal.fire({
        title: t('createErrorTitle', 'jobs'),
        text: errorMsg,
        icon: 'error',
        confirmButtonText: t('createOk', 'jobs'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const mode = isEditMode ? t('createEdit', 'jobs') : t('createCreate', 'jobs');
  const back = (
    <Link
      to="/jobs"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('createBackToJobs', 'jobs')}
    </Link>
  );

  if (companiesLoading) {
    return (
      <LoadingSpinner fullPage message={isEditMode ? t('createLoadingJobData', 'jobs') : t('createLoadingForm', 'jobs')} />
    );
  }

  return (
    <>
      <PageMeta title={t('createPageTitle', 'jobs', { mode })} description={t('createPageDesc', 'jobs', { mode })} />
      <PageShell
        back={back}
        title={isEditMode ? t('cjEditTitle', 'jobs') : t('cjNewTitle', 'jobs')}
        subtitle={isEditMode ? jobForm.title || undefined : t('cjNewSubtitle', 'jobs')}
      >
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
          {formError && <ValidationErrorAlert error={formError} onDismiss={() => setFormError('')} />}

          {!isEditMode && (
            <DuplicateJobCard jobs={allJobs} value={selectedJobId} onChange={handleJobSelect} loading={jobsLoading} />
          )}
          <CompanyDepartmentCard
            isEditMode={isEditMode}
            companies={companies}
            departments={departments}
            companyId={jobForm.companyId}
            departmentId={jobForm.departmentId}
            onCompanyChange={handleCompanyChange}
            onDepartmentChange={(departmentId) => !departmentSelectDisabled && setJobForm((p) => ({ ...p, departmentId }))}
            departmentDisabled={departmentSelectDisabled}
            departmentPlaceholder={departmentPlaceholder}
          />
          <AiGenerateCard
            prompt={aiPrompt}
            onPromptChange={setAiPrompt}
            onGenerate={handleGenerateWithAI}
            pending={generateFieldsMutation.isPending}
          />
          <JobDetailsCard
            form={jobForm}
            setForm={setJobForm}
            isEditMode={isEditMode}
            onTranslateAll={translateAll}
            translatingAll={translatingAll}
          />
          <CompensationCard form={jobForm} setForm={setJobForm} />
          <ApplicationWindowCard form={jobForm} setForm={setJobForm} statuses={companyStatuses} />
          <ApplicantFieldsCard form={jobForm} setForm={setJobForm} />
          <TermsCard form={jobForm} setForm={setJobForm} />
          <JobSpecsCard form={jobForm} setForm={setJobForm} />
          <CustomFieldsCard
            form={jobForm}
            setForm={setJobForm}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            onAddBlank={handleAddBlankField}
            onRemove={handleRemoveField}
            savedFields={savedFields as LibraryField[]}
            savedLoading={savedFieldsLoading}
            recommendedFields={recommendedFields as LibraryField[]}
            recommendedLoading={recommendedLoading}
            onAddLibrary={handleAddLibrary}
          />

          <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:mx-0 sm:rounded-2xl sm:border">
            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
                {jobStatus || t('createReadyDesc', 'jobs')}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button onClick={() => navigate('/jobs')}>{t('createCancel', 'jobs')}</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  icon={isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                >
                  {isSubmitting
                    ? isEditMode
                      ? t('createPropagating', 'jobs')
                      : t('createPublishing', 'jobs')
                    : isEditMode
                      ? t('createSaveChanges', 'jobs')
                      : t('createLaunchPosition', 'jobs')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </PageShell>
    </>
  );
}
