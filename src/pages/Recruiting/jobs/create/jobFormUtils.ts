// Pure helpers for the Create/Edit job form: converting API documents to
// editing state and back. No React here.
import { toPlainString } from '../../../../utils/strings';
import { translateText } from '../../../../utils/translate';
import { getDefaultFieldConfig, normalizeFieldConfig } from '../../../../utils/jobUtils';
import type {
  CreateJobPositionRequest,
  GeneratedJobFields,
  JobCustomField,
  JobGroupField,
  JobPosition,
} from '../../../../types/jobPositions';
import type {
  CompanyStatusOption,
  CustomFieldDraft,
  EmploymentType,
  JobForm,
  JobSpecDraft,
  LibraryField,
  LibraryGroupField,
  SubFieldDraft,
} from './types';

export const emptyJobForm = (companyId = ''): JobForm => ({
  companyId,
  departmentId: '',
  jobCode: '',
  title: '',
  titleAr: '',
  description: '',
  descriptionAr: '',
  salary: 0,
  salaryVisible: true,
  fieldConfig: getDefaultFieldConfig(),
  bilingual: false,
  openPositions: 1,
  registrationStart: '',
  registrationEnd: '',
  allowedStatuses: [],
  hideAfterRegistrationEnd: false,
  termsAndConditions: [],
  termsAndConditionsAr: [],
  jobSpecs: [],
  customFields: [],
  employmentType: 'full-time',
  workArrangement: 'on-site',
});

// ─── Small readers ───────────────────────────────────────────────────────────

/** Id of a ref that may be an id string or a populated document. */
export const refId = (ref: unknown): string => {
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object') {
    const r = ref as { _id?: string; id?: string };
    return r._id || r.id || '';
  }
  return '';
};

/** EN side of a string-or-{en,ar} value ('' when missing). */
const enOf = (value: unknown): string =>
  typeof value === 'string' ? value : ((value as { en?: string } | null)?.en ?? '');

/** AR side of a {en,ar} value; plain strings have no Arabic side. */
const arOf = (value: unknown): string =>
  value && typeof value === 'object' ? ((value as { ar?: string }).ar ?? '') : '';

const toDateInput = (date?: string) => (date ? new Date(date).toISOString().split('T')[0] : '');

export function normalizeEmploymentType(val: unknown): EmploymentType | undefined {
  if (!val) return undefined;
  const s = String(val).toLowerCase().trim();
  if (s === 'full-time' || s === 'full time' || s === 'fulltime' || s === 'full') return 'full-time';
  if (s === 'part-time' || s === 'part time' || s === 'parttime' || s === 'part') return 'part-time';
  if (s === 'contract') return 'contract';
  if (s === 'internship' || s === 'intern') return 'internship';
  return undefined;
}

const normalizeStatusLabel = (value: unknown): string => toPlainString(value).trim().toLowerCase();

// Map stored allowed-status entries (ids, names, or objects) onto the
// company's status ids.
export const normalizeAllowedStatuses = (
  value: unknown,
  companyStatuses: CompanyStatusOption[] = []
): string[] => {
  const rawValues: unknown[] = Array.isArray(value) ? value : [];
  if (rawValues.length === 0) return [];

  const statusMap = new Map<string, string>();
  companyStatuses.forEach((status) => {
    const statusId = String(status?._id || status?.id || '').trim();
    if (!statusId) return;
    statusMap.set(statusId, statusId);
    const statusName = normalizeStatusLabel(status?.name);
    if (statusName) statusMap.set(statusName, statusId);
  });

  return rawValues
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        return statusMap.get(trimmed) || statusMap.get(normalizeStatusLabel(trimmed)) || trimmed;
      }
      if (typeof entry === 'object') {
        const e = entry as CompanyStatusOption;
        const id = String(e._id || e.id || '').trim();
        if (id) return id;
        const name = normalizeStatusLabel(e.name);
        return statusMap.get(name) || name;
      }
      return String(entry).trim();
    })
    .filter(Boolean);
};

