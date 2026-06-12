// components/BulkInsert.tsx
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
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

// components/BulkInsert.tsx
// Update the parseCustomFields function

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

    // Handle repeatable_group with multiple numbered columns
    if (
      inputType === 'repeatable_group' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      const rows: Record<string, unknown>[] = [];
      const subFields = (fieldRecord.groupFields as unknown[]).map(
        (sf) => sf as Record<string, unknown>
      );

      // Find all numbered occurrences (max up to 20 entries)
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

      // Parse each numbered occurrence
      for (let idx = 1; idx <= maxIndex; idx++) {
        const row: Record<string, unknown> = {};
        let hasValue = false;

        for (const subField of subFields) {
          const subLocKey = String(subField.fieldId || '');
          const subLabel = toStringValue(subField.label);
          const subInputType = String(subField.inputType || 'text');

          // Column naming convention:
          // First occurrence: "Group Label - Subfield Label"
          // Subsequent: "Group Label N - Subfield Label"
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

            // Parse based on input type
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

    // Handle groupField (single group)
    if (inputType === 'groupField' && Array.isArray(fieldRecord.groupFields)) {
      const groupObj: Record<string, unknown> = {};
      const subFields = (fieldRecord.groupFields as unknown[]).map(
        (sf) => sf as Record<string, unknown>
      );

      for (const subField of subFields) {
        const subLocKey = String(subField.fieldId || '');
        const subLabel = toStringValue(subField.label);
        const subInputType = String(subField.inputType || 'text');

        // Column naming: "Group Label - Subfield Label"
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

    // Regular fields (non-group)
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
  batchSeenPhones: Map<string, number>
): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalizedPhone = normalizePhoneValue(row.phone);
  const normalizedEmail = row.email.trim().toLowerCase();
  let hasDuplicate = false;
  let duplicateInfo = '';

  // Basic validation (errors - prevent submission)
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

  if (!row.jobPositionTitle) {
    errors.push('Job position is required.');
  } else if (!row.jobPositionId) {
    errors.push(
      `Job position "${row.jobPositionTitle}" was not found. Available positions: ${jobPositions.map((j) => toStringValue(j.title)).join(', ')}`
    );
  }

  if (row.expectedSalary !== undefined && Number.isNaN(row.expectedSalary)) {
    errors.push('Expected salary must be numeric.');
  }

  // Duplicate check within batch (warnings - doesn't prevent submission)
  if (normalizedEmail) {
    const firstSeenRow = batchSeenEmails.get(normalizedEmail);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      warnings.push(
        `Duplicate email appears in row ${firstSeenRow} (will still be submitted).`
      );
      hasDuplicate = true;
      duplicateInfo = `Email duplicate with row ${firstSeenRow}`;
    } else {
      batchSeenEmails.set(normalizedEmail, row.rowNumber);
    }
  }

  if (normalizedPhone) {
    const firstSeenRow = batchSeenPhones.get(normalizedPhone);
    if (firstSeenRow !== undefined && firstSeenRow !== row.rowNumber) {
      warnings.push(
        `Duplicate phone appears in row ${firstSeenRow} (will still be submitted).`
      );
      hasDuplicate = true;
      duplicateInfo =
        duplicateInfo || `Phone duplicate with row ${firstSeenRow}`;
    } else {
      batchSeenPhones.set(normalizedPhone, row.rowNumber);
    }
  }

  // Duplicate check against existing applicants (warnings - doesn't prevent submission)
  const duplicate = checkExistingApplicant(existingApplicants, {
    email: normalizedEmail,
    phone: normalizedPhone,
  });
  if (duplicate) {
    warnings.push(
      `Applicant may already exist: ${duplicate.fullName || duplicate.email || duplicate.phone} (will still be submitted).`
    );
    hasDuplicate = true;
    duplicateInfo =
      duplicateInfo ||
      `Existing applicant: ${duplicate.fullName || duplicate.email}`;
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

// ─── Build template workbook for a specific job position ──────────────────────

function buildTemplateWorkbookForJob(jobPosition: JobPosition): XLSX.WorkBook {
  const headers = [
    'fullName',
    'email',
    'phone',
    'address',
    'birthDate',
    'gender',
    'expectedSalary',
    'jobPosition',
  ];

  const customFieldHeaders: string[] = [];
  const jobSpecHeaders: string[] = [];

  (jobPosition.customFields || []).forEach((field: unknown) => {
    const fieldRecord = field as Record<string, unknown>;
    const label = toStringValue(fieldRecord.label);
    const inputType = String(fieldRecord.inputType || 'text');

    if (label) {
      if (
        inputType === 'repeatable_group' &&
        Array.isArray(fieldRecord.groupFields)
      ) {
        // Generate 3 example rows for repeatable groups
        const subFields = fieldRecord.groupFields as unknown[];
        const maxExamples = 3; // Show 3 example rows in template

        for (let exampleNum = 1; exampleNum <= maxExamples; exampleNum++) {
          subFields.forEach((subField: unknown) => {
            const subRecord = subField as Record<string, unknown>;
            const subLabel = toStringValue(subRecord.label);
            // Format: "Group Label N - Subfield Label"
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
        // For single group, add subfields with "Group - Subfield" format
        (fieldRecord.groupFields as unknown[]).forEach((subField: unknown) => {
          const subRecord = subField as Record<string, unknown>;
          const subLabel = toStringValue(subRecord.label);
          const composite = `${label} - ${subLabel}`;
          customFieldHeaders.push(composite);
        });
      } else {
        customFieldHeaders.push(label);
      }
    }
  });

  (jobPosition.jobSpecsWithDetails || []).forEach(
    (spec: { spec?: unknown }) => {
      const specText = toStringValue(spec?.spec);
      if (specText && !jobSpecHeaders.includes(specText))
        jobSpecHeaders.push(specText);
    }
  );

  const allHeaders = [...headers, ...customFieldHeaders, ...jobSpecHeaders];

  // Create example row with sample data
  const exampleRowData: (string | number)[] = [
    'Amina Hassan',
    'amina@example.com',
    '01012345678',
    'Cairo',
    '1998-06-12',
    'Female',
    '12000',
    toStringValue(jobPosition.title),
  ];

  // Add example values for custom fields
  (jobPosition.customFields || []).forEach((field: unknown) => {
    const fieldRecord = field as Record<string, unknown>;
    const label = toStringValue(fieldRecord.label);
    const inputType = String(fieldRecord.inputType || 'text');

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
          const subInputType = String(subRecord.inputType || 'text');

          if (subInputType === 'checkbox') exampleRowData.push('Yes');
          else if (subInputType === 'date') exampleRowData.push('2023-01-01');
          else if (subInputType === 'number') exampleRowData.push('5');
          else if (subInputType === 'tags') exampleRowData.push('tag1, tag2');
          else exampleRowData.push(`Example ${subLabel}`);
        });
      }
    } else if (
      inputType === 'groupField' &&
      Array.isArray(fieldRecord.groupFields)
    ) {
      (fieldRecord.groupFields as unknown[]).forEach((subField: unknown) => {
        const subRecord = subField as Record<string, unknown>;
        const subLabel = toStringValue(subRecord.label);
        const subInputType = String(subRecord.inputType || 'text');

        if (subInputType === 'checkbox') exampleRowData.push('Yes');
        else if (subInputType === 'date') exampleRowData.push('2023-01-01');
        else if (subInputType === 'number') exampleRowData.push('5');
        else if (subInputType === 'tags') exampleRowData.push('tag1, tag2');
        else exampleRowData.push(`Example ${subLabel}`);
      });
    } else {
      if (inputType === 'checkbox') exampleRowData.push('Yes');
      else if (inputType === 'date') exampleRowData.push('2023-01-01');
      else if (inputType === 'number') exampleRowData.push('5');
      else if (inputType === 'tags') exampleRowData.push('tag1, tag2');
      else exampleRowData.push(`Example ${label}`);
    }
  });

  // Add job spec examples
  jobSpecHeaders.forEach(() => exampleRowData.push('Yes'));

  const worksheet = XLSX.utils.aoa_to_sheet([allHeaders, exampleRowData]);
  worksheet['!cols'] = allHeaders.map(() => ({ wch: 20 }));

  // Enhanced instructions
  const instructionsData = [
    ['Instructions for Bulk Upload'],
    [''],
    ['Required Columns:'],
    ['- fullName: Applicant full name (required)'],
    ['- email: Valid email address (required)'],
    ['- phone: Egyptian phone number (01XXXXXXXXX) (required)'],
    ['- address: Applicant address (required)'],
    ['- birthDate: YYYY-MM-DD format (required)'],
    ['- gender: Male or Female (required)'],
    ['- expectedSalary: Numeric value (optional)'],
    ['- jobPosition: Exact job title as shown above (required)'],
    [''],
    [
      'For Repeatable Groups (e.g., Work Experience, Education, Certifications):',
    ],
    ['  - Use the numbered columns to add multiple entries'],
    [
      '  - First entry uses "Group Name - Field Name" (e.g., "Work Experience - Company Name")',
    ],
    [
      '  - Second entry uses "Group Name 2 - Field Name" (e.g., "Work Experience 2 - Company Name")',
    ],
    ['  - Third entry uses "Group Name 3 - Field Name", and so on'],
    ['  - You can add up to 20 entries for each repeatable group'],
    ['  - Leave unused columns empty'],
    [''],
    ['For Single Groups (e.g., Address, Contact Info):'],
    [
      '  - Use the format "Group Name - Field Name" (e.g., "Current Address - Street")',
    ],
    [''],
    ['Job Specifications:'],
    ...jobSpecHeaders.map((h) => [`- ${h}: Answer with Yes or No`]),
    [''],
    ['Notes:'],
    ['- Duplicate applicants will show a warning but can still be submitted'],
    [
      '- All custom fields are optional unless marked as required in the job settings',
    ],
    ['- For checkboxes, use Yes/No or True/False'],
    ['- For tags, separate multiple values with commas'],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return workbook;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkInsert({
  jobPositions,
  existingApplicants,
  themeColors,
  onSuccess,
}: BulkInsertProps) {
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkApplicantRow[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkFileResetKey, setBulkFileResetKey] = useState(0);
  const [selectedJobForTemplate, setSelectedJobForTemplate] =
    useState<string>('');

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
        phoneTracker
      )
    );
  };

  const handleDownloadTemplate = () => {
    if (!selectedJobForTemplate) {
      Swal.fire({
        title: 'Select a job position',
        text: 'Please select a job position to download the template.',
        icon: 'warning',
        confirmButtonText: 'OK',
      });
      return;
    }

    const jobPosition = jobPositions.find(
      (job) => job._id === selectedJobForTemplate
    );
    if (!jobPosition) {
      Swal.fire({
        title: 'Job not found',
        text: 'The selected job position could not be found.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    const workbook = buildTemplateWorkbookForJob(jobPosition);
    const fileName = `Applicant_Template_${toStringValue(jobPosition.title).replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    Swal.fire({
      title: 'Template downloaded',
      text: `Template for "${toStringValue(jobPosition.title)}" has been downloaded.`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
    });
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
        normalizeApplicantRow(row, index + 2, jobPositions)
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

    // Separate rows: those with errors (blocking) vs those with only warnings (including duplicates)
    const rowsWithOnlyWarnings = validatedRows.filter(
      (row) => row.errors.length === 0 && row.warnings.length > 0
    );
    const validRows = validatedRows.filter((row) => row.errors.length === 0);

    setBulkRows([...validatedRows]);

    if (validatedRows.length === 0) {
      setBulkUploadErrors([
        'Upload and parse an Excel file before submitting.',
      ]);
      return;
    }

    if (validRows.length === 0) {
      setBulkUploadErrors([
        'No valid rows are available for submission. Please fix the errors.',
      ]);
      return;
    }

    // Show warning if there are duplicates
    if (rowsWithOnlyWarnings.length > 0) {
      const duplicateCount = rowsWithOnlyWarnings.length;
      const result = await Swal.fire({
        title: '⚠️ Duplicate Applicants Detected',
        html: `
          <div style="text-align: left;">
            <p><strong>${duplicateCount} row${duplicateCount > 1 ? 's' : ''} ${duplicateCount > 1 ? 'have' : 'has'} potential duplicates:</strong></p>
            <ul style="margin-top: 10px; margin-bottom: 10px;">
              ${rowsWithOnlyWarnings
                .slice(0, 5)
                .map(
                  (row) =>
                    `<li>Row ${row.rowNumber}: ${row.fullName || row.email} - ${row.duplicateInfo || 'Potential duplicate'}</li>`
                )
                .join('')}
              ${rowsWithOnlyWarnings.length > 5 ? `<li>... and ${rowsWithOnlyWarnings.length - 5} more</li>` : ''}
            </ul>
            <p>These applicants will still be submitted. Do you want to continue?</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit anyway',
        cancelButtonText: 'No, cancel',
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
        title: 'Submitting batch',
        text: `Saving ${payload.length} applicant${payload.length === 1 ? '' : 's'} to the server.${rowsWithOnlyWarnings.length > 0 ? ` (${rowsWithOnlyWarnings.length} duplicate${rowsWithOnlyWarnings.length > 1 ? 's' : ''} included)` : ''}`,
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await axiosInstance.post('/applicants/bulk', { applicants: payload });

      await Swal.fire({
        title: 'Batch submitted',
        html: `${payload.length} applicant${payload.length === 1 ? '' : 's'} inserted successfully.${
          rowsWithOnlyWarnings.length > 0
            ? `<br/><br/><span style="color: #f59e0b;">⚠️ ${rowsWithOnlyWarnings.length} duplicate${rowsWithOnlyWarnings.length > 1 ? 's were' : ' was'} submitted with warnings.</span>`
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
        title: 'Batch failed',
        text: getApiErrorMessage(
          error,
          'Failed to submit the applicant batch.'
        ),
        icon: 'error',
        confirmButtonText: 'Close',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const bulkPreviewRows = validateBulkRows(bulkRows);

  const formatCellValue = (value: unknown): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getRowStatus = (
    row: RowValidationResult
  ): { status: string; color: string; icon: JSX.Element } => {
    if (row.errors.length > 0) {
      return {
        status: 'Failed',
        color: 'bg-red-100 text-red-700',
        icon: <AlertCircle className="h-3 w-3" />,
      };
    }
    if (row.hasDuplicate || row.warnings.length > 0) {
      return {
        status: 'Duplicate',
        color: 'bg-amber-100 text-amber-700',
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    }
    return {
      status: 'Valid',
      color: 'bg-emerald-100 text-emerald-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section
        className={`space-y-5 rounded-3xl border ${themeColors.borderPrimary} bg-white p-6 shadow-xl`}
      >
        <div
          className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Bulk Excel Insert
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload a spreadsheet, inspect the parsed rows, and submit only the
              valid applicants.
              <span className="block text-amber-600 text-xs mt-1">
                ⚠️ Duplicate applicants will show a warning but can still be
                submitted.
              </span>
            </p>
          </div>
        </div>

        {/* Template Download Section */}
        <div
          className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}
        >
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            Download Template
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Job Position
              </label>
              <div className="relative">
                <select
                  value={selectedJobForTemplate}
                  onChange={(e) => setSelectedJobForTemplate(e.target.value)}
                  className={`w-full appearance-none rounded-xl border ${themeColors.borderPrimary} bg-white px-4 py-2 pr-10 text-sm shadow-sm outline-none transition ${themeColors.focusRing}`}
                >
                  <option value="">-- Select a job position --</option>
                  {jobPositions.map((job) => (
                    <option key={job._id} value={job._id}>
                      {toStringValue(job.title) || job.jobCode || job._id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
              Download Template
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div>
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            Upload File
          </h3>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleBulkDrop(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed ${themeColors.borderPrimary} ${themeColors.bgLight} px-6 py-10 text-center transition hover:bg-gray-200`}
          >
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <FileSpreadsheet
                className={`h-8 w-8 ${themeColors.textPrimary}`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-gray-900">
                Drop your .xlsx file here
              </p>
              <p className="text-sm text-gray-600">
                Or click to browse. Use the template matching your job position.
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
              <Upload className="h-4 w-4" /> Browse Excel file
            </span>
          </label>
        </div>

        {bulkFileName && (
          <div
            className={`flex items-center justify-between rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} px-4 py-3`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`h-5 w-5 ${themeColors.textPrimary}`} />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {getDisplayFileName(bulkFileName, 40)}
                </p>
                <p className="text-xs text-gray-500">
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
              <Trash2 className="h-4 w-4" /> Reset
            </button>
          </div>
        )}

        {bulkUploadErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" /> Upload issues
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
              label: 'Parsed rows',
              value: bulkRows.length,
              color: 'text-gray-900',
            },
            {
              label: 'Valid',
              value: bulkPreviewRows.filter(
                (r) => r.errors.length === 0 && !r.hasDuplicate
              ).length,
              color: 'text-emerald-600',
            },
            {
              label: 'Duplicate',
              value: bulkPreviewRows.filter(
                (r) => r.errors.length === 0 && r.hasDuplicate
              ).length,
              color: 'text-amber-600',
            },
            {
              label: 'Failed',
              value: bulkPreviewRows.filter((r) => r.errors.length > 0).length,
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
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4 text-sm text-gray-600`}
        >
          <span className={`font-semibold ${themeColors.textPrimary}`}>
            Validation Rules:
          </span>
          <ul className="mt-1 space-y-1 text-xs">
            <li>
              • <span className="text-red-600">Failed (red)</span> - Missing
              required fields or invalid data - cannot submit
            </li>
            <li>
              • <span className="text-amber-600">Duplicate (yellow)</span> -
              Potential duplicate applicant - can still submit
            </li>
            <li>
              • <span className="text-emerald-600">Valid (green)</span> - Ready
              to submit
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => void handleBulkSubmit()}
          disabled={
            bulkSubmitting ||
            bulkPreviewRows.filter((r) => r.errors.length === 0).length === 0
          }
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${themeColors.hoverBg} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {bulkSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Submit Valid Rows (
          {bulkPreviewRows.filter((r) => r.errors.length === 0).length})
        </button>
      </section>

      <section
        className={`overflow-hidden rounded-3xl border ${themeColors.borderPrimary} bg-white shadow-xl flex flex-col`}
      >
        <div
          className={`flex items-center justify-between border-b ${themeColors.borderLight} px-4 py-3 flex-shrink-0 flex-wrap gap-2`}
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Parsed Preview
            </h3>
            <p className="text-xs text-gray-500">
              Yellow rows have potential duplicates but can still be submitted.
            </p>
          </div>
          <div
            className={`rounded-full ${themeColors.bgLight} px-3 py-1 text-xs font-semibold ${themeColors.textPrimary} whitespace-nowrap`}
          >
            {bulkPreviewRows.length} rows × {allColumnHeaders.length} cols
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
              className={`${themeColors.bgLight} text-gray-900 sticky top-0 z-10`}
            >
              <tr>
                <th className="px-2 py-2 font-semibold w-[50px]">#</th>
                <th className="px-2 py-2 font-semibold w-[80px]">Status</th>
                <th className="px-2 py-2 font-semibold w-[180px]">Issues</th>
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
            <tbody className={`divide-y ${themeColors.borderLight} bg-white`}>
              {bulkPreviewRows.length === 0 ? (
                <tr>
                  <td
                    className="px-2 py-8 text-center text-gray-500"
                    colSpan={allColumnHeaders.length + 3}
                  >
                    Upload an Excel file to preview applicant rows here.
                  </td>
                </tr>
              ) : (
                bulkPreviewRows.map((row) => {
                  const rowStatus = getRowStatus(row);
                  const hasErrors = row.errors.length > 0;
                  const isDuplicate =
                    !hasErrors && (row.hasDuplicate || row.warnings.length > 0);

                  return (
                    <tr
                      key={`${row.rowNumber}-${row.email}`}
                      className={
                        hasErrors
                          ? 'bg-red-50/50'
                          : isDuplicate
                            ? 'bg-amber-50/50'
                            : 'bg-emerald-50/40'
                      }
                    >
                      <td className="px-2 py-2 font-medium text-gray-700 text-center">
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
                            ✓ Ready
                          </span>
                        )}
                      </td>
                      {allColumnHeaders.map((header) => (
                        <td
                          key={header}
                          className="px-2 py-2 text-gray-700 max-w-[150px]"
                        >
                          <div
                            className="truncate"
                            title={formatCellValue(row.allData?.[header])}
                          >
                            {formatCellValue(row.allData?.[header])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {allColumnHeaders.length > 6 && (
          <div
            className={`border-t ${themeColors.borderLight} px-3 py-1.5 text-center text-[10px] text-gray-400 flex-shrink-0`}
          >
            <span className="inline-flex items-center gap-1">
              ← Scroll → {allColumnHeaders.length} columns total
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
