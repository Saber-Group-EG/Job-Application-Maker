import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Applicant, Interview, Message, Comment, StatusHistory, ResponseSection, JobSpecItem } from '../types/applicants';
import { toPlainString } from './strings';

const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

const resolveJobTitle = (applicant: Applicant, jobPosition?: any): string => {
  if (jobPosition?.title) return toPlainString(jobPosition.title);
  const jpId = applicant.jobPositionId as any;
  if (jpId && typeof jpId === 'object' && jpId.title) return toPlainString(jpId.title);
  return 'N/A';
};

const resolveCompanyName = (company?: any): string =>
  company ? toPlainString(company.name || company.companyName || 'Company') : 'Company';

const sectionHead = (title: string): string =>
  `<div style="margin:0 0 8px;padding:0 0 4px;border-bottom:2px solid #1a56db;color:#1e3a5f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${esc(title)}</div>`;

const infoRow = (label: string, value: string): string =>
  `<tr><td style="padding:4px 10px;font-weight:600;color:#374151;width:150px;border-bottom:1px solid #e5e7eb;font-size:11px;vertical-align:top;">${label}</td><td style="padding:4px 10px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(value)}</td></tr>`;

const badge = (text: string, bg: string, fg: string): string =>
  `<span style="display:inline-block;padding:1px 7px;border-radius:9px;font-size:10px;font-weight:600;background:${bg};color:${fg};">${esc(text)}</span>`;

const tableHead = (cols: string[]): string =>
  `<thead><tr style="background:#f8fafc;">${cols.map(c => `<th style="padding:5px 8px;text-align:left;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #d1d5db;">${c}</th>`).join('')}</tr></thead>`;

const wrap = (content: string): string =>
  `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#111827;font-size:12px;line-height:1.4;background:#fff;padding:0;width:660px;">${content}</div>`;

const buildPage1Html = (applicant: Applicant, jobPosition?: any, company?: any): string => {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const rows = [
    ['Full Name', applicant.fullName || '—'],
    ['Email', applicant.email || '—'],
    ['Phone', applicant.phone || '—'],
    ['Address', applicant.address || '—'],
    ['Gender', applicant.gender ? applicant.gender.charAt(0).toUpperCase() + applicant.gender.slice(1) : '—'],
    ['Status', applicant.status ? applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1) : '—'],
    ['Source', applicant.source || '—'],
    ['Expected Salary', applicant.expectedSalary || '—'],
    ['Date Applied', formatDate(applicant.submittedAt || applicant.createdAt)],
  ];
  const tableRows = rows.map(([l, v]) => infoRow(l, v)).join('');

  const photoHtml = applicant.profilePhoto
    ? `<div style="text-align:center;margin-bottom:22px;">
        <img src="${esc(applicant.profilePhoto)}" crossorigin="anonymous"
          style="width:170px;height:170px;object-fit:cover;border-radius:50%;border:4px solid #dbeafe;box-shadow:0 4px 14px rgba(0,0,0,0.1);" />
      </div>`
    : '';

  return wrap(`
    <div style="padding:35px 40px 20px;">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #1a56db;">
        <div style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1e3a5f;letter-spacing:-0.01em;">Applicant Profile</div>
        <div style="margin:0 0 2px;font-size:13px;color:#6b7280;">${esc(resolveCompanyName(company))}</div>
        <div style="margin:0;font-size:10px;color:#9ca3af;">Generated ${now}</div>
      </div>

      ${photoHtml}

      <div style="margin-bottom:20px;">
        ${sectionHead('Personal Information')}
        <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      </div>

      <div>
        ${sectionHead('Position Applied For')}
        <table style="width:100%;border-collapse:collapse;"><tbody>
          ${infoRow('Job Title', resolveJobTitle(applicant, jobPosition))}
        </tbody></table>
      </div>
    </div>
  `);
};

const buildTableHtml = (title: string, headers: string[], rows: string): string =>
  wrap(`${sectionHead(title)}<table style="width:100%;border-collapse:collapse;">${tableHead(headers)}<tbody>${rows}</tbody></table>`);

