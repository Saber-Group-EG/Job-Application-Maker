import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../../components/common/PageMeta";
import Swal from '../../../utils/swal';
import { useLocale } from "../../../context/LocaleContext";
import { useCreateCompany } from "../../../hooks/queries/useCompanies";
import { companiesKeys } from "../../../hooks/queries/useCompanies";
import {
  ArrowLeft,
  Building2,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Button,
  Card,
  CardToolbar,
  Field,
  IconButton,
  PageShell,
  SectionTitle,
  focusRing,
  inputClass,
} from "../../../components/ui/kit";

type CompanyForm = {
  name: { en: string; ar: string; };
  description: { en: string; ar: string; };
  contactEmail: string;
  phone: string;
  address: Array<{ en: string; ar: string; location: string; }>;
  website: string;
  logoPath?: string;
};

const defaultCompany: CompanyForm = {
  name: { en: "", ar: "" },
  description: { en: "", ar: "" },
  contactEmail: "",
  phone: "",
  address: [{ en: "", ar: "", location: "" }],
  website: "",
  logoPath: "",
};

export default function CreateCompany() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCompanyMutation = useCreateCompany();
  const { t } = useLocale();
  
  const [companyForm, setCompanyForm] = useState<CompanyForm>(defaultCompany);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleCompanyChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocalizedChange = (field: 'name' | 'description', lang: 'en' | 'ar', value: string) => {
    setCompanyForm((prev) => ({
      ...prev, [field]: { ...prev[field], [lang]: value },
    }));
  };

  const handleAddressChange = (index: number, field: 'en' | 'ar' | 'location', value: string) => {
    setCompanyForm((prev) => {
      const newAddress = [...prev.address];
      newAddress[index] = { ...newAddress[index], [field]: value };
      return { ...prev, address: newAddress };
    });
  };

  const handleAddAddress = () => {
    setCompanyForm((prev) => ({
      ...prev, address: [...prev.address, { en: '', ar: '', location: '' }],
    }));
  };

  const handleRemoveAddress = (index: number) => {
    setCompanyForm((prev) => ({
      ...prev, address: prev.address.filter((_, i) => i !== index),
    }));
  };

  const uploadToCloudinary = async (file: File) => {
    const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || "";
    const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_PRESET as string) || "";
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    return res.json();
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const result: any = await uploadToCloudinary(file);
      setCompanyForm((prev) => ({ ...prev, logoPath: result.secure_url }));
    } catch (err: any) {
      Swal.fire(t('uploadFailed', 'companies'), err.message || t('uploadFailedDesc', 'companies'), "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCompanySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Show loading toast
    await Swal.fire({
      title: t('submitting', 'companies'),
      text: t('submittingDesc', 'companies'),
      icon: "info",
      showConfirmButton: false,
      timer: 1000
    });

    // Optimistic update
    const previousCompanies = queryClient.getQueryData(companiesKeys.list());
    const tempId = `temp-${Date.now()}`;
    const tempCompany: any = { ...companyForm, _id: tempId };

    queryClient.setQueryData<any>(companiesKeys.list(), (old: any) => {
      if (!old) return [tempCompany];
      if (Array.isArray(old)) return [...old, tempCompany];
      return { ...old, data: [...(old.data || []), tempCompany] };
    });

    try {
      const newCompany = await createCompanyMutation.mutateAsync(companyForm);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: companiesKeys.list() });
      
      await Swal.fire({
        title: t('companyCreated', 'companies'),
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
      
      // Navigate to the new company page
      if (newCompany?._id) {
        navigate(`/company/${newCompany._id}`);
      } else {
        navigate("/companies");
      }
    } catch (err: any) {
      // Rollback optimistic update
      queryClient.setQueryData(companiesKeys.list(), previousCompanies);
      
      await Swal.fire({
        title: t('registrationFailed', 'companies'),
        text: err.message || t('registrationFailedDesc', 'companies'),
        icon: "error"
      });
    }
  };

  const busy = createCompanyMutation.isPending || isUploadingLogo;

  const back = (
    <Link
      to="/companies"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('backToCompanies', 'companies')}
    </Link>
  );

  return (
    <>
      <PageMeta title={t('newPageTitle', 'companies')} description={t('newPageDesc', 'companies')} />
      <PageShell back={back} title={t('companyInformation', 'companies')} subtitle={t('companyInformationDesc', 'companies')}>
        <form id="company-form" onSubmit={handleCompanySubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<Building2 className="size-4" />}>{t('companyProfile', 'companies')}</SectionTitle>
                </CardToolbar>
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  <Field label={t('companyNameEn', 'companies')} htmlFor="cc-name-en">
                    <input
                      id="cc-name-en"
                      required
                      dir="ltr"
                      value={companyForm.name.en}
                      onChange={(e) => handleLocalizedChange('name', 'en', e.target.value)}
                      placeholder={t('companyNameEnPlaceholder', 'companies')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('companyNameAr', 'companies')} htmlFor="cc-name-ar">
                    <input
                      id="cc-name-ar"
                      required
                      dir="rtl"
                      value={companyForm.name.ar}
                      onChange={(e) => handleLocalizedChange('name', 'ar', e.target.value)}
                      placeholder={t('companyNameArPlaceholder', 'companies')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('companyDescEn', 'companies')} htmlFor="cc-desc-en" optional>
                    <textarea
                      id="cc-desc-en"
                      dir="ltr"
                      rows={4}
                      value={companyForm.description.en}
                      onChange={(e) => handleLocalizedChange('description', 'en', e.target.value)}
                      placeholder={t('companyDescPlaceholder', 'companies')}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                  <Field label={t('companyDescAr', 'companies')} htmlFor="cc-desc-ar" optional>
                    <textarea
                      id="cc-desc-ar"
                      dir="rtl"
                      rows={4}
                      value={companyForm.description.ar}
                      onChange={(e) => handleLocalizedChange('description', 'ar', e.target.value)}
                      placeholder={t('companyDescArPlaceholder', 'companies')}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </div>
              </Card>

              <Card>
                <CardToolbar>
                  <SectionTitle icon={<MapPin className="size-4" />}>{t('locations', 'companies')}</SectionTitle>
                  <Button onClick={handleAddAddress} icon={<Plus className="size-4" />}>
                    {t('addLocation', 'companies')}
                  </Button>
                </CardToolbar>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companyForm.address.map((addr, idx) => (
                    <li key={idx} className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('locationNumber', 'companies', { n: idx + 1 })}
                        </p>
                        {companyForm.address.length > 1 && (
                          <IconButton tone="danger" label={t('dissolveLocation', 'companies')} onClick={() => handleRemoveAddress(idx)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label={t('streetAddressEn', 'companies')} htmlFor={`cc-addr-en-${idx}`}>
                          <input
                            id={`cc-addr-en-${idx}`}
                            dir="ltr"
                            value={addr.en}
                            onChange={(e) => handleAddressChange(idx, 'en', e.target.value)}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t('streetAddressAr', 'companies')} htmlFor={`cc-addr-ar-${idx}`}>
                          <input
                            id={`cc-addr-ar-${idx}`}
                            dir="rtl"
                            value={addr.ar}
                            onChange={(e) => handleAddressChange(idx, 'ar', e.target.value)}
                            className={inputClass}
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label={t('geolocation', 'companies')} htmlFor={`cc-addr-loc-${idx}`} optional>
                            <input
                              id={`cc-addr-loc-${idx}`}
                              dir="ltr"
                              value={addr.location}
                              onChange={(e) => handleAddressChange(idx, 'location', e.target.value)}
                              placeholder={t('geolocationPlaceholder', 'companies')}
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardToolbar>
                  <SectionTitle icon={<ImageIcon className="size-4" />}>{t('brandCompany', 'companies')}</SectionTitle>
                </CardToolbar>
                <div className="flex items-center gap-4 p-4">
                  <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                    {companyForm.logoPath ? (
                      <img src={companyForm.logoPath} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="size-6" />
                    )}
                    {isUploadingLogo && (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
                        <Loader2 className="size-5 animate-spin text-brand-500" />
                      </span>
                    )}
                  </span>
                  <div className="space-y-2">
                    <label
                      className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${isUploadingLogo ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <Upload className="size-4" />
                      {companyForm.logoPath ? t('updateLogo', 'companies') : t('uploadCompanyMark', 'companies')}
                      <input type="file" className="sr-only" accept="image/*" onChange={handleLogoChange} disabled={isUploadingLogo} />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('brandSubtext', 'companies')}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardToolbar>
                  <SectionTitle icon={<Mail className="size-4" />}>{t('contact', 'companies')}</SectionTitle>
                </CardToolbar>
                <div className="space-y-4 p-4">
                  <Field label={t('corporateEmail', 'companies')} htmlFor="cc-email" optional>
                    <input
                      id="cc-email"
                      name="contactEmail"
                      type="email"
                      dir="ltr"
                      value={companyForm.contactEmail}
                      onChange={handleCompanyChange}
                      placeholder={t('emailPlaceholder', 'companies')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('centralSwitchboard', 'companies')} htmlFor="cc-phone" optional>
                    <input
                      id="cc-phone"
                      name="phone"
                      type="tel"
                      dir="ltr"
                      value={companyForm.phone}
                      onChange={handleCompanyChange}
                      placeholder={t('phonePlaceholder', 'companies')}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('officialWebsite', 'companies')} htmlFor="cc-website" optional>
                    <input
                      id="cc-website"
                      name="website"
                      dir="ltr"
                      value={companyForm.website}
                      onChange={handleCompanyChange}
                      placeholder={t('websitePlaceholder', 'companies')}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => navigate("/companies")}>{t('cancel', 'companies')}</Button>
            <Button type="submit" variant="primary" loading={createCompanyMutation.isPending} disabled={busy}>
              {t('saveCompany', 'companies')}
            </Button>
          </div>
        </form>
      </PageShell>
    </>
  );
}
