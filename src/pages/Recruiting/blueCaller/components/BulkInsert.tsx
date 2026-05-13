// components/BulkInsert.tsx
import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import axiosInstance from '../../../../config/axios';
import Swal from '../../../../utils/swal';
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

function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function normalizePhoneValue(value: string): string {
  return String(value || '').replace(/\s+/g, '').replace(/-/g, '').trim();
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
  return value ? String(value) : '';
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

  return existingApplicants.find((applicant) => {
    const applicantEmail = String(applicant?.email || '').trim().toLowerCase();
    const applicantPhone = normalizePhoneValue(String(applicant?.phone || ''));
    return (
      (normalizedEmail && applicantEmail === normalizedEmail) ||
      (normalizedPhone && applicantPhone === normalizedPhone)
    );
  }) || null;
}

function normalizeApplicantRow(rawRow: Record<string, unknown>, rowNumber: number): BulkApplicantRow {
  return {
    rowNumber,
    fullName: String(rawRow.fullName || '').trim(),
    email: String(rawRow.email || '').trim(),
    phone: String(rawRow.phone || '').trim(),
    address: String(rawRow.address || '').trim(),
    birthDate: parseExcelDate(rawRow.birthDate),
    gender: String(rawRow.gender || '').trim(),
    expectedSalary: rawRow.expectedSalary === undefined || rawRow.expectedSalary === null || rawRow.expectedSalary === '' ? undefined : Number(rawRow.expectedSalary),
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
  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.push('Invalid email format.');
  if (!normalizedPhone) errors.push('Phone is required.');
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) errors.push('Phone must match 01[0125]XXXXXXXX.');
  if (!row.address) errors.push('Address is required.');
  if (!row.birthDate) errors.push('Birth date is required.');
  if (row.birthDate && isFutureBirthDate(row.birthDate)) errors.push('Birth date cannot be in the future.');
  if (!row.gender) errors.push('Gender is required.');
  if (row.gender && !['Male', 'Female'].includes(row.gender)) errors.push('Gender must be Male or Female.');
  if (!row.jobPositionId) errors.push('Job position is required.');
  if (row.jobPositionId && !jobPositionIds.has(row.jobPositionId)) errors.push('Job position ID was not found in the loaded job positions.');
  if (row.expectedSalary !== undefined && Number.isNaN(row.expectedSalary)) errors.push('Expected salary must be numeric.');

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

  const duplicate = checkExistingApplicant(existingApplicants, { email: normalizedEmail, phone: normalizedPhone });
  if (duplicate) {
    errors.push(`Duplicate applicant found in the current company scope (${duplicate.fullName || duplicate._id}).`);
  }

  return { ...row, phone: normalizedPhone, errors, normalizedPhone };
}

function buildTemplateWorkbook() {
  const headers = ['fullName', 'email', 'phone', 'address', 'birthDate', 'gender', 'expectedSalary', 'jobPositionId'];
  const example = ['Amina Hassan', 'amina@example.com', '01012345678', 'Cairo', '1998-06-12', 'Female', '12000', 'JOB_POSITION_ID'];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants');
  return workbook;
}

