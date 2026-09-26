import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useLocale } from "../../../context/LocaleContext";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { ValidationErrorAlert } from "../../../components/common/ValidationErrorAlert";
import {
  useUsers,
  useUpdateUser,
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

type UserCompany = {
  companyId: string;
  companyName: any;
  departments: string[];
};

export default function EditUser() {
  const { t } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data fetching
  const { data: usersResponse, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const rawUsers = Array.isArray(usersResponse) ? usersResponse : ((usersResponse as any)?.data ?? []);
  const { data: roles = [] } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();

  // Mutations
  const updateUserMutation = useUpdateUser();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roleId: "",
    isActive: true,
  });

  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [initializedUserId, setInitializedUserId] = useState("");

  // Find user
  const user = useMemo(() => {
    return rawUsers.find((u: any) => u._id === id);
  }, [rawUsers, id]);

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

  const normalizeUserPermissions = (rawUser: any): UserPermission[] => {
    const raw = Array.isArray(rawUser?.permissions) ? rawUser.permissions : [];
    const merged = new Map<string, Set<string>>();

    raw.forEach((item: any) => {
      const permissionId =
        typeof item === "string"
          ? item
          : typeof item?.permission === "string"
            ? item.permission
            : item?.permission?._id || "";

      if (!permissionId) return;

      const access = Array.isArray(item?.access) && item.access.length > 0
        ? item.access.map((action: string) => String(action).toLowerCase())
        : getDefaultAccessForPermission(permissionId);

      const existing = merged.get(permissionId) || new Set<string>();
      access.forEach((action: string) => existing.add(action));
      merged.set(permissionId, existing);
    });

    return Array.from(merged.entries()).map(([permission, accessSet]) => ({
      permission,
      access: Array.from(accessSet),
    }));
  };

  useEffect(() => {
    if (user && user._id !== initializedUserId) {
      setFormData({
        email: user.email || "",
        password: "", 
        fullName: toPlainString(user.fullName || user.name || ""),
        phone: user.phone || "",
        roleId: typeof user.roleId === "string" ? user.roleId : user.roleId?._id || "",
        isActive: user.isActive !== false,
      });

      // Initialize companies from user data
      const initialCompanies = user.companies?.map((c: any) => ({
        companyId: typeof c.companyId === "string" ? c.companyId : c.companyId?._id,
        companyName: c.companyId?.name || "",
        departments: c.departments?.map((d: any) => {
          if (typeof d === "string") return d;
          if (d?._id) return d._id;
          return "";
        }).filter(Boolean) || [],
      })) || [];
      setUserCompanies(initialCompanies);

      const fromUser = normalizeUserPermissions(user);
      if (fromUser.length > 0) {
        setUserPermissions(fromUser);
      } else {
        const currentRoleId = typeof user.roleId === "string" ? user.roleId : user.roleId?._id;
        const selectedRole = roles.find((role: any) => role._id === currentRoleId);
        setUserPermissions(normalizeRolePermissions(selectedRole));
      }

      setInitializedUserId(user._id);
    }
  }, [user, initializedUserId, roles, permissions]);

  const handleAddCompany = () => {
    if (!selectedCompanyId) {
      setFormError(t('editAddCompanyErrorNoSelect', 'users'));
      return;
    }

    if (userCompanies.some(c => c.companyId === selectedCompanyId)) {
      setFormError(t('editAddCompanyErrorDuplicate', 'users'));
      return;
    }

    const selectedCompany = companies.find((c: any) => c._id === selectedCompanyId);
    setUserCompanies(prev => [...prev, {
      companyId: selectedCompanyId,
      companyName: selectedCompany?.name || "",
      departments: [],
    }]);
    setSelectedCompanyId("");
  };

const handleUpdateDepartments = (companyId: string, departments: string[]) => {
  setUserCompanies((prev) =>
    prev.map((c) => (c.companyId === companyId ? { ...c, departments } : c))
  );
};

 const handleRemoveCompany = (companyId: string) => {
  setUserCompanies((prev) => prev.filter((c) => c.companyId !== companyId));
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
      if (!formData.fullName || !formData.email || !formData.roleId) {
        throw new Error(t('editErrorRequired', 'users'));
      }

      // Update basic user info, permissions and the complete companies list.
      // The companies array must include the existing companies as well,
      // otherwise the backend replaces them and the previous access is lost.
      await updateUserMutation.mutateAsync({
        id: id!,
        data: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          roleId: formData.roleId,
          isActive: formData.isActive,
          permissions: userPermissions.map((item) => ({
            permission: item.permission,
            access: item.access,
          })),
          companies: userCompanies.map((c) => ({
            companyId: c.companyId,
            departments: c.departments,
          })),
        }
      });

      await Swal.fire({
        title: t('editSuccessTitle', 'users'),
        text: t('editSuccessText', 'users'),
        icon: "success",
        background: "rgba(255, 255, 255, 0.9)",
        backdrop: "rgba(0,0,0,0.4)"
      });
      
      // Refetch users to get updated data
      await refetchUsers();
      navigate("/users");
    } catch (err: any) {
      setFormError(err.message || t('editErrorValidation', 'users'));
    } finally {
      setIsSaving(false);
    }
  };

  if (usersLoading) return <LoadingSpinner fullPage />;

  // Get available companies (not yet assigned to user)
  const availableCompanies = companies.filter(
    (c: any) => !userCompanies.some(uc => uc.companyId === c._id)
  );

  const back = (
    <Link
      to="/users"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('editBackButton', 'users')}
    </Link>
  );

  return (
    <>
      <PageMeta title={t('editMetaTitle', 'users', { name: toPlainString(formData.fullName) })} description={t('editMetaDescription', 'users')} />
      <PageShell
        back={back}
        title={toPlainString(formData.fullName) || t('editModifyCredential', 'users')}
        subtitle={t('editSubtitle', 'users')}
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {formError && <ValidationErrorAlert error={formError} onDismiss={() => setFormError("")} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardToolbar>
                <SectionTitle icon={<UserRound className="size-4" />}>{t('editPersonalInfo', 'users')}</SectionTitle>
              </CardToolbar>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label={t('editFullName', 'users')} htmlFor="eu-name">
                  <input
                    id="eu-name"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputClass}
                    placeholder={t('editFullNamePlaceholder', 'users')}
                  />
                </Field>
                <Field label={t('editEmail', 'users')} htmlFor="eu-email">
                  <input
                    id="eu-email"
                    type="email"
                    required
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder={t('editEmailPlaceholder', 'users')}
                  />
                </Field>
                <Field label={t('editPhone', 'users')} htmlFor="eu-phone" optional>
                  <input
                    id="eu-phone"
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder={t('editPhonePlaceholder', 'users')}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardToolbar>
                <SectionTitle icon={<Shield className="size-4" />}>{t('editSecurityAccess', 'users')}</SectionTitle>
              </CardToolbar>
              <div className="space-y-4 p-4">
                <Field label={t('editAssignedRole', 'users')} htmlFor="eu-role" hint={t('editRoleHint', 'users')}>
                  <select
                    id="eu-role"
                    required
                    value={formData.roleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">{t('editSelectRole', 'users')}</option>
                    {roles.map((r: any) => (
                      <option key={r._id} value={r._id}>{toPlainString(r.name)}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('editActivityStatus', 'users')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('editActivityHint', 'users')}</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onChange={(next) => setFormData({ ...formData, isActive: next })}
                    label={t('editActivityStatus', 'users')}
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
                <SectionTitle icon={<Building2 className="size-4" />}>{t('editCompanyAccess', 'users')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('editCompanyAccessHint', 'users')}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  aria-label={t('editAddCompanyAccess', 'users')}
                  className={`${selectClass} sm:w-64`}
                >
                  <option value="">{t('editSelectCompany', 'users')}</option>
                  {availableCompanies.map((c: any) => (
                    <option key={c._id} value={c._id}>{toPlainString(c.name)}</option>
                  ))}
                </select>
                <Button onClick={handleAddCompany} disabled={!selectedCompanyId} icon={<Plus className="size-4" />}>
                  {t('editAddCompanyButton', 'users')}
                </Button>
              </div>
            </CardToolbar>

            {userCompanies.length === 0 ? (
              <EmptyState
                icon={<Building2 className="size-6" />}
                title={t('editNoCompanyAccess', 'users')}
                text={t('editAddCompanyHint', 'users')}
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {userCompanies.map((assignment) => {
                  // Get departments for this specific company
                  const companyDepartments = departments.filter((d: any) => {
                    const deptCompanyId = typeof d.companyId === "string" ? d.companyId : d.companyId?._id;
                    return deptCompanyId === assignment.companyId;
                  });
                  const companyName = toPlainString(assignment.companyName);

                  return (
                    <li key={assignment.companyId} className="flex items-start gap-4 p-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{companyName}</p>
                        <DepartmentPicker
                          departments={companyDepartments}
                          selected={assignment.departments || []}
                          onChange={(next) => handleUpdateDepartments(assignment.companyId, next)}
                          emptyText={t('editNoDepartments', 'users')}
                        />
                        {companyDepartments.length > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('editDepartmentHint', 'users')}</p>
                        )}
                      </div>
                      <IconButton
                        tone="danger"
                        label={t('editRemoveCompany', 'users', { name: companyName })}
                        onClick={() => handleRemoveCompany(assignment.companyId)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => navigate("/users")}>{t('editCancel', 'users')}</Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              {t('editSaveChanges', 'users')}
            </Button>
          </div>
        </form>
      </PageShell>
    </>
  );
}
