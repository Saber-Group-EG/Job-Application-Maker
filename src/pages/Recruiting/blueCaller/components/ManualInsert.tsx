// components/ManualInsert.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  CheckCircle2,
  FileText
} from 'lucide-react';
import axiosInstance from '../../../../config/axios';
import Swal from '../../../../utils/swal';
import { toPlainString } from '../../../../utils/strings';
import type { Applicant } from '../../../../types/applicants';
import type { JobPosition } from '../../../../types/jobPositions';
import { useLocale } from '../../../../context/LocaleContext';

type ManualFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'Male' | 'Female';
  expectedSalary: string;
  jobPositionId: string;
};

type CustomFieldDefinition = {
  fieldId: string;
  label: string;
  inputType: string;
  isRequired: boolean;
  defaultValue?: string;
  minValue?: number;
  maxValue?: number;
  choices?: Array<{ label: string; value: string }>;
  groupFields?: CustomFieldDefinition[];
  parentFieldId?: string;
};

type RepeatingRowState = Record<string, unknown>;

type FieldConfigKey =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'gender'
  | 'birthDate'
  | 'address'
  | 'profilePhoto'
  | 'cvFilePath'
  | 'expectedSalary';

const PHONE_REGEX = /^01[0125]\d{8}$/;
const PROFILE_PHOTO_LIMIT = 5 * 1024 * 1024;
const CV_LIMIT = 10 * 1024 * 1024;

interface ManualInsertProps {
  companyId: string;
  jobPositions: JobPosition[];
  existingApplicants: Applicant[];
  loadingJobs: boolean;
  themeColors: {
    bgPrimary: string;
    borderPrimary: string;
    textPrimary: string;
    bgLight: string;
    borderLight: string;
    focusRing: string;
    hoverBg: string;
    gradientFrom: string;
    gradientTo: string;
  };
  onSuccess: () => void;
}

// Helper to get string value from title (handles object with en/ar)
function getJobTitle(job: JobPosition): string {
  const title = job.title;
  if (!title) return job.jobCode || job._id;
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    // Return English version by default, fallback to Arabic
    return (title as { en?: string; ar?: string }).en || (title as { ar?: string }).ar || job.jobCode || job._id;
  }
  return job.jobCode || job._id;
}

function isFieldVisible(jobPosition: JobPosition | null, fieldName: FieldConfigKey): boolean {
  if (!jobPosition?.fieldConfig) return true;
  const config = jobPosition.fieldConfig as Record<string, { visible?: boolean; required?: boolean }>;
  return config[fieldName]?.visible !== false;
}

function isFieldRequired(jobPosition: JobPosition | null, fieldName: FieldConfigKey): boolean {
  if (!jobPosition?.fieldConfig) return false;
  const config = jobPosition.fieldConfig as Record<string, { visible?: boolean; required?: boolean }>;
  return config[fieldName]?.required === true;
}

