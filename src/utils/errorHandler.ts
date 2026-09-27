/**
 * Centralized error handling utility
 * Extracts detailed validation errors from API responses
 */
import { describeError } from '../lib/userErrors';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  message: string;
  validationErrors?: ValidationError[];
}

/**
 * The message to show the user for any error (API, network or code).
 * Raw server/JS text only comes through when it already reads like a
 * sentence; see lib/userErrors.
 */
export const getErrorMessage = (err: any): string => describeError(err).message;

/**
 * Extract validation errors as structured array
 */
export const getValidationErrors = (err: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Joi validation format
  if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
    err.response.data.details.forEach((detail: any) => {
      errors.push({
        field: detail.path?.join('.') || detail.context?.key || 'unknown',
        message: detail.message || 'Validation failed',
      });
    });
  }

  // express-validator format
  if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
    err.response.data.errors.forEach((e: any) => {
      errors.push({
        field: e.param || e.path || 'unknown',
        message: e.msg || e.message || 'Validation failed',
      });
    });
  }

  return errors;
};

/**
 * Get error response for display
 */
export const getErrorResponse = (err: any): ErrorResponse => {
  return {
    message: getErrorMessage(err),
    validationErrors: getValidationErrors(err),
  };
};

/**
 * Format validation errors for display in forms
 * Returns object with field names as keys and error messages as values
 */
export const formatValidationErrors = (err: any): Record<string, string> => {
  const validationErrors = getValidationErrors(err);
  const formatted: Record<string, string> = {};

  validationErrors.forEach(({ field, message }) => {
    formatted[field] = message;
  });

  return formatted;
};
