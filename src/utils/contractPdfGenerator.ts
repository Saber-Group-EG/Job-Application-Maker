// contractPdfGenerator.ts
import { JobContract, BilingualField } from '../services/contractsService';
import { contractTypeLabel } from './documentLabels';
import {
  LETTER,
  type LetterKey,
  defaultContractAgreement,
  defaultContractIntro,
  fillLetter,
  letterParagraph,
  letterVars,
  formatLetterDate,
  formatLetterMoney,
  letterLogoUrl,
  letterText,
} from './offerLetter';

interface ContractPDFOptions {
  contract: JobContract;
  lang?: 'ar' | 'en';
  companyName?: string;
}

const escapeHtml = (text: any) => {
  if (text === null || text === undefined) return '';
  const s = String(text);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const pick = (field: BilingualField | string | null | undefined, lang: 'ar' | 'en'): string => {
  if (!field) return '—';
  if (typeof field === 'string') return field;
  if (lang === 'ar') return field.ar || field.en || '—';
  return field.en || field.ar || '—';
};

export const generateContractPDF = async ({ contract, lang = 'en', companyName = '' }: ContractPDFOptions): Promise<string> => {
  const isRTL = lang === 'ar';
  const L = (key: LetterKey) => letterText(key, lang);
  const ink = LETTER.text;
  const accent = LETTER.accent;
  const muted = LETTER.muted;
  const has = (v: string) => Boolean(v) && v !== '—';

  const company = typeof contract.companyId === 'object' && contract.companyId !== null ? (contract.companyId as any) : null;
  const finalCompanyName = companyName || (company ? pick(company.name, lang) : '');
  const logo = letterLogoUrl(company?.logoPath);

  const applicant = typeof contract.applicantId === 'object' && contract.applicantId !== null ? contract.applicantId : null;
  const employeeName = applicant?.fullName || '';
  const employee = employeeName || L('employeePlaceholder');

  const position = pick(contract.position, lang);
  const department = pick(contract.department, lang);
  const reportingTo = pick(contract.reportingTo, lang);
  const contractType = contractTypeLabel(contract.contractType, lang);
  const startDate = contract.startDate ? formatLetterDate(contract.startDate, lang) : '';
  const endDate = contract.endDate ? formatLetterDate(contract.endDate, lang) : '';
  const probation = contract.probationPeriod;
  const letterDate = formatLetterDate((contract as any).sentAt || (contract as any).createdAt || Date.now(), lang);

  // Opening and agreement: the text saved on the contract (or the default
  // wording), with {name}, {position} and {company} filled in.
  const vars = letterVars({ name: employee, position: has(position) ? position : '', company: finalCompanyName }, lang);
  const paragraph = (saved: { en?: string; ar?: string } | null | undefined, fallback: string) =>
    fillLetter(letterParagraph(saved, fallback, lang), vars);

  const heading = (text: string) =>
    `<div style="font-size: 10.5pt; font-weight: 700; color: ${accent}; margin: 18px 0 6px;">${escapeHtml(text)}</div>`;
  const row = (label: string, value: string) =>
    `<div style="padding: 2px 0;"><span style="color: ${muted};">${escapeHtml(label)}:</span> <span style="font-weight: 600;">${escapeHtml(value)}</span></div>`;
  const bullets = (items: string[]) =>
    `<ul style="margin: 0; ${isRTL ? 'padding-right' : 'padding-left'}: 18px; list-style: disc;">${items
      .map((i) => `<li style="padding: 2px 0;">${escapeHtml(i)}</li>`)
      .join('')}</ul>`;

  const detailsHTML = [
    has(position) ? row(L('jobTitle'), position) : '',
    has(department) ? row(L('department'), department) : '',
    has(reportingTo) ? row(L('reportingTo'), reportingTo) : '',
    has(contractType) ? row(L('contractType'), contractType) : '',
    startDate ? row(L('startDate'), startDate) : '',
    endDate ? row(L('endDate'), endDate) : '',
    probation != null && probation > 0 ? row(L('probation'), `${probation} ${L('months')}`) : '',
  ].join('');

  const benefitLines = (contract.benefits || [])
    .map((b) => {
      const label = pick(b.label, lang);
      const value = pick(b.value, lang);
      if (!has(label) && !has(value)) return '';
      return has(value) ? `${has(label) ? `${label}: ` : ''}${value}` : label;
    })
    .filter(Boolean);
  const compensationHTML =
    (contract.salary && contract.salary.basic != null
      ? row(L('basicSalary'), formatLetterMoney(contract.salary.basic, contract.salary.currency, lang))
      : '') +
    (benefitLines.length
      ? `<div style="padding: 2px 0; color: ${muted};">${escapeHtml(L('benefits'))}:</div>${bullets(benefitLines)}`
      : '');

  // Compensation prints where it was placed among the sections in the editor.
  const sortedSections = [...(contract.sections || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const blocks = sortedSections.map((s) => {
    const items = (s.items || []).map((i) => pick(i, lang)).filter(has);
    return items.length ? heading(pick(s.title, lang)) + bullets(items) : '';
  });
  const compensationAt = Math.min(Math.max(contract.compensationOrder ?? 0, 0), blocks.length);
  blocks.splice(compensationAt, 0, compensationHTML ? heading(L('compensationBenefits')) + compensationHTML : '');
  const bodyHTML = blocks.join('');

  const signLine = `<div style="border-bottom: 1px solid ${ink}; height: 34px; width: 62mm; margin-bottom: 6px;"></div>`;

  const htmlContent = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employment Contract - ${escapeHtml(position)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; }
        .pdf-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: ${LETTER.padding};
            direction: ${isRTL ? 'rtl' : 'ltr'};
            text-align: start;
            font-family: ${isRTL ? LETTER.fontAr : LETTER.font};
            font-size: 10pt;
            line-height: 1.6;
            color: ${ink};
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                ${logo ? `<img src="${escapeHtml(logo)}" crossorigin="anonymous" alt="" style="height: 44px; width: auto; object-fit: contain;" />` : ''}
                <div style="font-size: 13pt; font-weight: 700; color: ${accent};">${escapeHtml(finalCompanyName)}</div>
            </div>
            <div style="font-size: 9pt; color: ${muted}; text-align: end;">${escapeHtml(letterDate)}</div>
        </div>
        <div style="border-bottom: 2px solid ${accent}; margin: 14px 0 22px;"></div>

        <div style="text-align: center; font-size: 18pt; font-weight: 800; letter-spacing: ${isRTL ? '0' : '2px'}; color: ${accent}; margin-bottom: 22px;">${escapeHtml(L('contractTitle'))}</div>

        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(paragraph(contract.intro, defaultContractIntro(lang)))}</p>

        ${detailsHTML ? heading(L('employmentDetails')) + detailsHTML : ''}
        ${bodyHTML}

        ${heading(L('agreement'))}
        <p style="text-align: justify; white-space: pre-wrap;">${escapeHtml(paragraph(contract.agreement, defaultContractAgreement(lang)))}</p>

        <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 34px; page-break-inside: avoid;">
            <div>
                <div style="margin-bottom: 4px;">${escapeHtml(L('forCompany'))}</div>
                ${signLine}
                <div style="font-weight: 600;">${escapeHtml(finalCompanyName)}</div>
                <div style="color: ${muted}; font-size: 9pt;">${escapeHtml(L('date'))} ____________</div>
            </div>
            <div>
                <div style="margin-bottom: 4px;">${escapeHtml(L('employeeSignature'))}</div>
                ${signLine}
                <div style="font-weight: 600;">${escapeHtml(employee)}</div>
                <div style="color: ${muted}; font-size: 9pt;">${escapeHtml(L('date'))} ____________</div>
            </div>
        </div>
    </div>
</body>
</html>`;

  return htmlContent;
};

export const downloadContractPDF = async (htmlContent: string, filename: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.zIndex = '-9999';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument!;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        await new Promise<void>((r) => setTimeout(r, 800));

        const element = iframeDoc.querySelector('.pdf-container') as HTMLElement;
        if (!element) throw new Error('PDF container not found');

        const html2pdfModule: any = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;

        const opt = {
          margin: [0.2, 0.2, 0.2, 0.2] as [number, number, number, number],
          filename,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            letterRendering: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: element.scrollWidth,
            dpi: 300,
          },
          jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait',
          },
        };

        await html2pdf().set(opt).from(element).save();
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(iframe);
      }
    };

    iframe.src = 'about:blank';
  });
};

export const downloadContractAsPdf = async (contract: JobContract, lang: 'ar' | 'en' = 'en', companyName?: string): Promise<void> => {
  const htmlContent = await generateContractPDF({ contract, lang, companyName });
  const safeName = pick(contract.position, lang).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `job_contract_${safeName}.pdf`;
  await downloadContractPDF(htmlContent, filename);
};