// ─── API document → form ─────────────────────────────────────────────────────

// Old documents may still carry these.
type LegacyCustomField = JobCustomField & { subFields?: JobGroupField[] };

const choicesEn = (choices: unknown): string[] =>
  Array.isArray(choices) ? choices.map((c) => (typeof c === 'string' ? c : enOf(c))) : [];
const choicesAr = (choices: unknown): string[] =>
  Array.isArray(choices) ? choices.map((c) => (typeof c === 'object' ? arOf(c) : '')) : [];

const groupToDraft = (sf: JobGroupField, fieldId: string): SubFieldDraft => ({
  fieldId,
  label: enOf(sf.label),
  labelAr: arOf(sf.label),
  inputType: sf.inputType,
  isRequired: sf.isRequired as boolean,
  choices: choicesEn(sf.choices),
  choicesAr: choicesAr(sf.choices),
});

const customFieldToDraft = (
  cf: LegacyCustomField,
  ids: { field: () => string; sub: (sf: JobGroupField) => string } | null,
  groups: JobGroupField[] | undefined
): CustomFieldDraft => ({
  fieldId: ids ? ids.field() : cf.fieldId,
  label: enOf(cf.label),
  labelAr: arOf(cf.label),
  inputType: cf.inputType,
  isRequired: cf.isRequired as boolean,
  minValue: cf.minValue,
  maxValue: cf.maxValue,
  choices: choicesEn(cf.choices),
  choicesAr: choicesAr(cf.choices),
  subFields: Array.isArray(groups)
    ? groups.map((sf) => groupToDraft(sf, ids ? ids.sub(sf) : sf.fieldId))
    : [],
  displayOrder: cf.displayOrder ?? cf.order ?? 0,
});

const specsToDrafts = (job: JobPosition): JobSpecDraft[] =>
  Array.isArray(job.jobSpecs)
    ? job.jobSpecs.map((s) => ({
        spec: typeof s.spec === 'string' ? s.spec : s.spec?.en || '',
        specAr: typeof s.spec === 'object' ? s.spec?.ar || '' : '',
        weight: s.weight || 0,
      }))
    : [];

const allowedStatusesOf = (job: JobPosition): string[] =>
  Array.isArray(job.allowedStatuses)
    ? job.allowedStatuses.map((status) => String(status || '').trim()).filter(Boolean)
    : [];

/** Prefill a new job from an existing one ("Quick start"): new field ids, no company or code. */
export function duplicateJobToForm(job: JobPosition): JobForm {
  const newId = () => `dup_${Date.now()}_${Math.random()}`;
  const newSubId = () => `dup_sub_${Date.now()}_${Math.random()}`;
  const terms: unknown[] = Array.isArray(job.termsAndConditions) ? job.termsAndConditions : [];
  return {
    companyId: '',
    departmentId: refId(job.departmentId),
    jobCode: '',
    title: typeof job.title === 'object' ? (job.title.en ?? '') : (job.title ?? ''),
    titleAr: typeof job.title === 'object' && job.title.ar ? job.title.ar : '',
    description:
      typeof job.description === 'object' ? job.description.en || '' : (job.description as string | undefined) || '',
    descriptionAr: typeof job.description === 'object' ? job.description.ar || '' : '',
    salary: job.salary || 0,
    salaryVisible: job.salaryVisible ?? true,
    fieldConfig: normalizeFieldConfig(job.fieldConfig, job.salaryFieldVisible),
    bilingual: job.bilingual ?? false,
    openPositions: job.openPositions || 1,
    registrationStart: toDateInput(job.registrationStart),
    registrationEnd: toDateInput(job.registrationEnd),
    allowedStatuses: allowedStatusesOf(job),
    hideAfterRegistrationEnd: Boolean(job.hideAfterRegistrationEnd),
    termsAndConditions: terms.map((t) => (typeof t === 'string' ? t : enOf(t))),
    termsAndConditionsAr: terms.map((t) => (typeof t === 'object' ? arOf(t) : '')),
    jobSpecs: specsToDrafts(job),
    customFields: Array.isArray(job.customFields)
      ? (job.customFields as LegacyCustomField[]).map((cf) =>
          customFieldToDraft(cf, { field: newId, sub: newSubId }, cf.groupFields || cf.subFields)
        )
      : [],
    employmentType: job.employmentType || 'full-time',
    workArrangement: job.workArrangement || 'on-site',
  };
}

