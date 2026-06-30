// components/BulkInsert.tsx
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import * as fflate from 'fflate';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import axiosInstance from '../../../../config/axios';
import Swal from '../../../../utils/swal';
import { toPlainString } from '../../../../utils/strings';
import type { Applicant } from '../../../../types/applicants';
import type { JobPosition } from '../../../../types/jobPositions';
import { useLocale } from '../../../../context/LocaleContext';

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
  jobPositionTitle: string;
  customFields?: Record<string, unknown>;
  allData?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  hasDuplicate: boolean;
  duplicateInfo?: string;
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

interface BulkInsertProps {
  companyId: string;
  jobPositions: JobPosition[];
  existingApplicants: Applicant[];
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

// ─── Helper functions ─────────────────────────────────────────────────────────

function getApiErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (error instanceof Error) return error.message;
  return fallback;
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

function getFieldKeyEn(label: string): string {
  if (!label) return '';
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
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
    if (!Number.isNaN(direct.getTime()))
      return direct.toISOString().slice(0, 10);
    return trimmed;
  }
  return '';
}

function getDisplayFileName(name: string, maxLength = 40): string {
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

  return (
    existingApplicants.find((applicant) => {
      const applicantEmail = String(applicant?.email || '')
        .trim()
        .toLowerCase();
      const applicantPhone = normalizePhoneValue(
        String(applicant?.phone || '')
      );
      return (
        (normalizedEmail && applicantEmail === normalizedEmail) ||
        (normalizedPhone && applicantPhone === normalizedPhone)
      );
    }) || null
  );
}

// ─── Parse custom fields from Excel ───────────────────────────────────────────

function parseCustomFields(
  rawRow: Record<string, unknown>,
  jobPosition: JobPosition | null
): Record<string, unknown> {
  const customValues: Record<string, unknown> = {};

  if (!jobPosition?.customFields) return customValues;

  jobPosition.customFields.forEach((field: unknown) => {
    const fieldRecord = field as Record<string, unknown>;
    const fieldId = String(fieldRecord.fieldId || '');
    const fieldLabel = toStringValue(fieldRecord.label);
    const inputType = String(fieldRecord.inputType || 'text');

    if (
      inputType === 'repeatable_group' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      const rows: Record<string, unknown>[] = [];
      const subFields = (fieldRecord.groupFields as unknown[]).map(
        (sf) => sf as Record<string, unknown>
      );

      let maxIndex = 0;
      for (let i = 1; i <= 20; i++) {
        let hasAnyField = false;
        for (const subField of subFields) {
          const subLabel = toStringValue(subField.label);
          const numberedLabel =
            i === 1
              ? `${fieldLabel} - ${subLabel}`
              : `${fieldLabel} ${i} - ${subLabel}`;
          if (
            rawRow[numberedLabel] !== undefined &&
            rawRow[numberedLabel] !== null &&
            rawRow[numberedLabel] !== ''
          ) {
            hasAnyField = true;
            break;
          }
        }
        if (hasAnyField) {
          maxIndex = i;
        } else {
          break;
        }
      }

      for (let idx = 1; idx <= maxIndex; idx++) {
        const row: Record<string, unknown> = {};
        let hasValue = false;

        for (const subField of subFields) {
          const subLocKey = String(subField.fieldId || '');
          const subLabel = toStringValue(subField.label);
          const subInputType = String(subField.inputType || 'text');

          const columnName =
            idx === 1
              ? `${fieldLabel} - ${subLabel}`
              : `${fieldLabel} ${idx} - ${subLabel}`;

          let value = rawRow[columnName];
          if (value === undefined)
            value = rawRow[`${fieldLabel} ${idx} ${subLabel}`];
          if (value === undefined)
            value = rawRow[`${fieldId}_${idx}_${subLocKey}`];

          if (value !== undefined && value !== null && value !== '') {
            hasValue = true;

            if (subInputType === 'checkbox') {
              const strValue = String(value).toLowerCase().trim();
              row[subLocKey] =
                strValue === 'yes' || strValue === 'true' || strValue === '1';
            } else if (subInputType === 'number') {
              const num = Number(value);
              if (!isNaN(num)) row[subLocKey] = num;
            } else if (subInputType === 'date') {
              row[subLocKey] = parseExcelDate(value);
            } else if (subInputType === 'tags') {
              const strValue = String(value);
              row[subLocKey] = strValue
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
            } else {
              row[subLocKey] = String(value).trim();
            }
          }
        }

        if (hasValue) {
          rows.push(row);
        }
      }

      if (rows.length > 0) {
        customValues[fieldId] = rows;
      }
      return;
    }

    if (inputType === 'groupField' && Array.isArray(fieldRecord.groupFields)) {
      const groupObj: Record<string, unknown> = {};
      const subFields = (fieldRecord.groupFields as unknown[]).map(
        (sf) => sf as Record<string, unknown>
      );

      for (const subField of subFields) {
        const subLocKey = String(subField.fieldId || '');
        const subLabel = toStringValue(subField.label);
        const subInputType = String(subField.inputType || 'text');

        const columnName = `${fieldLabel} - ${subLabel}`;
        let value = rawRow[columnName];
        if (value === undefined) value = rawRow[subLabel];
        if (value === undefined) value = rawRow[subLocKey];

        if (value !== undefined && value !== null && value !== '') {
          if (subInputType === 'checkbox') {
            const strValue = String(value).toLowerCase().trim();
            groupObj[subLocKey] =
              strValue === 'yes' || strValue === 'true' || strValue === '1';
          } else if (subInputType === 'number') {
            const num = Number(value);
            if (!isNaN(num)) groupObj[subLocKey] = num;
          } else if (subInputType === 'date') {
            groupObj[subLocKey] = parseExcelDate(value);
          } else if (subInputType === 'tags') {
            const strValue = String(value);
            groupObj[subLocKey] = strValue
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean);
          } else {
            groupObj[subLocKey] = String(value).trim();
          }
        }
      }

      if (Object.keys(groupObj).length > 0) {
        customValues[fieldId] = groupObj;
      }
      return;
    }

    let value = rawRow[fieldLabel];
    if (value === undefined) value = rawRow[fieldId];
    if (value === undefined || value === null) return;

    if (inputType === 'checkbox') {
      const strValue = String(value).toLowerCase().trim();
      customValues[fieldId] =
        strValue === 'yes' || strValue === 'true' || strValue === '1';
    } else if (inputType === 'number') {
      const num = Number(value);
      if (!isNaN(num)) customValues[fieldId] = num;
    } else if (inputType === 'date') {
      customValues[fieldId] = parseExcelDate(value);
    } else if (inputType === 'tags') {
      const strValue = String(value);
      customValues[fieldId] = strValue
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    } else {
      customValues[fieldId] = String(value).trim();
    }
  });

  return customValues;
}

// ─── Parse job specs from Excel ───────────────────────────────────────────────

