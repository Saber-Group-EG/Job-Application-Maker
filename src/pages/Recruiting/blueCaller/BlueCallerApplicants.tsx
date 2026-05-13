import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  Building2,
} from 'lucide-react';
import axiosInstance from '../../../config/axios';
import { useAuth } from '../../../context/AuthContext';
import PageMeta from '../../../components/common/PageMeta';
import Swal from '../../../utils/swal';
import { applicantsService } from '../../../services/applicantsService';
import { jobPositionsService } from '../../../services/jobPositionsService';
import { getErrorMessage } from '../../../utils/errorHandler';
import { toPlainString } from '../../../utils/strings';
import type { Applicant } from '../../../types/applicants';
import type { JobPosition } from '../../../types/jobPositions';

type TabKey = 'manual' | 'bulk';

type Company = {
  _id: string;
  nameEN?: string;
  name?: string | { en: string; ar?: string };
  settings?: {
    defaultColorGradient?: string[];
  };
};

type ManualFormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'Male' | 'Female';
  expectedSalary: string;
  jobPositionId: string;
  profilePhoto?: string;
  cvFilePath?: string;
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

type BulkApplicantRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'Male' | 'Female' | string;
  expectedSalary?: number;
  jobPositionId: string;
  errors: string[];
};

type PreparedApplicantPayload = {
  jobPositionId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'Male' | 'Female';
  status: 'pending';
  expectedSalary?: number;
  profilePhoto?: string;
  cvFilePath?: string;
  customResponses?: Record<string, unknown>;
  jobSpecsResponses?: Array<{ jobSpecId: string; answer: boolean }>;
};

type RowValidationResult = BulkApplicantRow & { normalizedPhone: string };

const PHONE_REGEX = /^01[0125]\d{8}$/;
const PROFILE_PHOTO_LIMIT = 5 * 1024 * 1024;
const CV_LIMIT = 10 * 1024 * 1024;

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

// ─── Theme helpers ────────────────────────────────────────────────────────────

function getThemeGradient(company?: Company | null): { from: string; to: string } {
  const colors = company?.settings?.defaultColorGradient;
  if (Array.isArray(colors) && colors.length >= 2) {
    return { from: String(colors[0]), to: String(colors[1]) };
  }
  return { from: '#3b82f6', to: '#0ea5e9' };
}

function getTailwindColorClass(company?: Company | null): {
  bgPrimary: string;
  borderPrimary: string;
  textPrimary: string;
  bgLight: string;
  borderLight: string;
  focusRing: string;
} {
  const isDefaultBlue = !company?.settings?.defaultColorGradient?.length;
  if (isDefaultBlue) {
    return {
      bgPrimary: 'bg-blue-600',
      borderPrimary: 'border-blue-200',
      textPrimary: 'text-blue-700',
      bgLight: 'bg-blue-50',
      borderLight: 'border-blue-100',
      focusRing: 'focus:border-blue-500 focus:ring-blue-100',
    };
  }
  return {
    bgPrimary: 'bg-slate-600',
    borderPrimary: 'border-slate-200',
    textPrimary: 'text-slate-700',
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-100',
    focusRing: 'focus:border-slate-500 focus:ring-slate-100',
  };
}

// ─── Field-visibility helpers ─────────────────────────────────────────────────

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

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultManualForm: ManualFormState = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  gender: 'Male',
  expectedSalary: '',
  jobPositionId: '',
};

// ─── Misc helpers ─────────────────────────────────────────────────────────────

function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  return getErrorMessage(error as never) || fallback;
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

function toStringValue(value: unknown): string {
  const plain = toPlainString(value as never);
  return plain ? String(plain) : '';
}

// ─── Custom-field flattening and key helpers (matching JobApplicationForm) ───

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
      label: toStringValue(
        choiceRecord.label ?? choiceRecord.en ?? choiceRecord.value ?? choice
      ),
      value: toStringValue(
        choiceRecord.value ?? choiceRecord.en ?? choiceRecord.label ?? choice
      ),
    };
  };

  (jobPosition?.customFields || []).forEach((field: unknown, index: number) => {
    if (!field) return;
    const fieldRecord = field as Record<string, unknown>;
    const baseLabel =
      toStringValue(fieldRecord.label) ||
      String(fieldRecord.fieldId || `Field ${index + 1}`);
    const inputType = String(fieldRecord.inputType || 'text');

    const baseDefinition: CustomFieldDefinition = {
      fieldId: String(fieldRecord.fieldId || `field_${index}`),
      label: baseLabel,
      inputType,
      isRequired: Boolean(fieldRecord.isRequired),
      defaultValue: fieldRecord.defaultValue ? String(fieldRecord.defaultValue) : '',
      minValue:
        typeof fieldRecord.minValue === 'number' ? fieldRecord.minValue : undefined,
      maxValue:
        typeof fieldRecord.maxValue === 'number' ? fieldRecord.maxValue : undefined,
      choices: Array.isArray(fieldRecord.choices)
        ? fieldRecord.choices.map(mapChoice)
        : undefined,
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
            fieldId: String(
              groupRecord.fieldId ||
                `${baseDefinition.fieldId}_group_${groupIndex}`
            ),
            label: toStringValue(groupRecord.label) || `Field ${groupIndex + 1}`,
            inputType: String(groupRecord.inputType || 'text'),
            isRequired: Boolean(groupRecord.isRequired),
            defaultValue: groupRecord.defaultValue ? String(groupRecord.defaultValue) : '',
            minValue:
              typeof groupRecord.minValue === 'number' ? groupRecord.minValue : undefined,
            maxValue:
              typeof groupRecord.maxValue === 'number' ? groupRecord.maxValue : undefined,
            choices: Array.isArray(groupRecord.choices)
              ? groupRecord.choices.map(mapChoice)
              : undefined,
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

// ─── Payload builder matching JobApplicationForm exactly ──────────────────────
//
// This matches the exact format from your working JobApplicationForm:
// - English keys (using getFieldKeyEn)
// - Simple fields: { type, answer }
// - groupField: single object with { subKey: { type, answer } }
// - repeatable_group: array of such objects
// - tags: plain array of strings
// - checkbox: boolean

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

    const wrap = (inputType: string, answer: unknown) => ({
      type: inputType || 'text',
      answer,
    });

    // Case 1: groupField (single object with subfields)
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

    // Case 2: repeatable_group (array of objects with subfields)
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

    // Case 3: tags field -> plain array of strings
    if (field.inputType === 'tags') {
      const tags = Array.isArray(val) 
        ? val.filter((tag) => tag && String(tag).trim() !== '')
        : [];
      if (tags.length > 0) {
        remappedCustomResponses[enKey] = tags;
      }
      return;
    }

    // Case 4: checkbox -> boolean
    if (field.inputType === 'checkbox') {
      remappedCustomResponses[enKey] = Boolean(val);
      return;
    }

    // Case 5: All other field types -> { type, answer }
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

function parseExcelDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);
    return trimmed;
  }
  return '';
}

