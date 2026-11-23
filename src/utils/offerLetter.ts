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

export const letterIntro = (
  position: string,
  company: string,
  lang: DocLang
) => {
  const p = position || (lang === 'ar' ? '[المسمى الوظيفي]' : '[position]');
  const c = company || (lang === 'ar' ? 'شركتنا' : 'our company');
  return lang === 'ar'
    ? `يسعدنا أن نعرض عليك وظيفة ${p} في ${c}. لقد أُعجبنا بمؤهلاتك ويسعدنا انضمامك إلى فريقنا. نوضح فيما يلي تفاصيل هذا العرض.`
    : `We are pleased to offer you the position of ${p} at ${c}. We were impressed with your qualifications and are excited to welcome you to our team. The details of this offer are set out below.`;
};

export const letterAcceptance = (validUntil: string, lang: DocLang) =>
  lang === 'ar'
    ? `${validUntil ? `هذا العرض ساري حتى ${validUntil}. ` : ''}يرجى تأكيد قبولك لهذا العرض بالتوقيع أدناه وإعادة نسخة من هذا الخطاب إلينا.`
    : `${validUntil ? `This offer is valid until ${validUntil}. ` : ''}Please confirm your acceptance of this offer by signing below and returning a copy of this letter to us.`;

export const contractIntro = (
  company: string,
  employee: string,
  position: string,
  lang: DocLang
) => {
  const c = company || (lang === 'ar' ? 'الشركة' : 'the Company');
  const e = employee || letterText('employeePlaceholder', lang);
  const p = position || (lang === 'ar' ? '[المسمى الوظيفي]' : '[position]');
  return lang === 'ar'
    ? `تم إبرام عقد العمل هذا بين ${c} ("الشركة") و${e} ("الموظف"). توافق الشركة على تعيين الموظف في وظيفة ${p} وفقاً للشروط والأحكام الموضحة أدناه.`
    : `This employment contract is made between ${c} (the "Company") and ${e} (the "Employee"). The Company agrees to employ the Employee as ${p} on the terms and conditions set out below.`;
};

export const contractAgreement = (lang: DocLang) =>
  lang === 'ar'
    ? 'بالتوقيع أدناه، يقر الطرفان بأنهما قد قرآ هذا العقد ويوافقان على جميع شروطه وأحكامه.'
    : 'By signing below, both parties confirm that they have read this contract and agree to all of its terms and conditions.';

export const formatLetterDate =(date: Date | string | number, lang: DocLang) => {
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
