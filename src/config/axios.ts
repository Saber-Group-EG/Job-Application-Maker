import axios from 'axios';
import { tokenStorage } from './api';
import { emitQuotaEvent } from '../lib/quotaEvents';
import { emitAuthEvent } from '../lib/authEvents';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// The near-limit header is set by trackRequestQuota on both successful and
// blocked (402) responses alike, so both interceptor branches need to check
// it — not just the error branch.
function handleNearLimitHeader(response: any) {
  const header = response?.headers?.['x-quota-near-limit-companies'];
  if (!header) return;
  const companyIds = String(header)
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (companyIds.length > 0) {
    emitQuotaEvent('near-limit-companies', companyIds);
  }
}

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    handleNearLimitHeader(response);
    return response;
  },
  (error) => {
    if (error.response) {
      handleNearLimitHeader(error.response);

      const { data, status } = error.response;

      // Quota exceeded (402) — flip the app-wide blocked state so the
      // layout can render the "contact your admin" screen. Deliberately
      // scoped to 402 only; 403 is also used by unrelated permission
      // checks elsewhere and must not trigger this.
      if (status === 402) {
        emitQuotaEvent('quota-exceeded');
      }
      if (status === 401 && data?.code === 'SESSION_SUPERSEDED') {
        sessionStorage.setItem(
          'authNotice',
          data.message ?? 'Signed in on another device'
        );
        tokenStorage.clearTokens();
        emitAuthEvent(
          'session-superseded',
          data.message ?? 'Signed in on another device'
        );
      }
      // Create a user-friendly error message
      let errorMessage = 'An error occurred';

      // Check for Joi validation errors (details array)
      if (data?.details && Array.isArray(data.details)) {
        errorMessage = data.details
          .map((detail: any) => {
            const field = detail.path?.join('.') || detail.context?.key || '';
            const message = detail.message || '';
            return field ? `${field}: ${message}` : message;
          })
          .join('\n');
      }
      // Check for express-validator errors
      else if (data?.errors && Array.isArray(data.errors)) {
        errorMessage = data.errors
          .map((e: any) => {
            const field = e.param || e.path || '';
            const message = e.msg || e.message || '';
            return field ? `${field}: ${message}` : message;
          })
          .join('\n');
      }
      // Standard error message
      else if (data?.message) {
        errorMessage = data.message;
      }

      // Attach enhanced message to error
      error.message = errorMessage;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
