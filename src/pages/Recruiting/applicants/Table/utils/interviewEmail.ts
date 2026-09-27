// Interview invitation emails for bulk scheduling: the same placeholders
// and layout as the single-applicant invitation (ApplicantDetails).
import { getConnectedGmail } from '../../../../../hooks/useConnectedGmailSender';

export interface InterviewEmailValues {
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: string;
  location: string;
  address: string;
}

const escapeHtml = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const PLACEHOLDERS: [RegExp, keyof InterviewEmailValues][] = [
  [/\{\{\s*candidateName\s*\}\}/gi, 'candidateName'],
  [/\{\{\s*(?:position|jobTitle)\s*\}\}/gi, 'jobTitle'],
  [/\{\{\s*InterviewDate\s*\}\}/gi, 'interviewDate'],
  [/\{\{\s*interviewTime\s*\}\}/gi, 'interviewTime'],
  [/\{\{\s*interviewType\s*\}\}/gi, 'interviewType'],
  [/\{\{\s*location\s*\}\}/gi, 'location'],
  [/\{\{\s*address\s*\}\}/gi, 'address'],
];

/** Replace {{placeholders}}; values are escaped when the text is HTML. */
export function fillInterviewTemplate(text: string, values: InterviewEmailValues, html: boolean): string {
  return PLACEHOLDERS.reduce(
    (out, [pattern, key]) => out.replace(pattern, html ? escapeHtml(values[key]) : values[key]),
    text || ''
  );
}

/** The invitation email: subject as the heading, then the message. */
export function buildInterviewEmailHtml(subject: string, body: string): string {
  const linked = body.replace(/(^|[\s>])((?:https?:\/\/|www\.)[^\s<]+)/gi, (_, lead, url) => {
    const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
    return `${lead}<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline;">${escapeHtml(url)}</a>`;
  });
  const bodyHtml = linked.includes('<')
    ? linked
    : linked
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p style="margin:0 0 12px;color:#444;">${p}</p>`)
        .join('');
  return `<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(subject)}</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; margin: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 24px 30px; text-align: center;">
      <h1 style="color: #111827; margin: 0; font-size: 22px; font-weight: 700;">${escapeHtml(subject)}</h1>
    </div>
    <div style="padding: 30px;"><div style="font-size: 16px; line-height: 1.6; color: #444;">${bodyHtml}</div></div>
  </div>
</body></html>`;
}

/**
 * Sender for the invitations: a connected Gmail always wins (the backend
 * sends as it), then the address picked in the modal, then the company's
 * default sender.
 */
export function resolveInterviewSender(company: any, picked: string): string {
  const mailSettings = company?.settings?.mailSettings || company?.mailSettings || null;
  const gmail = getConnectedGmail(mailSettings);
  if (gmail) return gmail;
  const available: string[] = [...(mailSettings?.availableMails || []), ...(company?.availableMails || [])].filter(
    (m: unknown): m is string => typeof m === 'string' && m.trim().length > 0
  );
  return (picked || mailSettings?.defaultMail || company?.contactEmail || company?.email || available[0] || '').trim();
}

/** Start of the first interview: the form's date and time (local), or now. */
export function bulkInterviewStart(date: string, time: string): Date {
  if (!date) return new Date();
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}
