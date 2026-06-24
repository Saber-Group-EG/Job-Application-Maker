// contractPdfGenerator.ts
import { JobContract, BilingualField } from '../services/contractsService';

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

const formatDateLocale = (date?: string | null, lang: 'ar' | 'en' = 'en') => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(date);
  }
};

const formatCurrency = (amount: number, currency: string, lang: 'ar' | 'en'): string => {
  const formattedAmount = amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  if (lang === 'ar') return `${formattedAmount} ${currency}`;
  return `${currency} ${formattedAmount}`;
};

export const generateContractPDF = async ({ contract, lang = 'en', companyName = '' }: ContractPDFOptions): Promise<string> => {
  const isRTL = lang === 'ar';
  const generatedDate = formatDateLocale(new Date().toISOString(), lang);

  // Get company name from contract if not provided
  let finalCompanyName = companyName;
  if (!finalCompanyName) {
    if (typeof contract.companyId === 'object' && contract.companyId !== null) {
      finalCompanyName = pick((contract.companyId as any).name, lang);
    } else {
      finalCompanyName = lang === 'ar' ? 'الشركة' : 'Company';
    }
  }

  const applicantName = typeof contract.applicantId === 'object' && contract.applicantId !== null
    ? contract.applicantId.fullName
    : null;
  const applicantEmail = typeof contract.applicantId === 'object' && contract.applicantId !== null
    ? contract.applicantId.email
    : null;

  const position = pick(contract.position, lang);
  const contractType = contract.contractType?.replace(/-/g, ' ') || '—';
  const startDate = formatDateLocale(contract.startDate, lang);
  const endDate = formatDateLocale(contract.endDate, lang);
  const probationPeriod = contract.probationPeriod;
  const notes = pick(contract.notes, lang);

  const sortedSections = [...(contract.sections || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Build benefits HTML - Fix table headers for RTL
  let benefitsHTML = '';
  if (contract.benefits && contract.benefits.length > 0) {
    benefitsHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt;"><thead><tr>';
    if (isRTL) {
      // For RTL: Value column first (right), then Benefit column (left)
      benefitsHTML += `<th style="background: #242B32; color: white; padding: 10px 8px; font-weight: 700; font-size: 10pt; border: 1px solid #1a1f24; text-align: center;">${lang === 'ar' ? 'القيمة' : 'Value'}</th>`;
      benefitsHTML += `<th style="background: #242B32; color: white; padding: 10px 8px; font-weight: 700; font-size: 10pt; border: 1px solid #1a1f24; text-align: center;">${lang === 'ar' ? 'الميزة' : 'Benefit'}</th>`;
    } 
    benefitsHTML += '</tr></thead><tbody>';
    
    for (const benefit of contract.benefits) {
      const label = pick(benefit.label, lang);
      const value = pick(benefit.value, lang);
      benefitsHTML += '<tr>';
      if (isRTL) {
        // For RTL: Value first, then Benefit
        benefitsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align: center; font-weight: 500;">${escapeHtml(value)}</td>`;
        benefitsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align: center;"><strong>${escapeHtml(label)}</strong></td>`;
      } else {
        // For LTR: Benefit first, then Value
        benefitsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0;"><strong>${escapeHtml(label)}</strong></td>`;
        benefitsHTML += `<td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e0e0e0; font-weight: 500;">${escapeHtml(value)}</td>`;
      }
      benefitsHTML += '</tr>';
    }
    benefitsHTML += '</tbody></table>';
  } else {
    benefitsHTML = `<div style="text-align: center; padding: 20px; color: #999;">${lang === 'ar' ? 'لا توجد مزايا محددة' : 'No benefits defined'}</div>`;
  }

  // Build sections HTML (This is the CONTRACT TERMS / Terms and Conditions)
  let sectionsHTML = '';
  if (sortedSections.length > 0) {
    for (const section of sortedSections) {
      const sectionTitle = pick(section.title, lang);
      if (!section.items || section.items.length === 0) continue;

      let itemsHTML = '';
      for (const item of section.items) {
        const itemText = pick(item, lang);
        if (!itemText || itemText === '—') continue;
        itemsHTML += `
          <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
            <span style="color: #4caf50; font-weight: bold; font-size: 11pt;">✓</span>
            <span style="flex: 1; font-size: 10pt; color: #334155; line-height: 1.5; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(itemText)}</span>
          </div>
        `;
      }

      if (itemsHTML) {
        sectionsHTML += `
          <div style="margin-bottom: 24px; break-inside: avoid; page-break-inside: avoid;">
            <div style="font-size: 11pt; font-weight: 700; color: #242B32; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(sectionTitle)}</div>
            <div style="${isRTL ? 'padding-right: 8px; padding-left: 0;' : 'padding-left: 8px;'}">${itemsHTML}</div>
          </div>
        `;
      }
    }
  }
  
  if (!sectionsHTML) {
    sectionsHTML = `<div style="text-align: center; padding: 20px; color: #999;">${lang === 'ar' ? 'لا توجد بنود محددة' : 'No terms and conditions defined'}</div>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Contract - ${escapeHtml(position)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: ${isRTL ? "'Segoe UI', 'Tahoma', Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"};
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
            padding: 0;
            margin: 0;
            background: white;
            direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        .pdf-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 12mm 10mm;
            direction: ${isRTL ? 'rtl' : 'ltr'};
        }
        ${isRTL ? `
        .header-left {
            order: 2;
        }
        .header-right {
            order: 1;
        }
        .info-item {
            flex-direction: row-reverse;
        }
        .notes-section {
            border-left: none !important;
            border-right: 4px solid #ff9800 !important;
        }
        ` : ''}
        @media print {
            body {
                padding: 0;
                margin: 0;
            }
            .page-break {
                page-break-before: always;
            }
            .avoid-break {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <!-- Header -->
        <div style="background: #242B32; color: white; padding: 15px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-radius: 4px; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
            <div style="font-size: 12pt; font-weight: 700;">${escapeHtml(finalCompanyName)}</div>
            <div style="text-align: ${isRTL ? 'left' : 'right'};">
                <div style="font-size: 14pt; font-weight: 800;">${lang === 'ar' ? 'عقد عمل' : 'JOB CONTRACT'}</div>
                <div style="font-size: 9pt; opacity: 0.9; margin-top: 4px;">${escapeHtml(generatedDate)}</div>
            </div>
        </div>

        <!-- Title -->
        <div style="font-size: 16pt; font-weight: 700; text-align: center; margin: 20px 0; color: #181D21;">
            ${escapeHtml(position)}
        </div>

        <!-- Applicant Info -->
        ${applicantName ? `
        <div style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 15px; margin: 15px 0;">
            <div style="font-size: 10pt; font-weight: 700; margin-bottom: 5px; color: #555; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'المرشح' : 'Candidate'}</div>
            <div style="font-size: 11pt; color: #333; font-weight: 500; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(applicantName)}</div>
            ${applicantEmail ? `<div style="font-size: 9pt; color: #666; margin-top: 4px; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(applicantEmail)}</div>` : ''}
        </div>
        ` : ''}

        <!-- Contract Details -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; margin: 15px 0; padding: 15px; background: #fafafa; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'نوع العقد' : 'Contract Type'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(contractType)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(startDate)}</span>
            </div>
            ${endDate && endDate !== '—' ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(endDate)}</span>
            </div>
            ` : ''}
            ${probationPeriod != null && probationPeriod > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'فترة التجربة' : 'Probation Period'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${probationPeriod} ${lang === 'ar' ? 'شهر' : 'month'}${probationPeriod !== 1 ? (lang === 'ar' ? 'ات' : 's') : ''}</span>
            </div>
            ` : ''}
            ${contract.salary && contract.salary.basic != null ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</span>
                <span style="font-size: 11pt; font-weight: 700; color: #059669;">${formatCurrency(contract.salary.basic, contract.salary.currency, lang)}</span>
            </div>
            ` : ''}
        </div>

        <!-- Benefits -->
        ${contract.benefits && contract.benefits.length > 0 ? `
        <div style="margin: 20px 0;">
            <div style="font-size: 11pt; font-weight: 700; color: #242B32; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'المزايا' : 'Benefits'}</div>
            ${benefitsHTML}
        </div>
        ` : ''}

        <!-- Contract Terms & Conditions (Sections) -->
        <div style="margin: 20px 0;">
            <div style="font-size: 11pt; font-weight: 700; color: #242B32; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'بنود العقد والشروط' : 'Contract Terms & Conditions'}</div>
            ${sectionsHTML}
        </div>

        <!-- Notes -->
        ${notes && notes !== '—' ? `
        <div style="margin: 20px 0; padding: 12px 15px; background: #fff8e1; ${isRTL ? 'border-right: 4px solid #ff9800; border-left: none;' : 'border-left: 4px solid #ff9800;'} border-radius: 4px;">
            <div style="font-size: 10pt; font-weight: 700; margin-bottom: 6px; color: #ff9800; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'ملاحظات:' : 'Notes:'}</div>
            <div style="font-size: 9pt; color: #555; white-space: pre-wrap; word-break: break-word; line-height: 1.5; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(notes).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #e0e0e0; padding-top: 15px;">
            ${lang === 'ar' ? 'شكراً لثقتكم بنا' : 'Thank you for your business'}
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