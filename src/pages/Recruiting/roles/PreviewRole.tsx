import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import {
  useRoles,
  usePermissions,
  useUpdateRole,
  useUsers,
  useDeleteRole,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  KeyRound,
  Pencil,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  PageShell,
  SectionTitle,
  StatCard,
  ToggleChip,
  focusRing,
  inputClass,
} from "../../../components/ui/kit";

export default function PreviewRole() {
  const { t, locale } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  
  // Check if we should start in edit mode based on query param
  const queryParams = new URLSearchParams(location.search);
  const startInEditMode = queryParams.get("edit") === "true";

  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionAccess, setPermissionAccess] = useState<Record<string, string[]>>({});

  const { data: roles = [], isLoading: rolesLoading, isFetching: rolesFetching, error: rolesError } = useRoles();
  const role: any = Array.isArray(roles)
    ? roles.find((r: any) => r._id === id)
    : ((roles as any)?.data || []).find((r: any) => r._id === id);
  const { data: permissions = [], isLoading: permissionsLoading } = usePermissions();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const canUpdate = hasPermission("Role Management", "write");
  const canDelete = hasPermission("Role Management", "write");

  const loadRoleForm = () => {
    if (role) {
      setFormData({
        name: toPlainString((role as any).name) || "",
        description: role.description || "",
      });
      
      const rolePerms = role.permissions || [];
      setSelectedPermissions(rolePerms.map((p: any) => p.permission?._id || p.permission));
      
      const accessMap: Record<string, string[]> = {};
      rolePerms.forEach((p: any) => {
        const permId = p.permission?._id || p.permission;
        accessMap[permId] = p.access || [];
      });
      setPermissionAccess(accessMap);
    }
  };

  useEffect(loadRoleForm, [role]);

  // Cancel throws away unsaved edits.
  const cancelEditing = () => {
    loadRoleForm();
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permId: string) => {
    if (!isEditing) return;
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
        const defaultActions = permission?.actions || ["read"];
        setPermissionAccess((prevAccess) => ({ ...prevAccess, [permId]: defaultActions }));
        return [...prev, permId];
      }
    });
  };

  const handleAccessToggle = (permId: string, action: string) => {
    if (!isEditing) return;
    setPermissionAccess((prev) => {
      const current = prev[permId] || [];
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [permId]: updated };
    });
  };

  const handleSave = async () => {
    const payload = {
      name: formData.name,
      description: formData.description,
      permissions: selectedPermissions.map((permId) => ({
        permission: permId,
        access: permissionAccess[permId] || [],
      })),
    };

    try {
      await updateRoleMutation.mutateAsync({ id: id!, data: payload });
      setIsEditing(false);
      Swal.fire({
        title: t('previewUpdatedTitle', 'roles'),
        text: t('previewUpdatedText', 'roles'),
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "rgba(255, 255, 255, 0.9)",
        backdrop: `rgba(0,0,0,0.4) blur(4px)`
      });
    } catch (err: any) {
      Swal.fire(t('previewUpdateFailed', 'roles'), err.message || t('previewErrorGeneric', 'roles'), "error");
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('previewDeleteTitle', 'roles'),
      text: t('previewDeleteText', 'roles'),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t('previewDeleteConfirm', 'roles')
    });

    if (result.isConfirmed) {
      try {
        await deleteRoleMutation.mutateAsync(id!);
        navigate("/permissions");
        Swal.fire({ title: t('previewDecommissioned', 'roles'), icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire(t('previewErrorGeneric', 'roles'), err.message, "error");
      }
    }
  };

  const roleUsers = (Array.isArray(usersData) ? usersData : ((usersData as any)?.data ?? []))
    .filter((u: any) => (u.roleId?._id || u.roleId) === id);

  const actionLabels: Record<string, string> = {
    read: t('previewActionRead', 'roles'),
    write: t('previewActionWrite', 'roles'),
    create: t('previewActionCreate', 'roles'),
    update: t('previewActionUpdate', 'roles'),
    delete: t('previewActionDelete', 'roles'),
  };
  const actionLabel = (action: string) => actionLabels[action] ?? action;

  const back = (
    <Link
      to="/permissions"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t('previewBackButton', 'roles')}
    </Link>
  );

  if (rolesLoading || permissionsLoading || usersLoading || (!role && rolesFetching)) return <LoadingSpinner fullPage />;
  if (rolesError || !role) return (
    <PageShell back={back} title={t('previewNotFoundTitle', 'roles')}>
      <Card>
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title={t('previewNotFoundTitle', 'roles')}
          text={t('previewNotFoundText', 'roles')}
          action={<Button onClick={() => navigate("/permissions")}>{t('previewReturnButton', 'roles')}</Button>}
        />
      </Card>
    </PageShell>
  );

  const createdAt = role.createdAt
    ? new Date(role.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })
    : "—";

  const actions = isEditing ? (
    <>
      <Button onClick={cancelEditing} disabled={updateRoleMutation.isPending}>{t('previewCancelButton', 'roles')}</Button>
      <Button variant="primary" onClick={handleSave} loading={updateRoleMutation.isPending}>
        {t('previewSaveChanges', 'roles')}
      </Button>
    </>
  ) : (
    <>
      {canDelete && (
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={handleDelete}>
          {t('previewDeleteButton', 'roles')}
        </Button>
      )}
      {canUpdate && (
        <Button icon={<Pencil className="size-4" />} onClick={() => setIsEditing(true)}>
          {t('previewEditButton', 'roles')}
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageMeta title={t('previewMetaTitle', 'roles', { name: formData.name })} description={t('previewMetaDescription', 'roles')} />
      <PageShell
        back={back}
        title={formData.name || t('previewPageTitle', 'roles')}
        subtitle={!isEditing && formData.description ? formData.description : undefined}
        actions={actions}
      >
        {isEditing && (
          <Card>
            <CardToolbar>
              <SectionTitle>{t('previewDetailsTitle', 'roles')}</SectionTitle>
            </CardToolbar>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <Field label={t('previewRoleNameLabel', 'roles')} htmlFor="pr-name">
                <input
                  id="pr-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder={t('previewRoleNamePlaceholder', 'roles')}
                />
              </Field>
              <Field label={t('previewRoleDescLabel', 'roles')} htmlFor="pr-desc" optional>
                <textarea
                  id="pr-desc"
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`${inputClass} resize-y`}
                  placeholder={t('previewRoleDescPlaceholder', 'roles')}
                />
              </Field>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label={t('previewDeployedLabel', 'roles')} value={createdAt} icon={<Calendar className="size-4" />} />
          <StatCard
            label={t('previewModulesLabel', 'roles')}
            value={t('previewModulesEnabled', 'roles', { selected: selectedPermissions.length, total: permissions.length })}
            icon={<KeyRound className="size-4" />}
          />
          <StatCard label={t('previewInfluenceLabel', 'roles')} value={roleUsers.length} icon={<Users className="size-4" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardToolbar>
              <div>
                <SectionTitle icon={<KeyRound className="size-4" />}>{t('previewCapabilitiesMatrix', 'roles')}</SectionTitle>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isEditing ? t('previewPermsEditHint', 'roles') : t('previewPermsViewHint', 'roles')}
                </p>
              </div>
            </CardToolbar>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {permissions.map((perm) => {
                const isSelected = selectedPermissions.includes(perm._id);
                const name = toPlainString(perm.name);
                return (
                  <li key={perm._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className={`flex min-w-0 items-start gap-3 ${isEditing ? "cursor-pointer" : ""}`}>
                      {isEditing && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(perm._id)}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-500"
                        />
                      )}
                      <span className="min-w-0">
                        <span className={`block text-sm font-medium ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                          {name}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {toPlainString(perm.description) || t('previewDefaultPermDesc', 'roles')}
                        </span>
                      </span>
                    </label>
                    {isSelected ? (
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {(perm.actions || ["read", "write", "create", "delete", "update"]).map((action) => (
                          <ToggleChip
                            key={action}
                            selected={Boolean(permissionAccess[perm._id]?.includes(action))}
                            disabled={!isEditing}
                            onClick={() => handleAccessToggle(perm._id, action)}
                          >
                            {actionLabel(action)}
                          </ToggleChip>
                        ))}
                      </div>
                    ) : (
                      !isEditing && (
                        <span className="self-start sm:self-auto">
                          <Badge tone="slate">{t('previewDisabledLabel', 'roles')}</Badge>
                        </span>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="self-start">
            <CardToolbar>
              <SectionTitle icon={<Users className="size-4" />}>{t('previewActiveReach', 'roles')}</SectionTitle>
            </CardToolbar>
            {roleUsers.length === 0 ? (
              <EmptyState icon={<Users className="size-6" />} title={t('previewNoUsers', 'roles')} />
            ) : (
              <>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roleUsers.slice(0, 5).map((user: any) => {
                    const userName = toPlainString(user.fullName || user.name) || user.email;
                    return (
                      <li key={user._id}>
                        <Link
                          to={`/user/${user._id}`}
                          className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${focusRing}`}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {userName?.charAt(0).toUpperCase() || "?"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{userName}</span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400" dir="ltr">{user.email}</span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-slate-500 rtl:rotate-180" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {roleUsers.length > 5 && (
                  <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {t('previewAdditionalUsers', 'roles', { count: roleUsers.length - 5 })}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </PageShell>
    </>
  );
}
