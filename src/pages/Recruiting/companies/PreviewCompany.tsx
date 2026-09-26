import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState, useEffect, useId } from "react";
import Swal from '../../../utils/swal';
import { Link, useParams } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { Modal } from "../../../components/ui/modal";
import {
  ArrowLeft,
  Building,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
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
  Table,
  Td,
  Th,
  focusRing,
  inputClass,
  rowClass,
} from "../../../components/ui/kit";

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

export default function PreviewCompany() {
  const { companyId } = useParams<{ companyId: string }>();
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

  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>({
    companyId: companyId || "",
    name: { en: "", ar: "" },
    description: { en: "", ar: "" },
  });

  const loadCompanyForm = () => {
    if (!companyData) return;
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
  };

  useEffect(loadCompanyForm, [companyData]);

  // Cancel throws away unsaved edits.
  const cancelEditing = () => {
    loadCompanyForm();
    setIsEditingCompany(false);
  };

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
    } catch {
      Swal.fire(t('uploadFailed', 'companies'), t('uploadFailedText', 'companies'), "error");
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

  if (loading) return <LoadingSpinner fullPage />;

  const pick = (en?: string, ar?: string) =>
    locale === 'ar' ? (toPlainString(ar) || toPlainString(en) || '') : (toPlainString(en) || toPlainString(ar) || '');
  const companyName = pick(companyForm.name?.en, companyForm.name?.ar);

  const openDeptModal = (dept?: any) => {
    setEditingDeptId(dept?._id ?? null);
    setDepartmentForm({
      companyId: companyId!,
      name: { en: dept?.name?.en || "", ar: dept?.name?.ar || "" },
      description: { en: dept?.description?.en || "", ar: dept?.description?.ar || "" },
    });
    setShowDeptModal(true);
  };

  const updateAddress = (idx: number, key: "en" | "ar" | "location", value: string) => {
    const newAddrs = [...companyForm.address];
    newAddrs[idx][key] = value;
    setCompanyForm(p => ({ ...p, address: newAddrs }));
  };

  const back = (
    <Link
      to="/companies"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('backToCompanies', 'companies')}
    </Link>
  );

  const logo = (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {companyForm.logoPath ? (
        <img src={companyForm.logoPath} alt="" className="size-full object-cover" />
      ) : (
        companyName.charAt(0).toUpperCase() || <Building2 className="size-5" />
      )}
    </span>
  );

  return (
    <>
      <PageMeta title={t('previewPageTitle', 'companies', { name: companyName })} description={t('previewPageDesc', 'companies')} />
      <PageShell
        back={back}
        title={
          <span className="flex items-center gap-3">
            {logo}
            <span className="min-w-0 truncate">{companyName}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={companyForm.isActive ? "green" : "slate"}>
              {companyForm.isActive ? t('active', 'companies') : t('disabled', 'companies')}
            </Badge>
            <span>{t('activeDepartments', 'companies', { count: departments.length })}</span>
          </span>
        }
        actions={
          canEdit &&
          (isEditingCompany ? (
            <>
              <Button onClick={cancelEditing} disabled={isSaving}>{t('cancel', 'companies')}</Button>
              <Button variant="primary" onClick={handleSaveCompany} loading={isSaving}>
                {t('saveChanges', 'companies')}
              </Button>
            </>
          ) : (
            <Button icon={<Pencil className="size-4" />} onClick={() => setIsEditingCompany(true)}>
              {t('edit', 'companies')}
            </Button>
          ))
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardToolbar>
                <SectionTitle icon={<Building2 className="size-4" />}>{t('companyInformationTitle', 'companies')}</SectionTitle>
              </CardToolbar>
              {isEditingCompany ? (
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  <Field label={t('legalNameEn', 'companies')} htmlFor="pc-name-en">
                    <input
                      id="pc-name-en"
                      dir="ltr"
                      value={companyForm.name.en}
                      onChange={(e) => setCompanyForm(p => ({ ...p, name: { ...p.name, en: e.target.value } }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('legalNameAr', 'companies')} htmlFor="pc-name-ar">
                    <input
                      id="pc-name-ar"
                      dir="rtl"
                      value={companyForm.name.ar}
                      onChange={(e) => setCompanyForm(p => ({ ...p, name: { ...p.name, ar: e.target.value } }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('companyDescEnTitle', 'companies')} htmlFor="pc-desc-en">
                    <textarea
                      id="pc-desc-en"
                      dir="ltr"
                      rows={4}
                      value={companyForm.description.en}
                      onChange={(e) => setCompanyForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                  <Field label={t('companyDescArTitle', 'companies')} htmlFor="pc-desc-ar">
                    <textarea
                      id="pc-desc-ar"
                      dir="rtl"
                      rows={4}
                      value={companyForm.description.ar}
                      onChange={(e) => setCompanyForm(p => ({ ...p, description: { ...p.description, ar: e.target.value } }))}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t('corporateBrandAsset', 'companies')} hint={t('logoHint', 'companies')}>
                      <div className="flex items-center gap-4">
                        {logo}
                        <label
                          className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${isSaving ? "pointer-events-none opacity-50" : ""}`}
                        >
                          <Upload className="size-4" />
                          {t('uploadCompanyMark', 'companies')}
                          <input type="file" accept="image/*" className="sr-only" onChange={handleLogoChange} disabled={isSaving} />
                        </label>
                      </div>
                    </Field>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
                  <Detail label={t('legalNameEn', 'companies')} dir="ltr">{companyForm.name.en}</Detail>
                  <Detail label={t('legalNameAr', 'companies')} dir="rtl">{companyForm.name.ar}</Detail>
                  <Detail label={t('companyDescEnTitle', 'companies')} dir="ltr">{companyForm.description.en}</Detail>
                  <Detail label={t('companyDescArTitle', 'companies')} dir="rtl">{companyForm.description.ar}</Detail>
                </dl>
              )}
            </Card>

            <Card>
              <CardToolbar>
                <SectionTitle icon={<Building className="size-4" />}>{t('departmentSection', 'companies')}</SectionTitle>
                {canEdit && (
                  <Button onClick={() => openDeptModal()} icon={<Plus className="size-4" />}>
                    {t('createDepartment', 'companies')}
                  </Button>
                )}
              </CardToolbar>
              {departments.length === 0 ? (
                <EmptyState
                  icon={<Building className="size-6" />}
                  title={t('noDepartmentsTitle', 'companies')}
                  text={t('noDepartmentsText', 'companies')}
                />
              ) : (
                <Table minWidth={520}>
                  <thead>
                    <tr>
                      <Th>{t('colDepartment', 'companies')}</Th>
                      <Th>{t('colDescription', 'companies')}</Th>
                      <Th align="end"><span className="sr-only">{t('colActions', 'companies')}</span></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept: any) => {
                      const deptName = pick(dept.name?.en, dept.name?.ar) || toPlainString(dept.name);
                      const deptDesc = pick(dept.description?.en, dept.description?.ar);
                      return (
                        <tr key={dept._id} className={rowClass}>
                          <Td>
                            <p className="font-medium text-slate-900 dark:text-white">{deptName}</p>
                            {locale !== 'ar' && dept.name?.ar && (
                              <p className="text-xs text-slate-500 dark:text-slate-400"><bdi>{toPlainString(dept.name.ar)}</bdi></p>
                            )}
                          </Td>
                          <Td className="max-w-md">
                            <p className="line-clamp-2 text-slate-500 dark:text-slate-400">{deptDesc || t('noOverview', 'companies')}</p>
                          </Td>
                          <Td align="end">
                            <div className="flex justify-end gap-1">
                              <IconButton label={t('editDepartmentLabel', 'companies', { name: deptName })} onClick={() => openDeptModal(dept)}>
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton tone="danger" label={t('deleteDepartmentLabel', 'companies', { name: deptName })} onClick={() => handleDeleteDepartment(dept._id)}>
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardToolbar>
                <SectionTitle icon={<Mail className="size-4" />}>{t('contact', 'companies')}</SectionTitle>
              </CardToolbar>
              {isEditingCompany ? (
                <div className="space-y-4 p-4">
                  <Field label={t('mailAddress', 'companies')} htmlFor="pc-email">
                    <input
                      id="pc-email"
                      type="email"
                      dir="ltr"
                      value={companyForm.contactEmail}
                      onChange={(e) => setCompanyForm(p => ({ ...p, contactEmail: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('phone', 'companies')} htmlFor="pc-phone">
                    <input
                      id="pc-phone"
                      type="tel"
                      dir="ltr"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm(p => ({ ...p, phone: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('website', 'companies')} htmlFor="pc-website">
                    <input
                      id="pc-website"
                      type="url"
                      dir="ltr"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm(p => ({ ...p, website: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  <ContactRow icon={<Mail className="size-4" />} label={t('mailAddress', 'companies')} value={companyForm.contactEmail} href={companyForm.contactEmail ? `mailto:${companyForm.contactEmail}` : undefined} />
                  <ContactRow icon={<Phone className="size-4" />} label={t('phone', 'companies')} value={companyForm.phone} href={companyForm.phone ? `tel:${companyForm.phone}` : undefined} />
                  <ContactRow icon={<Globe className="size-4" />} label={t('website', 'companies')} value={companyForm.website} href={companyForm.website ? (/^https?:\/\//i.test(companyForm.website) ? companyForm.website : `https://${companyForm.website}`) : undefined} external />
                </ul>
              )}
            </Card>

            <Card>
              <CardToolbar>
                <SectionTitle icon={<MapPin className="size-4" />}>{t('location', 'companies')}</SectionTitle>
              </CardToolbar>
              {isEditingCompany ? (
                <div className="space-y-4 p-4">
                  {companyForm.address.map((addr, idx) => (
                    <div key={idx} className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t('locationNumber', 'companies', { n: idx + 1 })}
                        </p>
                        {companyForm.address.length > 1 && (
                          <IconButton
                            tone="danger"
                            label={t('dissolveLocation', 'companies')}
                            onClick={() => setCompanyForm(p => ({ ...p, address: p.address.filter((_, i) => i !== idx) }))}
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        )}
                      </div>
                      <input
                        dir="ltr"
                        aria-label={t('companyAddressEn', 'companies')}
                        placeholder={t('companyAddressEn', 'companies')}
                        value={addr.en}
                        onChange={(e) => updateAddress(idx, "en", e.target.value)}
                        className={inputClass}
                      />
                      <input
                        dir="rtl"
                        aria-label={t('companyAddressAr', 'companies')}
                        placeholder={t('companyAddressAr', 'companies')}
                        value={addr.ar}
                        onChange={(e) => updateAddress(idx, "ar", e.target.value)}
                        className={inputClass}
                      />
                      <input
                        dir="ltr"
                        aria-label={t('googleMapsUrl', 'companies')}
                        placeholder={t('googleMapsUrl', 'companies')}
                        value={addr.location}
                        onChange={(e) => updateAddress(idx, "location", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <Button onClick={handleAddAddress} icon={<Plus className="size-4" />} className="w-full">
                    {t('addLocationBtn', 'companies')}
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {companyForm.address.map((addr, idx) => {
                    const text = pick(addr.en, addr.ar);
                    return (
                      <li key={idx} className="space-y-1 p-4">
                        <p className={`text-sm ${text ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{text || "—"}</p>
                        {locale !== 'ar' && addr.ar && (
                          <p className="text-xs text-slate-500 dark:text-slate-400"><bdi>{toPlainString(addr.ar)}</bdi></p>
                        )}
                        {/^https?:\/\//i.test(addr.location) ? (
                          <a
                            href={addr.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 rounded text-xs font-medium text-brand-600 hover:underline dark:text-brand-400 ${focusRing}`}
                          >
                            <MapPin className="size-3.5" />
                            {t('openInMaps', 'companies')}
                          </a>
                        ) : addr.location ? (
                          // Landmark notes rather than a link.
                          <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="size-3.5 shrink-0" />
                            {addr.location}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </PageShell>

      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        className="mx-4 max-w-xl overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
      >
        <DepartmentModalForm
          isEdit={Boolean(editingDeptId)}
          form={departmentForm}
          setForm={setDepartmentForm}
          onSubmit={handleDeptSubmit}
          onCancel={() => setShowDeptModal(false)}
          saving={isSaving}
        />
      </Modal>
    </>
  );
}

function Detail({ label, dir, children }: { label: ReactNode; dir?: "ltr" | "rtl"; children?: string }) {
  const value = toPlainString(children);
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`whitespace-pre-line text-sm ${value ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
        {value ? <bdi dir={dir}>{value}</bdi> : "—"}
      </dd>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {value && href ? (
          <a
            href={href}
            dir="ltr"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`inline-flex max-w-full items-center gap-1 break-all rounded text-sm font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400 ${focusRing}`}
          >
            {value}
            {external && <ExternalLink className="size-3.5 shrink-0" />}
          </a>
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </div>
    </li>
  );
}

function DepartmentModalForm({
  isEdit,
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
}: {
  isEdit: boolean;
  form: DepartmentForm;
  setForm: React.Dispatch<React.SetStateAction<DepartmentForm>>;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    // The shared Modal pads its scroll box; -m-4 cancels that so the header
    // and footer sit flush.
    <form onSubmit={onSubmit} className="-m-4 flex max-h-[85vh] flex-col">
      <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? t('editDepartment', 'companies') : t('createDepartmentTitle', 'companies')}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('deptModalSubtitle', 'companies')}</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <Field label={t('deptDivisionNameEn', 'companies')} htmlFor={`${id}-name-en`}>
          <input
            id={`${id}-name-en`}
            required
            dir="ltr"
            autoFocus
            value={form.name.en}
            onChange={(e) => setForm(p => ({ ...p, name: { ...p.name, en: e.target.value } }))}
            className={inputClass}
          />
        </Field>
        <Field label={t('deptDivisionNameAr', 'companies')} htmlFor={`${id}-name-ar`}>
          <input
            id={`${id}-name-ar`}
            required
            dir="rtl"
            value={form.name.ar}
            onChange={(e) => setForm(p => ({ ...p, name: { ...p.name, ar: e.target.value } }))}
            className={inputClass}
          />
        </Field>
        <Field label={t('deptDescEn', 'companies')} htmlFor={`${id}-desc-en`} optional>
          <textarea
            id={`${id}-desc-en`}
            dir="ltr"
            rows={4}
            value={form.description.en}
            onChange={(e) => setForm(p => ({ ...p, description: { ...p.description, en: e.target.value } }))}
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field label={t('deptDescAr', 'companies')} htmlFor={`${id}-desc-ar`} optional>
          <textarea
            id={`${id}-desc-ar`}
            dir="rtl"
            rows={4}
            value={form.description.ar}
            onChange={(e) => setForm(p => ({ ...p, description: { ...p.description, ar: e.target.value } }))}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
        <Button onClick={onCancel}>{t('cancel', 'companies')}</Button>
        <Button type="submit" variant="primary" loading={saving}>
          {isEdit ? t('saveChanges', 'companies') : t('createDepartment', 'companies')}
        </Button>
      </div>
    </form>
  );
}
