import { useEffect, useState } from "react";
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import Swal from '../../../utils/swal';
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { useCompanies, useUpdateMailSettings } from "../../../hooks/queries/useCompanies";
import { 
  Mail, 
  Trash2, 
  Save, 
  Globe, 
  ShieldCheck, 
  Settings, 
  Briefcase,
  CheckCircle,
  PlusCircle,
  ArrowRight
} from "lucide-react";

type Props = {
  companyId?: string;
  onSaved?: (data: any) => void;
  onChange?: (mailSettings: { availableMails?: string[]; defaultMail?: string | null; companyDomain?: string | null }) => void;
};

export default function CompanySettingsPage({ companyId: _companyId, onSaved, onChange }: Props) {
  const { selectedCompanyId } = useCompanyFilter();

  const { data: companies = [] } = useCompanies();
  const { hasPermission } = useAuth();
  const { t } = useLocale();
  const updateMailMutation = useUpdateMailSettings();

  const [availableMails, setAvailableMails] = useState<string[]>([]);
  const [defaultMail, setDefaultMail] = useState<string>("");
  const [companyDomain, setCompanyDomain] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [newMail, setNewMail] = useState("");

  const canViewMailManagement = !!hasPermission && hasPermission('Mail Management', 'read');
  const canEdit = !!hasPermission && (hasPermission('Mail Management', 'write') && hasPermission('Mail Management', 'create'));

  // Get mail settings directly from the selected company (from /auth/me data)
  useEffect(() => {
    if (!selectedCompanyId) {
      setAvailableMails([]);
      setDefaultMail("");
      setCompanyDomain("");
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
    if (!selectedCompanyId) return;
    setIsSaving(true);
    try {
      await updateMailMutation.mutateAsync({
        companyId: selectedCompanyId,
        data: {
          availableMails,
          defaultMail,
          companyDomain
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
      ? selectedCompany?.name?.en || selectedCompany?.name?.ar
      : selectedCompany?.name) || t('noCompanySelected', 'companies');
  const defaultIsRegistered = !!defaultMail && availableMails.includes(defaultMail);

  if (!canViewMailManagement) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <ShieldCheck className="size-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('restrictedProtocol', 'companies')}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t('restrictedProtocolDesc', 'companies')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
      <PageMeta title={t('settingsPageTitle', 'companies')} description={t('settingsPageDesc', 'companies')} />
      <PageBreadcrumb pageTitle={t('settingsBreadcrumb', 'companies')} />

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Settings className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600/80 dark:text-brand-300">{t('mailManagement', 'companies')}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t('companyCommSettings', 'companies')}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('companyCommSettingsDesc', 'companies')}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving || !canEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="size-4" />}
              {t('saveChangesBtn', 'companies')}
              <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t('selectedCompany', 'companies')}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedCompanyName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t('senderChannels', 'companies')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{availableMails.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t('defaultSender', 'companies')}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{defaultMail || t('notAssigned', 'companies')}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {defaultIsRegistered ? t('configuredInList', 'companies') : t('selectOneAsDefault', 'companies')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-4">


            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Globe className="size-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{t('domainIdentity', 'companies')}</h3>
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
                  <input
                    value={companyDomain || ""}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder={t('domainPlaceholder', 'companies')}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('domainDesc', 'companies')}
                </p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Mail className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{t('authorizedSenders', 'companies')}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('authorizedSendersDesc', 'companies')}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 self-start rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Briefcase className="size-3.5" />
                  {t('channels', 'companies', { count: availableMails.length })}
                </span>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <div className="relative flex-1">
                      <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={newMail}
                        onChange={(e) => setNewMail(e.target.value)}
                        placeholder={t('addSenderPlaceholder', 'companies')}
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMail()}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddMail}
                    disabled={!canEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusCircle className="size-4" /> {t('addSender', 'companies')}
                  </button>
                </div>

                {availableMails.length > 0 ? (
                  <div className="space-y-3">
                    {availableMails.map((mail) => {
                      const isDefault = defaultMail === mail;

                      return (
                      <div 
                        key={mail}
                        onClick={() => setDefaultMail(mail)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDefaultMail(mail);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all md:flex-row md:items-center md:justify-between ${
                          isDefault
                            ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${isDefault ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {isDefault ? <CheckCircle className="size-5" /> : <Mail className="size-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{mail}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {isDefault ? t('defaultSenderUsed', 'companies') : t('clickToMarkDefault', 'companies')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${isDefault ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {isDefault ? t('default', 'companies') : t('secondary', 'companies')}
                          </span>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveMail(mail); }}
                            disabled={!canEdit}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
                    <Mail className="mx-auto mb-3 size-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noSendersYet', 'companies')}</p>
                  </div>
                )}

                <div className="flex items-start gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500 dark:text-blue-300">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-blue-900 dark:text-blue-200">{t('deliveryPolicyNote', 'companies')}</h4>
                    <p className="text-sm leading-relaxed text-blue-900/80 dark:text-blue-200/80">
                      {t('deliveryPolicyDesc', 'companies')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}