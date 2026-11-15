// Lets applicants know they missed their interview, right after they are moved
// to the company's no-show status: the "Missed interview" WhatsApp update
// and/or an email, chosen in the Change Status window (one applicant or many).
import { applicantsService } from '../services/applicantsService';
import { getErrorMessage } from './errorHandler';
import {
  buildInterviewEmailHtml,
  fillInterviewTemplate,
  resolveInterviewSender,
} from '../pages/Recruiting/applicants/Table/utils/interviewEmail';

export type NoShowNotifyChoice = {
  whatsapp: boolean;
  email: boolean;
  subject: string;
  body: string;
};

export type NoShowRecipient = {
  applicantId: string;
  name: string;
  email?: string;
  jobTitle?: string;
  jobPositionId?: string;
};

export type NoShowNotifyResult = {
  waSent: number;
  waFailed: number;
  waError: string;
  emailSent: number;
  emailError: string;
};

type SendBatch = (payload: { company: string; batch: any[] }) => Promise<unknown>;

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function sendNoShowNotices({
  recipients,
  choice,
  company,
  companyId,
  sendBatch,
}: {
  recipients: NoShowRecipient[];
  choice: NoShowNotifyChoice;
  company: any;
  companyId?: string | null;
  sendBatch: SendBatch;
}): Promise<NoShowNotifyResult> {
  const result: NoShowNotifyResult = { waSent: 0, waFailed: 0, waError: '', emailSent: 0, emailError: '' };

  if (choice.whatsapp) {
    // One at a time: each is its own message, and errors are per applicant.
    for (const r of recipients) {
      try {
        await applicantsService.sendWhatsAppUpdate(r.applicantId, 'interviewMissed');
        result.waSent += 1;
      } catch (err) {
        result.waFailed += 1;
        if (!result.waError) result.waError = getErrorMessage(err);
      }
    }
  }

  if (choice.email) {
    const withEmail = recipients.filter((r) => r.email);
    if (!companyId) {
      result.emailError = 'No company';
    } else if (withEmail.length) {
      const from = resolveInterviewSender(company, '');
      const values = (r: NoShowRecipient) => ({
        candidateName: r.name,
        jobTitle: r.jobTitle || '',
        interviewDate: '',
        interviewTime: '',
        interviewType: '',
        location: '',
        address: '',
      });
      const batch = withEmail.map((r) => {
        const subject = fillInterviewTemplate(choice.subject, values(r), false);
        const body = fillInterviewTemplate(choice.body, values(r), false);
        return {
          to: r.email,
          ...(from ? { from } : {}),
          subject,
          html: buildInterviewEmailHtml(subject, escapeHtml(body)),
          applicant: r.applicantId,
          ...(r.jobPositionId ? { jobPosition: r.jobPositionId } : {}),
        };
      });
      try {
        await sendBatch({ company: String(companyId), batch });
        result.emailSent = batch.length;
        // Show it in each applicant's messages, like other sent emails.
        await Promise.allSettled(
          batch.map((e) =>
            applicantsService.sendMessage(e.applicant, {
              type: 'email',
              content: `<h2 style="color:#333; margin-bottom:10px;">Subject: ${escapeHtml(e.subject)}</h2><hr style="margin:10px 0;"/>${e.html}`,
            } as any)
          )
        );
      } catch (err) {
        result.emailError = getErrorMessage(err);
      }
    }
  }
  return result;
}

/** One line per channel for the confirmation after the status change. */
export function describeNoShowNotify(
  result: NoShowNotifyResult,
  choice: NoShowNotifyChoice,
  t: (key: string, ns?: string, params?: Record<string, string | number>) => string
): { text: string; ok: boolean } {
  const lines: string[] = [];
  let ok = true;
  if (choice.whatsapp) {
    lines.push(t('noShowNotifyWaResult', 'modals', { sent: result.waSent, failed: result.waFailed }));
    if (result.waError) {
      ok = false;
      lines.push(result.waError);
    }
  }
  if (choice.email) {
    if (result.emailError) {
      ok = false;
      lines.push(t('noShowNotifyEmailFailed', 'modals', { error: result.emailError }));
    } else {
      lines.push(t('noShowNotifyEmailResult', 'modals', { sent: result.emailSent }));
    }
  }
  return { text: lines.join(' '), ok };
}