/** Load a job for editing: keeps ids, company and code. */
export function editJobToForm(job: JobPosition): JobForm {
  const terms: unknown[] = Array.isArray(job.termsAndConditions) ? job.termsAndConditions : [];
  const legacySalary = job.salary as unknown;
  return {
    companyId: refId(job.companyId),
    departmentId: refId(job.departmentId),
    jobCode: job.jobCode || '',
    title: (typeof job.title === 'object' && job.title?.en) || (typeof job.title === 'string' ? job.title : ''),
    titleAr: (typeof job.title === 'object' && job.title?.ar) || '',
    description:
      (typeof job.description === 'object' && job.description?.en) ||
      (typeof job.description === 'string' ? job.description : ''),
    descriptionAr: (typeof job.description === 'object' && job.description?.ar) || '',
    // Older documents stored salary as { min }.
    salary:
      (legacySalary && typeof legacySalary === 'object' ? (legacySalary as { min?: number }).min : undefined) ||
      (typeof legacySalary === 'number' ? legacySalary : 0),
    salaryVisible: job.salaryVisible ?? true,
    fieldConfig: normalizeFieldConfig(job.fieldConfig, job.salaryFieldVisible),
    bilingual: job.bilingual ?? false,
    openPositions: job.openPositions || 1,
    registrationStart: toDateInput(job.registrationStart),
    registrationEnd: toDateInput(job.registrationEnd),
    allowedStatuses: allowedStatusesOf(job),
    hideAfterRegistrationEnd: Boolean(job.hideAfterRegistrationEnd),
    // Very old jobs kept plain-string `requirements` instead of terms.
    termsAndConditions:
      terms.length > 0
        ? terms.map((t) => (typeof t === 'string' ? t : enOf(t)))
        : job.requirements && job.requirements.length > 0
          ? job.requirements
          : [],
    termsAndConditionsAr: terms.length > 0 ? terms.map((t) => (typeof t === 'string' ? '' : arOf(t))) : [],
    jobSpecs: job.jobSpecs && job.jobSpecs.length > 0 ? specsToDrafts(job) : [],
    customFields: Array.isArray(job.customFields)
      ? (job.customFields as LegacyCustomField[]).map((cf) =>
          customFieldToDraft(cf, null, Array.isArray(cf.groupFields) ? cf.groupFields : cf.subFields)
        )
      : [],
    employmentType: normalizeEmploymentType(job.employmentType) || 'full-time',
    workArrangement: job.workArrangement || 'on-site',
  };
}

// ─── Saved / recommended field templates ─────────────────────────────────────

// Labels arrive as strings, {en, ar}, or (from an old bug) character-indexed
// objects like {0:'N',1:'a',...}.
export const convertToString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (v.en) return v.en as string;
    return Object.keys(v)
      .filter((key) => !isNaN(Number(key)) && key !== '_id')
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => v[key])
      .join('');
  }
  return '';
};

const libraryChoicesEn = (choices: unknown): string[] =>
  Array.isArray(choices)
    ? choices.map((c) =>
        typeof c === 'object' && c !== null && (c as { en?: string }).en ? (c as { en: string }).en : convertToString(c)
      )
    : [];

const libraryChoicesAr = (choices: unknown): string[] =>
  Array.isArray(choices)
    ? choices.map((c) =>
        typeof c === 'object' && c !== null && (c as { ar?: string }).ar ? (c as { ar: string }).ar : convertToString(c)
      )
    : [];

