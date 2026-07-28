import { useState, useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Label from "../components/form/Label";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../context/AuthContext";
import { useCreateAuthenticatedInquiry, useCompanies } from "../hooks/queries";
import { toPlainString } from "../utils/strings";
import { uploadToR2 } from "../utils/uploadToR2";

function ContactInfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-brand-500/30 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-all">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
          {value}
        </p>
      </div>
    </div>
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
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6">
      <PageMeta
        title={t('supportPageTitle', 'common')}
        description={t('supportPageDesc', 'common')}
      />
      <PageBreadcrumb  pageTitle={t('support', 'common')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Contact Form */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-3 lg:p-8">
          <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-[2.5rem] bg-gradient-to-b from-brand-500 to-brand-300" />
          <div className="mb-8 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11.0991 7.52507C11.0991 8.02213 11.5021 8.42507 11.9991 8.42507H12.0001C12.4972 8.42507 12.9001 8.02213 12.9001 7.52507C12.9001 7.02802 12.4972 6.62507 12.0001 6.62507H11.9991C11.5021 6.62507 11.0991 7.02802 11.0991 7.52507ZM12.0001 17.3714C11.5859 17.3714 11.2501 17.0356 11.2501 16.6214V10.9449C11.2501 10.5307 11.5859 10.1949 12.0001 10.1949C12.4143 10.1949 12.7501 10.5307 12.7501 10.9449V16.6214C12.7501 17.0356 12.4143 17.3714 12.0001 17.3714Z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {t('sendUsMessage', 'common')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('willGetBack', 'common')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t('name', 'common')}</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={t('enterName', 'common')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">{t('email', 'common')}</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder={t('enterEmail', 'common')}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="companyId">To</Label>
              <select
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900  dark:placeholder:text-white/30 dark:focus:border-brand-800 text-gray-800 dark:text-white/90"
              >
                <option value="" className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">System</option>
                {userCompanies.map((company: any) => (
                  <option key={company._id} value={company._id} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    {toPlainString(company.name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subject">{t('subject', 'common')}</Label>
              <Input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder={t('whatIsThisAbout', 'common')}
                required
              />
            </div>
            <div>
              <Label htmlFor="message">{t('message', 'common')}</Label>
              <TextArea
                placeholder={t('describeIssue', 'common')}
                value={formData.message}
                onChange={(value) => handleChange("message", value)}
                rows={5}
              />
            </div>
            {/* Attachments */}
            <div>
              <Label>{t('attachments', 'common')}</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-brand-500 dark:hover:bg-brand-500/5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                  <path d="M12 4.5V19.5M19.5 12L4.5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {attachments.length > 0
                    ? `${attachments.length} ${attachments.length === 1 ? 'file' : 'files'} selected`
                    : t('attachments', 'common')}
                </p>
                <p className="text-xs text-gray-400">Click to browse or drag & drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {attachments.map((file, index) => (
                    <div key={index} className="relative group rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                            <path fillRule="evenodd" clipRule="evenodd" d="M18.5 8.5L10.5 16.5L5.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      <p className="mt-1 truncate text-[11px] font-medium text-gray-600 text-center dark:text-gray-400">{file.name}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeAttachment(index); }}
                        className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100 hover:scale-110"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={createInquiryMutation.isPending || uploading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z" fill="currentColor" />
                </svg>
                {uploading ? t('uploadingAttachments', 'common') : createInquiryMutation.isPending ? t('submitting', 'common') : t('sendMessage', 'common')}
              </button>
            </div>
          </form>
        </div>

        {/* Contact Info Sidebar */}
        <div className="space-y-4 lg:col-span-2">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
            <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-[2.5rem] bg-gradient-to-b from-brand-500 to-brand-300" />
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.25 5.25C2.25 3.59315 3.59315 2.25 5.25 2.25H18.75C20.4069 2.25 21.75 3.59315 21.75 5.25V18.75C21.75 20.4069 20.4069 21.75 18.75 21.75H5.25C3.59315 21.75 2.25 20.4069 2.25 18.75V5.25ZM5.25 3.75C4.42157 3.75 3.75 4.42157 3.75 5.25V7.66272L12 13.0173L20.25 7.66272V5.25C20.25 4.42157 19.5784 3.75 18.75 3.75H5.25ZM20.25 9.33728L12 14.6931L3.75 9.33728V18.75C3.75 19.5784 4.42157 20.25 5.25 20.25H18.75C19.5784 20.25 20.25 19.5784 20.25 18.75V9.33728Z" fill="currentColor" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {t('contactInfo', 'common')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('waysToReachUs', 'common')}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <ContactInfoCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2.25 5.25C2.25 3.59315 3.59315 2.25 5.25 2.25H18.75C20.4069 2.25 21.75 3.59315 21.75 5.25V18.75C21.75 20.4069 20.4069 21.75 18.75 21.75H5.25C3.59315 21.75 2.25 20.4069 2.25 18.75V5.25ZM5.25 3.75C4.42157 3.75 3.75 4.42157 3.75 5.25V7.66272L12 13.0173L20.25 7.66272V5.25C20.25 4.42157 19.5784 3.75 18.75 3.75H5.25ZM20.25 9.33728L12 14.6931L3.75 9.33728V18.75C3.75 19.5784 4.42157 20.25 5.25 20.25H18.75C19.5784 20.25 20.25 19.5784 20.25 18.75V9.33728Z" fill="currentColor" />
                  </svg>
                }
                label={t('emailContact', 'common')}
                value="info@sabergroup-eg.com"
              />
              <ContactInfoCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2.25 6C2.25 4.34315 3.59315 3 5.25 3H18.75C20.4069 3 21.75 4.34315 21.75 6V18C21.75 19.6569 20.4069 21 18.75 21H5.25C3.59315 21 2.25 19.6569 2.25 18V6ZM5.25 4.5C4.42157 4.5 3.75 5.17157 3.75 6V7.5H20.25V6C20.25 5.17157 19.5784 4.5 18.75 4.5H5.25ZM20.25 9H3.75V18C3.75 18.8284 4.42157 19.5 5.25 19.5H18.75C19.5784 19.5 20.25 18.8284 20.25 18V9ZM7.5 16.5C7.5 15.6716 8.17157 15 9 15H10.5C11.3284 15 12 15.6716 12 16.5C12 17.3284 11.3284 18 10.5 18H9C8.17157 18 7.5 17.3284 7.5 16.5Z" fill="currentColor" />
                  </svg>
                }
                label={t('phoneContact', 'common')}
                value={<a href="https://wa.me/201080099757" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">01080099757</a>}
              />
              <ContactInfoCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C7.44365 2.25 3.75 5.94365 3.75 10.5C3.75 14.2286 6.42234 17.5283 11.25 20.6345V21C11.25 21.4142 11.5858 21.75 12 21.75C12.4142 21.75 12.75 21.4142 12.75 21V20.6345C17.5777 17.5283 20.25 14.2286 20.25 10.5C20.25 5.94365 16.5563 2.25 12 2.25ZM12 13.5C10.3431 13.5 9 12.1569 9 10.5C9 8.84315 10.3431 7.5 12 7.5C13.6569 7.5 15 8.84315 15 10.5C15 12.1569 13.6569 13.5 12 13.5Z" fill="currentColor" />
                  </svg>
                }
                label={t('officeContact', 'common')}
                value={locale === 'ar' ? 'شارع الاستاد - طنطا - مصر' : 'El-Stad St - Tanta - Egypt'}
              />
            </div>
          </div>

          {/* Hours card */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C6.61522 2.25 2.25 6.61522 2.25 12C2.25 17.3848 6.61522 21.75 12 21.75C17.3848 21.75 21.75 17.3848 21.75 12C21.75 6.61522 17.3848 2.25 12 2.25ZM12 5.25C12.4142 5.25 12.75 5.58579 12.75 6V11.25H18C18.4142 11.25 18.75 11.5858 18.75 12C18.75 12.4142 18.4142 12.75 18 12.75H12C11.5858 12.75 11.25 12.4142 11.25 12V6C11.25 5.58579 11.5858 5.25 12 5.25Z" fill="currentColor" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {t('businessHours', 'common')}
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('saturdayToThursday', 'common')}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">{t('hoursWeekdays', 'common')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('friday', 'common')}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-sm font-medium text-red-500">{t('closed', 'common')}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t('byAppointmentOnly', 'common')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
