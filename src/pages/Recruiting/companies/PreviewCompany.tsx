import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect } from "react";
import Swal from '../../../utils/swal';
import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Save, 
  X, 
  Briefcase,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  InfoIcon,
  MailIcon,
  GridIcon,
  BoxCubeIcon,
  AngleLeftIcon,
  PlusIcon,
  TrashBinIcon,
  PencilIcon,
  UserIcon,
} from "../../../icons";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import {
  useCompany,
  useDepartments,
  useUpdateCompany,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";

type CompanyForm = {
  name: { en: string; ar: string; };
  description: { en: string; ar: string; };
  address: Array<{ en: string; ar: string; location: string; }>;
  contactEmail?: string;
  phone?: string;
  website?: string;
  logoPath?: string;
  isActive?: boolean;
};

type DepartmentForm = {
  companyId: string;
  name: { en: string; ar: string; };
  description: { en: string; ar: string; };
};

const tabs = [
  { id: "overview", label: "Overview", icon: InfoIcon },
  { id: "contact-locations", label: "Contact & Locations", icon: GridIcon },
  { id: "departments", label: "Departments", icon: BoxCubeIcon },
];

export default function PreviewCompany() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const canEdit = hasPermission("Company Management", "write");

  const { data: companyData, isLoading: loading } = useCompany(companyId || "");
  const { data: departments = [] } = useDepartments(companyId);

  const updateCompanyMutation = useUpdateCompany();
  const createDepartmentMutation = useCreateDepartment();
  const updateDepartmentMutation = useUpdateDepartment();
  const deleteDepartmentMutation = useDeleteDepartment();

  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    name: { en: "", ar: "" },
    description: { en: "", ar: "" },
    address: [{ en: "", ar: "", location: "" }],
    contactEmail: "",
    phone: "",
    website: "",
    logoPath: "",
    isActive: true,
  });

  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>({
    companyId: companyId || "",
    name: { en: "", ar: "" },
    description: { en: "", ar: "" },
  });

  useEffect(() => {
    if (companyData) {
      const c: any = (companyData as any).company ?? (companyData as any).data ?? companyData;
      setCompanyForm({
        name: {
          en: typeof c.name === 'object' ? c.name.en || '' : toPlainString(c.name) || '',
          ar: typeof c.name === 'object' ? c.name.ar || '' : '',
        },
        description: {
          en: typeof c.description === 'object' ? c.description.en || '' : toPlainString(c.description) || '',
          ar: typeof c.description === 'object' ? c.description.ar || '' : '',
        },
        address: Array.isArray(c.address) && c.address.length > 0 ? c.address.map((a: any) => ({
          en: a.en || '',
          ar: a.ar || '',
          location: a.location || ''
        })) : [{ en: "", ar: "", location: "" }],
        contactEmail: c.contactEmail || "",
        phone: c.phone || "",
        website: c.website || "",
        logoPath: c.logoPath || "",
        isActive: c.isActive ?? true,
      });
    }
  }, [companyData]);

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || "";
      const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_PRESET as string) || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const result = await res.json();
      setCompanyForm(prev => ({ ...prev, logoPath: result.secure_url }));
    } catch (err) {
      Swal.fire(t('uploadFailed', 'companies'), "Could not process brand asset", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setIsSaving(true);
    try {
      await updateCompanyMutation.mutateAsync({ id: companyId!, data: companyForm as any });
      setIsEditingCompany(false);
      Swal.fire({ title: t('profileUpdated', 'companies'), icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire(t('updateFailedTitle', 'companies'), err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddress = () => {
    setCompanyForm(prev => ({
      ...prev,
      address: [...prev.address, { en: "", ar: "", location: "" }]
    }));
  };

  const handleDeleteDepartment = async (deptId: string) => {
    const result = await Swal.fire({
      title: t('eliminateDept', 'companies'),
      text: t('eliminateDeptDesc', 'companies'),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t('dissolveConfirm', 'companies')
    });
    if (result.isConfirmed) {
      try {
        await deleteDepartmentMutation.mutateAsync(deptId);
        Swal.fire({ title: t('dissolved', 'companies'), icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire(t('error', 'companies'), err.message, "error");
      }
    }
  };

  const handleDeptSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingDeptId) {
        await updateDepartmentMutation.mutateAsync({ id: editingDeptId, data: departmentForm });
      } else {
        await createDepartmentMutation.mutateAsync(departmentForm);
      }
      setShowDeptModal(false);
      setEditingDeptId(null);
      setDepartmentForm({ companyId: companyId!, name: { en: "", ar: "" }, description: { en: "", ar: "" } });
      Swal.fire({ title: editingDeptId ? t('updatedTitle', 'companies') : t('createdTitle', 'companies'), icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire(t('error', 'companies'), err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t('previewPageTitle', 'companies', { name: locale === 'ar' ? (companyForm.name?.ar || companyForm.name?.en || '') : (companyForm.name?.en || companyForm.name?.ar || '') })} description={t('previewPageDesc', 'companies')} />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <PageBreadcrumb pageTitle={t('previewBreadcrumb', 'companies')} />
        </div>

        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <button onClick={() => navigate("/companies")} className="size-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 active:scale-90 transition-all shrink-0">
              <AngleLeftIcon className="size-5" />
            </button>
            <div className="size-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 border-2 border-white dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {companyForm.logoPath ? <img src={companyForm.logoPath} alt="" className="w-full h-full object-contain" /> : <Building2 className="size-10 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                {locale === 'ar' ? (companyForm.name?.ar || companyForm.name?.en || '') : (companyForm.name?.en || companyForm.name?.ar || '')}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${companyForm.isActive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                  {companyForm.isActive ? t('active', 'companies') : t('disabled', 'companies')}
                </span>
                <span className="text-slate-400 text-xs">{t('activeDepartments', 'companies', { count: departments.length })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && (
                <button 
                  onClick={() => isEditingCompany ? handleSaveCompany() : setIsEditingCompany(true)}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-105 active:scale-95 ${isEditingCompany ? "bg-brand-500 text-white shadow-brand-500/20" : "bg-white dark:bg-white/5 border border-white/20 dark:border-white/10"}`}
                >
                  {isSaving ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isEditingCompany ? <Save className="size-4" /> : <PencilIcon className="size-4" />)}
                  {isEditingCompany ? t('saveChanges', 'companies') : t('edit', 'companies')}
                </button>
              )}
              {isEditingCompany && (
                <button onClick={() => setIsEditingCompany(false)} className="size-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                  <X className="size-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-white/10">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-6 py-4 text-sm font-bold transition-all relative ${
                    activeTab === tab.id
                      ? "text-brand-500"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className={`size-[18px] ${activeTab === tab.id ? "text-brand-500" : ""}`} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-500 rounded-full" />
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <UserIcon className="size-[18px] text-brand-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Company Identity</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">{t('legalNameEn', 'companies')}</label>
                      <input 
                        readOnly={!isEditingCompany}
                        value={companyForm.name.en}
                        onChange={(e) => setCompanyForm(p => ({ ...p, name: { ...p.name, en: e.target.value } }))}
                        className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm font-medium focus:ring-2 ring-brand-500/50 transition-all outline-none"
                      />
                    </div>
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">{t('legalNameAr', 'companies')}</label>
                      <input 
                        readOnly={!isEditingCompany}
                        dir="rtl"
                        value={companyForm.name.ar}
                        onChange={(e) => setCompanyForm(p => ({ ...p, name: { ...p.name, ar: e.target.value } }))}
                        className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm font-medium focus:ring-2 ring-brand-500/50 transition-all outline-none"
                      />
                    </div>
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">{t('corporateBrandAsset', 'companies')}</label>
                      <div className="relative aspect-square w-full max-w-[120px] mx-auto rounded-lg border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-3 transition-all hover:border-brand-500/50 overflow-hidden bg-white dark:bg-white/10">
                        {companyForm.logoPath ? (
                          <>
                            <img src={companyForm.logoPath} alt="" className="absolute inset-0 w-full h-full object-contain p-2" />
                            {isEditingCompany && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white/20 backdrop-blur-md p-2.5 rounded-lg border border-white/20 shadow-lg">
                                  <Upload className="size-4 text-white" />
                                  <input type="file" className="hidden" onChange={handleLogoChange} />
                                </label>
                              </div>
                            )}
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-1.5">
                            <ImageIcon className="size-6 text-slate-300" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">{t('uploadCompanyMark', 'companies')}</span>
                            <input type="file" className="hidden" onChange={handleLogoChange} disabled={!isEditingCompany} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <InfoIcon className="size-[18px] text-brand-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Description</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">{t('companyDescEnTitle', 'companies')}</label>
                      <textarea 
                        readOnly={!isEditingCompany}
                        value={companyForm.description.en}
                        onChange={(e) => setCompanyForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
                        rows={4}
                        className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm font-medium focus:ring-2 ring-brand-500/50 transition-all outline-none resize-none"
                      />
                    </div>
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">{t('companyDescArTitle', 'companies')}</label>
                      <textarea 
                        readOnly={!isEditingCompany}
                        dir="rtl"
                        value={companyForm.description.ar}
                        onChange={(e) => setCompanyForm(p => ({ ...p, description: { ...p.description, ar: e.target.value } }))}
                        rows={4}
                        className="w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm font-medium focus:ring-2 ring-brand-500/50 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contact-locations" && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <MailIcon className="size-[18px] text-brand-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('contact', 'companies')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Mail className="size-4 text-brand-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('mailAddress', 'companies')}</span>
                      </div>
                      <input 
                        readOnly={!isEditingCompany}
                        value={companyForm.contactEmail}
                        onChange={(e) => setCompanyForm(p => ({ ...p, contactEmail: e.target.value }))}
                        className="w-full bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-300"
                        placeholder="email@company.com"
                      />
                    </div>
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Phone className="size-4 text-brand-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('phone', 'companies')}</span>
                      </div>
                      <input 
                        readOnly={!isEditingCompany}
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-300"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Globe className="size-4 text-brand-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('website', 'companies')}</span>
                      </div>
                      <input 
                        readOnly={!isEditingCompany}
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm(p => ({ ...p, website: e.target.value }))}
                        className="w-full bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-300"
                        placeholder="www.company.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 mb-5">
                    <MapPin className="size-[18px] text-brand-500" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('location', 'companies')}</h3>
                  </div>
                  <div className="space-y-3">
                    {companyForm.address.map((addr, idx) => (
                      <div key={idx} className="bg-slate-50/60 dark:bg-white/5 rounded-xl p-5">
                        {isEditingCompany ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <MapPin className="size-4 text-slate-400 shrink-0" />
                              <input 
                                placeholder={t('companyAddressEn', 'companies')} 
                                value={addr.en} 
                                onChange={(e) => {
                                  const newAddrs = [...companyForm.address];
                                  newAddrs[idx].en = e.target.value;
                                  setCompanyForm(p => ({ ...p, address: newAddrs }));
                                }}
                                className="flex-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-sm font-medium outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="size-4 text-slate-400 shrink-0" />
                              <input 
                                dir="rtl"
                                placeholder={t('companyAddressAr', 'companies')} 
                                value={addr.ar} 
                                onChange={(e) => {
                                  const newAddrs = [...companyForm.address];
                                  newAddrs[idx].ar = e.target.value;
                                  setCompanyForm(p => ({ ...p, address: newAddrs }));
                                }}
                                className="flex-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-sm font-medium outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="size-4 text-slate-400 shrink-0" />
                              <input 
                                placeholder={t('googleMapsUrl', 'companies')} 
                                value={addr.location} 
                                onChange={(e) => {
                                  const newAddrs = [...companyForm.address];
                                  newAddrs[idx].location = e.target.value;
                                  setCompanyForm(p => ({ ...p, address: newAddrs }));
                                }}
                                className="flex-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs font-medium outline-none opacity-60"
                              />
                              {companyForm.address.length > 1 && (
                                <button onClick={() => setCompanyForm(p => ({ ...p, address: p.address.filter((_, i) => i !== idx) }))} className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0">
                                  <TrashBinIcon className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="size-9 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                              <MapPin className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{t('mainCampus', 'companies')}</span>
                                {idx > 0 && <span className="text-[10px] font-medium text-slate-400">• Location {idx + 1}</span>}
                              </div>
                              <p className="text-sm font-medium">{locale === 'ar' ? (toPlainString(addr.ar) || toPlainString(addr.en) || '') : (toPlainString(addr.en) || toPlainString(addr.ar) || '')}</p>
                              {addr.location && (
                                <p className="text-xs text-slate-400 mt-1.5 truncate flex items-center gap-1.5">
                                  <Globe className="size-3 shrink-0" />
                                  {addr.location}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isEditingCompany && (
                      <button onClick={handleAddAddress} className="w-full py-3.5 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:border-brand-500/50 hover:text-brand-500 transition-all flex items-center justify-center gap-2">
                        <PlusIcon className="size-4" /> {t('addLocationBtn', 'companies')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "departments" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-slate-500">{t('activeDepartments', 'companies', { count: departments.length })}</p>
                  {canEdit && (
                    <button 
                      onClick={() => { setEditingDeptId(null); setDepartmentForm({ companyId: companyId!, name: { en: "", ar: "" }, description: { en: "", ar: "" } }); setShowDeptModal(true); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <PlusIcon className="size-3.5" /> {t('createDepartment', 'companies')}
                    </button>
                  )}
                </div>

                {departments.length === 0 ? (
                  <div className="text-center py-14 text-slate-400 text-sm bg-slate-50/50 dark:bg-white/5 rounded-xl">
                    <BoxCubeIcon className="size-10 mx-auto mb-3 text-slate-300" />
                    {t('noDepartments', 'companies') || 'No departments found'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {departments.map((dept: any) => (
                      <div key={dept._id} className="group bg-slate-50/60 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-4 hover:shadow-md hover:border-brand-500/20 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-brand-500/10 group-hover:text-brand-500 transition-all shrink-0">
                              <Briefcase className="size-[18px]" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {locale === 'ar' ? (toPlainString(dept.name?.ar) || toPlainString(dept.name?.en) || '') : (toPlainString(dept.name?.en) || toPlainString(dept.name?.ar) || '')}
                              </h4>
                              {locale === 'ar' ? null : <p className="text-[10px] font-medium text-brand-500 truncate">{toPlainString(dept.name?.ar)}</p>}
                              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                {locale === 'ar' ? (toPlainString(dept.description?.ar) || toPlainString(dept.description?.en) || t('noOverview', 'companies')) : (toPlainString(dept.description?.en) || toPlainString(dept.description?.ar) || t('noOverview', 'companies'))}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            <button 
                              onClick={() => {
                                setEditingDeptId(dept._id);
                                setDepartmentForm({
                                  companyId: companyId!,
                                  name: { en: dept.name?.en || "", ar: dept.name?.ar || "" },
                                  description: { en: dept.description?.en || "", ar: dept.description?.ar || "" }
                                });
                                setShowDeptModal(true);
                              }}
                              className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                            >
                              <PencilIcon className="size-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteDepartment(dept._id)}
                              className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                            >
                              <TrashBinIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowDeptModal(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full max-w-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">{editingDeptId ? t('editDepartment', 'companies') : t('createDepartmentTitle', 'companies')}</h3>
                <button onClick={() => setShowDeptModal(false)} className="size-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 active:scale-90 transition-all">
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleDeptSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={locale === 'ar' ? 'order-2' : 'order-1'}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('deptDivisionNameEn', 'companies')}</label>
                    <input 
                      required
                      value={departmentForm.name.en}
                      onChange={(e) => setDepartmentForm(p => ({ ...p, name: { ...p.name, en: e.target.value } }))}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-xl p-3.5 text-sm font-medium focus:ring-2 ring-brand-500/50 outline-none"
                    />
                  </div>
                  <div className={locale === 'ar' ? 'order-1' : 'order-2'}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('deptDivisionNameAr', 'companies')}</label>
                    <input 
                      required
                      dir="rtl"
                      value={departmentForm.name.ar}
                      onChange={(e) => setDepartmentForm(p => ({ ...p, name: { ...p.name, ar: e.target.value } }))}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-xl p-3.5 text-sm font-medium focus:ring-2 ring-brand-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={locale === 'ar' ? 'order-2' : 'order-1'}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('deptDescEn', 'companies')}</label>
                    <textarea 
                      value={departmentForm.description.en}
                      onChange={(e) => setDepartmentForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
                      rows={3}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-xl p-3.5 text-sm font-medium focus:ring-2 ring-brand-500/50 outline-none resize-none"
                    />
                  </div>
                  <div className={locale === 'ar' ? 'order-1' : 'order-2'}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{t('deptDescAr', 'companies')}</label>
                    <textarea 
                      dir="rtl"
                      value={departmentForm.description.ar}
                      onChange={(e) => setDepartmentForm(p => ({ ...p, description: { ...p.description, ar: e.target.value } }))}
                      rows={3}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-xl p-3.5 text-sm font-medium focus:ring-2 ring-brand-500/50 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {isSaving ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="size-4" />}
                    {editingDeptId ? t('saveChanges', 'companies') : t('createDepartment', 'companies')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowDeptModal(false)}
                    className="px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-sm"
                  >
                    {t('cancel', 'common')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