function parseJobSpecs(
  rawRow: Record<string, unknown>,
  jobPosition: JobPosition | null
): Record<string, boolean> {
  const specValues: Record<string, boolean> = {};

  if (!jobPosition?.jobSpecsWithDetails?.length) return specValues;

  jobPosition.jobSpecsWithDetails.forEach(
    (spec: { jobSpecId?: string; spec?: unknown }, index: number) => {
      const specId = String(spec?.jobSpecId || `spec_${index}`);
      const specText = toStringValue(spec?.spec);

      let value = rawRow[specText];
      if (value === undefined) value = rawRow[specId];

      if (value !== undefined) {
        const strValue = String(value).toLowerCase().trim();
        specValues[specId] =
          strValue === 'yes' ||
          strValue === 'true' ||
          strValue === '1' ||
          strValue === 'x';
      }
    }
  );

  return specValues;
}

// ─── Build custom responses payload ───────────────────────────────────────────

function buildCustomResponsesPayload(
  values: Record<string, unknown>,
  jobPosition: JobPosition | null
): Record<string, unknown> {
  if (!jobPosition?.customFields) return {};

  const remappedCustomResponses: Record<string, unknown> = {};

  jobPosition.customFields.forEach((field: unknown) => {
    const fieldRecord = field as Record<string, unknown>;
    const locKey = String(fieldRecord.fieldId || '');
    const label = toStringValue(fieldRecord.label);
    const enKey = getFieldKeyEn(label);
    const inputType = String(fieldRecord.inputType || 'text');

    const val = values[locKey];
    if (val === undefined || val === null) return;
    if (typeof val === 'string' && val.trim() === '') return;

    const wrap = (type: string, answer: unknown) => ({ type, answer });

    if (
      inputType === 'repeatable_group' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      if (Array.isArray(val)) {
        const mappedRows = val
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const mappedItem: Record<
              string,
              { type: string; answer: unknown }
            > = {};
            (fieldRecord.groupFields as unknown[]).forEach(
              (subField: unknown) => {
                const subRecord = subField as Record<string, unknown>;
                const subLocKey = String(subRecord.fieldId || '');
                const subLabel = toStringValue(subRecord.label);
                const subEnKey = getFieldKeyEn(subLabel);
                const subVal = (item as Record<string, unknown>)[subLocKey];
                if (subVal !== undefined && subVal !== null && subVal !== '') {
                  mappedItem[subEnKey] = wrap(
                    String(subRecord.inputType || 'text'),
                    subVal
                  );
                }
              }
            );
            return Object.keys(mappedItem).length > 0 ? mappedItem : null;
          })
          .filter(
            (row): row is Record<string, { type: string; answer: unknown }> =>
              row !== null
          );
        if (mappedRows.length > 0) remappedCustomResponses[enKey] = mappedRows;
      }
      return;
    }

    if (inputType === 'groupField' && Array.isArray(fieldRecord.groupFields)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const mapped: Record<string, { type: string; answer: unknown }> = {};
        (fieldRecord.groupFields as unknown[]).forEach((subField: unknown) => {
          const subRecord = subField as Record<string, unknown>;
          const subLocKey = String(subRecord.fieldId || '');
          const subLabel = toStringValue(subRecord.label);
          const subEnKey = getFieldKeyEn(subLabel);
          const subVal = (val as Record<string, unknown>)[subLocKey];
          if (subVal !== undefined && subVal !== null && subVal !== '') {
            mapped[subEnKey] = wrap(
              String(subRecord.inputType || 'text'),
              subVal
            );
          }
        });
        if (Object.keys(mapped).length > 0)
          remappedCustomResponses[enKey] = mapped;
      }
      return;
    }

    if (inputType === 'tags') {
      const tags = Array.isArray(val)
        ? val
        : String(val)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
      if (tags.length > 0) remappedCustomResponses[enKey] = tags;
      return;
    }

    if (inputType === 'checkbox') {
      remappedCustomResponses[enKey] = Boolean(val);
      return;
    }

    remappedCustomResponses[enKey] = wrap(inputType, val);
  });

  return remappedCustomResponses;
}

// ─── Build job specs responses payload ────────────────────────────────────────

function buildJobSpecsResponsesPayload(
  jobPosition: JobPosition | null,
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

// ─── Normalize applicant row with custom fields ───────────────────────────────

function normalizeApplicantRow(
  rawRow: Record<string, unknown>,
  rowNumber: number,
  jobPositions: JobPosition[]
): BulkApplicantRow {
  const jobTitle = String(
    rawRow.jobPosition || rawRow.jobTitle || rawRow.position || ''
  ).trim();

  const jobPosition = jobPositions.find((job) => {
    const jobTitleStr = toStringValue(job.title).toLowerCase();
    return (
      jobTitleStr === jobTitle.toLowerCase() ||
      job.jobCode?.toLowerCase() === jobTitle.toLowerCase()
    );
  });

  const customFields = jobPosition
    ? parseCustomFields(rawRow, jobPosition)
    : {};
  const jobSpecValues = jobPosition ? parseJobSpecs(rawRow, jobPosition) : {};

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
    jobPositionId: jobPosition?._id || '',
    jobPositionTitle: jobTitle,
    customFields: { ...customFields, ...jobSpecValues },
    allData: rawRow,
    errors: [],
    warnings: [],
    hasDuplicate: false,
  };
}

// ─── Validate bulk row with custom fields ─────────────────────────────────────

function validateBulkRow(
  row: BulkApplicantRow,
  jobPositions: JobPosition[],
  existingApplicants: Applicant[],
  batchSeenEmails: Map<string, number>,
  batchSeenPhones: Map<string, number>,
  t: (key: string, ns: string, params?: Record<string, string | number>) => string
): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalizedPhone = normalizePhoneValue(row.phone);
  const normalizedEmail = row.email.trim().toLowerCase();
  let hasDuplicate = false;
  let duplicateInfo = '';

  if (!row.fullName) errors.push(t('fullNameRequired', 'blueCaller'));
  if (!normalizedEmail) errors.push(t('emailRequired', 'blueCaller'));
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.push(t('invalidEmailFormat', 'blueCaller'));
  }
  if (!normalizedPhone) errors.push(t('phoneRequired', 'blueCaller'));
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    errors.push(t('phoneMustMatch', 'blueCaller'));
  }
  if (!row.address) errors.push(t('addressRequired', 'blueCaller'));
  if (!row.birthDate) errors.push(t('birthDateRequired', 'blueCaller'));
  if (row.birthDate && isFutureBirthDate(row.birthDate)) {
    errors.push(t('birthDateFuture', 'blueCaller'));
  }
  if (!row.gender) errors.push(t('genderRequired', 'blueCaller'));
  if (row.gender && !['Male', 'Female'].includes(row.gender)) {
    errors.push(t('genderMustBeMaleOrFemale', 'blueCaller'));
  }

  if (!row.jobPositionTitle) {
    errors.push(t('jobPositionRequired', 'blueCaller'));
  } else if (!row.jobPositionId) {
    errors.push(
      t('jobPositionNotFound', 'blueCaller', {
        jobTitle: row.jobPositionTitle,
        availablePositions: jobPositions.map((j) => toStringValue(j.title)).join(', ')
      })
    );
  }

  if (row.expectedSalary !== undefined && Number.isNaN(row.expectedSalary)) {
    errors.push(t('expectedSalaryNumeric', 'blueCaller'));
  }

  if (normalizedEmail) {
    const firstSeenRow = batchSeenEmails.get(normalizedEmail);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      warnings.push(
        t('duplicateEmailWarning', 'blueCaller', { rowNumber: firstSeenRow })
      );
      hasDuplicate = true;
      duplicateInfo = t('duplicateEmailInfo', 'blueCaller', { rowNumber: firstSeenRow });
    } else {
      batchSeenEmails.set(normalizedEmail, row.rowNumber);
    }
  }

  if (normalizedPhone) {
    const firstSeenRow = batchSeenPhones.get(normalizedPhone);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      warnings.push(
        t('duplicatePhoneWarning', 'blueCaller', { rowNumber: firstSeenRow })
      );
      hasDuplicate = true;
      duplicateInfo =
        duplicateInfo || t('duplicatePhoneInfo', 'blueCaller', { rowNumber: firstSeenRow });
    } else {
      batchSeenPhones.set(normalizedPhone, row.rowNumber);
    }
  }

  const duplicate = checkExistingApplicant(existingApplicants, {
    email: normalizedEmail,
    phone: normalizedPhone,
  });
  if (duplicate) {
    warnings.push(
      t('existingApplicantWarning', 'blueCaller', {
        applicantName: duplicate.fullName || duplicate.email || duplicate.phone
      })
    );
    hasDuplicate = true;
    duplicateInfo =
      duplicateInfo ||
      t('existingApplicantInfo', 'blueCaller', {
        applicantName: duplicate.fullName || duplicate.email
      });
  }

  return {
    ...row,
    phone: normalizedPhone,
    errors,
    warnings,
    hasDuplicate,
    duplicateInfo,
    normalizedPhone,
  };
}