const libraryLabelAr = (label: unknown) =>
  label && typeof label === 'object' && (label as { ar?: string }).ar
    ? (label as { ar: string }).ar
    : convertToString(label);

const libraryGroupToDraft = (g: LibraryGroupField): SubFieldDraft => ({
  fieldId: g.fieldId || `sub_${Date.now()}`,
  label: convertToString(g.label) || '',
  labelAr: libraryLabelAr(g.label),
  inputType: g.inputType as SubFieldDraft['inputType'],
  isRequired: g.isRequired || false,
  choices: Array.isArray(g.choices) ? libraryChoicesEn(g.choices) : [],
});

/**
 * Turn a saved (`sav_`) or recommended (`rec_`) template into a form field.
 * Saved templates keep sub-fields in `groupFields`; recommended ones may use
 * `subFields` or `groupFields`.
 */
export function libraryFieldToDraft(
  field: LibraryField,
  source: 'saved' | 'recommended',
  displayOrder: number
): CustomFieldDraft {
  const groups =
    source === 'saved'
      ? Array.isArray(field.groupFields)
        ? field.groupFields
        : undefined
      : Array.isArray(field.subFields) || Array.isArray(field.groupFields)
        ? field.subFields || field.groupFields
        : undefined;
  return {
    fieldId: `${source === 'saved' ? 'sav' : 'rec'}_${field.fieldId}`,
    label: convertToString(field.label) || '',
    labelAr: libraryLabelAr(field.label),
    inputType: field.inputType as CustomFieldDraft['inputType'],
    isRequired: field.isRequired || false,
    minValue: field.minValue,
    maxValue: field.maxValue,
    choices: libraryChoicesEn(field.choices),
    choicesAr: libraryChoicesAr(field.choices),
    subFields: groups ? groups.map(libraryGroupToDraft) : undefined,
    displayOrder,
  };
}

/** True when a template (by its own id) is already in the form. */
export const isLibraryFieldAdded = (fields: CustomFieldDraft[], fieldId: string, source: 'saved' | 'recommended') => {
  const prefixed = `${source === 'saved' ? 'sav' : 'rec'}_${fieldId}`;
  return fields.some((cf) => cf.fieldId === prefixed || cf.fieldId === fieldId);
};

/** Append templates (skipping ones already added), numbering after the highest displayOrder. */
export function appendLibraryFields(
  fields: CustomFieldDraft[],
  library: LibraryField[],
  selectedIds: string[],
  source: 'saved' | 'recommended'
): CustomFieldDraft[] {
  const additions: CustomFieldDraft[] = [];
  let currentMax = fields.reduce((m, cf) => Math.max(m, cf.displayOrder || 0), 0);
  selectedIds.forEach((fieldId) => {
    if (isLibraryFieldAdded(fields, fieldId, source)) return;
    const template = library.find((f) => f.fieldId === fieldId);
    if (!template) return;
    currentMax += 1;
    additions.push(libraryFieldToDraft(template, source, currentMax));
  });
  return [...fields, ...additions];
}

// ─── AI draft → form ─────────────────────────────────────────────────────────

/** Merge an AI draft into the form (the AI writes English only). */
export function mergeGeneratedFields(prev: JobForm, res: GeneratedJobFields): JobForm {
  return {
    ...prev,
    title: res.title || prev.title,
    description: res.description || prev.description,
    jobSpecs: res.jobSpecs?.length
      ? res.jobSpecs.map((s) => ({ spec: s.spec, specAr: '', weight: s.weight }))
      : prev.jobSpecs,
    termsAndConditions: res.termsAndConditions?.length
      ? [...prev.termsAndConditions, ...res.termsAndConditions]
      : prev.termsAndConditions,
    termsAndConditionsAr: res.termsAndConditions?.length
      ? [...prev.termsAndConditionsAr, ...res.termsAndConditions.map(() => '')]
      : prev.termsAndConditionsAr,
    customFields: res.customFields?.length
      ? [
          ...prev.customFields,
          ...res.customFields.map((cf) => ({
            fieldId: cf.fieldId,
            label: cf.label,
            labelAr: '',
            inputType: cf.inputType,
            isRequired: cf.isRequired,
            choices: cf.choices,
            subFields: (cf.groupFields || []).map((sf) => ({
              fieldId: sf.fieldId,
              label: sf.label,
              labelAr: '',
              inputType: sf.inputType,
              isRequired: sf.isRequired,
              choices: sf.choices,
            })),
            displayOrder: cf.displayOrder,
          })),
        ]
      : prev.customFields,
  };
}

