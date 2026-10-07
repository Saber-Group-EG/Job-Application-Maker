import { toSlug } from './strings';

// Public application form (careers page). Override per deployment.
const CAREERS_BASE_URL = (
  import.meta.env.VITE_CAREERS_BASE_URL || 'https://form.sabergroup-eg.com'
).replace(/\/$/, '');

export interface ShareSource {
  /** Stored on the applicant as `source.channel` (lowercase). */
  value: string;
  label: string;
}

export const SHARE_SOURCES: ShareSource[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'wuzzuf', label: 'Wuzzuf' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'bayt', label: 'Bayt' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'x', label: 'X (Twitter)' },
];

/**
 * Public URL of a job's application page, optionally tagged with where it
 * will be posted (`?source=`), which the form records on each applicant.
 */
export const buildJobLink = (job: any, source?: string): string => {
  const companySlug = job?.companyId?.slug || toSlug(job?.companyId?.name, 'en');
  const jobSlug = job?.slug || toSlug(job?.title, 'en');
  const url = `${CAREERS_BASE_URL}/${companySlug}/${jobSlug}`;
  return source ? `${url}?source=${encodeURIComponent(source)}` : url;
};

/** Display name for a stored source channel, e.g. "linkedin" -> "LinkedIn". */
export const formatSourceLabel = (channel?: string | null): string => {
  const value = String(channel || '').trim().toLowerCase();
  if (!value) return '';
  const known = SHARE_SOURCES.find((source) => source.value === value);
  if (known) return known.label;
  return value.charAt(0).toUpperCase() + value.slice(1);
};