interface SectionImg {
  dataUrl: string;
  heightPx: number;
}

async function renderSection(html: string): Promise<SectionImg> {
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;left:0;top:0;background:#fff;';
  div.innerHTML = html;
  document.body.appendChild(div);
  try {
    const canvas = await html2canvas(div, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    return { dataUrl: canvas.toDataURL('image/png'), heightPx: canvas.height };
  } finally {
    document.body.removeChild(div);
  }
}

export async function generateApplicantPdf(
  applicant: Applicant,
  sections: ResponseSection[],
  jobSpecs: JobSpecItem[],
  jobPosition?: any,
  company?: any,
): Promise<void> {
  const pages: { html: string; label: string }[] = [];

  pages.push({ html: buildPage1Html(applicant, jobPosition, company), label: 'page1' });

  const customRespSection = sections.find(s => s.id === 'applicant_responses' || s.title.toLowerCase().includes('response'));

  if (customRespSection?.questions.length || jobSpecs.length) {
    const parts: string[] = [];

    if (customRespSection?.questions.length) {
      parts.push(sectionHead('Application Responses'));

      const simpleQuestions = customRespSection.questions.filter((q: any) => q.type !== 'group');
      const groupQuestions = customRespSection.questions.filter((q: any) => q.type === 'group');

      if (simpleQuestions.length) {
        const rows = simpleQuestions.map((q: any) => {
          let ans = '';
          switch (q.type) {
            case 'checkbox': ans = q.checked ? 'Yes' : 'No'; break;
            case 'radio':
            case 'dropdown': ans = q.selectedValue || '—'; break;
            case 'tags': ans = Array.isArray(q.values) ? q.values.join(', ') : '—'; break;
            case 'number': ans = q.value !== undefined && q.value !== null ? String(q.value) : '—'; break;
            default: ans = q.value || '—';
          }
          if (!ans || ans === '—') return '';
          return infoRow(q.text || q.label || 'Field', ans);
        }).filter(Boolean).join('');
        if (rows) parts.push(`<table style="width:100%;border-collapse:collapse;">${rows}</table>`);
      }

      groupQuestions.forEach((gq: any) => {
        const groupName = gq.groupName || gq.text || 'Group';
        const subRows = (gq.questions || []).map((sq: any) => {
          let ans = '';
          switch (sq.type) {
            case 'checkbox': ans = sq.checked ? 'Yes' : 'No'; break;
            case 'radio':
            case 'dropdown': ans = sq.selectedValue || '—'; break;
            case 'tags': ans = Array.isArray(sq.values) ? sq.values.join(', ') : '—'; break;
            case 'number': ans = sq.value !== undefined && sq.value !== null ? String(sq.value) : '—'; break;
            default: ans = sq.value || '—';
          }
          if (!ans || ans === '—') return '';
          return infoRow(sq.text || sq.label || 'Field', ans);
        }).filter(Boolean).join('');
        if (!subRows) return;
        parts.push(`
          <div style="padding:5px 8px;background:#f9fafb;border-left:3px solid #93c5fd;border-radius:2px;margin-top:4px;">
            <div style="font-size:11px;font-weight:600;color:#1e40af;margin-bottom:2px;">${esc(groupName)}</div>
            <table style="width:100%;border-collapse:collapse;">${subRows}</table>
          </div>
        `);
      });
    }

    if (jobSpecs.length) {
      const specsRows = jobSpecs.map(s =>
        `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(s.spec.en)}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${s.answer ? badge('Yes', '#dcfce7', '#166534') : badge('No', '#fee2e2', '#991b1b')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${s.weight || 0}</td></tr>`
      ).join('');
      parts.push(`<div style="margin-top:${customRespSection?.questions.length ? 14 : 0}px;">${sectionHead('Job Specifications')}<table style="width:100%;border-collapse:collapse;">${tableHead(['Specification', 'Answer', 'Weight'])}<tbody>${specsRows}</tbody></table></div>`);
    }

    if (parts.length) pages.push({ html: wrap(parts.join('')), label: 'page2' });
  }

  if (applicant.interviews?.length) {
    const stCol: Record<string, [string, string]> = { scheduled: ['#dbeafe', '#1e40af'], in_progress: ['#fef3c7', '#92400e'], completed: ['#dcfce7', '#166534'], cancelled: ['#fee2e2', '#991b1b'] };
    const rows = applicant.interviews.map(iv => {
      const [bg, fg] = stCol[iv.status || 'scheduled'] || ['#f3f4f6', '#374151'];
      return `<tr><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${formatDate(iv.scheduledAt || iv.createdAt)}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${badge((iv.status || 'scheduled').replace('_', ' '), bg, fg)}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${iv.type || '—'}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${iv.achievedScore ?? '—'}/${iv.totalScore ?? '—'}</td></tr>`;
    }).join('');
    pages.push({ html: buildTableHtml(`Interviews (${applicant.interviews.length})`, ['Date', 'Status', 'Type', 'Score'], rows), label: 'interviews' });
  }

  if (applicant.messages?.length) {
    const tl: Record<string, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', internal: 'Note' };
    const rows = applicant.messages.map(m => `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${tl[m.type] || m.type}</td><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(m.subject || '—')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-size:10px;">${formatDate(m.sentAt)}</td></tr>`).join('');
    pages.push({ html: buildTableHtml(`Messages (${applicant.messages.length})`, ['Type', 'Subject', 'Date'], rows), label: 'messages' });
  }

  if (applicant.comments?.length) {
    const rows = applicant.comments.map(c => {
      const author = typeof c.commentedBy === 'object' && c.commentedBy
        ? toPlainString((c.commentedBy as any).fullName || (c.commentedBy as any).name || 'Unknown')
        : typeof c.commentedBy === 'string' ? c.commentedBy : c.author || 'Unknown';
      const tag = c.isInternal
        ? `<span style="display:inline-block;padding:0 4px;border-radius:5px;font-size:8px;font-weight:600;background:#fef3c7;color:#92400e;margin-left:3px;">Internal</span>`
        : '';
      return `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${esc(author)}${tag}</td><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(c.comment || c.text || '')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${formatDate(c.commentedAt || c.changedAt)}</td></tr>`;
    }).join('');
    pages.push({ html: buildTableHtml(`Comments (${applicant.comments.length})`, ['Author', 'Comment', 'Date'], rows), label: 'comments' });
  }

  if (applicant.statusHistory?.length) {
    const stCol: Record<string, [string, string]> = { new: ['#dbeafe', '#1e40af'], screening: ['#e0e7ff', '#3730a3'], interview: ['#fef3c7', '#92400e'], offered: ['#dcfce7', '#166534'], hired: ['#bbf7d0', '#14532d'], rejected: ['#fee2e2', '#991b1b'] };
    const rows = applicant.statusHistory.map(sh => {
      const [bg, fg] = stCol[sh.status?.toLowerCase() || ''] || ['#f3f4f6', '#374151'];
      const reasons = sh.reasons?.length ? `<br/><span style="font-size:9px;color:#6b7280;">Reasons: ${sh.reasons.map(esc).join(', ')}</span>` : '';
      const notes = sh.notes ? `<br/><span style="font-size:9px;color:#6b7280;">${esc(sh.notes)}</span>` : '';
      return `<tr><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${badge(sh.status, bg, fg)}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(sh.changedBy || '—')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${formatDate(sh.changedAt)}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:10px;">${reasons}${notes}</td></tr>`;
    }).join('');
    pages.push({ html: buildTableHtml('Status History', ['Status', 'By', 'Date', 'Details'], rows), label: 'statusHistory' });
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth() - 20;

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    const img = await renderSection(pages[i].html);
    const hMm = (img.heightPx / (660 * 2)) * pageW;
    pdf.addImage(img.dataUrl, 'PNG', 10, 10, pageW, hMm);
  }

  const safeName = (applicant.fullName || 'Applicant').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  pdf.save(`${safeName}_Profile.pdf`);
}
