// types/mail.ts — mail history (sent mail and applicant replies).

export type MailDirection = 'outbound' | 'inbound';

// Stored statuses, grouped the way the API filters them (failed includes
// complained; see backend controllers/email.controller.js).
export type MailStatusKey =
  | 'sent'
  | 'delivery_delayed'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'received';

export interface MailAttachment {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  // null when the file was too large to keep.
  key: string | null;
}

export interface MailApplicantRef {
  _id: string;
  fullName?: string;
  email?: string;
  jobPositionId?: string;
}

export interface MailJobPositionRef {
  _id: string;
  title?: { en?: string; ar?: string } | string;
}

export interface MailRecord {
  _id: string;
  company: string;
  sentBy?: string;
  direction?: MailDirection;
  provider?: 'resend' | 'gmail';
  to: string;
  from: string;
  subject: string;
  html: string;
  // Populated by the list endpoints; null = an unassigned reply.
  applicant: MailApplicantRef | string | null;
  jobPosition: MailJobPositionRef | string | null;
  resendEmailId?: string | null;
  messageId?: string | null;
  status: string;
  receivedAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  bouncedAt?: string | null;
  complainedAt?: string | null;
  attachments?: MailAttachment[];
  webhookEvents?: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}

export interface MailListParams {
  page?: number;
  limit?: number;
  companyId?: string;
  direction?: MailDirection;
  status?: MailStatusKey[];
  jobPosition?: string;
  applicant?: string;
  unassigned?: boolean;
  marked?: boolean;
  q?: string;
}

export interface MailListResponse {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  data: MailRecord[];
}

export interface MailCounts {
  all: number;
  outbound: number;
  inbound: number;
  unassigned: number;
  marked: number;
  status: Record<MailStatusKey, number>;
}

export interface MailReplyPayload {
  html: string;
  subject?: string;
  from?: string;
}

export interface MailAssignSuggestion {
  _id: string;
  fullName: string;
  email: string;
  submittedAt?: string;
  jobPositionId?: MailJobPositionRef | null;
}
