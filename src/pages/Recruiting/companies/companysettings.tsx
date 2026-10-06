import { useEffect, useState } from "react";
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import Swal from '../../../utils/swal';
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import PageMeta from "../../../components/common/PageMeta";
import { useCompanies, useUpdateMailSettings } from "../../../hooks/queries/useCompanies";
import GmailConnectionCard from "./components/GmailConnectionCard";
import EmailTemplates from "../Settings/MailTemplate";
import { AlertTriangle, Building2, CheckCircle, Globe, Mail, PlusCircle, Save, ShieldCheck, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  IconButton,
  PageShell,
  SectionTitle,
  StatCard,
  TabBar,
  focusRing,
  inputClass,
} from "../../../components/ui/kit";

const EMPTY_COMPANIES: never[] = [];

type Props = {
  companyId?: string;
  onSaved?: (data: any) => void;
  onChange?: (mailSettings: { availableMails?: string[]; defaultMail?: string | null; companyDomain?: string | null }) => void;
};

export default function CompanySettingsPage({ companyId: _companyId, onSaved, onChange }: Props) {
  const { selectedCompanyId } = useCompanyFilter();

  const { data: companiesData } = useCompanies();
  // A `= []` default is a new array every render while data is loading,
  // which re-ran the effect below (and its setState) on every render.
  const companies = companiesData ?? EMPTY_COMPANIES;
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const updateMailMutation = useUpdateMailSettings();

  const [availableMails, setAvailableMails] = useState<string[]>([]);
  const [defaultMail, setDefaultMail] = useState<string>("");
  const [companyDomain, setCompanyDomain] = useState<string>("");
  const [receivingDomain, setReceivingDomain] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [newMail, setNewMail] = useState("");
  const [section, setSection] = useState<'senders' | 'templates'>('senders');

  const canViewMailManagement = !!hasPermission && hasPermission('Mail Management', 'read');
  const canEdit = !!hasPermission && (hasPermission('Mail Management', 'write') && hasPermission('Mail Management', 'create'));

  // Get mail settings directly from the selected company (from /auth/me data)
  useEffect(() => {
    if (!selectedCompanyId) {
      setAvailableMails((prev) => (prev.length ? [] : prev));
      setDefaultMail("");
      setCompanyDomain("");
      setReceivingDomain("");
      return;
    }

    const company = (companies as any[]).find((c) => c._id === selectedCompanyId);
    
    if (company) {
      // Get mail settings from company.settings.mailSettings
      const mailSettingsData = company?.settings?.mailSettings || company?.mailSettings || {};
      
      const mails = mailSettingsData?.availableMails ?? mailSettingsData?.available_senders ?? mailSettingsData?.availableSenders ?? [];
      setAvailableMails(Array.isArray(mails) ? mails : []);
      setDefaultMail(mailSettingsData?.defaultMail || company?.contactEmail || "");
      setCompanyDomain(mailSettingsData?.companyDomain || "");
      setReceivingDomain(mailSettingsData?.receivingDomain || "");
    }
  }, [selectedCompanyId, companies]);

  useEffect(() => {
    onChange?.({
      availableMails,
      defaultMail: defaultMail || null,
      companyDomain: companyDomain || null,
    });
  }, [availableMails, defaultMail, companyDomain, onChange]);

  const handleAddMail = () => {
    if (!newMail || !newMail.includes("@")) {
      Swal.fire(t('invalidFormat', 'companies'), t('invalidFormatDesc', 'companies'), "error");
      return;
    }
    if (availableMails.includes(newMail)) return;
    setAvailableMails([...availableMails, newMail]);
    setNewMail("");
  };

  const handleRemoveMail = (mail: string) => {
    setAvailableMails(availableMails.filter(m => m !== mail));
    if (defaultMail === mail) setDefaultMail("");
  };

  const handleSave = async () => {
    const settingsId = selectedCompany?.settings?._id;
    if (!settingsId) return;
    setIsSaving(true);
    try {
      await updateMailMutation.mutateAsync({
        settingsId,
        data: {
          availableMails,
          defaultMail,
          companyDomain,
          receivingDomain: receivingDomain.trim() || null,
        }
      });
      Swal.fire({ title: t('configSynced', 'companies'), icon: "success", timer: 1500, showConfirmButton: false });
      onSaved?.({ availableMails, defaultMail, companyDomain });
    } catch (err: any) {
      Swal.fire(t('failure', 'companies'), err.message || t('configurationUpdateFailed', 'common'), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCompany = (companies as any[]).find((company) => company._id === selectedCompanyId);
  const selectedCompanyName =
    (typeof selectedCompany?.name === "object"
      ? locale === 'ar' ? (selectedCompany?.name?.ar || selectedCompany?.name?.en) : (selectedCompany?.name?.en || selectedCompany?.name?.ar)
      : selectedCompany?.name) || t('noCompanySelected', 'companies');
  const defaultIsRegistered = !!defaultMail && availableMails.includes(defaultMail);

  if (!canViewMailManagement) {
    return (
      <PageShell title={t('settingsBreadcrumb', 'companies')}>
        <Card>
          <EmptyState
            icon={<ShieldCheck className="size-6" />}
            title={t('restrictedProtocol', 'companies')}
            text={t('restrictedProtocolDesc', 'companies')}
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t('companyCommSettings', 'companies')}
      subtitle={t('companyCommSettingsDesc', 'companies')}
      actions={
        section === 'senders' && (
        <Button
          variant="primary"
          icon={<Save className="size-4" />}
          loading={isSaving}
          disabled={!canEdit}
          onClick={handleSave}
        >
          {t('saveChangesBtn', 'companies')}
        </Button>
        )
      }
    >
      <PageMeta title={t('settingsPageTitle', 'companies')} description={t('settingsPageDesc', 'companies')} />

      <Card>
        <TabBar
          ariaLabel={t('mailSettingsSections', 'companies')}
          value={section}
          onChange={setSection}
          tabs={[
            { value: 'senders' as const, label: t('tabSendersDomain', 'companies'), icon: <Globe className="size-4" /> },
            { value: 'templates' as const, label: t('tabEmailTemplates', 'companies'), icon: <Mail className="size-4" /> },
          ]}
        />
      </Card>

      {section === 'templates' ? (
        <EmailTemplates embedded />
      ) : (
        <>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label={t('selectedCompany', 'companies')} value={<span className="text-base">{selectedCompanyName}</span>} icon={<Building2 className="size-4" />} />
        <StatCard label={t('senderChannels', 'companies')} value={availableMails.length} icon={<Mail className="size-4" />} />
        <StatCard
          label={t('defaultSender', 'companies')}
          value={<span className="block truncate text-base">{defaultMail || t('notAssigned', 'companies')}</span>}
          icon={<CheckCircle className="size-4" />}
          hint={defaultIsRegistered ? t('configuredInList', 'companies') : t('selectOneAsDefault', 'companies')}
        />
      </div>

      <GmailConnectionCard
        settingsId={selectedCompany?.settings?._id}
        canEdit={canEdit}
        defaultSenderName={selectedCompanyName !== t('noCompanySelected', 'companies') ? selectedCompanyName : undefined}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardToolbar>
            <SectionTitle icon={<Globe className="size-4" />}>{t('domainIdentity', 'companies')}</SectionTitle>
          </CardToolbar>
          <div className="space-y-5 p-4">
            <Field label={t('domainIdentity', 'companies')} htmlFor="cs-domain" hint={t('domainDesc', 'companies')}>
              <input
                id="cs-domain"
                dir="ltr"
                value={companyDomain || ""}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder={t('domainPlaceholder', 'companies')}
                className={inputClass}
              />
            </Field>
            <Field label={t('replySubdomain', 'companies')} htmlFor="cs-reply-domain" hint={t('replySubdomainDesc', 'companies')}>
              <input
                id="cs-reply-domain"
                dir="ltr"
                value={receivingDomain}
                onChange={(e) => setReceivingDomain(e.target.value)}
                placeholder={t('replySubdomainPlaceholder', 'companies')}
                disabled={!canEdit}
                className={inputClass}
              />
            </Field>
            <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {t('replySubdomainWarning', 'companies')}
            </p>
          </div>
        </Card>

        <Card className="xl:col-span-8">
          <CardToolbar>
            <div>
              <SectionTitle icon={<Mail className="size-4" />}>{t('authorizedSenders', 'companies')}</SectionTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('authorizedSendersDesc', 'companies')}</p>
            </div>
            <Badge tone="slate">{t('channels', 'companies', { count: availableMails.length })}</Badge>
          </CardToolbar>

          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                dir="ltr"
                aria-label={t('addSenderPlaceholder', 'companies')}
                value={newMail}
                onChange={(e) => setNewMail(e.target.value)}
                placeholder={t('addSenderPlaceholder', 'companies')}
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMail()}
              />
              <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={handleAddMail} disabled={!canEdit}>
                {t('addSender', 'companies')}
              </Button>
            </div>

            {availableMails.length > 0 ? (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {availableMails.map((mail) => {
                  const isDefault = defaultMail === mail;
                  return (
                    <li
                      key={mail}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isDefault ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setDefaultMail(mail)}
                        aria-pressed={isDefault}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start ${focusRing}`}
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                            isDefault ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isDefault ? <CheckCircle className="size-4" /> : <Mail className="size-4" />}
                        </span>
                        <span className="min-w-0">
                          <span dir="ltr" className="block truncate text-sm font-medium text-slate-900 dark:text-white">{mail}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {isDefault ? t('defaultSenderUsed', 'companies') : t('clickToMarkDefault', 'companies')}
                          </span>
                        </span>
                      </button>
                      <Badge tone={isDefault ? 'blue' : 'slate'}>
                        {isDefault ? t('default', 'companies') : t('secondary', 'companies')}
                      </Badge>
                      <IconButton
                        tone="danger"
                        label={t('delete', 'common')}
                        onClick={() => handleRemoveMail(mail)}
                        disabled={!canEdit}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Mail className="size-6" />} title={t('noSendersYet', 'companies')} />
            )}

            <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200">{t('deliveryPolicyNote', 'companies')}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-sky-900/80 dark:text-sky-200/80">{t('deliveryPolicyDesc', 'companies')}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
        </>
      )}
    </PageShell>
  );
}
