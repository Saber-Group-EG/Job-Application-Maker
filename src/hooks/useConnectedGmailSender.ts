import { useCompanies } from './queries/useCompanies';

type MailSettingsLike = {
  provider?: 'resend' | 'gmail';
  gmail?: { email?: string | null };
};

// The Gmail address a company has connected in Mail Settings, or null.
// When set, every email from that company is sent as this address (the
// backend's companyMailer ignores `from` for Gmail), so send forms should
// show it as the fixed sender instead of the custom-domain sender list.
export function getConnectedGmail(
  mailSettings: MailSettingsLike | null | undefined
): string | null {
  return mailSettings?.provider === 'gmail' && mailSettings.gmail?.email
    ? mailSettings.gmail.email
    : null;
}

// Looks the company up in the cached companies list, whose settings include
// mailSettings.provider/gmail (never the App Password).
export function useConnectedGmailSender(
  companyId: string | null | undefined
): string | null {
  const { data: companies } = useCompanies();
  if (!companyId) return null;
  const company = (companies ?? []).find(
    (c: { _id?: string }) => c._id === companyId
  ) as { settings?: { mailSettings?: MailSettingsLike } } | undefined;
  return getConnectedGmail(company?.settings?.mailSettings);
}
