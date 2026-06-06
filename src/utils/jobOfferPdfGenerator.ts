// jobOfferPdfGenerator.ts
import { JobOffer } from '../services/jobOffersService';

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

const formatDateLocale = (date?: string | number, lang: 'ar' | 'en' = 'en') => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

export const generateJobOfferPDF = async ({ offer, lang = 'en', companyName = '' }: JobOfferPDFOptions): Promise<string> => {
  const isRTL = lang === 'ar';
  const generatedDate = formatDateLocale(new Date().toISOString(), lang);

  const position = renderText(offer.position, lang);
  const workType = renderText(offer.workType, lang);
  const workHours = renderText(offer.workHours, lang);
  const notes = renderText(offer.notes, lang);

  // Get company name from offer if not provided
  let finalCompanyName = companyName;
  if (!finalCompanyName) {
    if (typeof offer.companyId === 'object' && offer.companyId !== null) {
      finalCompanyName = renderText((offer.companyId as any).name, lang);
    } else {
      finalCompanyName = lang === 'ar' ? 'الشركة' : 'Company';
    }
  }

  const applicantName = typeof offer.applicantId === 'object' && offer.applicantId !== null ? offer.applicantId.fullName : null;
  const applicantEmail = typeof offer.applicantId === 'object' && offer.applicantId !== null ? offer.applicantId.email : null;

  const createdAt = offer.createdAt ? formatDateLocale(offer.createdAt, lang) : '';
  const sentAt = offer.sentAt ? formatDateLocale(offer.sentAt, lang) : '';
  const validUntil = offer.expiresAt ? formatDateLocale(offer.expiresAt, lang) : '';

  const sortedSections = [...offer.sections].sort((a, b) => a.displayOrder - b.displayOrder);

  const getStatusInfo = () => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: lang === 'ar' ? 'مسودة' : 'Draft', color: '#64748b', bg: '#f1f5f9' },
      sent: { label: lang === 'ar' ? 'مرسل' : 'Sent', color: '#3b82f6', bg: '#eff6ff' },
      accepted: { label: lang === 'ar' ? 'مقبول' : 'Accepted', color: '#10b981', bg: '#f0fdf4' },
      rejected: { label: lang === 'ar' ? 'مرفوض' : 'Rejected', color: '#ef4444', bg: '#fef2f2' },
      expired: { label: lang === 'ar' ? 'منتهي' : 'Expired', color: '#f59e0b', bg: '#fffbeb' },
    };
    return statusMap[offer.status] || statusMap.draft;
  };

  const statusInfo = getStatusInfo();

  // Build commissions HTML with RTL support
  let commissionsHTML = '';
  if (offer.commissions.length > 0) {
    commissionsHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt;"><thead><tr>';
    if (isRTL) {
      commissionsHTML += `<th style="background: #242B32; color: white; padding: 10px 8px; font-weight: 700; font-size: 10pt; border: 1px solid #1a1f24; text-align: center;">${lang === 'ar' ? 'القيمة' : 'Value'}</th>`;
      commissionsHTML += `<th style="background: #242B32; color: white; padding: 10px 8px; font-weight: 700; font-size: 10pt; border: 1px solid #1a1f24; text-align: center;">${lang === 'ar' ? 'العمولة' : 'Commission'}</th>`;
    } 
    commissionsHTML += '<tr></thead><tbody>';
    
    for (const commission of offer.commissions) {
      const label = renderText(commission.label, lang);
      const condition = renderText(commission.condition, lang);
      const commissionValue = commission.value;
      const commissionType = commission.type;
      
      commissionsHTML += '<tr>';
      if (isRTL) {
        commissionsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align: center; font-weight: 700; color: #059669;">${commissionValue}${commissionType === 'percentage' ? '%' : ` ${offer.salary.currency}`}</td>`;
        commissionsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0; text-align: center;"><strong>${escapeHtml(label)}</strong>`;
        if (condition && condition !== '—') {
          commissionsHTML += `<div style="font-size: 8pt; color: #666; margin-top: 4px;">📌 ${escapeHtml(condition)}</div>`;
        }
        commissionsHTML += `</td>`;
      } else {
        commissionsHTML += `<td style="padding: 10px 8px; border-bottom: 1px solid #e0e0e0;"><strong>${escapeHtml(label)}</strong>`;
        if (condition && condition !== '—') {
          commissionsHTML += `<div style="font-size: 8pt; color: #666; margin-top: 4px;">📌 ${escapeHtml(condition)}</div>`;
        }
        commissionsHTML += `</td>`;
        commissionsHTML += `<td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e0e0e0; font-weight: 700; color: #059669;">${commissionValue}${commissionType === 'percentage' ? '%' : ` ${offer.salary.currency}`}</td>`;
      }
      commissionsHTML += '</tr>';
    }
    commissionsHTML += '</tbody></table>';
  } else {
    commissionsHTML = `<div style="text-align: center; padding: 20px; color: #999;">${lang === 'ar' ? 'لا توجد عمولات محددة' : 'No commission structure defined'}</div>`;
  }

  // Build sections HTML with RTL support
  let sectionsHTML = '';
  if (sortedSections.length > 0) {
    for (const section of sortedSections) {
      const sectionTitle = renderText(section.title, lang);
      if (section.items.length === 0) continue;

      let itemsHTML = '';
      for (const item of section.items) {
        const itemText = renderText(item, lang);
        itemsHTML += `
          <div style="display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
            <span style="color: #4caf50; font-weight: bold;">✓</span>
            <span style="flex: 1; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(itemText)}</span>
          </div>
        `;
      }

      sectionsHTML += `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 10pt; font-weight: 700; color: #242B32; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(sectionTitle)}</div>
          <div style="${isRTL ? 'padding-right: 15px;' : 'padding-left: 15px;'}">${itemsHTML}</div>
        </div>
      `;
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Offer - ${escapeHtml(position)}</title>
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
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <!-- Header -->
        <div style="background: #242B32; color: white; padding: 15px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-radius: 4px; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
            <div style="font-size: 12pt; font-weight: 700;">${escapeHtml(finalCompanyName)}</div>
            <div style="text-align: ${isRTL ? 'left' : 'right'};">
                <div style="font-size: 14pt; font-weight: 800;">${lang === 'ar' ? 'عرض وظيفي' : 'JOB OFFER'}</div>
                <div style="font-size: 9pt; opacity: 0.9; margin-top: 4px;">${escapeHtml(generatedDate)}</div>
            </div>
        </div>

        <!-- Title -->
        <div style="font-size: 16pt; font-weight: 700; text-align: center; margin: 20px 0; color: #181D21;">
            ${escapeHtml(position)}
            <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 9pt; font-weight: 600; background: ${statusInfo.bg}; color: ${statusInfo.color}; ${isRTL ? 'margin-right: 10px;' : 'margin-left: 10px;'}">${statusInfo.label}</span>
        </div>

        <!-- Applicant Info -->
        ${applicantName ? `
        <div style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 15px; margin: 15px 0;">
            <div style="font-size: 10pt; font-weight: 700; margin-bottom: 5px; color: #555; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'المرشح' : 'Candidate'}</div>
            <div style="font-size: 11pt; color: #333; font-weight: 500; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(applicantName)}</div>
            ${applicantEmail ? `<div style="font-size: 9pt; color: #666; margin-top: 4px; ${isRTL ? 'text-align: right;' : ''}">${escapeHtml(applicantEmail)}</div>` : ''}
        </div>
        ` : ''}

        <!-- Offer Details -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; margin: 15px 0; padding: 15px; background: #fafafa; border-radius: 4px; border: 1px solid #e0e0e0;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'نوع العمل' : 'Work Type'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(workType)}</span>
            </div>
            ${workHours && workHours !== '—' ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'ساعات العمل' : 'Work Hours'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(workHours)}</span>
            </div>
            ` : ''}
            ${offer.salary.basic != null ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</span>
                <span style="font-size: 11pt; font-weight: 700; color: #059669;">${formatCurrency(offer.salary.basic, offer.salary.currency, lang)}</span>
            </div>
            ` : ''}
            ${createdAt ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'تاريخ الإنشاء' : 'Date Created'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(createdAt)}</span>
            </div>
            ` : ''}
            ${sentAt ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; ${isRTL ? 'flex-direction: row-reverse;' : ''}">
                <span style="font-weight: 600; color: #666; font-size: 9pt;">${lang === 'ar' ? 'تاريخ الإرسال' : 'Date Sent'}</span>
                <span style="font-weight: 500; color: #333; font-size: 10pt;">${escapeHtml(sentAt)}</span>
            </div>
            ` : ''}
        </div>

        <!-- Commission Structure -->
        ${offer.commissions.length > 0 ? `
        <div style="margin: 20px 0;">
            <div style="font-size: 11pt; font-weight: 700; color: #242B32; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'هيكل العمولات' : 'Commission Structure'}</div>
            ${commissionsHTML}
        </div>
        ` : ''}

        <!-- Additional Sections -->
        ${sectionsHTML ? `
        <div style="margin: 20px 0;">
            <div style="font-size: 11pt; font-weight: 700; color: #242B32; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #242B32; ${isRTL ? 'text-align: right;' : ''}">${lang === 'ar' ? 'تفاصيل إضافية' : 'Additional Details'}</div>
            ${sectionsHTML}
        </div>
        ` : ''}

        <!-- Validity -->
        ${validUntil ? `
        <div style="margin: 20px 0; padding: 10px 15px; background: #fff3e0; border-radius: 4px; text-align: center; font-size: 9pt; border: 1px solid #ffe0b2;">
            <strong style="color: #e65100;">${lang === 'ar' ? 'صالح حتى:' : 'Valid Until:'}</strong> ${escapeHtml(validUntil)}
        </div>
        ` : ''}

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