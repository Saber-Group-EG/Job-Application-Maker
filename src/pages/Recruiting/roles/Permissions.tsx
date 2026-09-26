import type { ChangeEvent, FormEvent } from "react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../../icons";
import { useRoles, usePermissions, useCreateRole, useUsers, useDeleteRole } from "../../../hooks/queries";
import type { User } from "../../../services/usersService";
import type { CreateRoleRequest } from "../../../services/rolesService";
import { toPlainString } from "../../../utils/strings";
import { Search, Shield, Users, Calendar, ArrowRight, X } from "lucide-react";
import { Button, Card, CardToolbar, EmptyState, Field, IconButton, PageShell, SectionTitle, StatCard, Table, Td, Th, focusRing, inputClass, rowClass } from '../../../components/ui/kit';

type RoleForm = {
  name: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean;
  singleCompany?: boolean;
};

const defaultRoleForm: RoleForm = {
  name: "",
  description: "",
  permissions: [],
  isSystemRole: false,
  singleCompany: false,
};

export default function Permissions() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Check permissions
  const canRead = hasPermission("Role Management", "read");
  const canCreate = hasPermission("Role Management", "create");

  // React Query hooks - data fetching happens automatically
  const { data: roles = [], isLoading: rolesLoading} = useRoles();
  const { data: permissions = [], isLoading: permissionsLoading } =
    usePermissions();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const users: User[] = Array.isArray(usersData) ? usersData : ((usersData as any)?.data ?? []) as User[];

  // Mutations
  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();

  // Calculate user counts per role
  const roleUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user: User) => {
      const userRoleId = typeof user.roleId === "string" ? user.roleId : (user.roleId as any)?._id;
      if (userRoleId) {
        counts[userRoleId] = (counts[userRoleId] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  const [roleForm, setRoleForm] = useState<RoleForm>(defaultRoleForm);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to extract detailed error messages
  const getErrorMessage = (err: any): string => {
    if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
      return err.response.data.details
        .map((detail: any) => {
          const field = detail.path?.[0] || "";
          const message = detail.message || "";
          return field ? `${field}: ${message}` : message;
        })
        .join(", ");
    }
    if (err.response?.data?.errors) {
      const errors = err.response.data.errors;
      if (Array.isArray(errors)) return errors.map((e: any) => e.msg || e.message).join(", ");
      if (typeof errors === "object") return Object.entries(errors).map(([field, msg]) => `${field}: ${msg}`).join(", ");
    }
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message) return err.message;
    return t('rolesFormErrorGeneric', 'roles');
  };

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionAccess, setPermissionAccess] = useState<Record<string, string[]>>({});

  // Role handlers
  const handleRoleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permId: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permId)) {
        const newPerms = prev.filter((id) => id !== permId);
        setPermissionAccess((prevAccess) => {
          const newAccess = { ...prevAccess };
          delete newAccess[permId];
          return newAccess;
        });
        return newPerms;
      } else {
        const permission = permissions.find((p) => p._id === permId);
        const defaultActions = permission?.actions || ["read", "write", "create"];
        setPermissionAccess((prevAccess) => ({ ...prevAccess, [permId]: defaultActions }));
        return [...prev, permId];
      }
    });
  };

  const handleAccessToggleForPermission = (permId: string, access: string) => {
    setPermissionAccess((prev) => {
      const currentAccess = prev[permId] || [];
      const newAccess = currentAccess.includes(access)
        ? currentAccess.filter((a) => a !== access)
        : [...currentAccess, access];
      return { ...prev, [permId]: newAccess };
    });
  };

  const handleRoleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const permissionsWithAccess = selectedPermissions.map((permId) => ({
      permission: permId,
      access: permissionAccess[permId] || [],
    }));
    const payload = { name: roleForm.name, permissions: permissionsWithAccess };

    try {
      await createRoleMutation.mutateAsync(payload as CreateRoleRequest);
      await Swal.fire({
        title: t('rolesFormSuccessTitle', 'roles'),
        text: t('rolesFormSuccessText', 'roles'),
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      setRoleForm(defaultRoleForm);
      setSelectedPermissions([]);
      setPermissionAccess({});
      setShowRoleForm(false);
    } catch (err: any) {
      setFormError(getErrorMessage(err));
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    return roles.filter((role) => 
      toPlainString((role as any).name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [roles, searchTerm]);

  if (!canRead) {
    return (
      <PageShell title={t('rolesTitle', 'roles')}>
        <PageMeta title={t('rolesMetaTitle', 'roles')} description={t('rolesMetaDescription', 'roles')} />
        <Card>
          <EmptyState icon={<Shield className="size-6" />} title={t('rolesAccessDeniedTitle', 'roles')} text={t('rolesAccessDeniedText', 'roles')} />
        </Card>
      </PageShell>
    );
  }

  const deleteRole = async (roleId: string, userCount: number) => {
    const result = await Swal.fire({
      title: t('rolesDeleteConfirmTitle', 'roles'),
      text: t('rolesDeleteConfirmText', 'roles', { count: userCount }),
      icon: "error",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t('rolesDeleteConfirmButton', 'roles')
    });
    if (!result.isConfirmed) return;
    try {
      await deleteRoleMutation.mutateAsync(roleId);
      await Swal.fire({ title: t('rolesRemovedTitle', 'roles'), icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ title: t('previewErrorGeneric', 'roles'), text: getErrorMessage(err), icon: "error" });
    }
  };

  const loading = rolesLoading || permissionsLoading || usersLoading;

  return (
    <PageShell
      title={t('rolesTitle', 'roles')}
      subtitle={t('rolesSubtitle', 'roles')}
      actions={
        canCreate && (
          <Button
            variant={showRoleForm ? 'secondary' : 'primary'}
            icon={showRoleForm ? <X className="size-4" /> : <PlusIcon className="size-4" />}
            onClick={() => setShowRoleForm(!showRoleForm)}
          >
            {showRoleForm ? t('rolesCloseForm', 'roles') : t('rolesCreateButton', 'roles')}
          </Button>
        )
      }
    >
      <PageMeta title={t('rolesMetaTitle', 'roles')} description={t('rolesMetaDescription', 'roles')} />

      {loading ? (
        <LoadingSpinner fullPage message={t('rolesLoadingMessage', 'roles')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label={t('rolesStatTotalRoles', 'roles')} value={roles.length} icon={<Shield className="size-4" />} />
            <StatCard label={t('rolesStatActiveUsers', 'roles')} value={users.length} icon={<Users className="size-4" />} />
            <StatCard label={t('rolesStatPermModules', 'roles')} value={permissions.length} icon={<Shield className="size-4" />} />
          </div>

          {showRoleForm && (
            <Card>
              <form onSubmit={handleRoleSubmit}>
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('rolesFormTitle', 'roles')}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('rolesFormSubtitle', 'roles')}</p>
                </div>

                <div className="space-y-6 p-5">
                  {formError && (
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                      <span>{formError}</span>
                      <IconButton label={t('close', 'common')} onClick={() => setFormError("")}>
                        <X className="size-4" />
                      </IconButton>
                    </div>
                  )}

                  <div className="max-w-md">
                    <Field label={t('rolesFormNameLabel', 'roles')} htmlFor="roleName">
                      <input
                        id="roleName"
                        name="name"
                        value={roleForm.name}
                        onChange={handleRoleInputChange}
                        placeholder={t('rolesFormNamePlaceholder', 'roles')}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('rolesFormPermissionsLabel', 'roles')}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedPermissions.length === permissions.length) {
                            setSelectedPermissions([]);
                            setPermissionAccess({});
                          } else {
                            setSelectedPermissions(permissions.map(p => p._id));
                            const allAccess: Record<string, string[]> = {};
                            permissions.forEach(p => {
                              allAccess[p._id] = p.actions || ["read", "write", "create"];
                            });
                            setPermissionAccess(allAccess);
                          }
                        }}
                      >
                        {selectedPermissions.length === permissions.length ? t('rolesFormDeselectAll', 'roles') : t('rolesFormFullAccess', 'roles')}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {permissions.map((perm) => {
                        const isSelected = selectedPermissions.includes(perm._id);
                        return (
                          <div
                            key={perm._id}
                            className={`rounded-xl border p-4 transition ${
                              isSelected
                                ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/10'
                                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handlePermissionToggle(perm._id)}
                                className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-slate-900 dark:text-white">{perm.name}</span>
                                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                                  {perm.description || t('rolesFormDefaultPermDesc', 'roles')}
                                </span>
                              </span>
                            </label>

                            {isSelected && (
                              <div className="mt-3 flex flex-wrap gap-1.5 ps-7">
                                {(perm.actions || ["read", "write", "create"]).map((action) => {
                                  const isAccessActive = permissionAccess[perm._id]?.includes(action);
                                  return (
                                    <label
                                      key={action}
                                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition ${
                                        isAccessActive
                                          ? 'border-brand-500 bg-brand-500 text-white'
                                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isAccessActive}
                                        onChange={() => handleAccessToggleForPermission(perm._id, action)}
                                      />
                                      {action}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setShowRoleForm(false)}>
                    {t('rolesFormDiscard', 'roles')}
                  </Button>
                  <Button variant="primary" type="submit" loading={createRoleMutation.isPending}>
                    {t('rolesFormDeploy', 'roles')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <CardToolbar>
              <SectionTitle icon={<Shield className="size-4" />}>{t('rolesActiveRoles', 'roles')}</SectionTitle>
              <div className="relative min-w-[220px] sm:w-64">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('rolesSearchPlaceholder', 'roles')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${inputClass} ps-9`}
                />
              </div>
            </CardToolbar>

            {filteredRoles.length === 0 ? (
              <EmptyState icon={<Shield className="size-6" />} title={t('rolesNoResultsTitle', 'roles')} text={t('rolesNoResultsText', 'roles')} />
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredRoles.map((role) => {
                  const userCount = roleUserCounts[role._id] || 0;
                  const roleName = toPlainString((role as any).name);
                  return (
                    <div
                      key={role._id}
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/role/${role._id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/role/${role._id}`); }}
                      className={`group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${focusRing}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          <Shield className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{roleName}</h3>
                          {role.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{role.description}</p>
                          )}
                        </div>
                        {canCreate && (
                          <div onClick={(e) => e.stopPropagation()} className="-me-1 -mt-1 flex items-center transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <IconButton label={t('edit', 'common')} onClick={() => navigate(`/role/${role._id}?edit=true`)}>
                              <PencilIcon className="size-4" />
                            </IconButton>
                            <IconButton label={t('rolesDeleteConfirmButton', 'roles')} tone="danger" onClick={() => deleteRole(role._id, userCount)}>
                              <TrashBinIcon className="size-4" />
                            </IconButton>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('rolesCapabilityLabel', 'roles')}</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">
                            {t('rolesCapabilityCount', 'roles', { count: role.permissionsCount || role.permissions?.length || 0 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('rolesReachLabel', 'roles')}</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{t('rolesReachCount', 'roles', { count: userCount })}</p>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Calendar className="size-3.5" />
                          {role.createdAt ? new Date(role.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : t('rolesSystemBase', 'roles')}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
                          {t('rolesInvestigate', 'roles')}
                          <ArrowRight className="size-3.5 rtl:rotate-180" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardToolbar>
              <SectionTitle icon={<Shield className="size-4" />}>{t('rolesPermissions', 'roles')}</SectionTitle>
            </CardToolbar>
            <Table minWidth={480}>
              <thead>
                <tr>
                  <Th>{t('rolesTableDomain', 'roles')}</Th>
                  <Th>{t('rolesTableDescription', 'roles')}</Th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission._id} className={rowClass}>
                    <Td className="whitespace-nowrap font-medium text-slate-900 dark:text-white">{permission.name}</Td>
                    <Td className="text-slate-500 dark:text-slate-400">
                      {permission.description || t('rolesFormDefaultPermDesc', 'roles')}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </PageShell>
  );
}