// ─── Form → API payload ──────────────────────────────────────────────────────

type BilingualOut = { en: string; ar?: string };

/**
 * The create/update request body. jobCode and order are only sent on
 * create (the update validator rejects jobCode).
 */
export function buildJobPayload(
  form: JobForm,
  opts: { isEditMode: boolean; nextOrder: number; createdBy?: string }
): CreateJobPositionRequest {
  const salaryValue = Number(form.salary);

  const makeBilingualObject = (en: string | undefined, ar?: string): BilingualOut =>
    form.bilingual ? { en: en ?? '', ar: ar ?? en ?? '' } : { en: en ?? '' };

  const buildChoices = (choices: string[] | undefined, choicesAr?: string[]) => {
    const out: BilingualOut[] = [];
    if (!Array.isArray(choices)) return out;
    choices.forEach((c, i) => {
      const enVal = String(c ?? '').trim();
      const arVal = String((Array.isArray(choicesAr) ? choicesAr[i] : '') || '').trim();
      if (form.bilingual) {
        if (!enVal && !arVal) return;
        out.push({ en: enVal || arVal, ar: arVal || enVal });
      } else {
        if (!enVal) return;
        out.push({ en: enVal });
      }
    });
    return out;
  };

  const payload = {} as CreateJobPositionRequest;

  if (!opts.isEditMode) {
    if (form.jobCode) payload.jobCode = form.jobCode;
    payload.order = opts.nextOrder;
  }

  payload.companyId = form.companyId;
  payload.title = makeBilingualObject(form.title, form.titleAr);
  payload.description = makeBilingualObject(form.description, form.descriptionAr);
  payload.departmentId = form.departmentId || '';
  payload.termsAndConditions = form.termsAndConditions
    .filter((term, idx) => term.trim() || (form.bilingual && form.termsAndConditionsAr[idx]?.trim()))
    .map((t, idx) => makeBilingualObject(t, form.termsAndConditionsAr[idx] || t));
  payload.salary = isNaN(salaryValue) ? undefined : salaryValue;
  payload.salaryVisible = form.salaryVisible;
  payload.fieldConfig = normalizeFieldConfig(form.fieldConfig);
  payload.openPositions = form.openPositions;
  payload.registrationStart = form.registrationStart;
  payload.registrationEnd = form.registrationEnd;
  payload.allowedStatuses = Array.isArray(form.allowedStatuses) ? form.allowedStatuses.filter(Boolean) : [];
  payload.hideAfterRegistrationEnd = Boolean(form.hideAfterRegistrationEnd);
  payload.jobSpecs = form.jobSpecs
    .filter((spec) => spec.spec.trim() || (form.bilingual && spec.specAr?.trim()))
    .map((spec) => ({
      spec: makeBilingualObject(spec.spec, spec.specAr || spec.spec),
      weight: spec.weight,
    }));
  payload.customFields = form.customFields.map((cf) => ({
    fieldId: cf.fieldId,
    label: makeBilingualObject(cf.label, cf.labelAr || cf.label),
    inputType: cf.inputType,
    isRequired: cf.isRequired,
    minValue: cf.minValue,
    maxValue: cf.maxValue,
    choices: buildChoices(cf.choices, cf.choicesAr),
    groupFields: Array.isArray(cf.subFields)
      ? cf.subFields.map((sf) => ({
          fieldId: sf.fieldId,
          label: makeBilingualObject(sf.label, sf.labelAr || sf.label),
          inputType: sf.inputType,
          isRequired: sf.isRequired,
          choices: buildChoices(sf.choices, sf.choicesAr),
        }))
      : [],
    displayOrder: cf.displayOrder,
  }));
  payload.employmentType = form.employmentType;
  payload.workArrangement = form.workArrangement;
  payload.bilingual = form.bilingual;
  if (!opts.isEditMode && opts.createdBy) payload.createdBy = opts.createdBy;

  return payload;
}

