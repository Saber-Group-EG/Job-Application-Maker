// pages/promos/promoFormat.ts
// Display helpers shared by the promo pages.
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import type { CompanyName, PromoCode, PromoOwner } from '../../types/promos';
import type { BadgeTone } from './components/PromoUI';

export const HR_ROLE_NAME = 'hr manager';

export const REDEMPTION_STATUS_OPTIONS = [
  { value: 'active', labelKey: 'redemptionsStatusActive' },
  { value: 'expired', labelKey: 'redemptionsStatusExpired' },
  { value: 'revoked', labelKey: 'redemptionsStatusRevoked' },
];

export const isHrUser = (u: { roleId?: { name?: string } } | null | undefined) =>
  String(u?.roleId?.name || '').toLowerCase().trim() === HR_ROLE_NAME;

export const personName = (p: string | PromoOwner | null | undefined): string =>
  p && typeof p === 'object' ? toPlainString(p.fullName || p.name || p.email || '') : '';

export const discountLabel = (c: Pick<PromoCode, 'discountPercent' | 'discountAmountCents'>): string => {
  if (c.discountPercent != null) return `${c.discountPercent}%`;
  if (c.discountAmountCents != null) return formatMoney(c.discountAmountCents);
  return '—';
};

export const commissionLabel = (
  c: Pick<PromoCode, 'commissionPercent' | 'commissionAmountCents'>
): string => {
  const parts: string[] = [];
  if (c.commissionPercent != null) parts.push(`${c.commissionPercent}%`);
  if (c.commissionAmountCents != null) parts.push(formatMoney(c.commissionAmountCents));
  return parts.length ? parts.join(' + ') : '—';
};

export const isExpired = (c: Pick<PromoCode, 'expiresAt'>) =>
  !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

// A code's effective state: switched off, past its expiry, used up, or live.
export const codeState = (
  c: Pick<PromoCode, 'isActive' | 'expiresAt' | 'maxUses' | 'stats'>
): { tone: BadgeTone; labelKey: string } => {
  if (c.isActive === false) return { tone: 'slate', labelKey: 'statusInactive' };
  if (isExpired(c)) return { tone: 'amber', labelKey: 'statusExpired' };
  if (c.maxUses != null && (c.stats?.redemptions ?? 0) >= c.maxUses)
    return { tone: 'amber', labelKey: 'statusUsedUp' };
  return { tone: 'green', labelKey: 'statusActive' };
};

export const redemptionState = (status?: string): { tone: BadgeTone; labelKey: string | null } => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return { tone: 'green', labelKey: 'redemptionsStatusActive' };
    case 'expired':
      return { tone: 'slate', labelKey: 'redemptionsStatusExpired' };
    case 'revoked':
      return { tone: 'red', labelKey: 'redemptionsStatusRevoked' };
    default:
      return { tone: 'slate', labelKey: null };
  }
};

export const commissionState = (status?: string): { tone: BadgeTone; labelKey: string } => {
  switch ((status || '').toLowerCase()) {
    case 'paid':
      return { tone: 'green', labelKey: 'ledgerStatusPaid' };
    case 'void':
      return { tone: 'slate', labelKey: 'ledgerStatusVoid' };
    default:
      return { tone: 'amber', labelKey: 'ledgerStatusPending' };
  }
};

export const companyLabel = (
  company: string | { name?: CompanyName } | null | undefined,
  locale: string
): string => {
  const name = company && typeof company === 'object' ? company.name : undefined;
  if (!name) return '—';
  if (typeof name === 'string') return toPlainString(name);
  return toPlainString(locale === 'ar' ? name.ar || name.en : name.en || name.ar) || '—';
};

const intlLocale = (locale: string) => (locale === 'ar' ? 'ar-EG' : 'en-US');

export const formatDate = (value: string | null | undefined, locale: string): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' });
};

// "2026-09" -> "September 2026".
export const formatPeriod = (key: string | undefined, locale: string): string => {
  if (!key) return '—';
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return toPlainString(key);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};
