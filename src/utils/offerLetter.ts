// Wording and look of the printed job offer letter. Shared by the on-page
// editor (JobOffersModal) and the PDF generator (jobOfferPdfGenerator) so the
// sheet you type on is the letter that prints.

import type { DocLang } from './documentLabels';

export const LETTER = {
  accent: '#1f3a5f',
  text: '#1f2937',
  muted: '#6b7280',
  rule: '#d1d5db',
  font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontAr: "'Segoe UI', 'Tahoma', Arial, sans-serif",
  padding: '16mm 18mm',
} as const;

const T = {
  title: { en: 'JOB OFFER LETTER', ar: 'خطاب عرض وظيفي' },
  to: { en: 'To:', ar: 'إلى:' },
  date: { en: 'Date:', ar: 'التاريخ:' },
  candidatePlaceholder: { en: '[Candidate name]', ar: '[اسم المرشح]' },
  dear: { en: 'Dear', ar: 'عزيزي/عزيزتي' },
  positionDetails: { en: 'Position Details', ar: 'تفاصيل الوظيفة' },
  jobTitle: { en: 'Job Title', ar: 'المسمى الوظيفي' },
  department: { en: 'Department', ar: 'القسم' },
  departmentPlaceholder: { en: 'e.g. Sales', ar: 'مثال: المبيعات' },
  reportingTo: { en: 'Reporting To', ar: 'يتبع إلى' },
  reportingToPlaceholder: { en: 'e.g. Sales Director', ar: 'مثال: مدير المبيعات' },
  employmentType: { en: 'Employment Type', ar: 'نوع التوظيف' },
  workingHours: { en: 'Working Hours', ar: 'ساعات العمل' },
  compensation: { en: 'Compensation', ar: 'الراتب والمزايا' },
  basicSalary: { en: 'Basic Salary', ar: 'الراتب الأساسي' },
  commission: { en: 'Commission', ar: 'العمولة' },
  acceptance: { en: 'Acceptance', ar: 'قبول العرض' },
  sincerely: { en: 'Sincerely,', ar: 'مع خالص التحية،' },
  hr: { en: 'Human Resources', ar: 'إدارة الموارد البشرية' },
  acceptedBy: { en: 'Accepted by', ar: 'قبول المرشح' },
  signature: { en: 'Signature', ar: 'التوقيع' },
  // Employment contract
  contractTitle: { en: 'EMPLOYMENT CONTRACT', ar: 'عقد عمل' },
  employee: { en: 'Employee:', ar: 'الموظف:' },
  employeePlaceholder: { en: '[Employee name]', ar: '[اسم الموظف]' },
  employmentDetails: { en: 'Employment Details', ar: 'تفاصيل التوظيف' },
  contractType: { en: 'Contract Type', ar: 'نوع العقد' },
  startDate: { en: 'Start Date', ar: 'تاريخ البدء' },
  endDate: { en: 'End Date', ar: 'تاريخ الانتهاء' },
  probation: { en: 'Probation Period', ar: 'فترة التجربة' },
  months: { en: 'month(s)', ar: 'شهر' },
  compensationBenefits: { en: 'Compensation & Benefits', ar: 'الراتب والمزايا' },
  benefits: { en: 'Benefits', ar: 'المزايا' },
  agreement: { en: 'Agreement', ar: 'الإقرار' },
  forCompany: { en: 'For the Company', ar: 'عن الشركة' },
  authorizedSignatory: { en: 'Authorized Signatory', ar: 'المفوض بالتوقيع' },
  employeeSignature: { en: 'Employee', ar: 'الموظف' },
} satisfies Record<string, Record<DocLang, string>>;

export type LetterKey = keyof typeof T;
export const letterText = (key: LetterKey, lang: DocLang) => T[key][lang];

// ─── Editable offer paragraphs ───────────────────────────────────────────────
// The greeting, opening and acceptance paragraphs are saved as text the user
// can change. {name}, {position}, {company} and {validUntil} in that text are
// filled in when the letter is shown or printed, so a template or a bulk offer
// still reads right for each applicant. Empty text means the default below.

