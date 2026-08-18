import type { FieldType, BilingualString, BilingualChoice } from './fieldTypes';

// Re-export for convenient access
export type { FieldType, BilingualString, BilingualChoice } from './fieldTypes';

export type FieldValidation = {
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
};

export type RecommendedField = {
  fieldId: string;
  label: BilingualString;
  inputType: FieldType;
  isRequired: boolean;
  choices?: BilingualChoice[];
  minValue?: number;
  maxValue?: number;
  defaultValue?: string;
  order?: number;
  description?: BilingualString;
  // Support grouped sub-fields (API may return groupFields or subFields)
  groupFields?: Array<{
    fieldId?: string;
    label: BilingualString;
    inputType: FieldType;
    isRequired?: boolean;
    choices?: BilingualChoice[];
    order?: number;
    defaultValue?: string;
    minValue?: number;
    maxValue?: number;
  }>;
  // Some responses might use `subFields` instead of `groupFields`
  subFields?: Array<{
    fieldId?: string;
    label: BilingualString;
    inputType: FieldType;
    isRequired?: boolean;
    choices?: BilingualChoice[];
    order?: number;
    defaultValue?: string;
    minValue?: number;
    maxValue?: number;
  }>;
};

export type CreateRecommendedFieldRequest = {
  fieldId: string;
  label: BilingualString;
  inputType: FieldType;
  isRequired: boolean;
  order?: number;
  choices?: BilingualChoice[];
  minValue?: number;
  maxValue?: number;
  defaultValue?: string;
};

export type UpdateRecommendedFieldRequest = {
  label?: BilingualString;
  inputType?: FieldType;
  isRequired?: boolean;
  choices?: BilingualChoice[];
  minValue?: number;
  maxValue?: number;
  defaultValue?: string;
  order?: number;
};

export interface CompanyUsageRow {
  companyId: string;
  companyName: { en: string; ar: string };
  companyLogo: string | null;
  planName: string;
  subscriptionStatus: string;
  requestQuota: { used: number; limit: number };
  aiCredits: { used: number; limit: number };
  aiEnabled: boolean;
  featureToggles: Record<string, boolean>;
}

export interface UsageOverviewResponse {
  data: CompanyUsageRow[];
  page: number;
  limit: number;
}

// types/SystemSettings.ts
export interface CompanyUsageDetail {
  subscription?: {
    companyId?: {
      name: { en: string; ar: string };
    };
    planName?: string;
    status?: string;
  };
  requestUsage?: {
    count: number;
    limit?: number;
  };
  aiUsage?: {
    currentUsage: number;
    compedCredits?: number;
    limit?: number;
  };
  aiSettings?: {
    featureToggles?: Record<string, boolean>;
    enabled?: boolean;
  };
}