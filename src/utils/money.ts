// utils/money.ts
// All money values coming from the promo/commission API are in cents.
// Display through formatMoney() and parse user input with parseMoneyToCents() —
// never show or submit a raw cents value directly.

export function formatMoney(cents: number, currency = 'EGP') {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function parseMoneyToCents(input: string | number): number {
  if (input === '' || input === null || input === undefined) return 0;
  if (typeof input === 'number') return Math.round(input * 100);

  const cleaned = String(input).replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}