// ─── Build final applicant payload with custom fields ─────────────────────────

function buildApplicantPayload(
  row: RowValidationResult,
  jobPositions: JobPosition[]
): PreparedApplicantPayload | null {
  const jobPosition = jobPositions.find((job) => job._id === row.jobPositionId);
  if (!jobPosition) return null;

  const customResponses = buildCustomResponsesPayload(
    row.customFields || {},
    jobPosition
  );
  const jobSpecsResponses = buildJobSpecsResponsesPayload(
    jobPosition,
    row.customFields as Record<string, boolean>
  );

  const payload: PreparedApplicantPayload = {
    jobPositionId: row.jobPositionId,
    fullName: row.fullName,
    email: row.email.toLowerCase(),
    phone: row.phone,
    address: row.address,
    birthDate: row.birthDate,
    gender: row.gender === 'Female' ? 'Female' : 'Male',
    status: 'pending',
  };

  if (row.expectedSalary !== undefined)
    payload.expectedSalary = row.expectedSalary;
  if (Object.keys(customResponses).length > 0)
    payload.customResponses = customResponses;
  if (jobSpecsResponses.length > 0)
    payload.jobSpecsResponses = jobSpecsResponses;

  return payload;
}

// ─── Extract options from field record ─────────────────────────────────────────

function extractOptions(fieldRecord: Record<string, unknown>): string[] {
  const choicesArr = fieldRecord.choices || fieldRecord.options;
  if (!Array.isArray(choicesArr)) return [];
  return (choicesArr as unknown[])
    .map((o) => {
      if (typeof o === 'string') return o;
      const oRec = o as Record<string, unknown>;
      if (typeof oRec.en === 'string' && oRec.en) return oRec.en;
      return toStringValue(oRec.label || oRec.value || o);
    })
    .filter(Boolean);
}

// ─── Build template workbook for a specific job position ──────────────────────

