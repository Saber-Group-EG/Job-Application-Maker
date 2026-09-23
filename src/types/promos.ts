// types/promos.ts
// Promo-code & HR commission domain types.
// All money fields from the API are in cents.

export interface PromoStats {
  redemptions: number;
  activeRedemptions: number;
  commissionPaidCents: number;
  commissionPendingCents: number;
}

export interface PromoOwner {
  _id: string;
  email?: string;
  fullName?: string;
  name?: string;
}

export interface PromoCode {
  _id: string;
  code: string;
  ownerUserId?: string | PromoOwner; // populated with { _id, fullName, email }
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  discountCycles?: number | null;
  commissionPercent?: number | null;
  commissionAmountCents?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
  notes?: string | null;
  stats?: PromoStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoPlanRef {
  _id: string;
  name?: string;
  priceCents?: number;
  currency?: string;
}

export type CompanyName = string | { en: string; ar: string };

export interface PromoRedemption {
  _id: string;
  promoCodeId: string | { _id: string; code?: string; ownerUserId?: string | PromoOwner };
  hrUserId?: string | PromoOwner;
  companyId?: string | { _id: string; name?: CompanyName };
  subscriptionId?: string | Record<string, unknown>;
  planId?: string | PromoPlanRef;
  // Discount snapshot taken at redemption time — exactly one is set.
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  discountCyclesTotal?: number;
  discountCyclesUsed?: number;
  commissionPercent?: number | null;
  commissionAmountCents?: number | null;
  status?: string; // backend enum: 'active' | 'expired' | 'revoked'
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PromoCommissionStatus = 'pending' | 'paid' | 'void';

export interface PromoCommission {
  _id: string;
  promoCodeId?: string | { _id?: string; code?: string };
  companyId?: string | { _id: string; name?: CompanyName };
  subscriptionId?: string | Record<string, unknown>;
  transactionId?: string | Record<string, unknown>;
  hrUserId?: string | PromoOwner; // populated with { _id, fullName, email }
  billingPeriodKey?: string; // 'YYYY-MM'
  amountCents?: number;
  currency?: string;
  status?: PromoCommissionStatus;
  paidAt?: string | null;
  paidBy?: string | PromoOwner;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoCodeListEnvelope {
  data: PromoCode[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface MyPromoCodesEnvelope extends PromoCodeListEnvelope {
  summary: {
    totalCents: number;
    pendingCents: number;
    paidCents: number;
    cycles: number;
  };
}

export interface PromoRedemptionListEnvelope {
  data: PromoRedemption[];
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
}

export interface PromoCommissionListEnvelope {
  data: PromoCommission[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// #5 commission report — rows are per-HR per-month totals.
export interface PromoCommissionReportRow {
  hrUserId: string;
  hrName?: string;
  hrEmail?: string;
  cycles?: number;
  totalCents?: number;
  pendingCents?: number;
  paidCents?: number;
  byStatus?: Array<{ status: string; totalCents: number }>;
}

export interface PromoCommissionReportTotals {
  totalCents?: number;
  pendingCents?: number;
  paidCents?: number;
}

export interface PromoCommissionReport {
  month: string | null;
  rows: PromoCommissionReportRow[];
  totals: PromoCommissionReportTotals;
}

// #11 my-ledger — grouped { byMonth, summary, recent }.
export interface MyCommissionByMonthRow {
  _id: { billingPeriodKey: string; status: string };
  totalCents?: number;
  cycles?: number;
}

export interface MyCommissionSummaryRow {
  _id: string; // status key: 'pending' | 'paid' | 'void'
  totalCents?: number;
  cycles?: number;
}

export interface MyCommissionRecentRow {
  _id: string;
  billingPeriodKey?: string;
  amountCents?: number;
  currency?: string;
  status?: string;
  paidAt?: string | null;
  createdAt?: string;
  promoCodeId?: string | { _id?: string; code?: string };
  companyId?: string | { _id: string; name?: CompanyName };
}

export interface MyCommissionLedger {
  byMonth: MyCommissionByMonthRow[];
  summary: MyCommissionSummaryRow[];
  recent: MyCommissionRecentRow[];
}

// Create/update payload. Admin create (#1) requires ownerUserId. Update (#4)
// ignores `code`/`ownerUserId` (backend allow-list) — send them only on create.
export interface PromoCodePayload {
  code?: string;
  ownerUserId?: string;
  discountPercent?: number | null;
  discountAmountCents?: number | null;
  discountCycles?: number | null;
  commissionPercent?: number | null;
  commissionAmountCents?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface SettleCommissionsPayload {
  month: string;
  hrUserId?: string;
}

export interface SettleCommissionsResult {
  month: string;
  matched: number;
  paid: number;
}