// ─── Misc ────────────────────────────────────────────────────────────────────

/** New job code: initials of the company name plus a timestamp suffix. */
export function generateJobCode(companyName: string): string {
  const companyAbbr = (companyName || 'COMP')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 4);
  return `${companyAbbr}-${Date.now().toString().slice(-6)}`;
}

/** Position for a new job: after the company's existing jobs, skipping used slots. */
export function nextCompanyOrder(jobs: JobPosition[], companyId: string, editJobId: string | null): number {
  if (!companyId) return 1;
  const sameCompanyJobs = jobs.filter((job) => {
    const jobCompanyId = refId(job.companyId);
    if (!jobCompanyId || jobCompanyId !== companyId) return false;
    if (editJobId && job?._id === editJobId) return false;
    return true;
  });
  const usedOrders = new Set(
    sameCompanyJobs.map((job) => Number(job?.order)).filter((value) => Number.isFinite(value) && value > 0)
  );
  let order = sameCompanyJobs.length + 1;
  while (usedOrders.has(order)) order += 1;
  return order;
}

type JobApiError = {
  message?: string;
  response?: {
    data?: {
      message?: string;
      details?: Array<{ path?: string[]; message?: string }>;
      errors?: Array<{ msg?: string; message?: string }> | Record<string, string>;
    };
  };
};

export function getJobErrorMessage(error: unknown, fallback: string): string {
  const err = (error ?? {}) as JobApiError;
  const data = err.response?.data;
  if (data?.details && Array.isArray(data.details)) {
    return data.details
      .map((detail) => {
        const field = detail.path?.[0] || '';
        const message = detail.message || '';
        return field ? `${field}: ${message}` : message;
      })
      .join(', ');
  }
  if (data?.errors) {
    const errors = data.errors;
    if (Array.isArray(errors)) return errors.map((e) => e.msg || e.message).join(', ');
    if (typeof errors === 'object') {
      return Object.entries(errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
    }
  }
  if (data?.message) return data.message;
  if (err.message) return err.message;
  return fallback;
}

// ─── Immutable form updaters ─────────────────────────────────────────────────

export const patchSpec = (form: JobForm, index: number, patch: Partial<JobSpecDraft>): JobForm => ({
  ...form,
  jobSpecs: form.jobSpecs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)),
});

export const patchField = (form: JobForm, index: number, patch: Partial<CustomFieldDraft>): JobForm => ({
  ...form,
  customFields: form.customFields.map((cf, i) => (i === index ? { ...cf, ...patch } : cf)),
});

export const patchSubField = (
  form: JobForm,
  fieldIndex: number,
  subIndex: number,
  patch: Partial<SubFieldDraft>
): JobForm => ({
  ...form,
  customFields: form.customFields.map((cf, i) =>
    i === fieldIndex
      ? { ...cf, subFields: cf.subFields?.map((sf, si) => (si === subIndex ? { ...sf, ...patch } : sf)) }
      : cf
  ),
});

/** Fill the empty side of an EN/AR pair: EN → AR when English is set, else AR → EN. */
export function translatePair(
  en: string,
  ar: string,
  set: { en: (v: string) => void; ar: (v: string) => void }
): Promise<void> {
  if (en.trim()) return translateText(en, 'en', 'ar').then((v) => { if (v) set.ar(v); });
  if (ar.trim()) return translateText(ar, 'ar', 'en').then((v) => { if (v) set.en(v); });
  return Promise.resolve();
}
