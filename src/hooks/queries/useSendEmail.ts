import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../config/axios';
import Swal from 'sweetalert2';
import { useLocale } from '../../context/LocaleContext';

type ApplicantRef = { _id?: string } | string;

type EmailPayload = {
  company?: string;
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: unknown[];
  metadata?: unknown;
  applicant?: ApplicantRef;
  jobPosition?: string;
};

type MailError = {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: { message?: string; error?: string; details?: Array<{ message?: string }> };
  };
};

const applicantId = (applicant?: ApplicantRef) =>
  applicant && typeof applicant === 'object' ? applicant._id : applicant;

// Builds exactly what the backend's mail schema accepts (validation/
// applicant.validation.js: singleEmailSchema / batchEmailSchema). Unknown
// keys fail the whole request, so extras callers pass (e.g. `metadata`,
// `text`) are dropped here. Also strips "<a@b.com>" brackets from `from`.
const normalizeEmail = (email: EmailPayload) => {
  const payload: Record<string, unknown> = {
    to: email.to,
    subject: email.subject,
    html: email.html,
  };
  if (email.company) payload.company = email.company;
  if (typeof email.from === 'string' && email.from.trim())
    payload.from = email.from.replace(/[<>]/g, '');
  if (email.attachments?.length) payload.attachments = email.attachments;
  const applicant = applicantId(email.applicant);
  if (applicant) payload.applicant = applicant;
  if (email.jobPosition) payload.jobPosition = email.jobPosition;
  return payload;
};

// The backend's validation middleware returns a generic message plus the
// specific reasons in `details`; show the reasons.
const serverErrorText = (error: MailError): string | undefined => {
  const data = error?.response?.data;
  const details = data?.details?.map((d) => d.message).filter(Boolean);
  return details?.length ? details.join(' ') : data?.message || data?.error;
};

export function useSendEmail() {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  return useMutation({
    // Refresh mail history (Mail Preview, applicant activity).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mail-logs'] }),
    mutationFn: (emailData: EmailPayload) => axiosInstance.post('/mail', normalizeEmail(emailData)),
    onError: (error: MailError) => {
      // Check for rate limit error (429 status code)
      if (error?.response?.status === 429) {
        const errorMessage = error?.response?.data?.message || 
          error?.response?.data?.error ||
          t('emailLimitMsg', 'common');
        
        Swal.fire({
          title: t('emailLimitReached', 'common'),
          text: errorMessage,
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
      }
      
      // Check for other errors
      if (error?.response?.status === 400) {
        const errorMessage = serverErrorText(error) || t('emailInvalidMsg', 'common');
        
        Swal.fire({
          title: t('emailError', 'common'),
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
      }
    },
  });
}

export function useSendBatchEmail() {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  return useMutation({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mail-logs'] }),
    mutationFn: (payload: { company?: string; batch: EmailPayload[] } | EmailPayload[] | EmailPayload) => {
      // Normalize payload to { company, batch: [...] }.
      const body: { company?: string; batch: EmailPayload[] } =
        Array.isArray(payload)
          ? { batch: payload }
          : 'batch' in payload
            ? { company: payload.company, batch: payload.batch }
            : { batch: [payload] };

      if (!body.company) {
        throw new Error(t('companyRequired', 'common'));
      }

      return axiosInstance.post('/mail', { company: body.company, batch: body.batch.map(({ company: _company, ...item }) => normalizeEmail(item)) }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onError: (error: MailError) => {
      // Check for rate limit error (429 status code)
      if (error?.response?.status === 429) {
        const errorMessage = error?.response?.data?.message ||
          error?.response?.data?.error ||
          t('emailLimitMsg', 'common');

        Swal.fire({
          title: t('emailLimitReached', 'common'),
          text: errorMessage,
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
        return;
      }

      // Check for authentication/authorization errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        Swal.fire({
          title: t('authError', 'common'),
          text: t('authErrorMsg', 'common'),
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
        return;
      }

      // Check for other client errors
      if ((error?.response?.status ?? 0) >= 400 && (error?.response?.status ?? 0) < 500) {
        const errorMessage = serverErrorText(error) || t('emailInvalidMsg', 'common');

        Swal.fire({
          title: t('emailError', 'common'),
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
        return;
      }

      // Server errors
      if ((error?.response?.status ?? 0) >= 500) {
        Swal.fire({
          title: t('serverError', 'common'),
          text: t('serverErrorMsg', 'common'),
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
        return;
      }

      // Network or other errors
      if (error?.code === 'ERR_NETWORK') {
        Swal.fire({
          title: t('networkError', 'common'),
          text: t('networkErrorMsg', 'common'),
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: t('ok', 'common'),
        });
        return;
      }

      // Fallback for any other errors
      Swal.fire({
        title: t('emailError', 'common'),
        text: error?.message || t('unexpectedError', 'common'),
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: t('ok', 'common'),
      });
    },
  });
}