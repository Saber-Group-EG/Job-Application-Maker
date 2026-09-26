import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "../../../context/LocaleContext";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import { ValidationErrorAlert } from "../../../components/common/ValidationErrorAlert";
import {
  useCreateUser,
  useRoles,
  usePermissions,
  useCompanies,
  useDepartments,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import { ArrowLeft, Building2, Plus, Shield, Trash2, UserRound } from "lucide-react";
import {
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  IconButton,
  PageShell,
  SectionTitle,
  Switch,
  focusRing,
  inputClass,
  selectClass,
} from "../../../components/ui/kit";
import {
  DepartmentPicker,
  UserPermissionsEditor,
  type UserPermission,
} from "./components/UserAccessEditors";

type CompanyAssignment = {
  companyId: string;
  departments: string[];
  isPrimary: boolean;
};

export default function CreateUser() {
  const { t } = useLocale();
  const navigate = useNavigate();

  const { data: roles = [] } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();

  const createUserMutation = useCreateUser();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roleId: "",
    isActive: true,
    companies: [] as CompanyAssignment[],
  });

  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  const handleAddCompany = () => {
    setFormData((prev) => ({
      ...prev,
      companies: [
        ...prev.companies,
        { companyId: "", departments: [], isPrimary: prev.companies.length === 0 },
      ],
    }));
  };

  const handleRemoveCompany = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      companies: prev.companies.filter((_, i) => i !== index),
    }));
  };

  const updateCompany = (
    index: number,
    field: keyof CompanyAssignment,
    value: CompanyAssignment[keyof CompanyAssignment]
  ) => {
    setFormData((prev) => {
      const nextCompanies = [...prev.companies];
      nextCompanies[index] = { ...nextCompanies[index], [field]: value } as CompanyAssignment;

      if (field === "isPrimary" && value === true) {
        nextCompanies.forEach((company, i) => {
          if (i !== index) company.isPrimary = false;
        });
      }

      return { ...prev, companies: nextCompanies };
    });
  };

  const getId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || "";
  };

  const getAvailableDepartmentIds = (companyId: string) => {
    if (!companyId) return new Set<string>();

    return new Set(
      departments
        .filter((d: any) => String(getId(d?.companyId)) === String(companyId))
        .map((d: any) => String(d._id))
    );
  };

  const getDefaultAccessForPermission = (permissionId: string) => {
    const permissionObj = permissions.find((p: any) => p._id === permissionId);
    const actions = Array.isArray(permissionObj?.actions) && permissionObj.actions.length > 0
      ? permissionObj.actions
      : ["read", "write", "create"];

    return Array.from(new Set(actions.map((action: string) => String(action).toLowerCase())));
  };

  const normalizeRolePermissions = (role: any): UserPermission[] => {
    const rawPermissions = Array.isArray(role?.permissions) ? role.permissions : [];
    const merged = new Map<string, Set<string>>();

    rawPermissions.forEach((perm: any) => {
      const permissionId =
        typeof perm === "string"
          ? perm
          : typeof perm?.permission === "string"
            ? perm.permission
            : perm?.permission?._id || "";

      if (!permissionId) return;

      const accessList = Array.isArray(perm?.access) && perm.access.length > 0
        ? perm.access.map((action: string) => String(action).toLowerCase())
        : getDefaultAccessForPermission(permissionId);

      const existing = merged.get(permissionId) || new Set<string>();
      accessList.forEach((action: string) => existing.add(action));
      merged.set(permissionId, existing);
    });

    return Array.from(merged.entries()).map(([permission, accessSet]) => ({
      permission,
      access: Array.from(accessSet),
    }));
  };

  const handleRoleChange = (nextRoleId: string) => {
    setFormData((prev) => ({ ...prev, roleId: nextRoleId }));
    const selectedRole = roles.find((role: any) => role._id === nextRoleId);
    setUserPermissions(normalizeRolePermissions(selectedRole));
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError("");
  setIsSaving(true);

  try {
    if (!formData.fullName || !formData.email || !formData.password || !formData.roleId) {
      throw new Error(t('createErrorRequired', 'users'));
    }

    const normalizedCompanies = formData.companies
      .filter((assignment) => Boolean(assignment.companyId))
      .map((assignment) => {
        const allowedDeptIds = getAvailableDepartmentIds(assignment.companyId);
        const validDepartments = assignment.departments.filter((deptId) =>
          allowedDeptIds.has(String(deptId))
        );

        return {
          companyId: assignment.companyId,
          departments: validDepartments,
        };
      });

    await createUserMutation.mutateAsync({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      roleId: formData.roleId,
      isActive: formData.isActive,
      companies: normalizedCompanies,
      permissions: userPermissions.map((item) => ({
        permission: item.permission,
        access: item.access,
      })),
    });

    await Swal.fire({
      title: t('createSuccessTitle', 'users'),
      text: t('createSuccessText', 'users'),
      icon: "success",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: "rgba(0,0,0,0.4)",
      confirmButtonColor: "#10b981",
    });

    navigate("/users");
  } catch (err: any) {
    // Extract detailed error message
    let errorMessage = t('createErrorGeneric', 'users');
    
    // Try to get detailed error from response
    if (err.response?.data) {
      const responseData = err.response.data;
      
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.error?.message) {
        errorMessage = responseData.error.message;
      } else if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        errorMessage = responseData.errors[0].message || responseData.errors[0];
      } else if (Array.isArray(responseData.details) && responseData.details.length > 0) {
        errorMessage = responseData.details[0].message || responseData.details[0];
      }
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    setFormError(errorMessage);
    
    // Show error Swal alert
    await Swal.fire({
      title: t('createErrorTitle', 'users'),
      text: errorMessage,
      icon: "error",
      confirmButtonText: t('ok', 'common'),
      confirmButtonColor: "#ef4444",
      background: "rgba(255, 255, 255, 0.9)",
      backdrop: "rgba(0,0,0,0.4)",
    });
  } finally {
    setIsSaving(false);
  }
};

  const back = (
    <Link
      to="/users"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('createBackButton', 'users')}
    </Link>
  );

  return (
    <>
      <PageMeta
        title={t('createMetaTitle', 'users')}
        description={t('createMetaDescription', 'users')}
      />
      <PageShell back={back} title={t('createCredential', 'users')} subtitle={t('createAddPersonnel', 'users')}>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {formError && <ValidationErrorAlert error={formError} onDismiss={() => setFormError("")} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardToolbar>
                <SectionTitle icon={<UserRound className="size-4" />}>{t('createAuthLayer', 'users')}</SectionTitle>
              </CardToolbar>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label={t('createFullName', 'users')} htmlFor="cu-name">
                  <input
                    id="cu-name"
                    type="text"
                    required
                    autoComplete="off"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputClass}
                    placeholder={t('createFullNamePlaceholder', 'users')}
                  />
                </Field>
                <Field label={t('createDigitalMailbox', 'users')} htmlFor="cu-email">
                  <input
                    id="cu-email"
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="off"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder={t('createEmailPlaceholder', 'users')}
                  />
                </Field>
                <Field label={t('createPassword', 'users')} htmlFor="cu-password" hint={t('createPasswordHint', 'users')}>
                  <input
                    id="cu-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputClass}
                    placeholder={t('createPasswordPlaceholder', 'users')}
                  />
                </Field>
                <Field label={t('createCommLine', 'users')} htmlFor="cu-phone" optional>
                  <input
                    id="cu-phone"
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder={t('createPhonePlaceholder', 'users')}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardToolbar>
                <SectionTitle icon={<Shield className="size-4" />}>{t('createSecurityAccess', 'users')}</SectionTitle>
              </CardToolbar>
              <div className="space-y-4 p-4">
                <Field label={t('createAssignedRole', 'users')} htmlFor="cu-role" hint={t('createRoleHint', 'users')}>
                  <select
                    id="cu-role"
                    required
                    value={formData.roleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">{t('createSelectRole', 'users')}</option>
                    {roles.map((r: any) => (
                      <option key={r._id} value={r._id}>
                        {toPlainString(r.name)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('createActivityStatus', 'users')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('createActivityHint', 'users')}</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onChange={(next) => setFormData({ ...formData, isActive: next })}
                    label={t('createActivityStatus', 'users')}
                  />
                </div>
              </div>
            </Card>
          </div>

          <UserPermissionsEditor
            catalog={permissions}
            value={userPermissions}
            onChange={setUserPermissions}
            getDefaultAccess={getDefaultAccessForPermission}
          />

          <Card>
            <CardToolbar>
              <div>
                <SectionTitle icon={<Building2 className="size-4" />}>{t('createCompanyAccess', 'users')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('createCompanyAccessHint', 'users')}</p>
              </div>
              <Button onClick={handleAddCompany} icon={<Plus className="size-4" />}>
                {t('createAddNode', 'users')}
              </Button>
            </CardToolbar>

            {formData.companies.length === 0 ? (
              <EmptyState
                icon={<Building2 className="size-6" />}
                title={t('createNoNodes', 'users')}
                text={t('createNoNodesHint', 'users')}
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {formData.companies.map((assignment, idx) => {
                  const selectedCompanyId = String(assignment.companyId || "");
                  const availableDepts = departments.filter(
                    (d: any) => String(getId(d?.companyId)) === selectedCompanyId
                  );
                  const companyName =
                    toPlainString(companies.find((c: any) => c._id === assignment.companyId)?.name) ||
                    t('createLinkedCompany', 'users');

                  return (
                    <li key={idx} className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] lg:items-start">
                      <Field label={t('createLinkedCompany', 'users')} htmlFor={`cu-company-${idx}`}>
                        <select
                          id={`cu-company-${idx}`}
                          value={assignment.companyId}
                          onChange={(e) => {
                            const nextCompanyId = e.target.value;
                            updateCompany(idx, "companyId", nextCompanyId);
                            updateCompany(idx, "departments", []);
                          }}
                          className={selectClass}
                        >
                          <option value="">{t('createSelectCompany', 'users')}</option>
                          {companies.map((c: any) => (
                            <option key={c._id} value={c._id}>
                              {toPlainString(c.name)}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {t('createDepartmentAccess', 'users')}
                        </p>
                        {assignment.companyId ? (
                          <DepartmentPicker
                            departments={availableDepts}
                            selected={assignment.departments}
                            onChange={(next) => updateCompany(idx, "departments", next)}
                            emptyText={t('createNoDepartments', 'users')}
                          />
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('createSelectCompanyFirst', 'users')}</p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('createDepartmentHint', 'users')}</p>
                      </div>

                      <div className="flex items-center gap-2 lg:pt-7">
                        <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="radio"
                            name="cu-primary-company"
                            checked={assignment.isPrimary}
                            onChange={() => updateCompany(idx, "isPrimary", true)}
                            className="size-4 cursor-pointer accent-brand-500"
                          />
                          {t('createPrimaryOffice', 'users')}
                        </label>
                        <IconButton
                          tone="danger"
                          label={t('createRemoveCompany', 'users', { name: companyName })}
                          onClick={() => handleRemoveCompany(idx)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => navigate("/users")}>{t('createAbort', 'users')}</Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              {t('createCreateUser', 'users')}
            </Button>
          </div>
        </form>
      </PageShell>
    </>
  );
}