function buildTemplateWorkbook() {
  const headers = [
    'fullName',
    'email',
    'phone',
    'address',
    'birthDate',
    'gender',
    'expectedSalary',
    'jobPositionId',
  ];
  const example = [
    'Amina Hassan',
    'amina@example.com',
    '01012345678',
    'Cairo',
    '1998-06-12',
    'Female',
    '12000',
    'JOB_POSITION_ID',
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants');
  return workbook;
}

async function uploadToCloudinary(
  file: File,
  retries = 2,
  delayMs = 400
): Promise<string> {
  const cloudName =
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) ||
    (import.meta.env.VITE_CLOUDINARY_CLOUD as string) ||
    '';
  const uploadPreset =
    (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) ||
    (import.meta.env.VITE_CLOUDINARY_PRESET as string) ||
    '';

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials are missing.');
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      );

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

function checkExistingApplicant(
  existingApplicants: Applicant[],
  candidate: { email: string; phone: string }
): Applicant | null {
  const normalizedEmail = candidate.email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneValue(candidate.phone);

  return (
    existingApplicants.find((applicant) => {
      const applicantEmail = String(applicant?.email || '').trim().toLowerCase();
      const applicantPhone = normalizePhoneValue(String(applicant?.phone || ''));
      return (
        (normalizedEmail && applicantEmail === normalizedEmail) ||
        (normalizedPhone && applicantPhone === normalizedPhone)
      );
    }) || null
  );
}

function normalizeApplicantRow(
  rawRow: Record<string, unknown>,
  rowNumber: number
): BulkApplicantRow {
  return {
    rowNumber,
    fullName: String(rawRow.fullName || '').trim(),
    email: String(rawRow.email || '').trim(),
    phone: String(rawRow.phone || '').trim(),
    address: String(rawRow.address || '').trim(),
    birthDate: parseExcelDate(rawRow.birthDate),
    gender: String(rawRow.gender || '').trim(),
    expectedSalary:
      rawRow.expectedSalary === undefined ||
      rawRow.expectedSalary === null ||
      rawRow.expectedSalary === ''
        ? undefined
        : Number(rawRow.expectedSalary),
    jobPositionId: String(rawRow.jobPositionId || '').trim(),
    errors: [],
  };
}

function validateBulkRow(
  row: BulkApplicantRow,
  jobPositionIds: Set<string>,
  existingApplicants: Applicant[],
  batchSeenEmails: Map<string, number>,
  batchSeenPhones: Map<string, number>
): RowValidationResult {
  const errors: string[] = [];
  const normalizedPhone = normalizePhoneValue(row.phone);
  const normalizedEmail = row.email.trim().toLowerCase();

  if (!row.fullName) errors.push('Full name is required.');
  if (!normalizedEmail) errors.push('Email is required.');
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.push('Invalid email format.');
  }
  if (!normalizedPhone) errors.push('Phone is required.');
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    errors.push('Phone must match 01[0125]XXXXXXXX.');
  }
  if (!row.address) errors.push('Address is required.');
  if (!row.birthDate) errors.push('Birth date is required.');
  if (row.birthDate && isFutureBirthDate(row.birthDate)) {
    errors.push('Birth date cannot be in the future.');
  }
  if (!row.gender) errors.push('Gender is required.');
  if (row.gender && !['Male', 'Female'].includes(row.gender)) {
    errors.push('Gender must be Male or Female.');
  }
  if (!row.jobPositionId) errors.push('Job position is required.');
  if (row.jobPositionId && !jobPositionIds.has(row.jobPositionId)) {
    errors.push('Job position ID was not found in the loaded job positions.');
  }
  if (row.expectedSalary !== undefined && Number.isNaN(row.expectedSalary)) {
    errors.push('Expected salary must be numeric.');
  }

  if (normalizedEmail) {
    const firstSeenRow = batchSeenEmails.get(normalizedEmail);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      errors.push(`Duplicate email already appears in row ${firstSeenRow}.`);
    } else {
      batchSeenEmails.set(normalizedEmail, row.rowNumber);
    }
  }

  if (normalizedPhone) {
    const firstSeenRow = batchSeenPhones.get(normalizedPhone);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      errors.push(`Duplicate phone already appears in row ${firstSeenRow}.`);
    } else {
      batchSeenPhones.set(normalizedPhone, row.rowNumber);
    }
  }

  const duplicate = checkExistingApplicant(existingApplicants, {
    email: normalizedEmail,
    phone: normalizedPhone,
  });
  if (duplicate) {
    errors.push(
      `Duplicate applicant found in the current company scope (${
        duplicate.fullName || duplicate._id
      }).`
    );
  }

  return { ...row, phone: normalizedPhone, errors, normalizedPhone };
}