function getFieldKeyEn(label: string): string {
  if (!label) return '';
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

function flattenCustomFields(jobPosition?: JobPosition | null): CustomFieldDefinition[] {
  const definitions: CustomFieldDefinition[] = [];

  const mapChoice = (choice: unknown) => {
    const choiceRecord =
      choice && typeof choice === 'object' ? (choice as Record<string, unknown>) : {};
    return {
      label: toPlainString(choiceRecord.label ?? choiceRecord.en ?? choiceRecord.value ?? choice),
      value: toPlainString(choiceRecord.value ?? choiceRecord.en ?? choiceRecord.label ?? choice),
    };
  };

  (jobPosition?.customFields || []).forEach((field: unknown, index: number) => {
    if (!field) return;
    const fieldRecord = field as Record<string, unknown>;
    const baseLabel = toPlainString(fieldRecord.label) || String(fieldRecord.fieldId || `Field ${index + 1}`);
    const inputType = String(fieldRecord.inputType || 'text');

    const baseDefinition: CustomFieldDefinition = {
      fieldId: String(fieldRecord.fieldId || `field_${index}`),
      label: baseLabel,
      inputType,
      isRequired: Boolean(fieldRecord.isRequired),
      defaultValue: fieldRecord.defaultValue ? String(fieldRecord.defaultValue) : '',
      minValue: typeof fieldRecord.minValue === 'number' ? fieldRecord.minValue : undefined,
      maxValue: typeof fieldRecord.maxValue === 'number' ? fieldRecord.maxValue : undefined,
      choices: Array.isArray(fieldRecord.choices) ? fieldRecord.choices.map(mapChoice) : undefined,
      groupFields: undefined,
    };

    if (
      (inputType === 'repeatable_group' || inputType === 'groupField') &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      const groupFields: CustomFieldDefinition[] = (
        fieldRecord.groupFields as unknown[]
      )
        .map((groupField: unknown, groupIndex: number): CustomFieldDefinition | null => {
          if (!groupField) return null;
          const groupRecord = groupField as Record<string, unknown>;
          return {
            fieldId: String(groupRecord.fieldId || `${baseDefinition.fieldId}_group_${groupIndex}`),
            label: toPlainString(groupRecord.label) || `Field ${groupIndex + 1}`,
            inputType: String(groupRecord.inputType || 'text'),
            isRequired: Boolean(groupRecord.isRequired),
            defaultValue: groupRecord.defaultValue ? String(groupRecord.defaultValue) : '',
            minValue: typeof groupRecord.minValue === 'number' ? groupRecord.minValue : undefined,
            maxValue: typeof groupRecord.maxValue === 'number' ? groupRecord.maxValue : undefined,
            choices: Array.isArray(groupRecord.choices) ? groupRecord.choices.map(mapChoice) : undefined,
            parentFieldId: baseDefinition.fieldId,
          };
        })
        .filter((f): f is CustomFieldDefinition => f !== null);

      baseDefinition.groupFields = groupFields;
    }

    definitions.push(baseDefinition);
  });

  return definitions;
}

function buildCustomResponsesPayload(
  values: Record<string, unknown>,
  definitions: CustomFieldDefinition[]
): Record<string, unknown> {
  const remappedCustomResponses: Record<string, unknown> = {};

  definitions.forEach((field) => {
    const locKey = field.fieldId;
    const enKey = getFieldKeyEn(field.label);
    
    const val = values[locKey];
    if (val === undefined || val === null) return;
    if (typeof val === 'string' && val.trim() === '') return;

    const wrap = (inputType: string, answer: unknown) => ({ type: inputType || 'text', answer });

    if (field.inputType === 'groupField' && field.groupFields && Array.isArray(field.groupFields)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const mapped: Record<string, { type: string; answer: unknown }> = {};
        field.groupFields.forEach((subField) => {
          const subLocKey = subField.fieldId;
          const subEnKey = getFieldKeyEn(subField.label);
          if (Object.prototype.hasOwnProperty.call(val, subLocKey)) {
            const subVal = (val as Record<string, unknown>)[subLocKey];
            if (subVal !== undefined && subVal !== null && subVal !== '') {
              mapped[subEnKey] = wrap(subField.inputType, subVal);
            }
          }
        });
        if (Object.keys(mapped).length > 0) {
          remappedCustomResponses[enKey] = mapped;
        }
      }
      return;
    }

    if (field.inputType === 'repeatable_group' && field.groupFields && Array.isArray(field.groupFields)) {
      if (Array.isArray(val)) {
        const mappedRows = val
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const mappedItem: Record<string, { type: string; answer: unknown }> = {};
            field.groupFields!.forEach((subField) => {
              const subLocKey = subField.fieldId;
              const subEnKey = getFieldKeyEn(subField.label);
              if (Object.prototype.hasOwnProperty.call(item, subLocKey)) {
                const subVal = (item as Record<string, unknown>)[subLocKey];
                if (subVal !== undefined && subVal !== null && subVal !== '') {
                  mappedItem[subEnKey] = wrap(subField.inputType, subVal);
                }
              }
            });
            return Object.keys(mappedItem).length > 0 ? mappedItem : null;
          })
          .filter((row): row is Record<string, { type: string; answer: unknown }> => row !== null);
        if (mappedRows.length > 0) {
          remappedCustomResponses[enKey] = mappedRows;
        }
      }
      return;
    }

    if (field.inputType === 'tags') {
      const tags = Array.isArray(val) ? val.filter((tag) => tag && String(tag).trim() !== '') : [];
      if (tags.length > 0) {
        remappedCustomResponses[enKey] = tags;
      }
      return;
    }

    if (field.inputType === 'checkbox') {
      remappedCustomResponses[enKey] = Boolean(val);
      return;
    }

    remappedCustomResponses[enKey] = wrap(field.inputType, val);
  });

  return remappedCustomResponses;
}

function buildJobSpecsResponsesPayload(
  jobPosition?: JobPosition | null,
  values?: Record<string, boolean>
): Array<{ jobSpecId: string; answer: boolean }> {
  if (!jobPosition?.jobSpecsWithDetails?.length) return [];
  return jobPosition.jobSpecsWithDetails.map(
    (spec: { jobSpecId?: string } | null | undefined) => ({
      jobSpecId: String(spec?.jobSpecId || ''),
      answer: Boolean(values?.[String(spec?.jobSpecId || '')]),
    })
  );
}

function normalizePhoneValue(value: string): string {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .trim();
}

