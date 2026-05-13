import { useMemo, useEffect } from 'react';
import { Mail } from 'lucide-react';
import {
  useSendEmail,
  useSendBatchEmail,
} from '../../../hooks/queries/useSendEmail';
import { useCompanies } from '../../../hooks/queries';
import { Company } from '../../../types';
import { FormState } from './JobOffersModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApplicantObject = {
  _id: string;
  fullName: string;
  email: string;
  jobPositionId?: {
    _id: string;
    companyId: { _id: string; name: { en: string; ar: string } } | null;
  } | null;
};

// ─── Sender resolution ────────────────────────────────────────────────────────

export function resolveSendersByCompany(
  companies: Company | Company[]
): Record<string, string[]> {
  const list = Array.isArray(companies) ? companies : [companies];

  return Object.fromEntries(
    list
      .filter((c) => c?._id)
      .map((c) => {
        const mails = c.settings?.mailSettings?.availableMails ?? [];
        const defaultMail = c.settings?.mailSettings?.defaultMail;
        const contactEmail = c.contactEmail;

        const emails = [...mails, defaultMail, contactEmail]
          .filter((e): e is string => !!e?.trim())
          .map((e) => e.trim());

        return [c._id, [...new Set(emails)]];
      })
  );
}

// ─── Group applicants by company ─────────────────────────────────────────────

export function groupApplicantsByCompany(
  applicantObjects: ApplicantObject[] | undefined
): Record<string, { name: string; applicants: ApplicantObject[] }> {
  const map: Record<string, { name: string; applicants: ApplicantObject[] }> =
    {};
  for (const a of applicantObjects ?? []) {
    const cid = a.jobPositionId?.companyId?._id;
    if (!cid) continue;
    const name = a.jobPositionId?.companyId?.name?.en ?? cid;
    if (!map[cid]) map[cid] = { name, applicants: [] };
    map[cid].applicants.push(a);
  }
  return map;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildOfferHtml(form: FormState, recipientName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:Arial,sans-serif;padding:20px;margin:0;background:#f5f5f5">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">

    <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:24px 30px">
      <h1 style="color:#111827;margin:0;font-size:22px;font-weight:700">
        Job Offer – ${form.position}
      </h1>
    </div>

    <div style="padding:30px">
      <p style="margin:0 0 20px;font-size:15px;color:#374151">Dear <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280">
        We are pleased to extend the following job offer to you. Please review the details below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px">
        <tr>
          <td style="padding:10px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;width:40%">Position</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0">${form.position}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0">Work Type</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0">${form.workType}</td>
        </tr>
        ${
          form.workHours
            ? `
        <tr>
          <td style="padding:10px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0">Work Hours</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0">${form.workHours}</td>
        </tr>`
            : ''
        }
        ${
          form.salaryBasic
            ? `
        <tr>
          <td style="padding:10px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0">Basic Salary</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0">
            ${Number(form.salaryBasic).toLocaleString()} ${form.salaryCurrency}
          </td>
        </tr>`
            : ''
        }
      </table>

      ${
        form.commissions.length > 0
          ? `
        <h3 style="font-size:16px;font-weight:700;margin:0 0 12px;color:#111827">Commission Structure</h3>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151">
          ${form.commissions
            .map(
              (c) => `
            <li>
              <strong>${c.label}:</strong>
              ${c.value}${c.type === 'percentage' ? '%' : ` ${form.salaryCurrency}`}
              ${c.condition ? `<span style="color:#6b7280"> (${c.condition})</span>` : ''}
            </li>`
            )
            .join('')}
        </ul>`
          : ''
      }

      ${form.sections
        .map(
          (s) => `
        <h3 style="font-size:16px;font-weight:700;margin:0 0 10px;color:#111827">${s.title.en}</h3>
        <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151">
          ${s.items.map((i) => `<li>${i.en}</li>`).join('')}
        </ul>`
        )
        .join('')}

      ${
        form.notes
          ? `
        <p style="margin:24px 0 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;font-size:13px;color:#64748b;font-style:italic">
          ${form.notes}
        </p>`
          : ''
      }

      <p style="margin:32px 0 0;font-size:14px;color:#374151">
        Please review and respond at your earliest convenience.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Clean "from" address ─────────────────────────────────────────────────────

export const cleanFrom = (addr: string) =>
  String(addr || '')
    .replace(/.*<\s*([^>]+)\s*>.*/, '$1')
    .replace(/[<>]/g, '')
    .trim();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobOfferEmail({
  propCompany,
  form,
  setForm,
  applicantObjects,
  jobPositionId,
}: {
  propCompany?: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  applicantObjects?: ApplicantObject[];
  jobPositionId?: string | null;
}) {
  const sendEmailMutation = useSendEmail();
  const sendBatchEmailMutation = useSendBatchEmail();

  const { data: companies } = useCompanies(
    propCompany ? [propCompany] : undefined
  );

  const sendersByCompany = useMemo(
    () => resolveSendersByCompany(companies!),
    [companies]
  );

  const groupedByCompany = useMemo(
    () => groupApplicantsByCompany(applicantObjects),
    [applicantObjects]
  );

  // Seed first sender per company as soon as the list resolves
  useEffect(() => {
    if (!Object.keys(sendersByCompany).length) return;
    setForm((prev) => {
      const patched = { ...prev.senderByCompany };
      let changed = false;
      for (const [cid, senders] of Object.entries(sendersByCompany)) {
        if (!patched[cid] && senders.length > 0) {
          patched[cid] = senders[0];
          changed = true;
        }
      }
      return changed ? { ...prev, senderByCompany: patched } : prev;
    });
  }, [sendersByCompany, setForm]);

  const sendSingleOfferEmail = async () => {
    const recipient = form.selectedApplicantObject;
    if (!recipient?.email) return;
    const cid = recipient.jobPositionId?.companyId._id!;
    await sendEmailMutation.mutateAsync({
      company: cid,
      applicant: recipient._id,
      to: recipient.email,
      from: cleanFrom(form.senderByCompany[cid] ?? ''),
      subject: `Job Offer – ${form.position}`,
      html: buildOfferHtml(form, recipient.fullName ?? 'Applicant'),
      ...(recipient.jobPositionId
        ? { jobPosition: recipient.jobPositionId._id }
        : {}),
    } as any);
  };

  const sendBulkOfferEmail = async () => {
    if (!applicantObjects?.length) return;
    await Promise.all(
      Object.entries(groupedByCompany).map(([cid, { applicants }]) => {
        const from = cleanFrom(form.senderByCompany[cid] ?? '');
        const batch = applicants
          .filter((a) => !!a.email)
          .map((a) => ({
            to: a.email!,
            from,
            subject: `Job Offer – ${form.position}`,
            html: buildOfferHtml(form, a.fullName),
            applicant: a._id,
            ...(a.jobPositionId
              ? { jobPosition: a.jobPositionId._id }
              : jobPositionId
                ? { jobPosition: jobPositionId }
                : {}),
          }));
        if (!batch.length) return Promise.resolve();
        return sendBatchEmailMutation.mutateAsync({ company: cid, batch });
      })
    );
  };

  const isPending =
    sendEmailMutation.isPending || sendBatchEmailMutation.isPending;

  return {
    sendersByCompany,
    groupedByCompany,
    sendSingleOfferEmail,
    sendBulkOfferEmail,
    isPending,
  };
}

// ─── EmailSettingsPanel ───────────────────────────────────────────────────────

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function ModalLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
      {children}
    </label>
  );
}

