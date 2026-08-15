// types/companies.ts

import type { Applicant } from './applicants';

export type CompanyStatus = {
  _id?: string;
  id?: string;
  name: string;
  color: string;
  textColor?: string;
  description?: string;
  isDefault?: boolean;
  statusKey?: string;
};

export type SectionTemplateItem = {
  _id?: string;
  en: string;
  ar: string;
};

export type SectionTemplate = {
  _id?: string;
  category: string;
  title: { en: string; ar: string };
  items: SectionTemplateItem[];
  displayOrder?: number;
};

export type CompanySet = {
  leadModal: {
    visibleFields: { field: Applicant; defaultValue: any }[];
    requiredFields: Applicant[];
  };
  leadTable?: {
    visibleColumns: string[];
  };
  statuses?: CompanyStatus[];
  _id?: string;
  company: string;
  mailSettings?: MailSettings;
};

export interface Company {
  _id: string;
  name: string | { en: string; ar: string };
  address?: string | Array<{ en: string; ar: string; location: string }>;
  industry?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  logoPath?: string;
  isActive?: boolean;
  description?: string | { en: string; ar: string };
  createdAt?: string;
  __v?: number;
  settings?: CompanySet;
}

export interface CreateCompanyRequest {
  name: { en: string; ar: string };
  description?: { en: string; ar: string };
  contactEmail: string;
  phone?: string;
  address?: Array<{ en: string; ar: string; location: string }>;
  website?: string;
  logoPath?: string;
}

export interface UpdateCompanyRequest {
  name?: { en: string; ar: string };
  description?: { en: string; ar: string };
  contactEmail?: string;
  phone?: string;
  address?: Array<{ en: string; ar: string; location: string }>;
  website?: string;
  logoPath?: string;
  isActive?: boolean;
}

export interface MailSettings {
  availableMails?: string[];
  defaultMail?: string | null;
  companyDomain?: string | null;
  resendApiKey?: string | null;
  sendApplicantDataMail?: boolean;
  webhookSecret?: string | null;
  applicantEmailTemplate?: {
    subject?: string;
    html?: string;
  };
  emailTemplates?: EmailTemplate[];
}

export interface EmailTemplate {
  _id?: string;
  name: string;
  subject: string;
  html: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interview Settings Types
export type InterviewAnswerType =
  | 'text'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'tags';

export interface ChoiceItem {
  label: string;
  score: number;
}

export function normalizeChoices(choices: unknown): ChoiceItem[] {
  if (!Array.isArray(choices)) return [];
  return choices
    .map((c: unknown) => {
      if (typeof c === 'string') return { label: c, score: 0 } as ChoiceItem;
      if (c && typeof c === 'object') {
        const obj = c as Record<string, unknown>;
        return {
          label: String(obj.label ?? obj.text ?? obj.en ?? obj.ar ?? ''),
          score: Number(obj.score) || 0,
        } as ChoiceItem;
      }
      return { label: String(c ?? ''), score: 0 } as ChoiceItem;
    })
    .filter((c) => c.label !== '');
}

export function normalizeChoicesToServer(choices: unknown): { text: string; score: number }[] {
  if (!Array.isArray(choices)) return [];
  return choices
    .map((c: unknown) => {
      if (typeof c === 'string') return { text: c, score: 0 };
      if (c && typeof c === 'object') {
        const obj = c as Record<string, unknown>;
        return {
          text: String(obj.label ?? obj.text ?? obj.en ?? obj.ar ?? ''),
          score: Number(obj.score) || 0,
        };
      }
      return { text: String(c ?? ''), score: 0 };
    })
    .filter((c) => c.text !== '');
}

export interface InterviewQuestion {
  question: string;
  score: number;
  answerType: InterviewAnswerType;
  choices?: ChoiceItem[];
  tags?: string[];
}

export interface InterviewGroup {
  name: string;
  questions: InterviewQuestion[];
}

export interface InterviewSettings {
  groups: InterviewGroup[];
}

// Company Settings Types
export interface UpdateCompanySettingsRequest {
  mailSettings?: Partial<MailSettings>;
  interviewSettings?: InterviewSettings;
  defaultColorGradient?: string[];
  rejectReasons?: string[];
  applicantStatus?: any[];
  statuses?: any[];
  applicantPages?: any[];
}

export type UpdateInterviewSettingsRequest = {
  interviewSettings: {
    groups: InterviewGroup[];
  };
};

export interface UpdateRejectionReasonsRequest {
  rejectReasons: string[];
}

export interface UpdateApplicantPagesRequest {
  applicantPages: any[];
}

// Company Response Types
export interface CompanyResponse {
  success?: boolean;
  data?: Company;
  company?: Company;
}

export interface CompaniesResponse {
  success: boolean;
  data: Company[];
}

export interface Plan {
  _id: string;
  name: string;
  priceCents: number;
  currency: string;
  requestQuota: number;
  frequency: number;
  isActive: boolean;
}

export interface SubscriptionUsage {
  used: number;
  baseLimit: number;
  bonusQuota: number;
  effectiveLimit: number;
  remaining: number;
  percentUsed: number;
  nearLimit: boolean;
}

export interface SubscriptionDetails {
  subscription: CompanySubscriptionInfo;
  plan: Plan;
  pendingPlan: Plan | null;
  upgradeInProgressPlan: Plan | null;
  usage: SubscriptionUsage;
}

export interface CompanySubscriptionInfo {
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  startedAt: string;
  lastPaymentAt: string;
  currentCycleAmountCents: number;
}

export type ChangePlanResponse =
  | { queued: true; effectiveAt: string | null }
  | { success: true; charged: true }
  | { checkoutUrl: string };

export interface SubscriptionCard {
  id: number; // pass this to delete/change-primary — never the `token`
  maskedPan: string;
  isPrimary: boolean;
  failedAttempts: number;
  createdAt: string;
}

export interface TransactionRecord {
  _id: string;
  companyId: string;
  subscriptionId: string;
  type: 'signup' | 'renewal' | 'upgrade' | 'downgrade' | 'topup';
  status: 'paid' | 'failed';
  amountCents: number;
  currency: string;
  metadata: Record<string, any>;
  paymobTransactionId: string | null;
  paymobOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface EmailDraftResult {
  subject: string;
  body: string;
}