function buildTemplateWorkbookForJob(jobPosition: JobPosition, t?: (key: string, ns?: string) => string): {
  workbook: XLSX.WorkBook;
  dropdownMap: Map<number, string[]>;
  dateColumns: Set<number>;
  allHeaders: string[];
} {
  // Required base fields (used for notes row)
  const requiredBaseFields = new Set([
    'fullName',
    'email',
    'phone',
    'address',
    'birthDate',
    'gender',
    'jobPosition',
  ]);

  // ── 1. Job spec headers — shown FIRST ──────────────────────────────────────
  const jobSpecHeaders: string[] = [];
  (jobPosition.jobSpecsWithDetails || []).forEach(
    (spec: { spec?: unknown }) => {
      const specText = toStringValue(spec?.spec);
      if (specText && !jobSpecHeaders.includes(specText))
        jobSpecHeaders.push(specText);
    }
  );

  // ── 2. Standard applicant fields ───────────────────────────────────────────
  const baseFields = [
    'fullName',
    'email',
    'phone',
    'address',
    'birthDate',
    'gender',
    'expectedSalary',
    'jobPosition',
  ];

  // ── 3. Custom field headers ─────────────────────────────────────────────────
  const customFieldHeaders: string[] = [];
  (jobPosition.customFields || []).forEach((field: unknown) => {
    const fieldRecord = field as Record<string, unknown>;
    const label = toStringValue(fieldRecord.label);
    const inputType = String(fieldRecord.inputType || 'text');

    if (!label) return;

    if (
      inputType === 'repeatable_group' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      const subFields = fieldRecord.groupFields as unknown[];
      const maxExamples = 3;
      for (let exampleNum = 1; exampleNum <= maxExamples; exampleNum++) {
        subFields.forEach((subField: unknown) => {
          const subRecord = subField as Record<string, unknown>;
          const subLabel = toStringValue(subRecord.label);
          const composite =
            exampleNum === 1
              ? `${label} - ${subLabel}`
              : `${label} ${exampleNum} - ${subLabel}`;
          customFieldHeaders.push(composite);
        });
      }
    } else if (
      inputType === 'groupField' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      (fieldRecord.groupFields as unknown[]).forEach((subField: unknown) => {
        const subRecord = subField as Record<string, unknown>;
        const subLabel = toStringValue(subRecord.label);
        customFieldHeaders.push(`${label} - ${subLabel}`);
      });
    } else {
      customFieldHeaders.push(label);
    }
  });

  // ── Final order: jobSpecs → base fields → custom fields ────────────────────
  const allHeaders = [...jobSpecHeaders, ...baseFields, ...customFieldHeaders];

  // ── Build notes for each header (will be appended to header name) ──────────
  const headerNotes: string[] = allHeaders.map((header) => {
    // Job spec columns
    if (jobSpecHeaders.includes(header)) return 'Yes / No';

    // Base field notes
    if (header === 'gender') return t ? t('templateGenderNote', 'blueCaller') : 'Required – Male / Female';
    if (header === 'expectedSalary') return 'Optional – numeric';
    if (requiredBaseFields.has(header)) return 'Required';

    // Custom field notes
    for (const field of jobPosition.customFields || []) {
      const fieldRecord = field as Record<string, unknown>;
      const label = toStringValue(fieldRecord.label);
      const inputType = String(fieldRecord.inputType || 'text');
      const isRequired = Boolean(fieldRecord.required);
      const mark = isRequired ? 'Required' : 'Optional';

      if (label === header) {
        if (inputType === 'checkbox') return `${mark} – Yes / No`;
        if (inputType === 'date') return `${mark} – MM/DD/YYYY`;
        if (inputType === 'number') return `${mark} – numeric`;
        if (inputType === 'tags') return `${mark} – comma separated`;
        if (
          (inputType === 'select' || inputType === 'radio') &&
          Array.isArray(fieldRecord.options)
        ) {
          const opts = (fieldRecord.options as unknown[])
            .map((o) => {
              const oRec = o as Record<string, unknown>;
              return toStringValue(oRec.label || oRec.value || o);
            })
            .filter(Boolean)
            .join(' / ');
          return `${mark} – ${opts}`;
        }
        return mark;
      }

      // Sub-field match (groupField / repeatable_group)
      if (
        (inputType === 'groupField' || inputType === 'repeatable_group') &&
        Array.isArray(fieldRecord.groupFields)
      ) {
        for (const sf of fieldRecord.groupFields as unknown[]) {
          const sfRecord = sf as Record<string, unknown>;
          const sfLabel = toStringValue(sfRecord.label);
          const sfType = String(sfRecord.inputType || 'text');
          const sfRequired = Boolean(sfRecord.required);
          const sfMark = sfRequired ? 'Required' : 'Optional';

          const isMatch =
            header === `${label} - ${sfLabel}` ||
            (header.startsWith(label) && header.endsWith(`- ${sfLabel}`));

          if (isMatch) {
            if (sfType === 'checkbox') return `${sfMark} – Yes / No`;
            if (sfType === 'date') return `${sfMark} – MM/DD/YYYY`;
            if (sfType === 'number') return `${sfMark} – numeric`;
            if (sfType === 'tags') return `${sfMark} – comma separated`;
            if (
              (sfType === 'select' || sfType === 'radio') &&
              Array.isArray(sfRecord.options)
            ) {
              const opts = (sfRecord.options as unknown[])
                .map((o) => {
                  const oRec = o as Record<string, unknown>;
                  return toStringValue(oRec.label || oRec.value || o);
                })
                .filter(Boolean)
                .join(' / ');
              return `${sfMark} – ${opts}`;
            }
            return sfMark;
          }
        }
      }
    }

    return '';
  });

  // Merge notes into header names: "fullName" → "fullName (Required)"
  const headersWithNotes = allHeaders.map((h, i) => {
    const note = headerNotes[i];
    return note ? `${h} (${note})` : h;
  });

  // ── Create sheet: row 1 = headers with notes, row 2+ = empty ───────────────
  const worksheet = XLSX.utils.aoa_to_sheet([
    headersWithNotes,
  ]);

  // ── Column widths ───────────────────────────────────────────────────────────
  worksheet['!cols'] = allHeaders.map((h) => ({
    wch: Math.max(22, h.length + 4),
  }));

  // ── Date cell formatting ───────────────────────────────────────────────────
  // Ensure date columns have proper number format so Excel treats them as dates.
  const dateColIndices = new Set<number>();
  allHeaders.forEach((header, colIdx) => {
    if (header === 'birthDate') {
      dateColIndices.add(colIdx);
      return;
    }
    for (const field of jobPosition.customFields || []) {
      const fieldRecord = field as Record<string, unknown>;
      const label = toStringValue(fieldRecord.label);
      const inputType = String(fieldRecord.inputType || 'text');
      if (label === header && inputType === 'date') {
        dateColIndices.add(colIdx);
        return;
      }
      if (
        (inputType === 'groupField' || inputType === 'repeatable_group') &&
        Array.isArray(fieldRecord.groupFields)
      ) {
        for (const sf of fieldRecord.groupFields as unknown[]) {
          const sfRecord = sf as Record<string, unknown>;
          const sfLabel = toStringValue(sfRecord.label);
          const sfType = String(sfRecord.inputType || 'text');
          const isMatch =
            header === `${label} - ${sfLabel}` ||
            (header.startsWith(label) && header.endsWith(`- ${sfLabel}`));
          if (isMatch && sfType === 'date') {
            dateColIndices.add(colIdx);
          }
        }
      }
    }
  });

  // Ensure date cells exist in the worksheet (styles patched later by injectDataValidations)
  dateColIndices.forEach((colIdx) => {
    let col = '';
    let n = colIdx + 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      col = String.fromCharCode(65 + r) + col;
      n = Math.floor((n - 1) / 26);
    }
    const rowsToFormat = [];
    for (let r = 2; r <= 1000; r++) rowsToFormat.push(r);
    rowsToFormat.forEach((r) => {
      const cellRef = `${col}${r}`;
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: 'n' };
      }
    });
  });

  // ── Data Validations (dropdowns) ────────────────────────────────────────────
  //
  // Strategy: collect all option lists, write them into a hidden "Options" sheet
  // (one list per column), then reference each range as the formula1 source.
  // This works reliably across all SheetJS CE versions and Excel / LibreOffice.
  //
  // Layout of Options sheet:
  //   Row 1 = column headers (debug label)
  //   Rows 2+ = option values for that column
  //
  // Each dropdown points to  Options!$X$2:$X$N  where N = number of options + 1.

  // Map: colIdx on Applicants sheet → string[] of options
  const dropdownMap = new Map<number, string[]>();
  // Set: colIdx on Applicants sheet → date columns (need date picker)
  const dateColumns = new Set<number>();

  allHeaders.forEach((header, colIdx) => {
    // Job spec → Yes / No
    if (jobSpecHeaders.includes(header)) {
      dropdownMap.set(colIdx, ['Yes', 'No']);
      return;
    }

    // gender → Male / Female
    if (header === 'gender') {
      dropdownMap.set(colIdx, ['Male', 'Female']);
      return;
    }

    // birthDate → date picker
    if (header === 'birthDate') {
      dateColumns.add(colIdx);
      return;
    }

    // Custom fields — scan each field definition
    for (const field of jobPosition.customFields || []) {
      const fieldRecord = field as Record<string, unknown>;
      const label = toStringValue(fieldRecord.label);
      const inputType = String(fieldRecord.inputType || 'text');

      // Direct field match
      if (label === header) {
        if (inputType === 'checkbox') {
          dropdownMap.set(colIdx, ['Yes', 'No']);
        } else if (
          inputType === 'select' ||
          inputType === 'radio' ||
          inputType === 'dropdown'
        ) {
          const opts = extractOptions(fieldRecord);
          if (opts.length) dropdownMap.set(colIdx, opts);
        } else if (inputType === 'date') {
          dateColumns.add(colIdx);
        }
        return; // done for this column
      }

      // Sub-fields inside groupField / repeatable_group
      if (
        (inputType === 'groupField' || inputType === 'repeatable_group') &&
        Array.isArray(fieldRecord.groupFields)
      ) {
        for (const sf of fieldRecord.groupFields as unknown[]) {
          const sfRecord = sf as Record<string, unknown>;
          const sfLabel = toStringValue(sfRecord.label);
          const sfType = String(sfRecord.inputType || 'text');

          // Match "Label - SubLabel" or "Label N - SubLabel"
          const isMatch =
            header === `${label} - ${sfLabel}` ||
            (header.startsWith(label) && header.endsWith(`- ${sfLabel}`));

          if (isMatch) {
            if (sfType === 'checkbox') {
              dropdownMap.set(colIdx, ['Yes', 'No']);
            } else if (
              sfType === 'select' ||
              sfType === 'radio' ||
              sfType === 'dropdown'
            ) {
              const opts = extractOptions(sfRecord);
              if (opts.length) dropdownMap.set(colIdx, opts);
            } else if (sfType === 'date') {
              dateColumns.add(colIdx);
            }
            break;
          }
        }
      }
    }
  });

  // ── Assemble workbook ───────────────────────────────────────────────────────
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants');

  return { workbook, dropdownMap, dateColumns, allHeaders };
}

