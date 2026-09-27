import { useState, useRef } from "react";
import PageMeta from "../components/common/PageMeta";
import { Clock, Contact, FileText, Mail, MapPin, MessageSquare, Phone, Send, Upload, X } from "lucide-react";
import {
  Button,
  Card,
  CardToolbar,
  Field,
  PageShell,
  SectionTitle,
  focusRing,
  inputClass,
  selectClass,
  textareaClass,
} from "../components/ui/kit";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../context/AuthContext";
import { useCreateAuthenticatedInquiry, useCompanies } from "../hooks/queries";
import { toPlainString } from "../utils/strings";
import { uploadToR2 } from "../utils/uploadToR2";

function ContactInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </li>
  );
}

export default function Support() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [companyId, setCompanyId] = useState("");

  const roleName = (user as any)?.roleId?.name?.toLowerCase();
  const isSuperAdmin = roleName === "admin" || roleName === "super admin";

  const { data: allCompanies } = useCompanies(isSuperAdmin ? undefined : undefined, { enabled: isSuperAdmin });

  const userCompanies = isSuperAdmin
    ? (allCompanies ?? [])
    : (user?.companies?.map((c: any) => c.companyId).filter(Boolean) ?? []);

  const createInquiryMutation = useCreateAuthenticatedInquiry();
  const [uploading, setUploading] = useState(false);

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      const attachmentPayload = await Promise.all(
        attachments.map(async (file) => {
          const url = await uploadToR2(file);
          return { url, filename: file.name, size: file.size };
        })
      );
      await createInquiryMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        attachments: attachmentPayload,
        ...(companyId ? { companyId } : {}),
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
      setAttachments([]);
      setCompanyId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      // The mutation's own onError already told the user.
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  const busy = createInquiryMutation.isPending || uploading;

  return (
    <PageShell title={t('support', 'common')} subtitle={t('willGetBack', 'common')}>
      <PageMeta title={t('supportPageTitle', 'common')} description={t('supportPageDesc', 'common')} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardToolbar>
            <SectionTitle icon={<MessageSquare className="size-4" />}>{t('sendUsMessage', 'common')}</SectionTitle>
          </CardToolbar>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('name', 'common')} htmlFor="name">
                <input id="name" name="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder={t('enterName', 'common')} required className={inputClass} />
              </Field>
              <Field label={t('email', 'common')} htmlFor="email">
                <input type="email" id="email" name="email" dir="ltr" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder={t('enterEmail', 'common')} required className={inputClass} />
              </Field>
            </div>

            <Field label={t('supportTo', 'common')} htmlFor="companyId">
              <select id="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={selectClass}>
                <option value="">{t('supportSystem', 'common')}</option>
                {userCompanies.map((company: any) => (
                  <option key={company._id} value={company._id}>
                    {toPlainString(company.name)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('subject', 'common')} htmlFor="subject">
              <input id="subject" name="subject" value={formData.subject} onChange={(e) => handleChange("subject", e.target.value)} placeholder={t('whatIsThisAbout', 'common')} required className={inputClass} />
            </Field>

            <Field label={t('message', 'common')} htmlFor="message">
              <textarea id="message" placeholder={t('describeIssue', 'common')} value={formData.message} onChange={(e) => handleChange("message", e.target.value)} rows={5} className={textareaClass} />
            </Field>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('attachments', 'common')}</p>
              <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5`}>
                <Upload className="size-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {attachments.length > 0 ? t('filesSelected', 'common', { count: attachments.length }) : t('attachments', 'common')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('dropHint', 'common')}</span>
                <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileChange} />
              </label>
              {attachments.length > 0 && (
                <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {attachments.map((file, index) => (
                    <li key={index} className="relative rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="h-20 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                          <FileText className="size-6 text-slate-400" />
                        </div>
                      )}
                      <p className="mt-1 truncate text-center text-[11px] text-slate-600 dark:text-slate-400">{file.name}</p>
                      <button
                        type="button"
                        aria-label={`${t('delete', 'common')} ${file.name}`}
                        onClick={(e) => { e.stopPropagation(); removeAttachment(index); }}
                        className={`absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md transition hover:bg-rose-600 ${focusRing}`}
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" icon={<Send className="size-4" />} loading={busy}>
                {uploading ? t('uploadingAttachments', 'common') : createInquiryMutation.isPending ? t('submitting', 'common') : t('sendMessage', 'common')}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardToolbar>
              <div>
                <SectionTitle icon={<Contact className="size-4" />}>{t('contactInfo', 'common')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('waysToReachUs', 'common')}</p>
              </div>
            </CardToolbar>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              <ContactInfoRow icon={<Mail className="size-4" />} label={t('emailContact', 'common')} value={<span dir="ltr">info@sabergroup-eg.com</span>} />
              <ContactInfoRow
                icon={<Phone className="size-4" />}
                label={t('phoneContact', 'common')}
                value={
                  <a href="https://wa.me/201080099757" target="_blank" rel="noopener noreferrer" dir="ltr" className={`rounded transition-colors hover:text-brand-600 ${focusRing}`}>
                    01080099757
                  </a>
                }
              />
              <ContactInfoRow icon={<MapPin className="size-4" />} label={t('officeContact', 'common')} value={locale === 'ar' ? 'شارع الاستاد - طنطا - مصر' : 'El-Stad St - Tanta - Egypt'} />
            </ul>
          </Card>

          <Card>
            <CardToolbar>
              <SectionTitle icon={<Clock className="size-4" />}>{t('businessHours', 'common')}</SectionTitle>
            </CardToolbar>
            <dl className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{t('saturdayToThursday', 'common')}</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{t('hoursWeekdays', 'common')}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500 dark:text-slate-400">{t('friday', 'common')}</dt>
                <dd className="text-end">
                  <span className="block font-medium text-rose-600 dark:text-rose-400">{t('closed', 'common')}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{t('byAppointmentOnly', 'common')}</span>
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
