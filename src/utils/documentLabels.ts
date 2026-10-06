// Labels printed in offer / contract documents. Shared by the PDF generators
// and the on-page editors so what is typed is exactly what is printed.

export type DocLang = 'en' | 'ar';

const WORK_TYPE: Record<string, { en: string; ar: string }> = {
  'full-time': { en: 'Full Time', ar: 'دوام كامل' },
  'part-time': { en: 'Part Time', ar: 'دوام جزئي' },
  contract: { en: 'Contract', ar: 'عقد' },
  internship: { en: 'Internship', ar: 'تدريب' },
};

const CONTRACT_TYPE: Record<string, { en: string; ar: string }> = {
  permanent: { en: 'Permanent', ar: 'دائم' },
  'fixed-term': { en: 'Fixed Term', ar: 'محدد المدة' },
  freelance: { en: 'Freelance', ar: 'عمل حر' },
  probation: { en: 'Probation', ar: 'فترة تجربة' },
};

export const workTypeLabel = (value: string | undefined, lang: DocLang) =>
  WORK_TYPE[value ?? '']?.[lang] ?? value ?? '—';

export const contractTypeLabel = (value: string | undefined, lang: DocLang) =>
  CONTRACT_TYPE[value ?? '']?.[lang] ?? value?.replace(/-/g, ' ') ?? '—';

export const WORK_TYPE_VALUES = Object.keys(WORK_TYPE);
export const CONTRACT_TYPE_VALUES = Object.keys(CONTRACT_TYPE);