function isFutureBirthDate(value: string): boolean {
  if (!value) return false;
  const chosen = new Date(`${value}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return chosen.getTime() > today.getTime();
}

function isAllowedProfilePhotoFile(file: File): boolean {
  return ['image/jpeg', 'image/png'].includes(file.type);
}

function isAllowedCvFile(file: File): boolean {
  return file.type === 'application/pdf';
}

function isFileWithinSizeLimit(file: File, maxBytes: number): boolean {
  return file.size <= maxBytes;
}

function getDisplayFileName(name: string, maxLength = 28): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex <= 0) return `${trimmed.slice(0, maxLength - 1)}…`;
  const extension = trimmed.slice(dotIndex);
  const base = trimmed.slice(0, dotIndex);
  const available = Math.max(8, maxLength - extension.length - 1);
  return `${base.slice(0, available)}…${extension}`;
}

function checkExistingApplicant(
  existingApplicants: Applicant[],
  candidate: { email: string; phone: string }
): Applicant | null {
  const normalizedEmail = candidate.email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneValue(candidate.phone);

  return existingApplicants.find((applicant) => {
    const applicantEmail = String(applicant?.email || '').trim().toLowerCase();
    const applicantPhone = normalizePhoneValue(String(applicant?.phone || ''));
    return (
      (normalizedEmail && applicantEmail === normalizedEmail) ||
      (normalizedPhone && applicantPhone === normalizedPhone)
    );
  }) || null;
}

async function uploadToCloudinary(file: File, retries = 2, delayMs = 400): Promise<string> {
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || '';
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) || '';

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials are missing.');
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed (${response.status})`);
      }

      const result = (await response.json()) as { secure_url?: string };
      if (!result?.secure_url) {
        throw new Error('Cloudinary upload returned no URL.');
      }

      return String(result.secure_url);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Cloudinary upload failed.');
}

function buildApplicantPayload(
  form: ManualFormState,
  jobPosition: JobPosition | null,
  customValues: Record<string, unknown>,
  jobSpecValues: Record<string, boolean>,
  profilePhotoUrl?: string,
  cvFileUrl?: string
) {
  const customDefinitions = flattenCustomFields(jobPosition);
  const customResponses = buildCustomResponsesPayload(customValues, customDefinitions);
  const jobSpecsResponses = buildJobSpecsResponsesPayload(jobPosition, jobSpecValues);

  const payload: Record<string, unknown> = {
    jobPositionId: form.jobPositionId,
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    phone: normalizePhoneValue(form.phone),
    address: form.address.trim(),
    birthDate: form.birthDate,
    gender: form.gender,
    status: 'pending',
  };

  if (form.expectedSalary.trim() !== '') {
    payload.expectedSalary = Number(form.expectedSalary);
  }
  if (profilePhotoUrl) payload.profilePhoto = profilePhotoUrl;
  if (cvFileUrl) payload.cvFilePath = cvFileUrl;
  if (Object.keys(customResponses).length > 0) payload.customResponses = customResponses;
  if (jobSpecsResponses.length > 0) payload.jobSpecsResponses = jobSpecsResponses;

  return payload;
}