export const LETTER_PLACEHOLDERS = ['name', 'position', 'company', 'validUntil'] as const;
export type LetterVars = Partial<Record<(typeof LETTER_PLACEHOLDERS)[number], string>>;

export const fillLetter = (raw: string, vars: LetterVars) =>
  raw.replace(/\{(\w+)\}/g, (m, k: string) => vars[k as keyof LetterVars] ?? m);

export const letterVars = (
  v: { name?: string; position?: string; company?: string; validUntil?: string },
  lang: DocLang
): LetterVars => ({
  name: v.name || letterText('candidatePlaceholder', lang),
  position: v.position || (lang === 'ar' ? '[المسمى الوظيفي]' : '[position]'),
  company: v.company || (lang === 'ar' ? 'شركتنا' : 'our company'),
  validUntil: v.validUntil || (lang === 'ar' ? '[تاريخ انتهاء العرض]' : '[valid until date]'),
});

export const defaultGreeting = (lang: DocLang) =>
  lang === 'ar' ? 'عزيزي/عزيزتي {name}،' : 'Dear {name},';

export const defaultIntro = (lang: DocLang) =>
  lang === 'ar'
    ? 'يسعدنا أن نعرض عليك وظيفة {position} في {company}. لقد أُعجبنا بمؤهلاتك ويسعدنا انضمامك إلى فريقنا. نوضح فيما يلي تفاصيل هذا العرض.'
    : 'We are pleased to offer you the position of {position} at {company}. We were impressed with your qualifications and are excited to welcome you to our team. The details of this offer are set out below.';

export const defaultAcceptance = (hasValidUntil: boolean, lang: DocLang) =>
  lang === 'ar'
    ? `${hasValidUntil ? 'هذا العرض ساري حتى {validUntil}. ' : ''}يرجى تأكيد قبولك لهذا العرض بالتوقيع أدناه وإعادة نسخة من هذا الخطاب إلينا.`
    : `${hasValidUntil ? 'This offer is valid until {validUntil}. ' : ''}Please confirm your acceptance of this offer by signing below and returning a copy of this letter to us.`;

/** The saved text in this language, or the default when there is none. */
export const letterParagraph = (
  saved: { en?: string; ar?: string } | null | undefined,
  fallback: string,
  lang: DocLang
) => (saved?.[lang]?.trim() ? (saved[lang] as string) : fallback);

// Contract paragraphs: same idea as the offer's (saved text, empty = default,
// {name}, {position} and {company} filled in when shown or printed).
export const defaultContractIntro = (lang: DocLang) =>
  lang === 'ar'
    ? 'تم إبرام عقد العمل هذا بين {company} ("الشركة") و{name} ("الموظف"). توافق الشركة على تعيين الموظف في وظيفة {position} وفقاً للشروط والأحكام الموضحة أدناه.'
    : 'This employment contract is made between {company} (the "Company") and {name} (the "Employee"). The Company agrees to employ the Employee as {position} on the terms and conditions set out below.';

export const defaultContractAgreement = (lang: DocLang) =>
  lang === 'ar'
    ? 'بالتوقيع أدناه، يقر الطرفان بأنهما قد قرآ هذا العقد ويوافقان على جميع شروطه وأحكامه.'
    : 'By signing below, both parties confirm that they have read this contract and agree to all of its terms and conditions.';

export const formatLetterDate = (date: Date | string | number, lang: DocLang) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatLetterMoney = (
  amount: number,
  currency: string,
  lang: DocLang
) => {
  const n = amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  return lang === 'ar' ? `${n} ${currency}` : `${currency} ${n}`;
};

/** Cloudinary logos come in full size; ask for a print-sized one. */
export const letterLogoUrl = (logoPath?: string) =>
  logoPath ? logoPath.replace('/upload/', '/upload/h_160/') : '';
