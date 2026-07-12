import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Applicant, ResponseSection, JobSpecItem } from '../types/applicants';
import { toPlainString } from './strings';

const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (dateStr?: string, locale?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

const tOpt = (key: string, ns: string, t?: (key: string, ns?: string, params?: Record<string, string | number>) => string): string =>
  t ? t(key, ns) : key;

const buildPage1Html = (
  applicant: Applicant,
  jobPosition?: any,
  company?: any,
  t?: (key: string, ns?: string, params?: Record<string, string | number>) => string,
  locale?: string
): string => {
  const now = new Date().toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const genderLabel = applicant.gender
    ? tOpt(applicant.gender.toLowerCase(), 'personalInfo', t)
    : '—';
  const statusLabel = applicant.status
    ? tOpt(applicant.status.toLowerCase(), 'applicants', t)
    : '—';
  const rows = [
    [tOpt('fullName', 'personalInfo', t), applicant.fullName || '—'],
    [tOpt('email', 'personalInfo', t), applicant.email || '—'],
    [tOpt('phone', 'personalInfo', t), applicant.phone || '—'],
    [tOpt('address', 'personalInfo', t), applicant.address || '—'],
    [tOpt('gender', 'personalInfo', t), genderLabel],
    [tOpt('status', 'applicants', t), statusLabel],
    [tOpt('source', 'personalInfo', t), applicant.source || '—'],
    [tOpt('expectedSalary', 'personalInfo', t), applicant.expectedSalary || '—'],
    [tOpt('dateApplied', 'personalInfo', t), formatDate(applicant.submittedAt || applicant.createdAt, locale)],
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
        <div style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1e3a5f;letter-spacing:-0.01em;">${tOpt('applicantProfile', 'personalInfo', t)}</div>
        <div style="margin:0 0 2px;font-size:13px;color:#6b7280;">${esc(resolveCompanyName(company))}</div>
        <div style="margin:0;font-size:10px;color:#9ca3af;">${tOpt('generated', 'personalInfo', t)} ${now}</div>
      </div>

      ${photoHtml}

      <div style="margin-bottom:20px;">
        ${sectionHead(tOpt('personalInformation', 'personalInfo', t))}
        <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      </div>

      <div>
        ${sectionHead(tOpt('positionAppliedFor', 'personalInfo', t))}
        <table style="width:100%;border-collapse:collapse;"><tbody>
          ${infoRow(tOpt('jobTitle', 'personalInfo', t), resolveJobTitle(applicant, jobPosition))}
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
  div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:660px;background:#fff;pointer-events:none;';
  div.innerHTML = html;
  document.body.appendChild(div);
  try {
    const canvas = await html2canvas(div, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
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
  t?: (key: string, ns?: string, params?: Record<string, string | number>) => string,
  locale?: string,
): Promise<void> {
  const pages: { html: string; label: string }[] = [];

  pages.push({ html: buildPage1Html(applicant, jobPosition, company, t, locale), label: 'page1' });

  const customRespSection = sections.find(s => s.id === 'applicant_responses' || s.title.toLowerCase().includes('response'));

  if (customRespSection?.questions.length || jobSpecs.length) {
    const parts: string[] = [];

    if (customRespSection?.questions.length) {
      parts.push(sectionHead(t ? t('applicationResponses', 'personalInfo') : 'Application Responses'));

      const simpleQuestions = customRespSection.questions.filter((q: any) => q.type !== 'group');
      const groupQuestions = customRespSection.questions.filter((q: any) => q.type === 'group');

      if (simpleQuestions.length) {
        const rows = simpleQuestions.map((q: any) => {
          let ans = '';
          switch (q.type) {
            case 'checkbox': ans = q.checked ? (t ? t('yes', 'personalInfo') : 'Yes') : (t ? t('no', 'personalInfo') : 'No'); break;
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
            case 'checkbox': ans = sq.checked ? (t ? t('yes', 'personalInfo') : 'Yes') : (t ? t('no', 'personalInfo') : 'No'); break;
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
      const yesLabel = t ? t('yes', 'personalInfo') : 'Yes';
      const noLabel = t ? t('no', 'personalInfo') : 'No';
      const specsRows = jobSpecs.map(s =>
        `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(s.spec.en)}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${s.answer ? badge(yesLabel, '#dcfce7', '#166534') : badge(noLabel, '#fee2e2', '#991b1b')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${s.weight || 0}</td></tr>`
      ).join('');
      const specLabel = t ? t('specification', 'personalInfo') : 'Specification';
      const ansLabel = t ? t('answer', 'personalInfo') : 'Answer';
      const wgtLabel = t ? t('weight', 'personalInfo') : 'Weight';
      parts.push(`<div style="margin-top:${customRespSection?.questions.length ? 14 : 0}px;">${sectionHead(t ? t('jobSpecifications', 'personalInfo') : 'Job Specifications')}<table style="width:100%;border-collapse:collapse;">${tableHead([specLabel, ansLabel, wgtLabel])}<tbody>${specsRows}</tbody></table></div>`);
    }

    if (parts.length) pages.push({ html: wrap(parts.join('')), label: 'page2' });
  }

  if (applicant.interviews?.length) {
    const stCol: Record<string, [string, string]> = { scheduled: ['#dbeafe', '#1e40af'], in_progress: ['#fef3c7', '#92400e'], completed: ['#dcfce7', '#166534'], cancelled: ['#fee2e2', '#991b1b'] };
    const rows = applicant.interviews.map(iv => {
      const [bg, fg] = stCol[iv.status || 'scheduled'] || ['#f3f4f6', '#374151'];
      return `<tr><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${formatDate(iv.scheduledAt || iv.createdAt, locale)}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${badge((iv.status || 'scheduled').replace('_', ' '), bg, fg)}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${iv.type || '—'}</td><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px;">${iv.achievedScore ?? '—'}/${iv.totalScore ?? '—'}</td></tr>`;
    }).join('');
    const ivTitle = `${t ? t('interviews', 'personalInfo') : 'Interviews'} (${applicant.interviews.length})`;
    const ivDate = t ? t('date', 'personalInfo') : 'Date';
    const ivStatus = t ? t('status', 'applicants') : 'Status';
    const ivType = t ? t('type', 'modals') : 'Type';
    const ivScore = t ? t('score', 'personalInfo') : 'Score';
    pages.push({ html: buildTableHtml(ivTitle, [ivDate, ivStatus, ivType, ivScore], rows), label: 'interviews' });
  }

  if (applicant.messages?.length) {
    const tl: Record<string, string> = {
      email: t ? t('email', 'modals') : 'Email',
      sms: t ? t('sms', 'modals') : 'SMS',
      whatsapp: t ? t('whatsapp', 'modals') : 'WhatsApp',
      internal: t ? t('note', 'personalInfo') : 'Note',
    };
    const rows = applicant.messages.map(m => `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:11px;">${tl[m.type] || m.type}</td><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(m.subject || '—')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-size:10px;">${formatDate(m.sentAt, locale)}</td></tr>`).join('');
    const msgTitle = `${t ? t('messages', 'personalInfo') : 'Messages'} (${applicant.messages.length})`;
    const msgType = t ? t('type', 'modals') : 'Type';
    const msgSubject = t ? t('subject', 'personalInfo') : 'Subject';
    const msgDate = t ? t('date', 'personalInfo') : 'Date';
    pages.push({ html: buildTableHtml(msgTitle, [msgType, msgSubject, msgDate], rows), label: 'messages' });
  }

  if (applicant.comments?.length) {
    const unknownLabel = 'Unknown';
    const internalLabel = t ? t('internal', 'activity') : 'Internal';
    const rows = applicant.comments.map(c => {
      const author = typeof c.commentedBy === 'object' && c.commentedBy
        ? toPlainString((c.commentedBy as any).fullName || (c.commentedBy as any).name || unknownLabel)
        : typeof c.commentedBy === 'string' ? c.commentedBy : c.author || unknownLabel;
      const tag = c.isInternal
        ? `<span style="display:inline-block;padding:0 4px;border-radius:5px;font-size:8px;font-weight:600;background:#fef3c7;color:#92400e;margin-left:3px;">${internalLabel}</span>`
        : '';
      return `<tr><td style="padding:5px 8px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${esc(author)}${tag}</td><td style="padding:5px 8px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:11px;">${esc(c.comment || c.text || '')}</td><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #e5e7eb;font-size:10px;white-space:nowrap;">${formatDate(c.commentedAt || c.changedAt, locale)}</td></tr>`;
    }).join('');
    const cmtTitle = `${t ? t('comments', 'personalInfo') : 'Comments'} (${applicant.comments.length})`;
    const cmtAuthor = t ? t('author', 'personalInfo') : 'Author';
    const cmtComment = t ? t('comment', 'personalInfo') : 'Comment';
    const cmtDate = t ? t('date', 'personalInfo') : 'Date';
    pages.push({ html: buildTableHtml(cmtTitle, [cmtAuthor, cmtComment, cmtDate], rows), label: 'comments' });
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