export default function ManualInsert({
  jobPositions,
  existingApplicants,
  loadingJobs,
  themeColors,
  onSuccess,
}: ManualInsertProps) {
  const { t } = useLocale();
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    gender: 'Male',
    expectedSalary: '',
    jobPositionId: '',
  });
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [manualCustomValues, setManualCustomValues] = useState<Record<string, unknown>>({});
  const [manualTagInputs, setManualTagInputs] = useState<Record<string, string>>({});
  const [manualJobSpecValues, setManualJobSpecValues] = useState<Record<string, boolean>>({});
  const [manualFileResetKey, setManualFileResetKey] = useState(0);

  const selectedJobPosition = jobPositions.find((job) => job._id === manualForm.jobPositionId) || null;
  const customFieldDefinitions = useMemo(() => flattenCustomFields(selectedJobPosition), [selectedJobPosition]);
  const jobSpecDefinitions: Array<{ jobSpecId?: string; spec?: unknown }> = selectedJobPosition?.jobSpecsWithDetails || [];

  // Reset custom values when job position changes
  useEffect(() => {
    const nextCustomValues: Record<string, unknown> = {};
    const nextJobSpecValues: Record<string, boolean> = {};

    customFieldDefinitions.forEach((definition) => {
      if (definition.inputType === 'repeatable_group') {
        nextCustomValues[definition.fieldId] = [];
        return;
      }
      const existingValue = manualCustomValues[definition.fieldId];
      if (existingValue !== undefined) {
        nextCustomValues[definition.fieldId] = existingValue;
        return;
      }
      if (definition.inputType === 'checkbox' || definition.inputType === 'boolean') {
        nextCustomValues[definition.fieldId] = false;
        return;
      }
      nextCustomValues[definition.fieldId] = definition.defaultValue || '';
    });

    jobSpecDefinitions.forEach((spec) => {
      const specId = String(spec?.jobSpecId || '');
      if (!specId) return;
      nextJobSpecValues[specId] = manualJobSpecValues[specId] ?? false;
    });

    setManualCustomValues(nextCustomValues);
    setManualJobSpecValues(nextJobSpecValues);
  }, [manualForm.jobPositionId]);

  const renderFieldError = (field: string) => {
    if (!manualErrors[field]) return null;
    return <p className="mt-1 text-sm text-red-600">{manualErrors[field]}</p>;
  };

  const renderTagsField = (
    fieldKey: string,
    label: string,
    isRequired: boolean,
    value: unknown,
    onChange: (nextTags: string[]) => void
  ) => {
    const tags = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
    const inputValue = manualTagInputs[fieldKey] || '';

    return (
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
          {isRequired ? ' *' : ''}
        </label>
        <div className={`mt-1 rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-3 py-2 shadow-sm ${themeColors.focusRing}`}>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className={`inline-flex items-center gap-1 rounded-full ${themeColors.bgLight} px-3 py-1 text-xs font-semibold ${themeColors.textPrimary}`}>
                {tag}
                <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="rounded-full p-0.5 hover:bg-white/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setManualTagInputs((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const nextTag = inputValue.trim().replace(/,$/, '');
                if (!nextTag) return;
                if (!tags.includes(nextTag)) onChange([...tags, nextTag]);
                setManualTagInputs((prev) => ({ ...prev, [fieldKey]: '' }));
              }}
              placeholder={t('typeTagPressEnter', 'blueCaller')}
              className="min-w-40 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGroupField = (definition: CustomFieldDefinition, value: unknown, onChange: (val: unknown) => void) => {
    const inputClasses = `mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm outline-none transition ${themeColors.focusRing}`;

    if (definition.inputType === 'tags') {
      return renderTagsField(definition.fieldId, definition.label, definition.isRequired, value, (nextTags) => onChange(nextTags));
    }

    if (definition.inputType === 'textarea') {
      return (
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <textarea className={`${inputClasses} min-h-20 text-sm`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }

    if (definition.inputType === 'date') {
      return (
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <input type="date" className={`${inputClasses} text-sm`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }

    if (definition.inputType === 'number') {
      return (
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <input type="number" className={`${inputClasses} text-sm`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }

    if (Array.isArray(definition.choices) && definition.choices.length > 0) {
      return (
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <div className="relative mt-1">
            <select className={`${inputClasses} appearance-none pr-12 text-sm`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
              <option value="">{t('select', 'blueCaller')}</option>
              {definition.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>{choice.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
        <input type={definition.inputType === 'url' ? 'url' : 'text'} className={`${inputClasses} text-sm`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  };

  const renderCustomField = (definition: CustomFieldDefinition) => {
    const value = manualCustomValues[definition.fieldId];
    const inputClasses = `mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm outline-none transition ${themeColors.focusRing}`;
    const error = manualErrors[definition.fieldId];

    if (definition.inputType === 'tags') {
      return (
        <div className="md:col-span-2">
          {renderTagsField(definition.fieldId, definition.label, definition.isRequired, value, (nextTags) =>
            setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: nextTags }))
          )}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (definition.inputType === 'repeatable_group' && Array.isArray(definition.groupFields)) {
      const rows = Array.isArray(value) ? (value as RepeatingRowState[]) : [];
      return (
        <div className="md:col-span-2">
          <div className={`space-y-4 rounded-2xl border ${themeColors.borderLight} bg-gray-50 dark:bg-gray-800/50 p-4`}>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
              <button
                type="button"
                onClick={() => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: [...rows, {}] }))}
                className={`inline-flex items-center gap-2 rounded-lg ${themeColors.bgPrimary} px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition ${themeColors.hoverBg}`}
              >
                <Plus className="h-4 w-4" /> {t('addRow', 'blueCaller')}
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('noRowsAdded', 'blueCaller')}</p>
            ) : (
              rows.map((row, rowIndex) => (
                <div key={rowIndex} className={`space-y-3 rounded-xl border ${themeColors.borderLight} bg-white dark:bg-gray-800 p-3`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('rowLabel', 'blueCaller', { count: rowIndex + 1 })}</span>
                    <button
                      type="button"
                      onClick={() => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: rows.filter((_, i) => i !== rowIndex) }))}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 transition dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('remove', 'blueCaller')}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {definition.groupFields!.map((groupField) =>
                      renderGroupField(groupField, (row as Record<string, unknown>)[groupField.fieldId], (newVal) => {
                        const newRows = [...rows];
                        newRows[rowIndex] = { ...row, [groupField.fieldId]: newVal };
                        setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: newRows }));
                      })
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (definition.inputType === 'textarea') {
      return (
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <textarea className={`${inputClasses} min-h-28`} value={String(value ?? '')} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.value }))} />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (definition.inputType === 'date') {
      return (
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <input type="date" className={inputClasses} value={String(value ?? '')} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.value }))} />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (definition.inputType === 'number') {
      return (
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <input type="number" min={definition.minValue} max={definition.maxValue} className={inputClasses} value={String(value ?? '')} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.value }))} />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (definition.inputType === 'checkbox' || definition.inputType === 'boolean') {
      return (
        <div className={`rounded-xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={Boolean(value)} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            {definition.label}{definition.isRequired ? ' *' : ''}
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    if (Array.isArray(definition.choices) && definition.choices.length > 0) {
      return (
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
          <div className="relative mt-1">
            <select className={`${inputClasses} appearance-none pr-12`} value={String(value ?? '')} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.value }))}>
              <option value="">{t('selectOption', 'blueCaller')}</option>
              {definition.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>{choice.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      );
    }

    return (
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{definition.label}{definition.isRequired ? ' *' : ''}</label>
        <input type={definition.inputType === 'url' ? 'url' : 'text'} className={inputClasses} value={String(value ?? '')} onChange={(e) => setManualCustomValues((prev) => ({ ...prev, [definition.fieldId]: e.target.value }))} />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  };

  const validateManualForm = () => {
    const nextErrors: Record<string, string> = {};

    if (isFieldVisible(selectedJobPosition, 'fullName') && !manualForm.fullName.trim()) nextErrors.fullName = t('fullNameRequired', 'blueCaller');
    if (isFieldVisible(selectedJobPosition, 'email')) {
      if (!manualForm.email.trim()) nextErrors.email = t('emailRequired', 'blueCaller');
      if (manualForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualForm.email.trim())) {
        nextErrors.email = t('validEmail', 'blueCaller');
      }
    }
    if (isFieldVisible(selectedJobPosition, 'phone')) {
      if (!manualForm.phone.trim()) nextErrors.phone = t('phoneRequired', 'blueCaller');
      if (manualForm.phone && !PHONE_REGEX.test(normalizePhoneValue(manualForm.phone))) {
        nextErrors.phone = t('phoneFormat', 'blueCaller');
      }
    }
    if (isFieldVisible(selectedJobPosition, 'address') && !manualForm.address.trim()) nextErrors.address = t('addressRequired', 'blueCaller');
    if (isFieldVisible(selectedJobPosition, 'birthDate')) {
      if (!manualForm.birthDate) nextErrors.birthDate = t('birthDateRequired', 'blueCaller');
      if (manualForm.birthDate && isFutureBirthDate(manualForm.birthDate)) {
        nextErrors.birthDate = t('birthDateFuture', 'blueCaller');
      }
    }
    if (isFieldVisible(selectedJobPosition, 'gender') && !manualForm.gender) nextErrors.gender = t('genderRequired', 'blueCaller');
    if (!manualForm.jobPositionId) nextErrors.jobPositionId = t('selectJobPosition', 'blueCaller');

    if (isFieldVisible(selectedJobPosition, 'profilePhoto') && profilePhotoFile) {
      if (!isAllowedProfilePhotoFile(profilePhotoFile)) {
        nextErrors.profilePhoto = t('profilePhotoFormat', 'blueCaller');
      } else if (!isFileWithinSizeLimit(profilePhotoFile, PROFILE_PHOTO_LIMIT)) {
        nextErrors.profilePhoto = t('profilePhotoSize', 'blueCaller');
      }
    }

    if (isFieldVisible(selectedJobPosition, 'cvFilePath') && cvFile) {
      if (!isAllowedCvFile(cvFile)) {
        nextErrors.cvFilePath = t('cvFormat', 'blueCaller');
      } else if (!isFileWithinSizeLimit(cvFile, CV_LIMIT)) {
        nextErrors.cvFilePath = t('cvSize', 'blueCaller');
      }
    }

    customFieldDefinitions.forEach((definition) => {
      if (definition.inputType === 'repeatable_group') return;
      const value = manualCustomValues[definition.fieldId];
      if (definition.isRequired && (value === undefined || value === null || value === '')) {
        nextErrors[definition.fieldId] = t('customFieldRequired', 'blueCaller', { label: definition.label });
      }
    });

    if (selectedJobPosition?.jobSpecsWithDetails?.length) {
      const missingRequiredSpecs = selectedJobPosition.jobSpecsWithDetails.filter(
        (spec: { jobSpecId?: string }) => manualJobSpecValues[String(spec?.jobSpecId || '')] === undefined
      );
      if (missingRequiredSpecs.length > 0) {
        nextErrors.jobSpecs = t('answerAllJobSpecs', 'blueCaller');
      }
    }

    setManualErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!isAllowedProfilePhotoFile(file)) {
      setManualErrors((prev) => ({ ...prev, profilePhoto: t('profilePhotoFormat', 'blueCaller') }));
      return;
    }
    if (!isFileWithinSizeLimit(file, PROFILE_PHOTO_LIMIT)) {
      setManualErrors((prev) => ({ ...prev, profilePhoto: t('profilePhotoSize', 'blueCaller') }));
      return;
    }
    setManualErrors((prev) => { const next = { ...prev }; delete next.profilePhoto; return next; });
    setProfilePhotoFile(file);
  };

  const handleCvChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!isAllowedCvFile(file)) {
      setManualErrors((prev) => ({ ...prev, cvFilePath: t('cvFormat', 'blueCaller') }));
      return;
    }
    if (!isFileWithinSizeLimit(file, CV_LIMIT)) {
      setManualErrors((prev) => ({ ...prev, cvFilePath: t('cvSize', 'blueCaller') }));
      return;
    }
    setManualErrors((prev) => { const next = { ...prev }; delete next.cvFilePath; return next; });
    setCvFile(file);
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateManualForm()) return;

    const duplicate = checkExistingApplicant(existingApplicants, {
      email: manualForm.email,
      phone: manualForm.phone,
    });

    if (duplicate) {
      const confirmation = await Swal.fire({
        title: t('applicantAlreadyApplied', 'applicants'),
        text: t('applicantAlreadyAppliedDesc', 'applicants', { name: duplicate.fullName || duplicate.email || duplicate.phone }),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('yes', 'common'),
        cancelButtonText: t('no', 'common'),
        reverseButtons: true,
      });

      if (!confirmation.isConfirmed) return;
    }

    setManualSubmitting(true);
    try {
      void Swal.fire({
        title: t('savingApplicant', 'applicants'),
        text: t('uploadingAttachments', 'applicants'),
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); },
      });

      let profilePhotoUrl: string | undefined;
      let cvFileUrl: string | undefined;

      if (profilePhotoFile) {
        setUploadingProfilePhoto(true);
        profilePhotoUrl = await uploadToCloudinary(profilePhotoFile);
      }

      if (cvFile) {
        setUploadingCv(true);
        cvFileUrl = await uploadToCloudinary(cvFile);
      }

      const payload = buildApplicantPayload(
        manualForm,
        selectedJobPosition,
        manualCustomValues,
        manualJobSpecValues,
        profilePhotoUrl,
        cvFileUrl
      );

      await axiosInstance.post('/applicants', payload);

      await Swal.fire({
        title: t('applicantCreated', 'applicants'),
        text: t('applicantCreatedDesc', 'applicants'),
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      });

      setManualForm({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        birthDate: '',
        gender: 'Male',
        expectedSalary: '',
        jobPositionId: '',
      });
      setProfilePhotoFile(null);
      setCvFile(null);
      setManualCustomValues({});
      setManualTagInputs({});
      setManualJobSpecValues({});
      setManualErrors({});
      setManualFileResetKey((v) => v + 1);
      onSuccess();
    } catch (error) {
      await Swal.fire({
        title: t('submitFailed', 'applicants'),
        text: error instanceof Error ? error.message : t('failedToCreateApplicant', 'applicants'),
        icon: 'error',
        confirmButtonText: t('close', 'common'),
      });
    } finally {
      setUploadingProfilePhoto(false);
      setUploadingCv(false);
      setManualSubmitting(false);
    }
  };

  const duplicateApplicant = checkExistingApplicant(existingApplicants, {
    email: manualForm.email,
    phone: manualForm.phone,
  });

  const jobTitle = selectedJobPosition ? getJobTitle(selectedJobPosition) : '';
  // Get job description as string
  const getJobDescription = (job: JobPosition | null): string => {
    if (!job?.description) return '';
    const desc = job.description;
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object') {
      return (desc as { en?: string; ar?: string }).en || (desc as { ar?: string }).ar || '';
    }
    return '';
  };
  const jobDescription = getJobDescription(selectedJobPosition);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <form onSubmit={handleManualSubmit} className={`space-y-6 rounded-3xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 p-6 shadow-xl`}>
        <div className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('manualInsertHeading', 'blueCaller')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('allSubmissionsForced', 'blueCaller')} <span className={`font-semibold ${themeColors.textPrimary}`}>{t('pending', 'blueCaller')}</span> {t('statusSuffix', 'blueCaller')}
            </p>
          </div>
          <div className={`rounded-full ${themeColors.bgLight} dark:bg-gray-700 px-4 py-2 text-sm font-medium ${themeColors.textPrimary}`}>
            {loadingJobs ? t('loadingJobs', 'blueCaller') : t('positionsLoaded', 'blueCaller', { count: jobPositions.length })}
          </div>
        </div>

        {duplicateApplicant && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            {t('duplicateWarning', 'blueCaller', { name: duplicateApplicant.fullName || duplicateApplicant.email || duplicateApplicant.phone })}
          </div>
        )}

        {selectedJobPosition && (
          <div className={`rounded-2xl border ${themeColors.borderLight} p-4`} style={{ background: `linear-gradient(135deg, ${themeColors.gradientFrom}18, ${themeColors.gradientTo}18)` }}>
            <h3 className={`text-lg font-bold ${themeColors.textPrimary}`}>{jobTitle}</h3>
            {jobDescription && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{jobDescription}</p>}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {isFieldVisible(selectedJobPosition, 'fullName') && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('fullNameLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'fullName') ? '*' : ''}</label>
              <input type="text" value={manualForm.fullName} onChange={(e) => setManualForm((prev) => ({ ...prev, fullName: e.target.value }))} className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} placeholder={t('fullNamePlaceholder', 'blueCaller')} />
              {renderFieldError('fullName')}
            </div>
          )}

          {isFieldVisible(selectedJobPosition, 'email') && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('emailLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'email') ? '*' : ''}</label>
              <input type="email" value={manualForm.email} onChange={(e) => setManualForm((prev) => ({ ...prev, email: e.target.value }))} className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} placeholder={t('emailPlaceholder', 'blueCaller')} />
              {renderFieldError('email')}
            </div>
          )}

          {isFieldVisible(selectedJobPosition, 'phone') && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('phoneLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'phone') ? '*' : ''}</label>
              <input type="text" value={manualForm.phone} onChange={(e) => setManualForm((prev) => ({ ...prev, phone: e.target.value }))} className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} placeholder={t('phonePlaceholder', 'blueCaller')} />
              {renderFieldError('phone')}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('jobPositionLabel', 'blueCaller')} *</label>
            <div className="relative mt-1">
              <select value={manualForm.jobPositionId} onChange={(e) => setManualForm((prev) => ({ ...prev, jobPositionId: e.target.value }))} className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 pr-12 shadow-sm outline-none transition ${themeColors.focusRing}`}>
                <option value="">{t('selectJobPositionOption', 'blueCaller')}</option>
                {jobPositions.map((job) => (
                  <option key={job._id} value={job._id}>{getJobTitle(job)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            </div>
            {renderFieldError('jobPositionId')}
          </div>

          {isFieldVisible(selectedJobPosition, 'address') && (
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('addressLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'address') ? '*' : ''}</label>
              <textarea value={manualForm.address} onChange={(e) => setManualForm((prev) => ({ ...prev, address: e.target.value }))} className={`mt-1 min-h-28 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} placeholder={t('addressPlaceholder', 'blueCaller')} />
              {renderFieldError('address')}
            </div>
          )}

          {isFieldVisible(selectedJobPosition, 'birthDate') && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('birthDateLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'birthDate') ? '*' : ''}</label>
              <input type="date" value={manualForm.birthDate} onChange={(e) => setManualForm((prev) => ({ ...prev, birthDate: e.target.value }))} className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} />
              {renderFieldError('birthDate')}
            </div>
          )}

          {isFieldVisible(selectedJobPosition, 'gender') && (
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('genderLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'gender') ? '*' : ''}</label>
              <div className="relative mt-1">
                <select value={manualForm.gender} onChange={(e) => setManualForm((prev) => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))} className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 pr-12 shadow-sm outline-none transition ${themeColors.focusRing}`}>
                  <option value="Male">{t('male', 'blueCaller')}</option>
                  <option value="Female">{t('female', 'blueCaller')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              </div>
              {renderFieldError('gender')}
            </div>
          )}

          {isFieldVisible(selectedJobPosition, 'expectedSalary') && (
  <div>
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('expectedSalaryLabel', 'blueCaller')} {isFieldRequired(selectedJobPosition, 'expectedSalary') ? '*' : ''}</label>
    <input 
      type="number" 
      value={manualForm.expectedSalary} 
      onChange={(e) => {
        const value = e.target.value;
        // Allow empty string or convert negative to positive
        if (value === '' || parseFloat(value) >= 0) {
          setManualForm((prev) => ({ ...prev, expectedSalary: value }));
        } else if (parseFloat(value) < 0) {
          setManualForm((prev) => ({ ...prev, expectedSalary: '0' }));
        }
      }} 
      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`} 
      placeholder={t('salaryPlaceholder', 'blueCaller')} 
      min="0"
      step="1"
    />
    {renderFieldError('expectedSalary')}
  </div>
)}

          {(isFieldVisible(selectedJobPosition, 'profilePhoto') || isFieldVisible(selectedJobPosition, 'cvFilePath')) && (
            <div className={`grid gap-3 md:col-span-2 ${isFieldVisible(selectedJobPosition, 'profilePhoto') && isFieldVisible(selectedJobPosition, 'cvFilePath') ? 'sm:grid-cols-2' : ''}`}>
              {isFieldVisible(selectedJobPosition, 'profilePhoto') && (
                <div className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4`}>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary}`}>
                    <ImageIcon className="h-4 w-4" /> {t('profilePhotoLabel', 'blueCaller')}
                  </div>
                  <label className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-6 text-center transition hover:bg-gray-50 dark:hover:bg-gray-700`}>
                    <Upload className={`h-5 w-5 ${themeColors.textPrimary}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{profilePhotoFile ? getDisplayFileName(profilePhotoFile.name) : t('profilePhotoHint', 'blueCaller')}</span>
                    <input key={manualFileResetKey} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleProfilePhotoChange} />
                  </label>
                  {profilePhotoFile && (
                    <button type="button" onClick={() => setProfilePhotoFile(null)} className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary} hover:opacity-80`}>
                      <Trash2 className="h-4 w-4" /> {t('clearFile', 'blueCaller')}
                    </button>
                  )}
                  {renderFieldError('profilePhoto')}
                </div>
              )}

              {isFieldVisible(selectedJobPosition, 'cvFilePath') && (
                <div className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4`}>
                  <div className={`flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary}`}>
                    <FileText className="h-4 w-4" /> {t('cvFileLabel', 'blueCaller')}
                  </div>
                  <label className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-6 text-center transition hover:bg-gray-50 dark:hover:bg-gray-700`}>
                    <Upload className={`h-5 w-5 ${themeColors.textPrimary}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cvFile ? getDisplayFileName(cvFile.name) : t('cvHint', 'blueCaller')}</span>
                    <input key={`${manualFileResetKey}-cv`} type="file" accept="application/pdf" className="hidden" onChange={handleCvChange} />
                  </label>
                  {cvFile && (
                    <button type="button" onClick={() => setCvFile(null)} className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary} hover:opacity-80`}>
                      <Trash2 className="h-4 w-4" /> {t('clearFile', 'blueCaller')}
                    </button>
                  )}
                  {renderFieldError('cvFilePath')}
                </div>
              )}
            </div>
          )}
        </div>

        {customFieldDefinitions.length > 0 && (
          <div className={`space-y-4 rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}>
            <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${themeColors.textPrimary}`}>
              <ShieldAlert className="h-4 w-4" /> {t('jobSpecificFields', 'blueCaller')}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {customFieldDefinitions.map((definition) => renderCustomField(definition))}
            </div>
          </div>
        )}

        {jobSpecDefinitions.length > 0 && (
          <div className={`space-y-4 rounded-2xl border ${themeColors.borderLight} bg-white dark:bg-gray-800 p-4`}>
            <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${themeColors.textPrimary}`}>
              <CheckCircle2 className="h-4 w-4" /> {t('jobSpecResponses', 'blueCaller')}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {jobSpecDefinitions.map((spec: { jobSpecId?: string; spec?: unknown }, index: number) => {
                const specId = String(spec?.jobSpecId || `spec_${index}`);
                const specValue = spec?.spec;
                let label = t('jobSpecDefaultLabel', 'blueCaller', { index: index + 1 });
                if (specValue) {
                  if (typeof specValue === 'string') label = specValue;
                  else if (typeof specValue === 'object') {
                    label = (specValue as { en?: string; ar?: string }).en || (specValue as { ar?: string }).ar || label;
                  }
                }
                const answer = manualJobSpecValues[specId] ?? false;
                return (
                  <label key={specId} className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4 text-sm font-medium text-gray-700 dark:text-gray-200`}>
                    <span className="block font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                    <span className="mt-3 flex items-center gap-3">
                      <input type="checkbox" checked={answer} onChange={(e) => setManualJobSpecValues((prev) => ({ ...prev, [specId]: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      {t('requiredAnswer', 'blueCaller')}
                    </span>
                  </label>
                );
              })}
            </div>
            {manualErrors.jobSpecs && <p className="text-sm text-red-600">{manualErrors.jobSpecs}</p>}
          </div>
        )}

        <div className={`flex flex-wrap items-center justify-between gap-4 border-t ${themeColors.borderLight} pt-4`}>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {manualSubmitting || uploadingProfilePhoto || uploadingCv ? t('processingStatus', 'blueCaller') : t('readyStatus', 'blueCaller')}
          </div>
          <button type="submit" disabled={manualSubmitting || uploadingProfilePhoto || uploadingCv || loadingJobs} className={`inline-flex items-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${themeColors.hoverBg} disabled:cursor-not-allowed disabled:opacity-60`}>
            {manualSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {t('insertApplicant', 'blueCaller')}
          </button>
        </div>
      </form>

      <aside className={`space-y-4 rounded-3xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 p-6 shadow-xl`}>
        <div className={`flex items-center gap-2 border-b ${themeColors.borderLight} pb-4`}>
          <Users className={`h-5 w-5 ${themeColors.textPrimary}`} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('insertionRules', 'blueCaller')}</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          {[
            { title: t('ruleHardcodedStatus', 'blueCaller'), body: <>{t('ruleStatusBodyPrefix', 'blueCaller')} <span className={`font-semibold ${themeColors.textPrimary}`}>{t('pending', 'blueCaller')}</span>{t('ruleStatusBodySuffix', 'blueCaller')}</> },
            { title: t('ruleFileUploads', 'blueCaller'), body: t('ruleFileUploadsBody', 'blueCaller') },
            { title: t('ruleDuplicateProtection', 'blueCaller'), body: t('ruleDuplicateBody', 'blueCaller') },
            { title: t('ruleJobDrivenFields', 'blueCaller'), body: t('ruleJobDrivenBody', 'blueCaller') },
          ].map(({ title, body }) => (
            <div key={title} className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4`}>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
              <p className="mt-1">{body}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}