function buildApplicantPayload(
  form: ManualFormState,
  jobPosition: JobPosition | null,
  customValues: Record<string, unknown>,
  jobSpecValues: Record<string, boolean>,
  profilePhotoUrl?: string,
  cvFileUrl?: string
): PreparedApplicantPayload {
  const customDefinitions = flattenCustomFields(jobPosition);
  const customResponses = buildCustomResponsesPayload(customValues, customDefinitions);
  const jobSpecsResponses = buildJobSpecsResponsesPayload(jobPosition, jobSpecValues);

  const payload: PreparedApplicantPayload = {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlueCallerApplicants() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('manual');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [existingApplicants, setExistingApplicants] = useState<Applicant[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>(defaultManualForm);
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [manualCustomValues, setManualCustomValues] = useState<Record<string, unknown>>({});
  const [manualTagInputs, setManualTagInputs] = useState<Record<string, string>>({});
  const [manualJobSpecValues, setManualJobSpecValues] = useState<Record<string, boolean>>({});
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkApplicantRow[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [manualFileResetKey, setManualFileResetKey] = useState(0);
  const [bulkFileResetKey, setBulkFileResetKey] = useState(0);

  // ── Derived from user context ──────────────────────────────────────────────

  const userCompanyIds = useMemo<string[] | undefined>(() => {
    if (!user) return [] as string[];
    const roleName = String((user as { roleId?: { name?: string } })?.roleId?.name || '').toLowerCase();
    if (roleName === 'admin' || roleName === 'super admin') return undefined;

    const userRecord = user as {
      companies?: Array<{ companyId?: string | { _id?: string } } | null>;
      assignedcompanyId?: Array<string | undefined>;
    };

    const ids = [
      ...(Array.isArray(userRecord.companies)
        ? userRecord.companies.map((entry) =>
            typeof entry?.companyId === 'string'
              ? entry.companyId
              : (entry?.companyId as { _id?: string } | undefined)?._id
          )
        : []),
      ...(Array.isArray(userRecord.assignedcompanyId)
        ? userRecord.assignedcompanyId.filter(
            (value): value is string => Boolean(value)
          )
        : []),
    ]
      .filter(Boolean)
      .map((value) => String(value));

    return ids.length > 0 ? Array.from(new Set(ids)) : [];
  }, [user]);

  const selectedJobPosition =
    jobPositions.find((job) => job._id === manualForm.jobPositionId) || null;
  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);
  const themeColors = getTailwindColorClass(selectedCompany);

  const customFieldDefinitions = useMemo(
    () => flattenCustomFields(selectedJobPosition),
    [selectedJobPosition]
  );

  const jobSpecDefinitions: Array<{ jobSpecId?: string; spec?: unknown }> =
    selectedJobPosition?.jobSpecsWithDetails || [];

  // ── Load companies ─────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const filterQuery =
          userCompanyIds === undefined
            ? {}
            : { companyId: userCompanyIds };

        const allJobPositions = await jobPositionsService.getAllJobPositions({
          ...filterQuery,
          deleted: false,
        });

        const uniqueCompanies = new Map<string, Company>();
        (Array.isArray(allJobPositions) ? allJobPositions : []).forEach(
          (job: JobPosition) => {
            const companyId = String(
              (job?.companyId as { _id?: string } | undefined)?._id || ''
            );
            if (companyId && !uniqueCompanies.has(companyId)) {
              const companyRecord = job.companyId as
                | {
                    _id?: string;
                    name?: string | { en: string; ar?: string };
                    settings?: { defaultColorGradient?: string[] };
                  }
                | undefined;
              uniqueCompanies.set(companyId, {
                _id: companyId,
                nameEN:
                  typeof companyRecord?.name === 'string'
                    ? companyRecord.name
                    : companyRecord?.name?.en,
                name: companyRecord?.name,
                settings: companyRecord?.settings,
              });
            }
          }
        );

        if (mounted) {
          setCompanies(Array.from(uniqueCompanies.values()));
          if (uniqueCompanies.size === 1) {
            const [firstCompanyId] = Array.from(uniqueCompanies.keys());
            setSelectedCompanyId(firstCompanyId);
          }
        }
      } catch (error) {
        if (mounted) {
          await Swal.fire({
            title: 'Load failed',
            text: getApiErrorMessage(error, 'Failed to load companies.'),
            icon: 'error',
            confirmButtonText: 'Close',
          });
        }
      } finally {
        if (mounted) setLoadingCompanies(false);
      }
    };

    loadCompanies();
    return () => { mounted = false; };
  }, [userCompanyIds]);

  // ── Load job positions + applicants when company changes ───────────────────

  useEffect(() => {
    let mounted = true;

    if (!selectedCompanyId) {
      setJobPositions([]);
      setExistingApplicants([]);
      return;
    }

    const loadData = async () => {
      setLoadingJobs(true);
      try {
        const [positions, applicants] = await Promise.all([
          jobPositionsService.getAllJobPositions({
            companyId: [selectedCompanyId],
            deleted: false,
          }),
          applicantsService.getAllApplicants({
            companyId: [selectedCompanyId],
            fields: 'email,phone,fullName,companyId',
            skipPopulation: true,
          }),
        ]);

        if (!mounted) return;
        setJobPositions(Array.isArray(positions) ? positions : []);
        setExistingApplicants(Array.isArray(applicants) ? applicants : []);
      } catch (error) {
        if (!mounted) return;
        await Swal.fire({
          title: 'Load failed',
          text: getApiErrorMessage(
            error,
            'Failed to load applicants or job positions.'
          ),
          icon: 'error',
          confirmButtonText: 'Close',
        });
      } finally {
        if (mounted) setLoadingJobs(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [selectedCompanyId]);

  // ── Reset custom values when job position changes ─────────────────────────

  useEffect(() => {
    setManualErrors((previous) => {
      const next = { ...previous };
      if (manualForm.jobPositionId && next.jobPositionId) delete next.jobPositionId;
      return next;
    });

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

      if (
        definition.inputType === 'checkbox' ||
        definition.inputType === 'boolean'
      ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualForm.jobPositionId, jobSpecDefinitions.length]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateManualForm = () => {
    const nextErrors: Record<string, string> = {};

    if (isFieldVisible(selectedJobPosition, 'fullName')) {
      if (!manualForm.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    }
    if (isFieldVisible(selectedJobPosition, 'email')) {
      if (!manualForm.email.trim()) nextErrors.email = 'Email is required.';
      if (
        manualForm.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualForm.email.trim())
      ) {
        nextErrors.email = 'Enter a valid email address.';
      }
    }
    if (isFieldVisible(selectedJobPosition, 'phone')) {
      if (!manualForm.phone.trim()) nextErrors.phone = 'Phone is required.';
      if (
        manualForm.phone &&
        !PHONE_REGEX.test(normalizePhoneValue(manualForm.phone))
      ) {
        nextErrors.phone = 'Phone must match 01[0125]XXXXXXXX.';
      }
    }
    if (isFieldVisible(selectedJobPosition, 'address')) {
      if (!manualForm.address.trim()) nextErrors.address = 'Address is required.';
    }
    if (isFieldVisible(selectedJobPosition, 'birthDate')) {
      if (!manualForm.birthDate) nextErrors.birthDate = 'Birth date is required.';
      if (manualForm.birthDate && isFutureBirthDate(manualForm.birthDate)) {
        nextErrors.birthDate = 'Birth date cannot be in the future.';
      }
    }
    if (isFieldVisible(selectedJobPosition, 'gender')) {
      if (!manualForm.gender) nextErrors.gender = 'Gender is required.';
    }
    if (!manualForm.jobPositionId) nextErrors.jobPositionId = 'Select a job position.';

    if (isFieldVisible(selectedJobPosition, 'profilePhoto')) {
      if (profilePhotoFile) {
        if (!isAllowedProfilePhotoFile(profilePhotoFile)) {
          nextErrors.profilePhoto = 'Profile photo must be JPG or PNG.';
        } else if (!isFileWithinSizeLimit(profilePhotoFile, PROFILE_PHOTO_LIMIT)) {
          nextErrors.profilePhoto = 'Profile photo must be 5 MB or less.';
        }
      }
    }

    if (isFieldVisible(selectedJobPosition, 'cvFilePath')) {
      if (cvFile) {
        if (!isAllowedCvFile(cvFile)) {
          nextErrors.cvFilePath = 'CV must be a PDF.';
        } else if (!isFileWithinSizeLimit(cvFile, CV_LIMIT)) {
          nextErrors.cvFilePath = 'CV must be 10 MB or less.';
        }
      }
    }

    customFieldDefinitions.forEach((definition) => {
      if (definition.inputType === 'repeatable_group') return;
      const value = manualCustomValues[definition.fieldId];
      if (!definition.isRequired) return;
      if (value === undefined || value === null || value === '') {
        nextErrors[definition.fieldId] = `${definition.label} is required.`;
      }
    });

    if (selectedJobPosition?.jobSpecsWithDetails?.length) {
      const missingRequiredSpecs = selectedJobPosition.jobSpecsWithDetails.filter(
        (spec: { jobSpecId?: string }) =>
          manualJobSpecValues[String(spec?.jobSpecId || '')] === undefined
      );
      if (missingRequiredSpecs.length > 0) {
        nextErrors.jobSpecs = 'Please answer all job-spec questions.';
      }
    }

    setManualErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ── File handlers ──────────────────────────────────────────────────────────

  const handleProfilePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!isAllowedProfilePhotoFile(file)) {
      setManualErrors((prev) => ({
        ...prev,
        profilePhoto: 'Profile photo must be JPG or PNG.',
      }));
      return;
    }
    if (!isFileWithinSizeLimit(file, PROFILE_PHOTO_LIMIT)) {
      setManualErrors((prev) => ({
        ...prev,
        profilePhoto: 'Profile photo must be 5 MB or less.',
      }));
      return;
    }
    setManualErrors((prev) => {
      const next = { ...prev };
      delete next.profilePhoto;
      return next;
    });
    setProfilePhotoFile(file);
  };

  const handleCvChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!isAllowedCvFile(file)) {
      setManualErrors((prev) => ({ ...prev, cvFilePath: 'CV must be a PDF.' }));
      return;
    }
    if (!isFileWithinSizeLimit(file, CV_LIMIT)) {
      setManualErrors((prev) => ({
        ...prev,
        cvFilePath: 'CV must be 10 MB or less.',
      }));
      return;
    }
    setManualErrors((prev) => {
      const next = { ...prev };
      delete next.cvFilePath;
      return next;
    });
    setCvFile(file);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

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
    const tags = Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const inputValue = manualTagInputs[fieldKey] || '';

    return (
      <div>
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {isRequired ? ' *' : ''}
        </label>
        <div
          className={`mt-1 rounded-xl border ${themeColors.borderPrimary} bg-white px-3 py-2 shadow-sm ${themeColors.focusRing}`}
        >
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 rounded-full ${themeColors.bgLight} px-3 py-1 text-xs font-semibold ${themeColors.textPrimary}`}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((t) => t !== tag))}
                  className="rounded-full p-0.5 hover:bg-white/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={inputValue}
              onChange={(e) =>
                setManualTagInputs((prev) => ({
                  ...prev,
                  [fieldKey]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const nextTag = inputValue.trim().replace(/,$/, '');
                if (!nextTag) return;
                if (!tags.includes(nextTag)) onChange([...tags, nextTag]);
                setManualTagInputs((prev) => ({ ...prev, [fieldKey]: '' }));
              }}
              placeholder="Type a tag and press Enter"
              className="min-w-40 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGroupField = (
    definition: CustomFieldDefinition,
    value: unknown,
    onChange: (val: unknown) => void
  ) => {
    const inputClasses = `mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition ${themeColors.focusRing}`;

    if (definition.inputType === 'tags') {
      return (
        <div key={definition.fieldId}>
          {renderTagsField(
            definition.fieldId,
            definition.label,
            definition.isRequired,
            value,
            (nextTags) => onChange(nextTags)
          )}
        </div>
      );
    }

    if (definition.inputType === 'textarea') {
      return (
        <div key={definition.fieldId}>
          <label className="text-xs font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <textarea
            className={`${inputClasses} min-h-20 text-sm`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }

    if (definition.inputType === 'date') {
      return (
        <div key={definition.fieldId}>
          <label className="text-xs font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <input
            type="date"
            className={`${inputClasses} text-sm`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }

    if (definition.inputType === 'number') {
      return (
        <div key={definition.fieldId}>
          <label className="text-xs font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <input
            type="number"
            className={`${inputClasses} text-sm`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    }

    if (Array.isArray(definition.choices) && definition.choices.length > 0) {
      return (
        <div key={definition.fieldId}>
          <label className="text-xs font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <div className="relative mt-1">
            <select
              className={`${inputClasses} appearance-none pr-12 text-sm`}
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">Select</option>
              {definition.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      );
    }

    return (
      <div key={definition.fieldId}>
        <label className="text-xs font-semibold text-slate-700">
          {definition.label}
          {definition.isRequired ? ' *' : ''}
        </label>
        <input
          type={definition.inputType === 'url' ? 'url' : 'text'}
          className={`${inputClasses} text-sm`}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  };

  const renderCustomField = (definition: CustomFieldDefinition) => {
    const value = manualCustomValues[definition.fieldId];
    const inputClasses = `mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition ${themeColors.focusRing}`;
    const error = manualErrors[definition.fieldId];

    if (definition.inputType === 'tags') {
      return (
        <div key={definition.fieldId} className="md:col-span-2">
          {renderTagsField(
            definition.fieldId,
            definition.label,
            definition.isRequired,
            value,
            (nextTags) =>
              setManualCustomValues((prev) => ({
                ...prev,
                [definition.fieldId]: nextTags,
              }))
          )}
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (
      definition.inputType === 'repeatable_group' &&
      Array.isArray(definition.groupFields)
    ) {
      const rows = Array.isArray(value) ? (value as RepeatingRowState[]) : [];
      return (
        <div key={definition.fieldId} className="md:col-span-2">
          <div
            className={`space-y-4 rounded-2xl border ${themeColors.borderLight} bg-slate-50 p-4`}
          >
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-slate-700">
                {definition.label}
                {definition.isRequired ? ' *' : ''}
              </label>
              <button
                type="button"
                onClick={() =>
                  setManualCustomValues((prev) => ({
                    ...prev,
                    [definition.fieldId]: [...rows, {}],
                  }))
                }
                className={`inline-flex items-center gap-2 rounded-lg ${themeColors.bgPrimary} px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition`}
              >
                <Plus className="h-4 w-4" />
                Add row
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No rows added yet</p>
            ) : (
              rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`space-y-3 rounded-xl border ${themeColors.borderLight} bg-white p-3`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Row {rowIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setManualCustomValues((prev) => ({
                          ...prev,
                          [definition.fieldId]: rows.filter(
                            (_, i) => i !== rowIndex
                          ),
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {definition.groupFields!.map((groupField) =>
                      renderGroupField(
                        groupField,
                        (row as Record<string, unknown>)[groupField.fieldId],
                        (newVal) => {
                          const newRows = [...rows];
                          newRows[rowIndex] = {
                            ...row,
                            [groupField.fieldId]: newVal,
                          };
                          setManualCustomValues((prev) => ({
                            ...prev,
                            [definition.fieldId]: newRows,
                          }));
                        }
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      );
    }

    if (definition.inputType === 'textarea') {
      return (
        <div key={definition.fieldId}>
          <label className="text-sm font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <textarea
            className={`${inputClasses} min-h-28`}
            value={String(value ?? '')}
            onChange={(e) =>
              setManualCustomValues((prev) => ({
                ...prev,
                [definition.fieldId]: e.target.value,
              }))
            }
          />
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (definition.inputType === 'date') {
      return (
        <div key={definition.fieldId}>
          <label className="text-sm font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <input
            type="date"
            className={inputClasses}
            value={String(value ?? '')}
            onChange={(e) =>
              setManualCustomValues((prev) => ({
                ...prev,
                [definition.fieldId]: e.target.value,
              }))
            }
          />
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (definition.inputType === 'number') {
      return (
        <div key={definition.fieldId}>
          <label className="text-sm font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <input
            type="number"
            min={definition.minValue}
            max={definition.maxValue}
            className={inputClasses}
            value={String(value ?? '')}
            onChange={(e) =>
              setManualCustomValues((prev) => ({
                ...prev,
                [definition.fieldId]: e.target.value,
              }))
            }
          />
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    if (
      definition.inputType === 'checkbox' ||
      definition.inputType === 'boolean'
    ) {
      return (
        <div
          key={definition.fieldId}
          className={`rounded-xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
        >
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) =>
                setManualCustomValues((prev) => ({
                  ...prev,
                  [definition.fieldId]: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      );
    }

    if (
      Array.isArray(definition.choices) &&
      definition.choices.length > 0
    ) {
      return (
        <div key={definition.fieldId}>
          <label className="text-sm font-semibold text-slate-700">
            {definition.label}
            {definition.isRequired ? ' *' : ''}
          </label>
          <div className="relative mt-1">
            <select
              className={`${inputClasses} appearance-none pr-12`}
              value={String(value ?? '')}
              onChange={(e) =>
                setManualCustomValues((prev) => ({
                  ...prev,
                  [definition.fieldId]: e.target.value,
                }))
              }
            >
              <option value="">Select an option</option>
              {definition.choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
      );
    }

    return (
      <div key={definition.fieldId}>
        <label className="text-sm font-semibold text-slate-700">
          {definition.label}
          {definition.isRequired ? ' *' : ''}
        </label>
        <input
          type={definition.inputType === 'url' ? 'url' : 'text'}
          className={inputClasses}
          value={String(value ?? '')}
          onChange={(e) =>
            setManualCustomValues((prev) => ({
              ...prev,
              [definition.fieldId]: e.target.value,
            }))
          }
        />
        {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  };

  // ── Bulk helpers ───────────────────────────────────────────────────────────

  const handleUploadTemplate = () => {
    const workbook = buildTemplateWorkbook();
    XLSX.writeFile(workbook, 'BlueCallerApplicants_Template.xlsx');
  };

  const validateBulkRows = (rows: BulkApplicantRow[]): RowValidationResult[] => {
    const knownJobPositionIds = new Set(jobPositions.map((job) => job._id));
    const emailTracker = new Map<string, number>();
    const phoneTracker = new Map<string, number>();
    return rows.map((row) =>
      validateBulkRow(
        row,
        knownJobPositionIds,
        existingApplicants,
        emailTracker,
        phoneTracker
      )
    );
  };

  const handleBulkFileParse = async (file: File) => {
    setBulkUploadErrors([]);
    setBulkFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setBulkRows([]);
        setBulkUploadErrors([
          'The uploaded file does not contain any worksheet.',
        ]);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { defval: '' }
      );
      const parsed = jsonRows.map((row, index) =>
        normalizeApplicantRow(row, index + 2)
      );
      setBulkRows(validateBulkRows(parsed));
    } catch (error) {
      setBulkRows([]);
      setBulkUploadErrors([
        getApiErrorMessage(error, 'Failed to parse the Excel file.'),
      ]);
    }
  };

  const handleBulkDrop = async (files: FileList | File[] | null) => {
    const file = files?.[0] || null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setBulkUploadErrors(['Please upload a .xlsx file.']);
      return;
    }
    await handleBulkFileParse(file);
  };

  const handleBulkSubmit = async () => {
    const validatedRows = validateBulkRows(bulkRows);
    const validRows = validatedRows.filter((row) => row.errors.length === 0);
    const invalidRows = validatedRows.filter((row) => row.errors.length > 0);

    setBulkRows([...validRows, ...invalidRows]);

    if (validatedRows.length === 0) {
      setBulkUploadErrors([
        'Upload and parse an Excel file before submitting.',
      ]);
      return;
    }

    if (validRows.length === 0) {
      setBulkUploadErrors(['No valid rows are available for submission.']);
      return;
    }

    const payload = validRows.map<PreparedApplicantPayload>((row) => {
      const jobPosition =
        jobPositions.find((job) => job._id === row.jobPositionId) || null;
      return buildApplicantPayload(
        {
          fullName: row.fullName,
          email: row.email,
          phone: row.phone,
          address: row.address,
          birthDate: row.birthDate,
          gender: row.gender === 'Female' ? 'Female' : 'Male',
          expectedSalary:
            row.expectedSalary === undefined ? '' : String(row.expectedSalary),
          jobPositionId: row.jobPositionId,
        },
        jobPosition,
        {},
        {}
      );
    });

    setBulkSubmitting(true);
    try {
      void Swal.fire({
        title: 'Submitting batch',
        text: 'Saving valid applicants to the server.',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); },
      });

      await axiosInstance.post('/applicants', payload);

      await Swal.fire({
        title: 'Batch submitted',
        text: `${validRows.length} applicant${
          validRows.length === 1 ? '' : 's'
        } inserted successfully.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      });

      setBulkFileName('');
      setBulkRows([]);
      setBulkUploadErrors([]);
      setBulkFileResetKey((v) => v + 1);
    } catch (error) {
      await Swal.fire({
        title: 'Batch failed',
        text: getApiErrorMessage(error, 'Failed to submit the applicant batch.'),
        icon: 'error',
        confirmButtonText: 'Close',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Manual submit ──────────────────────────────────────────────────────────

  const handleManualSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validateManualForm()) return;

    const duplicate = checkExistingApplicant(existingApplicants, {
      email: manualForm.email,
      phone: manualForm.phone,
    });

    if (duplicate) {
      const confirmation = await Swal.fire({
        title: 'Applicant already applied before',
        text: `A matching applicant already exists for ${
          duplicate.fullName || duplicate.email || duplicate.phone
        }. Do you want to apply again?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true,
      });

      if (!confirmation.isConfirmed) return;
    }

    setManualSubmitting(true);
    try {
      void Swal.fire({
        title: 'Saving applicant',
        text: 'Uploading attachments and creating the applicant record.',
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
        title: 'Applicant created',
        text: 'The applicant was inserted successfully.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      });

      setManualForm(defaultManualForm);
      setProfilePhotoFile(null);
      setCvFile(null);
      setManualCustomValues({});
      setManualTagInputs({});
      setManualJobSpecValues({});
      setManualErrors({});
      setManualFileResetKey((v) => v + 1);
    } catch (error) {
      await Swal.fire({
        title: 'Submit failed',
        text: getApiErrorMessage(error, 'Failed to create the applicant.'),
        icon: 'error',
        confirmButtonText: 'Close',
      });
    } finally {
      setUploadingProfilePhoto(false);
      setUploadingCv(false);
      setManualSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const bulkPreviewRows = validateBulkRows(bulkRows);
  const duplicateApplicant = checkExistingApplicant(existingApplicants, {
    email: manualForm.email,
    phone: manualForm.phone,
  });

  const themeGradient = getThemeGradient(selectedCompany);
  const jobTitle = selectedJobPosition
    ? toStringValue(selectedJobPosition.title)
    : '';
  const jobDescription = selectedJobPosition
    ? toStringValue(selectedJobPosition.description)
    : '';

  return (
    <div
      className={`min-h-screen ${themeColors.bgLight} px-4 py-6 text-slate-900 sm:px-6 lg:px-8`}
    >
      <PageMeta
        title="BlueCaller Applicants | Recruiting"
        description="Insert applicants manually or from Excel using a blue-themed dashboard."
      />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Company Selector Header */}
        <section
          className="overflow-hidden rounded-3xl border shadow-2xl p-6 sm:p-8 text-white"
          style={{
            background: `linear-gradient(135deg, ${themeGradient.from} 0%, ${themeGradient.to} 100%)`,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <Sparkles className="h-4 w-4" />
                BlueCaller Applicants
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                Insert applicants with a focused admin workflow.
              </h1>
              <p className="max-w-2xl text-sm text-white/90 sm:text-base">
                Select a company, add applicants manually or bulk import from
                Excel, validate everything up front, and submit clean payloads
                to the API.
              </p>
            </div>
            <div className="min-w-fit space-y-3">
              <label className="block text-sm font-semibold text-white">
                Select Company
              </label>
              <div className="relative w-full sm:w-80">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setActiveTab('manual');
                  }}
                  className="w-full appearance-none rounded-2xl border border-white/40 bg-white/20 px-4 py-3 pr-12 text-white backdrop-blur outline-none transition hover:bg-white/30 focus:border-white/60 focus:ring-2 focus:ring-white/30"
                >
                  <option value="" className="text-slate-900 bg-white">
                    {loadingCompanies
                      ? 'Loading companies...'
                      : 'Select a company'}
                  </option>
                  {companies.map((company) => (
                    <option
                      key={company._id}
                      value={company._id}
                      className="text-slate-900 bg-white"
                    >
                      {company.nameEN || company._id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* Tab switcher */}
        <div
          className={`rounded-2xl border ${themeColors.borderPrimary} bg-white p-2 shadow-sm`}
        >
          <div className="grid grid-cols-2 gap-2 sm:w-fit">
            {(
              [
                { key: 'manual', icon: UserPlus, label: 'Manual Insert' },
                // { key: 'bulk', icon: FileSpreadsheet, label: 'Bulk Insert' },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === key
                    ? `${themeColors.bgPrimary} text-white shadow-lg`
                    : `${themeColors.bgLight} ${themeColors.textPrimary} hover:bg-slate-200`
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* No company selected guard */}
        {!selectedCompanyId ? (
          <div
            className={`rounded-3xl border ${themeColors.borderPrimary} bg-white p-8 text-center shadow-xl`}
          >
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-semibold text-slate-700">
              Please select a company to proceed
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Choose a company from the dropdown above to start inserting
              applicants.
            </p>
          </div>
        ) : activeTab === 'manual' ? (
          /* Manual tab */
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <form
              onSubmit={handleManualSubmit}
              className={`space-y-6 rounded-3xl border ${themeColors.borderPrimary} bg-white p-6 shadow-xl`}
            >
              <div
                className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Manual Applicant Insert
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    All submissions are forced to{' '}
                    <span className={`font-semibold ${themeColors.textPrimary}`}>
                      pending
                    </span>{' '}
                    status.
                  </p>
                </div>
                <div
                  className={`rounded-full ${themeColors.bgLight} px-4 py-2 text-sm font-medium ${themeColors.textPrimary}`}
                >
                  {loadingJobs
                    ? 'Loading job positions...'
                    : `${jobPositions.length} positions loaded`}
                </div>
              </div>

              {duplicateApplicant ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  A matching applicant already exists in the current company
                  scope for{' '}
                  {duplicateApplicant.fullName ||
                    duplicateApplicant.email ||
                    duplicateApplicant.phone}
                  . You can still submit again after confirming.
                </div>
              ) : null}

              {selectedJobPosition && (
                <div
                  className={`rounded-2xl border ${themeColors.borderLight} p-4`}
                  style={{
                    background: `linear-gradient(135deg, ${themeGradient.from}18, ${themeGradient.to}18)`,
                  }}
                >
                  <h3 className={`text-lg font-bold ${themeColors.textPrimary}`}>
                    {jobTitle}
                  </h3>
                  {jobDescription && (
                    <p className="mt-2 text-sm text-slate-600">{jobDescription}</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {isFieldVisible(selectedJobPosition, 'fullName') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Full Name{' '}
                      {isFieldRequired(selectedJobPosition, 'fullName')
                        ? '*'
                        : ''}
                    </label>
                    <input
                      type="text"
                      value={manualForm.fullName}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      placeholder="Applicant full name"
                    />
                    {renderFieldError('fullName')}
                  </div>
                )}

                {isFieldVisible(selectedJobPosition, 'email') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Email{' '}
                      {isFieldRequired(selectedJobPosition, 'email') ? '*' : ''}
                    </label>
                    <input
                      type="email"
                      value={manualForm.email}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      placeholder="name@example.com"
                    />
                    {renderFieldError('email')}
                  </div>
                )}

                {isFieldVisible(selectedJobPosition, 'phone') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Phone{' '}
                      {isFieldRequired(selectedJobPosition, 'phone') ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      value={manualForm.phone}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      placeholder="01XXXXXXXXX"
                    />
                    {renderFieldError('phone')}
                  </div>
                )}

                {/* Job Position */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Job Position *
                  </label>
                  <div className="relative mt-1">
                    <select
                      value={manualForm.jobPositionId}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          jobPositionId: e.target.value,
                        }))
                      }
                      className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 pr-12 shadow-sm outline-none transition ${themeColors.focusRing}`}
                    >
                      <option value="">Select job position</option>
                      {jobPositions.map((job) => (
                        <option key={job._id} value={job._id}>
                          {toStringValue(job.title) ||
                            job.jobCode ||
                            job._id}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {renderFieldError('jobPositionId')}
                </div>

                {isFieldVisible(selectedJobPosition, 'address') && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Address{' '}
                      {isFieldRequired(selectedJobPosition, 'address')
                        ? '*'
                        : ''}
                    </label>
                    <textarea
                      value={manualForm.address}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className={`mt-1 min-h-28 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      placeholder="Applicant address"
                    />
                    {renderFieldError('address')}
                  </div>
                )}

                {isFieldVisible(selectedJobPosition, 'birthDate') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Birth Date{' '}
                      {isFieldRequired(selectedJobPosition, 'birthDate')
                        ? '*'
                        : ''}
                    </label>
                    <input
                      type="date"
                      value={manualForm.birthDate}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          birthDate: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                    />
                    {renderFieldError('birthDate')}
                  </div>
                )}

                {isFieldVisible(selectedJobPosition, 'gender') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Gender{' '}
                      {isFieldRequired(selectedJobPosition, 'gender')
                        ? '*'
                        : ''}
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={manualForm.gender}
                        onChange={(e) =>
                          setManualForm((prev) => ({
                            ...prev,
                            gender: e.target.value as 'Male' | 'Female',
                          }))
                        }
                        className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 pr-12 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {renderFieldError('gender')}
                  </div>
                )}

                {isFieldVisible(selectedJobPosition, 'expectedSalary') && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Expected Salary{' '}
                      {isFieldRequired(selectedJobPosition, 'expectedSalary')
                        ? '*'
                        : ''}
                    </label>
                    <input
                      type="number"
                      value={manualForm.expectedSalary}
                      onChange={(e) =>
                        setManualForm((prev) => ({
                          ...prev,
                          expectedSalary: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-3 shadow-sm outline-none transition ${themeColors.focusRing}`}
                      placeholder="4000"
                    />
                    {renderFieldError('expectedSalary')}
                  </div>
                )}

                {/* File uploads */}
                {(isFieldVisible(selectedJobPosition, 'profilePhoto') ||
                  isFieldVisible(selectedJobPosition, 'cvFilePath')) && (
                  <div
                    className={`grid gap-3 md:col-span-2 ${
                      isFieldVisible(selectedJobPosition, 'profilePhoto') &&
                      isFieldVisible(selectedJobPosition, 'cvFilePath')
                        ? 'sm:grid-cols-2'
                        : ''
                    }`}
                  >
                    {isFieldVisible(selectedJobPosition, 'profilePhoto') && (
                      <div
                        className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
                      >
                        <div
                          className={`flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary}`}
                        >
                          <ImageIcon className="h-4 w-4" />
                          Profile Photo
                        </div>
                        <label
                          className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${themeColors.borderPrimary} bg-white px-4 py-6 text-center transition hover:bg-slate-50`}
                        >
                          <Upload
                            className={`h-5 w-5 ${themeColors.textPrimary}`}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {profilePhotoFile
                              ? getDisplayFileName(profilePhotoFile.name)
                              : 'JPG / PNG up to 5 MB'}
                          </span>
                          <input
                            key={manualFileResetKey}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={handleProfilePhotoChange}
                          />
                        </label>
                        {profilePhotoFile && (
                          <button
                            type="button"
                            onClick={() => setProfilePhotoFile(null)}
                            className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary} hover:opacity-80`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear file
                          </button>
                        )}
                        {renderFieldError('profilePhoto')}
                      </div>
                    )}

                    {isFieldVisible(selectedJobPosition, 'cvFilePath') && (
                      <div
                        className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
                      >
                        <div
                          className={`flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary}`}
                        >
                          <FileText className="h-4 w-4" />
                          CV File
                        </div>
                        <label
                          className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${themeColors.borderPrimary} bg-white px-4 py-6 text-center transition hover:bg-slate-50`}
                        >
                          <Upload
                            className={`h-5 w-5 ${themeColors.textPrimary}`}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {cvFile
                              ? getDisplayFileName(cvFile.name)
                              : 'PDF up to 10 MB'}
                          </span>
                          <input
                            key={`${manualFileResetKey}-cv`}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleCvChange}
                          />
                        </label>
                        {cvFile && (
                          <button
                            type="button"
                            onClick={() => setCvFile(null)}
                            className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${themeColors.textPrimary} hover:opacity-80`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear file
                          </button>
                        )}
                        {renderFieldError('cvFilePath')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom fields */}
              {customFieldDefinitions.length > 0 && (
                <div
                  className={`space-y-4 rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
                >
                  <div
                    className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${themeColors.textPrimary}`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Job-specific fields
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {customFieldDefinitions.map((definition) =>
                      renderCustomField(definition)
                    )}
                  </div>
                </div>
              )}

              {/* Job specs */}
              {jobSpecDefinitions.length > 0 && (
                <div
                  className={`space-y-4 rounded-2xl border ${themeColors.borderLight} bg-white p-4`}
                >
                  <div
                    className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${themeColors.textPrimary}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Job spec responses
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {jobSpecDefinitions.map(
                      (
                        spec: { jobSpecId?: string; spec?: unknown },
                        index: number
                      ) => {
                        const specId = String(
                          spec?.jobSpecId || `spec_${index}`
                        );
                        const label =
                          toStringValue(spec?.spec) ||
                          `Job spec ${index + 1}`;
                        const answer = manualJobSpecValues[specId] ?? false;
                        return (
                          <label
                            key={specId}
                            className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4 text-sm font-medium text-slate-700`}
                          >
                            <span className="block font-semibold text-slate-900">
                              {label}
                            </span>
                            <span className="mt-3 flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={answer}
                                onChange={(e) =>
                                  setManualJobSpecValues((prev) => ({
                                    ...prev,
                                    [specId]: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Required answer
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                  {manualErrors.jobSpecs ? (
                    <p className="text-sm text-red-600">
                      {manualErrors.jobSpecs}
                    </p>
                  ) : null}
                </div>
              )}

              <div
                className={`flex flex-wrap items-center justify-between gap-4 border-t ${themeColors.borderLight} pt-4`}
              >
                <div className="text-sm text-slate-500">
                  {manualSubmitting || uploadingProfilePhoto || uploadingCv
                    ? 'Processing upload and submission...'
                    : 'Ready to submit a pending applicant record.'}
                </div>
                <button
                  type="submit"
                  disabled={
                    manualSubmitting ||
                    uploadingProfilePhoto ||
                    uploadingCv ||
                    loadingJobs ||
                    !selectedCompanyId
                  }
                  className={`inline-flex items-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {manualSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Insert Applicant
                </button>
              </div>
            </form>

            <aside
              className={`space-y-4 rounded-3xl border ${themeColors.borderPrimary} bg-white p-6 shadow-xl`}
            >
              <div
                className={`flex items-center gap-2 border-b ${themeColors.borderLight} pb-4`}
              >
                <Users className={`h-5 w-5 ${themeColors.textPrimary}`} />
                <h3 className="text-lg font-bold text-slate-900">
                  Insertion rules
                </h3>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                {[
                  {
                    title: 'Hardcoded status',
                    body: (
                      <>
                        Every applicant is submitted with status{' '}
                        <span
                          className={`font-semibold ${themeColors.textPrimary}`}
                        >
                          pending
                        </span>
                        .
                      </>
                    ),
                  },
                  {
                    title: 'File uploads',
                    body: 'Profile photos are uploaded as JPG or PNG and CV files are uploaded as PDF before submission.',
                  },
                  {
                    title: 'Duplicate protection',
                    body: 'The form checks the current company scope for matching email or phone values before insert.',
                  },
                  {
                    title: 'Job-driven fields',
                    body: 'Selecting a job position loads its custom fields and job-spec responses dynamically.',
                  },
                ].map(({ title, body }) => (
                  <div
                    key={title}
                    className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
                  >
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-1">{body}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          /* Bulk tab - same as before */
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section
              className={`space-y-5 rounded-3xl border ${themeColors.borderPrimary} bg-white p-6 shadow-xl`}
            >
              <div
                className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Bulk Excel Insert
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a spreadsheet, inspect the parsed rows, and submit
                    only the valid applicants.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadTemplate}
                  className={`inline-flex items-center gap-2 rounded-xl border ${themeColors.borderPrimary} ${themeColors.bgLight} px-4 py-3 text-sm font-semibold ${themeColors.textPrimary} transition hover:bg-slate-200`}
                >
                  <Download className="h-4 w-4" />
                  Download template
                </button>
              </div>

              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleBulkDrop(e.dataTransfer.files);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed ${themeColors.borderPrimary} ${themeColors.bgLight} px-6 py-14 text-center transition hover:bg-slate-200`}
              >
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <FileSpreadsheet
                    className={`h-8 w-8 ${themeColors.textPrimary}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-900">
                    Drop your .xlsx file here
                  </p>
                  <p className="text-sm text-slate-600">
                    Columns: fullName, email, phone, address, birthDate, gender,
                    expectedSalary, jobPositionId.
                  </p>
                </div>
                <input
                  key={bulkFileResetKey}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => void handleBulkDrop(e.target.files)}
                />
                <span
                  className={`inline-flex items-center gap-2 rounded-full ${themeColors.bgPrimary} px-4 py-2 text-sm font-semibold text-white shadow-lg`}
                >
                  <Upload className="h-4 w-4" />
                  Browse Excel file
                </span>
              </label>

              {bulkFileName && (
                <div
                  className={`flex items-center justify-between rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} px-4 py-3`}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className={`h-5 w-5 ${themeColors.textPrimary}`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getDisplayFileName(bulkFileName, 40)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Parsed rows are shown on the right.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRows([]);
                      setBulkFileName('');
                      setBulkUploadErrors([]);
                      setBulkFileResetKey((v) => v + 1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border ${themeColors.borderPrimary} bg-white px-3 py-2 text-sm font-semibold ${themeColors.textPrimary}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              )}

              {bulkUploadErrors.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    Upload issues
                  </div>
                  <ul className="space-y-1">
                    {bulkUploadErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: 'Parsed rows',
                    value: bulkRows.length,
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Valid',
                    value: bulkPreviewRows.filter((r) => r.errors.length === 0)
                      .length,
                    color: 'text-emerald-600',
                  },
                  {
                    label: 'Failed',
                    value: bulkPreviewRows.filter((r) => r.errors.length > 0)
                      .length,
                    color: 'text-red-600',
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
                  >
                    <p
                      className={`text-xs uppercase tracking-[0.18em] ${themeColors.textPrimary}`}
                    >
                      {label}
                    </p>
                    <p className={`mt-1 text-2xl font-bold ${color}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4 text-sm text-slate-600`}
              >
                The batch submission sends only valid rows to{' '}
                <span className={`font-semibold ${themeColors.textPrimary}`}>
                  POST /applicants
                </span>
                , while invalid rows remain listed with reasons.
              </div>

              <button
                type="button"
                onClick={() => void handleBulkSubmit()}
                disabled={bulkSubmitting || bulkRows.length === 0}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {bulkSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Submit valid rows
              </button>
            </section>

            <section
              className={`overflow-hidden rounded-3xl border ${themeColors.borderPrimary} bg-white shadow-xl`}
            >
              <div
                className={`flex items-center justify-between border-b ${themeColors.borderLight} px-6 py-4`}
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Parsed Preview
                  </h3>
                  <p className="text-sm text-slate-500">
                    Inspect each row and the validation result before
                    submission.
                  </p>
                </div>
                <div
                  className={`rounded-full ${themeColors.bgLight} px-4 py-2 text-sm font-semibold ${themeColors.textPrimary}`}
                >
                  {bulkPreviewRows.length} rows previewed
                </div>
              </div>

              <div className="overflow-auto">
                <table
                  className={`min-w-full divide-y ${themeColors.borderLight} text-left text-sm`}
                >
                  <thead className={`${themeColors.bgLight} text-slate-900`}>
                    <tr>
                      {[
                        'Row',
                        'Name',
                        'Email',
                        'Phone',
                        'Job',
                        'Status',
                        'Errors',
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${themeColors.borderLight} bg-white`}
                  >
                    {bulkPreviewRows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-slate-500"
                          colSpan={7}
                        >
                          Upload an Excel file to preview applicant rows here.
                        </td>
                      </tr>
                    ) : (
                      bulkPreviewRows.map((row) => {
                        const hasError = row.errors.length > 0;
                        const jobPosition = jobPositions.find(
                          (job) => job._id === row.jobPositionId
                        );
                        return (
                          <tr
                            key={`${row.rowNumber}-${row.email}`}
                            className={
                              hasError ? 'bg-red-50/50' : 'bg-emerald-50/40'
                            }
                          >
                            <td className="px-4 py-4 font-semibold text-slate-700">
                              {row.rowNumber}
                            </td>
                            <td className="px-4 py-4 text-slate-900">
                              {row.fullName || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {row.email || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {row.phone || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {jobPosition
                                ? toStringValue(jobPosition.title) ||
                                  jobPosition.jobCode
                                : row.jobPositionId || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                  hasError
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {hasError ? (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {hasError ? 'Failed' : 'Valid'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {hasError ? (
                                <ul className="space-y-1">
                                  {row.errors.map((error) => (
                                    <li key={error}>• {error}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-emerald-700">
                                  Ready to submit
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}