export default function BulkInsert({ jobPositions, existingApplicants, themeColors, onSuccess }: BulkInsertProps) {
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkApplicantRow[]>([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkFileResetKey, setBulkFileResetKey] = useState(0);

  const validateBulkRows = (rows: BulkApplicantRow[]): RowValidationResult[] => {
    const knownJobPositionIds = new Set(jobPositions.map((job) => job._id));
    const emailTracker = new Map<string, number>();
    const phoneTracker = new Map<string, number>();
    return rows.map((row) => validateBulkRow(row, knownJobPositionIds, existingApplicants, emailTracker, phoneTracker));
  };

  const handleUploadTemplate = () => {
    const workbook = buildTemplateWorkbook();
    XLSX.writeFile(workbook, 'BlueCallerApplicants_Template.xlsx');
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
        setBulkUploadErrors(['The uploaded file does not contain any worksheet.']);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const parsed = jsonRows.map((row, index) => normalizeApplicantRow(row, index + 2));
      setBulkRows(validateBulkRows(parsed));
    } catch (error) {
      setBulkRows([]);
      setBulkUploadErrors([getApiErrorMessage(error, 'Failed to parse the Excel file.')]);
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
      setBulkUploadErrors(['Upload and parse an Excel file before submitting.']);
      return;
    }

    if (validRows.length === 0) {
      setBulkUploadErrors(['No valid rows are available for submission.']);
      return;
    }

    const payload = validRows.map<PreparedApplicantPayload>((row) => ({
      jobPositionId: row.jobPositionId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      birthDate: row.birthDate,
      gender: row.gender === 'Female' ? 'Female' : 'Male',
      status: 'pending',
      expectedSalary: row.expectedSalary,
    }));

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
        text: `${validRows.length} applicant${validRows.length === 1 ? '' : 's'} inserted successfully.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      });

      setBulkFileName('');
      setBulkRows([]);
      setBulkUploadErrors([]);
      setBulkFileResetKey((v) => v + 1);
      onSuccess();
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

  const bulkPreviewRows = validateBulkRows(bulkRows);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className={`space-y-5 rounded-3xl border ${themeColors.borderPrimary} bg-white p-6 shadow-xl`}>
        <div className={`flex items-center justify-between gap-4 border-b ${themeColors.borderLight} pb-4`}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Excel Insert</h2>
            <p className="mt-1 text-sm text-gray-500">Upload a spreadsheet, inspect the parsed rows, and submit only the valid applicants.</p>
          </div>
          <button type="button" onClick={handleUploadTemplate} className={`inline-flex items-center gap-2 rounded-xl border ${themeColors.borderPrimary} ${themeColors.bgLight} px-4 py-3 text-sm font-semibold ${themeColors.textPrimary} transition hover:bg-gray-200`}>
            <Download className="h-4 w-4" /> Download template
          </button>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void handleBulkDrop(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed ${themeColors.borderPrimary} ${themeColors.bgLight} px-6 py-14 text-center transition hover:bg-gray-200`}
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <FileSpreadsheet className={`h-8 w-8 ${themeColors.textPrimary}`} />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900">Drop your .xlsx file here</p>
            <p className="text-sm text-gray-600">Columns: fullName, email, phone, address, birthDate, gender, expectedSalary, jobPositionId.</p>
          </div>
          <input key={bulkFileResetKey} type="file" accept=".xlsx" className="hidden" onChange={(e) => void handleBulkDrop(e.target.files)} />
          <span className={`inline-flex items-center gap-2 rounded-full ${themeColors.bgPrimary} px-4 py-2 text-sm font-semibold text-white shadow-lg ${themeColors.hoverBg}`}>
            <Upload className="h-4 w-4" /> Browse Excel file
          </span>
        </label>

        {bulkFileName && (
          <div className={`flex items-center justify-between rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} px-4 py-3`}>
            <div className="flex items-center gap-3">
              <FileText className={`h-5 w-5 ${themeColors.textPrimary}`} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{getDisplayFileName(bulkFileName, 40)}</p>
                <p className="text-xs text-gray-500">Parsed rows are shown on the right.</p>
              </div>
            </div>
            <button type="button" onClick={() => { setBulkRows([]); setBulkFileName(''); setBulkUploadErrors([]); setBulkFileResetKey((v) => v + 1); }} className={`inline-flex items-center gap-2 rounded-xl border ${themeColors.borderPrimary} bg-white px-3 py-2 text-sm font-semibold ${themeColors.textPrimary}`}>
              <Trash2 className="h-4 w-4" /> Reset
            </button>
          </div>
        )}

        {bulkUploadErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="mb-2 flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Upload issues</div>
            <ul className="space-y-1">{bulkUploadErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Parsed rows', value: bulkRows.length, color: 'text-gray-900' },
            { label: 'Valid', value: bulkPreviewRows.filter((r) => r.errors.length === 0).length, color: 'text-emerald-600' },
            { label: 'Failed', value: bulkPreviewRows.filter((r) => r.errors.length > 0).length, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${themeColors.textPrimary}`}>{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-2xl border ${themeColors.borderLight} ${themeColors.bgLight} p-4 text-sm text-gray-600`}>
          The batch submission sends only valid rows to <span className={`font-semibold ${themeColors.textPrimary}`}>POST /applicants</span>, while invalid rows remain listed with reasons.
        </div>

        <button type="button" onClick={() => void handleBulkSubmit()} disabled={bulkSubmitting || bulkRows.length === 0} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl ${themeColors.bgPrimary} px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 ${themeColors.hoverBg} disabled:cursor-not-allowed disabled:opacity-60`}>
          {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Submit valid rows
        </button>
      </section>

      <section className={`overflow-hidden rounded-3xl border ${themeColors.borderPrimary} bg-white shadow-xl`}>
        <div className={`flex items-center justify-between border-b ${themeColors.borderLight} px-6 py-4`}>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Parsed Preview</h3>
            <p className="text-sm text-gray-500">Inspect each row and the validation result before submission.</p>
          </div>
          <div className={`rounded-full ${themeColors.bgLight} px-4 py-2 text-sm font-semibold ${themeColors.textPrimary}`}>{bulkPreviewRows.length} rows previewed</div>
        </div>

        <div className="overflow-auto">
          <table className={`min-w-full divide-y ${themeColors.borderLight} text-left text-sm`}>
            <thead className={`${themeColors.bgLight} text-gray-900`}>
              <tr>
                {['Row', 'Name', 'Email', 'Phone', 'Job', 'Status', 'Errors'].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeColors.borderLight} bg-white`}>
              {bulkPreviewRows.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={7}>Upload an Excel file to preview applicant rows here.</td></tr>
              ) : (
                bulkPreviewRows.map((row) => {
                  const hasError = row.errors.length > 0;
                  const jobPosition = jobPositions.find((job) => job._id === row.jobPositionId);
                  return (
                    <tr key={`${row.rowNumber}-${row.email}`} className={hasError ? 'bg-red-50/50' : 'bg-emerald-50/40'}>
                      <td className="px-4 py-4 font-semibold text-gray-700">{row.rowNumber}</td>
                      <td className="px-4 py-4 text-gray-900">{row.fullName || '-'}</td>
                      <td className="px-4 py-4 text-gray-700">{row.email || '-'}</td>
                      <td className="px-4 py-4 text-gray-700">{row.phone || '-'}</td>
                      <td className="px-4 py-4 text-gray-700">{jobPosition ? toStringValue(jobPosition.title) || jobPosition.jobCode : row.jobPositionId || '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${hasError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {hasError ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {hasError ? 'Failed' : 'Valid'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {hasError ? <ul className="space-y-1">{row.errors.map((error) => <li key={error}>• {error}</li>)}</ul> : <span className="text-emerald-700">Ready to submit</span>}
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
  );
}