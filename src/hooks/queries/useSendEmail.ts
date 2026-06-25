import { useMutation } from '@tanstack/react-query';
import axiosInstance from '../../config/axios';
import Swal from 'sweetalert2';
import { useLocale } from '../../context/LocaleContext';

export function useSendEmail() {
  const { t } = useLocale();

  return useMutation({
    mutationFn: (emailData: {
      company?: string;
      to: string;
      from: string;
      subject: string;
      html: string;
      attachments?: any[];
      metadata?: any;
      applicant?: { _id?: string } | string;
      jobPosition?: string;
    }) => {
      const { text: _ignoredText, ...restEmailData } = emailData as any;

      // Sanitize `from` by removing surrounding angle brackets, then send.
      const payload = {
        ...restEmailData,
        from: typeof emailData.from === 'string' ? emailData.from.replace(/[<>]/g, '') : emailData.from,
        applicant:
          emailData?.applicant &&
          typeof emailData.applicant === 'object' &&
          '_id' in emailData.applicant
            ? emailData.applicant._id
            : emailData?.applicant,
      } as any;

      return axiosInstance.post('/mail', payload);
    },
    onError: (error: any) => {
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
        const errorMessage = error?.response?.data?.message || t('emailInvalidMsg', 'common');
        
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

  return useMutation({
    mutationFn: (payload: { company?: string; batch?: any } | any) => {
      // Normalize payload to { company, batch: [...] }.
      let body: any;
      if (payload && typeof payload === 'object' && Array.isArray(payload.batch)) {
        body = { company: payload.company, batch: payload.batch };
      } else if (Array.isArray(payload)) {
        body = { batch: payload };
      } else {
        body = { batch: [payload] };
      }

      if (!body.company) {
        throw new Error(t('companyRequired', 'common'));
      }

      // Strip surrounding angle brackets from `from` addresses (e.g. "<a@b.com>")
      body.batch = body.batch.map((item: any) => {
        const { text: _ignoredText, ...rest } = item || {};
        return {
          ...rest,
          from: typeof item.from === 'string' ? item.from.replace(/[<>]/g, '') : item.from,
          applicant:
            item?.applicant && typeof item.applicant === 'object' && '_id' in item.applicant
              ? item.applicant._id
              : item?.applicant,
        };
      });

      return axiosInstance.post('/mail', body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onError: (error: any) => {
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
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        const errorMessage = error?.response?.data?.message ||
          error?.response?.data?.error ||
          t('emailInvalidMsg', 'common');

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
      if (error?.response?.status >= 500) {
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