export function EmailSettingsPanel({
  form,
  isBulk,
  sendersByCompany,
  groupedByCompany,
  onSenderChange,
}: {
  form: FormState;
  isBulk: boolean;
  sendersByCompany: Record<string, string[]>;
  groupedByCompany: Record<
    string,
    { name: string; applicants: ApplicantObject[] }
  >;
  onSenderChange: (senderByCompany: Record<string, string>) => void;
}) {
  const setSender = (cid: string, value: string) =>
    onSenderChange({ ...form.senderByCompany, [cid]: value });

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-900/10">
      <div className="mb-3 flex items-center gap-2">
        <Mail className="size-4 text-brand-600 dark:text-brand-400" />
        <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
          Email Settings
        </span>
      </div>

      {isBulk ? (
        <div className="space-y-3">
          {Object.entries(groupedByCompany).map(
            ([cid, { name, applicants }]) => {
              const senders = sendersByCompany[cid] ?? [];
              const withEmail = applicants.filter((a) => !!a.email);
              return (
                <div
                  key={cid}
                  className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {name}
                    </p>
                    <span className="text-xs text-slate-500">
                      {withEmail.length}/{applicants.length} have email
                    </span>
                  </div>

                  <ModalLabel>Send From</ModalLabel>
                  {senders.length > 0 ? (
                    <select
                      className={selectCls}
                      value={form.senderByCompany[cid] ?? ''}
                      onChange={(e) => setSender(cid, e.target.value)}
                    >
                      {senders.map((addr) => (
                        <option key={addr} value={addr}>
                          {addr}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                      ⚠️ No sender addresses configured for this company.
                    </p>
                  )}

                  <ul className="mt-2 max-h-24 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100 dark:divide-slate-700/60 dark:border-slate-700">
                    {applicants.map((a) => (
                      <li
                        key={a._id}
                        className="flex items-center gap-2 px-2 py-1.5"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-[9px] font-bold text-brand-600 dark:text-brand-400">
                          {a.fullName?.[0]?.toUpperCase() ?? '?'}
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {a.fullName}
                        </span>
                        {a.email ? (
                          <span className="ml-auto text-[11px] text-slate-400">
                            {a.email}
                          </span>
                        ) : (
                          <span className="ml-auto text-[11px] text-amber-500">
                            no email
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <>
          <ModalLabel>Send From</ModalLabel>
          {(() => {
            const cid =
              form.selectedApplicantObject?.jobPositionId?.companyId?._id!;
            const senders = sendersByCompany[cid] ?? [];
            return senders.length > 0 ? (
              <select
                className={selectCls}
                value={form.senderByCompany[cid] ?? ''}
                onChange={(e) => setSender(cid, e.target.value)}
              >
                {senders.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400">
                ⚠️ No sender addresses found for this company. Please configure
                them in Company Settings first.
              </p>
            );
          })()}
          <div className="mt-3">
            <ModalLabel>Recipient</ModalLabel>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Will be sent to the selected applicant's email address
            </p>
          </div>
        </>
      )}
    </div>
  );
}
