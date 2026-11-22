// jobOfferPdfGenerator.ts
import { JobOffer } from '../services/jobOffersService';
import { workTypeLabel } from './documentLabels';
import {
  LETTER,
  type LetterKey,
  formatLetterDate,
  formatLetterMoney,
  letterAcceptance,
  letterIntro,
  letterLogoUrl,
  letterText,
} from './offerLetter';

interface JobOfferPDFOptions {
  offer: JobOffer;
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

const renderText = (text: string | { en?: string; ar?: string } | null | undefined, lang: 'ar' | 'en' = 'en'): string => {
  if (!text) return '—';
  if (typeof text === 'string') return text;
  if (lang === 'ar') return text.ar || text.en || '—';
  return text.en || text.ar || '—';
};

export const generateJobOfferPDF = async ({ offer, lang = 'en', companyName = '' }: JobOfferPDFOptions): Promise<string> => {
  const isRTL = lang === 'ar';
  const L = (key: LetterKey) => letterText(key, lang);
  const ink = LETTER.text;
  const accent = LETTER.accent;
  const muted = LETTER.muted;

  const position = renderText(offer.position, lang);
  const workType = workTypeLabel(offer.workType, lang);
  const workHours = renderText(offer.workHours, lang);

  const company = typeof offer.companyId === 'object' && offer.companyId !== null ? (offer.companyId as any) : null;
  const finalCompanyName = companyName || (company ? renderText(company.name, lang) : '');
  const logo = letterLogoUrl(company?.logoPath);

  const applicant = typeof offer.applicantId === 'object' && offer.applicantId !== null ? offer.applicantId : null;
  const applicantName = applicant?.fullName || '';
  const applicantEmail = applicant?.email || '';
  const addressee = applicantName || L('candidatePlaceholder');

  const letterDate = formatLetterDate(offer.sentAt || offer.createdAt || Date.now(), lang);
  const validUntil = offer.expiresAt ? formatLetterDate(offer.expiresAt, lang) : '';

  const sortedSections = [...offer.sections].sort((a, b) => a.displayOrder - b.displayOrder);

  const heading = (text: string) =>
    `<div style="font-size: 10.5pt; font-weight: 700; color: ${accent}; margin: 18px 0 6px;">${escapeHtml(text)}</div>`;
  const row = (label: string, value: string) =>
    `<div style="padding: 2px 0;"><span style="color: ${muted};">${escapeHtml(label)}:</span> <span style="font-weight: 600;">${escapeHtml(value)}</span></div>`;
  const bullets = (items: string[]) =>
    `<ul style="margin: 0; ${isRTL ? 'padding-right' : 'padding-left'}: 18px; list-style: disc;">${items
      .map((i) => `<li style="padding: 2px 0;">${escapeHtml(i)}</li>`)
      .join('')}</ul>`;
  const has = (v: string) => Boolean(v) && v !== '—';

  const detailsHTML = [
    has(position) ? row(L('jobTitle'), position) : '',
    has(workType) ? row(L('employmentType'), workType) : '',
    has(workHours) ? row(L('workingHours'), workHours) : '',
  ].join('');

  const commissionLines = offer.commissions.map((c) => {
    const label = renderText(c.label, lang);
    const condition = renderText(c.condition, lang);
    const value = `${c.value}${c.type === 'percentage' ? '%' : ` ${offer.salary.currency}`}`;
    return `${has(label) ? `${label}: ` : ''}${value}${has(condition) ? ` (${condition})` : ''}`;
  });
  const compensationHTML =
    (offer.salary.basic != null
      ? row(L('basicSalary'), formatLetterMoney(offer.salary.basic, offer.salary.currency, lang))
      : '') +
    (commissionLines.length
      ? `<div style="padding: 2px 0; color: ${muted};">${escapeHtml(L('commission'))}:</div>${bullets(commissionLines)}`
      : '');

  const sectionsHTML = sortedSections
    .filter((s) => s.items.length > 0)
    .map((s) => heading(renderText(s.title, lang)) + bullets(s.items.map((i) => renderText(i, lang))))
    .join('');

  const signLine = `<div style="border-bottom: 1px solid ${ink}; height: 34px; width: 62mm; margin-bottom: 6px;"></div>`;

  const htmlContent = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Offer - ${escapeHtml(position)}</title>
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

        <div style="text-align: center; font-size: 18pt; font-weight: 800; letter-spacing: ${isRTL ? '0' : '2px'}; color: ${accent}; margin-bottom: 22px;">${escapeHtml(L('title'))}</div>

        <div style="color: ${muted};">${escapeHtml(L('to'))}</div>
        <div style="font-weight: 600;">${escapeHtml(addressee)}</div>
        ${applicantEmail ? `<div style="color: ${muted};">${escapeHtml(applicantEmail)}</div>` : ''}

        <div style="margin-top: 18px;">${escapeHtml(L('dear'))} ${escapeHtml(addressee)}${isRTL ? '،' : ','}</div>
        <p style="margin-top: 6px; text-align: justify;">${escapeHtml(letterIntro(has(position) ? position : '', finalCompanyName, lang))}</p>

        ${detailsHTML ? heading(L('positionDetails')) + detailsHTML : ''}
        ${compensationHTML ? heading(L('compensation')) + compensationHTML : ''}
        ${sectionsHTML}

        ${heading(L('acceptance'))}
        <p style="text-align: justify;">${escapeHtml(letterAcceptance(validUntil, lang))}</p>

        <div style="display: flex; justify-content: space-between; gap: 24px; margin-top: 34px; page-break-inside: avoid;">
            <div>
                <div style="margin-bottom: 4px;">${escapeHtml(L('sincerely'))}</div>
                ${signLine}
                <div style="font-weight: 600;">${escapeHtml(finalCompanyName)}</div>
                <div style="color: ${muted}; font-size: 9pt;">${escapeHtml(L('hr'))}</div>
            </div>
            <div>
                <div style="margin-bottom: 4px;">${escapeHtml(L('acceptedBy'))}</div>
                ${signLine}
                <div style="font-weight: 600;">${escapeHtml(addressee)}</div>
                <div style="color: ${muted}; font-size: 9pt;">${escapeHtml(L('date'))} ____________</div>
            </div>
        </div>
    </div>
</body>
</html>`;

  return htmlContent;
};

export const downloadJobOfferPDF = async (htmlContent: string, filename: string): Promise<void> => {
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

export const downloadJobOfferAsPdf = async (offer: JobOffer, lang: 'ar' | 'en' = 'en', companyName?: string): Promise<void> => {
  const htmlContent = await generateJobOfferPDF({ offer, lang, companyName });
  const safeName = renderText(offer.position, lang).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `job_offer_${safeName}.pdf`;
  await downloadJobOfferPDF(htmlContent, filename);
};