// ─── Inject data validation XML into xlsx binary ─────────────────────────────
// SheetJS CE cannot write dataValidation properly, so we unzip, patch the XML,
// and re-zip.
//
// Excel Online shows a calendar date-picker only when the cell:
//   1. Has dataValidation type="date"
//   2. Uses a BUILT-IN date number format (numFmtId 14 = "m/d/yyyy")
// SheetJS always writes custom numFmts, so we must patch styles.xml too.

function colIdxToLetter(colIdx: number): string {
  let col = '';
  let n = colIdx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    col = String.fromCharCode(65 + r) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
}

function injectDataValidations(
  xlsxBytes: Uint8Array,
  dropdownMap: Map<number, string[]>,
  dateColumns: Set<number>,
): Uint8Array {
  const unzipped = fflate.unzipSync(xlsxBytes);

  // ── 1. Find sheet XML ─────────────────────────────────────────────────────
  const sheetKey = Object.keys(unzipped).find(
    (k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'),
  );
  if (!sheetKey) return xlsxBytes;

  let xml = new TextDecoder('utf-8').decode(unzipped[sheetKey]);

  // Remove any existing <dataValidations> block
  xml = xml.replace(
    /<dataValidations[^>]*>[\s\S]*?<\/dataValidations>/,
    '',
  );

  // ── 2. Build data validation entries ───────────────────────────────────────
  const dvEntries: string[] = [];

  // List dropdowns
  dropdownMap.forEach((opts, colIdx) => {
    const col = colIdxToLetter(colIdx);
    const sqref = `${col}2:${col}1000`;
    const formula1 = `"${opts.join(',')}"`;
    dvEntries.push(
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" error="Please select from the list." errorTitle="Invalid entry" sqref="${sqref}"><formula1>${formula1}</formula1></dataValidation>`,
    );
  });

  // Date columns
  dateColumns.forEach((colIdx) => {
    const col = colIdxToLetter(colIdx);
    const sqref = `${col}2:${col}1000`;
    dvEntries.push(
      `<dataValidation type="date" operator="between" allowBlank="1" showInputMessage="1" showErrorMessage="1" promptTitle="Date format" prompt="Enter date in MM/DD/YYYY format (e.g. 01/15/2025)." error="Please enter a valid date." errorTitle="Invalid date" sqref="${sqref}"><formula1>1</formula1><formula2>2958465</formula2></dataValidation>`,
    );
  });

  if (dvEntries.length === 0) return xlsxBytes;

  const dvXml = `<dataValidations count="${dvEntries.length}">${dvEntries.join('')}</dataValidations>`;
  xml = xml.replace(/<\/sheetData>/, `</sheetData>${dvXml}`);

  // ── 3. Patch styles.xml — ensure built-in date format (numFmtId 14) ────────
  const stylesKey = Object.keys(unzipped).find((k) => k.includes('styles'));
  let dateXfIdx = -1; // index of the <xf> with numFmtId=14 in <cellXfs>

  if (stylesKey) {
    let stylesXml = new TextDecoder('utf-8').decode(unzipped[stylesKey]);

    // Parse <cellXfs> to find or add an <xf> with numFmtId="14"
    const cellXfsMatch = stylesXml.match(
      /<cellXfs\s[^>]*count="(\d+)"[^>]*>([\s\S]*?)<\/cellXfs>/,
    );
    if (cellXfsMatch) {
      const xfCount = parseInt(cellXfsMatch[1], 10);
      const xfContent = cellXfsMatch[2];

      // Check if an xf with numFmtId=14 already exists
      const allXfs = xfContent.match(/<xf\s[^>]*\/>/g) || [];
      let foundIdx = -1;
      for (let i = 0; i < allXfs.length; i++) {
        if (/numFmtId="14"/.test(allXfs[i])) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx >= 0) {
        dateXfIdx = foundIdx;
      } else {
        // Add a new <xf> with numFmtId=14 (built-in Short Date)
        const newXf =
          '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>';
        dateXfIdx = xfCount; // 0-based index of the new xf

        stylesXml = stylesXml.replace(
          /<cellXfs\s([^>]*)count="\d+"/,
          `<cellXfs $1count="${xfCount + 1}"`,
        );
        stylesXml = stylesXml.replace(/<\/cellXfs>/, `${newXf}</cellXfs>`);
      }
    }

    unzipped[stylesKey] = new TextEncoder().encode(stylesXml);
  }

  // ── 4. Patch sheet XML — set s="<dateXfIdx>" on date cells ────────────────
  if (dateXfIdx >= 0) {
    dateColumns.forEach((colIdx) => {
      const col = colIdxToLetter(colIdx);
      const cellRefs = [];
      for (let r = 2; r <= 1000; r++) cellRefs.push(`${col}${r}`);

      cellRefs.forEach((ref) => {
        const tagRe = new RegExp(`(<c\\s+r="${ref}"[^>]*?)>`, 'g');
        xml = xml.replace(tagRe, (_match, tag) => {
          const clean = tag.replace(/\s*s="\d+"/g, '');
          return `${clean} s="${dateXfIdx}">`;
        });
      });
    });
  }

  unzipped[sheetKey] = new TextEncoder().encode(xml);
  return fflate.zipSync(unzipped, { level: 0 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkInsert({
  jobPositions,
  existingApplicants,
  themeColors,
  onSuccess,
}: BulkInsertProps) {
  const { t } = useLocale();
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkApplicantRow[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkFileResetKey, setBulkFileResetKey] = useState(0);
  const [selectedJobForTemplate, setSelectedJobForTemplate] =
    useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(
    new Set()
  );

  const allColumnHeaders = useMemo(() => {
    if (bulkRows.length === 0) return [];

    const headersSet = new Set<string>();
    bulkRows.forEach((row) => {
      if (row.allData) {
        Object.keys(row.allData).forEach((key) => headersSet.add(key));
      }
    });

    const preferredOrder = [
      'fullName',
      'email',
      'phone',
      'address',
      'birthDate',
      'gender',
      'expectedSalary',
      'jobPosition',
    ];
    const preferredHeaders = preferredOrder.filter((h) => headersSet.has(h));
    const otherHeaders = Array.from(headersSet).filter(
      (h) => !preferredOrder.includes(h)
    );

    return [...preferredHeaders, ...otherHeaders];
  }, [bulkRows]);

  const columnMeta = useMemo(() => {
    const meta: Record<string, { type: 'text' | 'checkbox' | 'select'; options?: string[] }> = {};

    allColumnHeaders.forEach((header) => {
      if (header === 'gender') {
        meta[header] = { type: 'select', options: ['Male', 'Female'] };
        return;
      }

      if (header === 'expectedSalary') {
        meta[header] = { type: 'text' };
        return;
      }

      for (const job of jobPositions) {
        const specs = job.jobSpecsWithDetails || [];
        for (const spec of specs) {
          const specRec = spec as Record<string, unknown>;
          const specText = toStringValue(specRec.spec);
          if (specText === header) {
            meta[header] = { type: 'checkbox' };
            return;
          }
        }
      }

      for (const job of jobPositions) {
        for (const field of (job.customFields || []) as unknown[]) {
          const fieldRecord = field as Record<string, unknown>;
          const label = toStringValue(fieldRecord.label);
          const inputType = String(fieldRecord.inputType || 'text');

          if (label === header) {
            if (inputType === 'checkbox') {
              meta[header] = { type: 'checkbox' };
            } else if (inputType === 'select' || inputType === 'radio' || inputType === 'dropdown') {
              const opts = extractOptions(fieldRecord);
              if (opts.length) meta[header] = { type: 'select', options: opts };
            }
            return;
          }

          if ((inputType === 'groupField' || inputType === 'repeatable_group') && Array.isArray(fieldRecord.groupFields)) {
            for (const sf of fieldRecord.groupFields as unknown[]) {
              const sfRecord = sf as Record<string, unknown>;
              const sfLabel = toStringValue(sfRecord.label);
              const sfType = String(sfRecord.inputType || 'text');

              const isMatch = header === `${label} - ${sfLabel}` ||
                (header.startsWith(label) && header.endsWith(`- ${sfLabel}`));

              if (isMatch) {
                if (sfType === 'checkbox') {
                  meta[header] = { type: 'checkbox' };
                } else if (sfType === 'select' || sfType === 'radio' || sfType === 'dropdown') {
                  const opts = extractOptions(sfRecord);
                  if (opts.length) meta[header] = { type: 'select', options: opts };
                }
                return;
              }
            }
          }
        }
      }
    });

    return meta;
  }, [allColumnHeaders, jobPositions]);

  const validateBulkRows = (
    rows: BulkApplicantRow[]
  ): RowValidationResult[] => {
    const emailTracker = new Map<string, number>();
    const phoneTracker = new Map<string, number>();
    return rows.map((row) =>
      validateBulkRow(
        row,
        jobPositions,
        existingApplicants,
        emailTracker,
        phoneTracker,
        t
      )
    );
  };

  const handleDownloadTemplate = async () => {
    if (!selectedJobForTemplate) {
      Swal.fire({
        title: t('selectJobPosition', 'common'),
        text: t('selectJobPositionDesc', 'common'),
        icon: 'warning',
        confirmButtonText: t('ok', 'common'),
      });
      return;
    }

    const jobPosition = jobPositions.find(
      (job) => job._id === selectedJobForTemplate
    );
    if (!jobPosition) {
      Swal.fire({
        title: t('jobNotFound', 'common'),
        text: t('jobNotFoundDesc', 'common'),
        icon: 'error',
        confirmButtonText: t('ok', 'common'),
      });
      return;
    }

    const { workbook, dropdownMap, dateColumns } = buildTemplateWorkbookForJob(jobPosition, t);
    const fileName = `Applicant_Template_${toStringValue(jobPosition.title).replace(/[^a-z0-9]/gi, '_')}.xlsx`;

    try {
      // Write workbook to binary string, then to Uint8Array
      const binStr: string = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'binary',
      });
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i) & 0xff;
      }

      // Inject data validation XML into the xlsx
      const patched = injectDataValidations(bytes, dropdownMap, dateColumns);

      // Download as .xlsx
      const blob = new Blob([new Uint8Array(patched)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire({
        title: t('templateDownloaded', 'common'),
        text: t('templateDownloadedFor', 'applicants', { title: toStringValue(jobPosition.title) }),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Template download error:', err);
      Swal.fire({
        title: t('downloadFailed', 'common'),
        text: err instanceof Error ? err.message : t('couldNotGenerateTemplate', 'applicants'),
        icon: 'error',
        confirmButtonText: t('ok', 'common'),
      });
    }
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
          t('noWorksheet', 'blueCaller'),
        ]);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        { defval: '' }
      );
      // Strip "(Required ...)" / "(Optional ...)" suffixes from header keys
      const cleanRows = jsonRows.map((row) => {
        const cleaned: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, val]) => {
          const cleanKey = key.replace(/\s*\(.*?\)\s*$/, '').trim();
          cleaned[cleanKey] = val;
        });
        return cleaned;
      });
      const parsed = cleanRows.map((row, index) =>
        normalizeApplicantRow(row, index + 2, jobPositions)
      );
      setBulkRows(validateBulkRows(parsed));
    } catch (error) {
      setBulkRows([]);
      setBulkUploadErrors([
        getApiErrorMessage(error, t('failedToParseExcel', 'blueCaller')),
      ]);
    }
  };

  const handleBulkDrop = async (files: FileList | File[] | null) => {
    const file = files?.[0] || null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setBulkUploadErrors([t('pleaseUploadXlsx', 'blueCaller')]);
      return;
    }
    await handleBulkFileParse(file);
  };

  const handleBulkSubmit = async () => {
    const validatedRows = validateBulkRows(bulkRows);

    const rowsWithOnlyWarnings = validatedRows.filter(
      (row) => row.errors.length === 0 && row.warnings.length > 0
    );
    const validRows = validatedRows.filter((row) => row.errors.length === 0);

    setBulkRows([...validatedRows]);

    if (validatedRows.length === 0) {
      setBulkUploadErrors([
        t('uploadBeforeSubmit', 'blueCaller'),
      ]);
      return;
    }

    if (validRows.length === 0) {
      setBulkUploadErrors([
        t('noValidRows', 'blueCaller'),
      ]);
      return;
    }

    if (rowsWithOnlyWarnings.length > 0) {
      const duplicateCount = rowsWithOnlyWarnings.length;
      const result = await Swal.fire({
        title: t('duplicateApplicantsDetected', 'applicants'),
        html: `
          <div style="text-align: left;">
            <p><strong>${t('rowsWithDuplicates', 'applicants', { count: duplicateCount })}</strong></p>
            <ul style="margin-top: 10px; margin-bottom: 10px;">
              ${rowsWithOnlyWarnings
                .slice(0, 5)
                .map(
                  (row) =>
                    `<li>Row ${row.rowNumber}: ${row.fullName || row.email}</li>`
                )
                .join('')}
              ${rowsWithOnlyWarnings.length > 5 ? `<li>...</li>` : ''}
            </ul>
            <p>${t('willStillBeSubmitted', 'applicants')}</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('submitAnyway', 'applicants'),
        cancelButtonText: t('no', 'common'),
        confirmButtonColor: '#f59e0b',
      });

      if (!result.isConfirmed) return;
    }

    const payload = validRows
      .map((row) => buildApplicantPayload(row, jobPositions))
      .filter((p): p is PreparedApplicantPayload => p !== null);

    setBulkSubmitting(true);
    try {
      void Swal.fire({
        title: t('submittingBatch', 'applicants'),
        text: t('savingApplicants', 'applicants', { count: payload.length }),
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await axiosInstance.post('/applicants/bulk', { applicants: payload });

      await Swal.fire({
        title: t('batchSubmitted', 'applicants'),
        html: `${t('insertedSuccessfully', 'applicants', { count: payload.length })}${
          rowsWithOnlyWarnings.length > 0
            ? `<br/><br/><span style="color: #f59e0b;">⚠️ ${t('duplicateWarning', 'common', { count: rowsWithOnlyWarnings.length })}</span>`
            : ''
        }`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: true,
      });

      setBulkFileName('');
      setBulkRows([]);
      setBulkUploadErrors([]);
      setBulkFileResetKey((v) => v + 1);
      onSuccess();
    } catch (error) {
      await Swal.fire({
        title: t('batchFailed', 'applicants'),
        text: getApiErrorMessage(
          error,
          t('failedToSubmitBatch', 'applicants')
        ),
        icon: 'error',
        confirmButtonText: t('close', 'common'),
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleCellEdit = (rowIndex: number, header: string, value: string) => {
    setBulkRows((prev) => {
      const updated = prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const newRow = { ...row };

        switch (header) {
          case 'fullName':
            newRow.fullName = value;
            break;
          case 'email':
            newRow.email = value;
            break;
          case 'phone':
            newRow.phone = value;
            break;
          case 'address':
            newRow.address = value;
            break;
          case 'birthDate':
            newRow.birthDate = value;
            break;
          case 'gender':
            newRow.gender = value;
            break;
          case 'expectedSalary':
            newRow.expectedSalary = value === '' ? undefined : Number(value);
            break;
          case 'jobPosition':
          case 'jobTitle':
          case 'position':
            newRow.jobPositionTitle = value;
            const job = jobPositions.find(
              (j) =>
                toStringValue(j.title).toLowerCase() === value.toLowerCase() ||
                j.jobCode?.toLowerCase() === value.toLowerCase()
            );
            newRow.jobPositionId = job?._id || '';
            break;
        }

        if (newRow.allData) {
          newRow.allData = { ...newRow.allData, [header]: value };
          const job = jobPositions.find((j) => j._id === newRow.jobPositionId);
          if (job) {
            newRow.customFields = {
              ...parseCustomFields(newRow.allData, job),
              ...parseJobSpecs(newRow.allData, job),
            };
          }
        }

        return newRow;
      });
      return updated;
    });
  };

  const toggleRowSelection = (rowKey: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedRowKeys((prev) => {
      if (prev.size === bulkPreviewRows.length) {
        return new Set();
      }
      return new Set(bulkPreviewRows.map((r) => String(r.rowNumber)));
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRowKeys.size === 0) return;

    const result = await Swal.fire({
      title: t('deleteSelectedRows', 'blueCaller'),
      text: t('deleteSelectedRowsDesc', 'blueCaller', { count: selectedRowKeys.size }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('yesDelete', 'blueCaller'),
      cancelButtonText: t('cancel', 'blueCaller'),
    });

    if (!result.isConfirmed) return;

    setBulkRows((prev) =>
      prev.filter((r) => !selectedRowKeys.has(String(r.rowNumber)))
    );
    setSelectedRowKeys(new Set());
  };

  const bulkPreviewRows = validateBulkRows(bulkRows);


  const getRowStatus = (
    row: RowValidationResult
  ): { status: string; color: string; icon: JSX.Element } => {
    if (row.errors.length > 0) {
      return {
        status: t('failed', 'blueCaller'),
        color: 'bg-red-100 text-red-700',
        icon: <AlertCircle className="h-3 w-3" />,
      };
    }
    if (row.hasDuplicate || row.warnings.length > 0) {
      return {
        status: t('duplicate', 'blueCaller'),
        color: 'bg-amber-100 text-amber-700',
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    }
    return {
      status: t('valid', 'blueCaller'),
      color: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Template + Upload + Stats + Submit */}
      <section
        className={`space-y-5 rounded-3xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 p-6 shadow-xl`}
      >
        <div
          className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('bulkExcelInsert', 'blueCaller')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('bulkExcelDesc', 'blueCaller')}
              <span className="block text-amber-600 text-xs mt-1">
                ⚠️ {t('duplicateWarningDesc', 'blueCaller')}
              </span>
            </p>
          </div>
        </div>

        {/* Template Download Section */}
        <div
          className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4`}
        >
          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('downloadTemplate', 'blueCaller')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t('selectJobPosition', 'blueCaller')}
              </label>
              <div className="relative">
                <select
                  value={selectedJobForTemplate}
                  onChange={(e) => setSelectedJobForTemplate(e.target.value)}
                  className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-4 py-2 pr-10 text-sm shadow-sm outline-none transition ${themeColors.focusRing}`}
                >
                  <option value="">{t('selectJobPositionPlaceholder', 'blueCaller')}</option>
                  {jobPositions.map((job) => (
                    <option key={job._id} value={job._id}>
                      {toStringValue(job.title) || job.jobCode || job._id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={!selectedJobForTemplate}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition ${
                selectedJobForTemplate
                  ? `${themeColors.bgPrimary} ${themeColors.hoverBg}`
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Download className="h-4 w-4" />
              {t('downloadTemplate', 'blueCaller')}
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('uploadFile', 'blueCaller')}
          </h3>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleBulkDrop(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed ${themeColors.borderPrimary} ${themeColors.bgLight} px-6 py-10 text-center transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-600`}
          >
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
              <FileSpreadsheet
                className={`h-8 w-8 ${themeColors.textPrimary}`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t('dropXlsxHere', 'blueCaller')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('orClickToBrowse', 'blueCaller')}
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
              className={`inline-flex items-center gap-2 rounded-full ${themeColors.bgPrimary} px-4 py-2 text-sm font-semibold text-white shadow-lg ${themeColors.hoverBg}`}
            >
              <Upload className="h-4 w-4" /> {t('browseExcelFile', 'blueCaller')}
            </span>
          </label>
        </div>

        {bulkFileName && (
          <div
            className={`flex items-center justify-between rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 px-4 py-3`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`h-5 w-5 ${themeColors.textPrimary}`} />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {getDisplayFileName(bulkFileName, 40)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('clickCellsToEdit', 'blueCaller')}
                </p>
              </div>
            </div>
          </div>
        )}

        {bulkUploadErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" /> {t('uploadIssues', 'blueCaller')}
            </div>
            <ul className="space-y-1">
              {bulkUploadErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            {
              label: t('parsedRows', 'blueCaller'),
              value: bulkRows.length,
              color: 'text-gray-900 dark:text-gray-100',
            },
            {
              label: t('valid', 'blueCaller'),
              value: bulkPreviewRows.filter(
                (r) => r.errors.length === 0 && !r.hasDuplicate
              ).length,
              color: 'text-emerald-600',
            },
            {
              label: t('duplicate', 'blueCaller'),
              value: bulkPreviewRows.filter(
                (r) => r.errors.length === 0 && r.hasDuplicate
              ).length,
              color: 'text-amber-600',
            },
            {
              label: t('failed', 'blueCaller'),
              value: bulkPreviewRows.filter((r) => r.errors.length > 0).length,
              color: 'text-red-600',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
          className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4`}
            >
              <p
                className={`text-xs uppercase tracking-[0.18em] ${themeColors.textPrimary}`}
              >
                {label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} dark:bg-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300`}
        >
          <span className={`font-semibold ${themeColors.textPrimary}`}>
            {t('validationRules', 'blueCaller')}
          </span>
          <ul className="mt-1 space-y-1 text-xs">
            <li>
              • <span className="text-red-600">{t('failedRed', 'blueCaller')}</span> - {t('failedRedDesc', 'blueCaller')}
            </li>
            <li>
              • <span className="text-amber-600">{t('duplicateYellow', 'blueCaller')}</span> - {t('duplicateYellowDesc', 'blueCaller')}
            </li>
            <li>
              • <span className="text-emerald-600">{t('validGreen', 'blueCaller')}</span> - {t('validGreenDesc', 'blueCaller')}
            </li>
          </ul>
        </div>
      </section>

      {/* Bottom Section: Editable Applicant Table */}
      <section
        className={`overflow-hidden rounded-3xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 shadow-xl flex flex-col`}
      >
        <div
          className={`flex items-center justify-between border-b ${themeColors.borderLight} px-4 py-3 flex-shrink-0 flex-wrap gap-2`}
        >
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {t('applicantData', 'blueCaller')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('applicantDataHint', 'blueCaller')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full ${themeColors.bgLight} dark:bg-gray-700 px-3 py-1 text-xs font-semibold ${themeColors.textPrimary} whitespace-nowrap`}
            >
              {t('rowsByCols', 'blueCaller', { rows: bulkPreviewRows.length, cols: allColumnHeaders.length })}
            </span>
            {bulkRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkRows([]);
                  setBulkFileName('');
                  setBulkUploadErrors([]);
                  setBulkFileResetKey((v) => v + 1);
                  setSelectedRowKeys(new Set());
                }}
                className={`inline-flex items-center gap-1 rounded-xl border ${themeColors.borderPrimary} bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold ${themeColors.textPrimary}`}
              >
                <Trash2 className="h-3 w-3" /> {t('reset', 'blueCaller')}
              </button>
            )}
            {selectedRowKeys.size > 0 && (
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow"
              >
                <Trash2 className="h-3 w-3" />
                {t('deleteCount', 'blueCaller', { count: selectedRowKeys.size })}
              </button>
            )}
              <button
            type="button"
            onClick={() => void handleBulkSubmit()}
            disabled={
              bulkSubmitting ||
              bulkPreviewRows.filter((r) => r.errors.length === 0).length === 0
            }
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${themeColors.hoverBg} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {bulkSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {t('submitValidRows', 'blueCaller', { count: bulkPreviewRows.filter((r) => r.errors.length === 0).length })}
            </button>
          </div>
        </div>

        <div
          className="overflow-auto flex-1"
          style={{ maxHeight: 'calc(100vh - 450px)', minHeight: '400px' }}
        >
          <table
            className={`min-w-full divide-y ${themeColors.borderLight} text-left text-xs`}
          >
            <thead
              className={`${themeColors.bgLight} dark:bg-gray-700 text-gray-900 dark:text-gray-100 sticky top-0 z-10`}
            >
              <tr>
                <th className="px-2 py-2 font-semibold w-[40px]">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      selectedRowKeys.size === bulkPreviewRows.length &&
                      bulkPreviewRows.length > 0
                    }
                  />
                </th>
                <th className="px-2 py-2 font-semibold w-[50px]">{t('rowNumber', 'blueCaller')}</th>
                <th className="px-2 py-2 font-semibold w-[80px]">{t('status', 'blueCaller')}</th>
                <th className="px-2 py-2 font-semibold w-[180px]">{t('issues', 'blueCaller')}</th>
                {allColumnHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-2 py-2 font-semibold max-w-[150px]"
                  >
                    <div className="truncate" title={header}>
                      {header}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeColors.borderLight} bg-white dark:bg-gray-800`}>
              {bulkPreviewRows.length === 0 ? (
                <tr>
                  <td
                    className="px-2 py-8 text-center text-gray-500 dark:text-gray-400"
                    colSpan={allColumnHeaders.length + 4}
                  >
                    {t('uploadToPreview', 'blueCaller')}
                  </td>
                </tr>
              ) : (
                bulkPreviewRows.map((row, rowIndex) => {
                  const rowStatus = getRowStatus(row);
                  const hasErrors = row.errors.length > 0;
                  const isDuplicate =
                    !hasErrors && (row.hasDuplicate || row.warnings.length > 0);
                  const rowKey = String(row.rowNumber);

                  return (
                    <tr
                      key={`row-${rowKey}`}
                      className={
                        hasErrors
                          ? 'bg-red-50/50'
                          : isDuplicate
                            ? 'bg-amber-50/50'
                            : 'bg-emerald-50/40'
                      }
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowKeys.has(rowKey)}
                          onChange={() => toggleRowSelection(rowKey)}
                        />
                      </td>
                      <td className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-center">
                        {row.rowNumber}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${rowStatus.color}`}
                        >
                          {rowStatus.icon}
                          {rowStatus.status}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {hasErrors ? (
                          <div
                            className="text-[10px] text-red-600 truncate max-w-[160px]"
                            title={row.errors.join(', ')}
                          >
                            {row.errors[0]}
                            {row.errors.length > 1
                              ? ` +${row.errors.length - 1}`
                              : ''}
                          </div>
                        ) : isDuplicate ? (
                          <div
                            className="text-[10px] text-amber-600 truncate max-w-[160px]"
                            title={row.warnings.join(', ')}
                          >
                            ⚠️ {row.warnings[0]}
                            {row.warnings.length > 1
                              ? ` +${row.warnings.length - 1}`
                              : ''}
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-[10px] whitespace-nowrap">
                            ✓ {t('ready', 'blueCaller')}
                          </span>
                        )}
                      </td>
                      {allColumnHeaders.map((header) => {
                        const currentMeta = columnMeta[header];
                        const currentValue = row.allData?.[header];

                        return (
                          <td
                            key={header}
                            className="px-2 py-2 max-w-[150px]"
                          >
                            {currentMeta?.type === 'checkbox' ? (
                              <input
                                type="checkbox"
                                checked={currentValue === 'Yes' || currentValue === 'true' || currentValue === true || currentValue === '1'}
                                onChange={(e) => handleCellEdit(rowIndex, header, e.target.checked ? 'Yes' : 'No')}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            ) : currentMeta?.type === 'select' ? (
                              <select
                                defaultValue={String(currentValue ?? '')}
                                onChange={(e) => handleCellEdit(rowIndex, header, e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                              >
                                <option value="">--</option>
                                {currentMeta.options?.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                defaultValue={String(currentValue ?? '')}
                                onBlur={(e) => handleCellEdit(rowIndex, header, e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {allColumnHeaders.length > 6 && (
          <div
            className={`border-t ${themeColors.borderLight} px-3 py-1.5 text-center text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0`}
          >
            <span className="inline-flex items-center gap-1">
              {t('scrollHint', 'blueCaller', { count: allColumnHeaders.length })}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}