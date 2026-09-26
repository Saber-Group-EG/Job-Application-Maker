import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { 
  useUsers, 
  useRoles, 
  useDeleteUser 
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import { 
  Search, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  Shield, 
  Building2, 
  UserMinus,
  ArrowRight
} from "lucide-react";
import Swal from '../../../utils/swal';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  IconButton,
  PageShell,
  Pagination,
  filterSelectClass,
  focusRing,
  inputClass,
} from '../../../components/ui/kit';

export default function Users() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { hasPermission, user: authUser } = useAuth();

  // Compute allowed company IDs for current auth user
  const allowedCompanyIds = useMemo(() => {
    const roleName = String(authUser?.roleId?.name || "").toLowerCase().trim();
    
    if (roleName === "admin" || roleName === "super admin") return undefined;

    const fromCompanies = Array.isArray(authUser?.companies)
      ? authUser.companies
          .map((c: any) => {
            const cid = c?.companyId;
            if (!cid) return null;
            if (typeof cid === "string") return cid;
            return String(cid._id || cid.id || "");
          })
          .filter(Boolean) as string[]
      : [];

    return Array.from(new Set([...fromCompanies]));
  }, [authUser]);

  // Permissions check
  const canRead = hasPermission("User Management", "read");
  const canCreate = hasPermission("User Management", "create");
  const canWrite = hasPermission("User Management", "write");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ✅ Fixed: useUsers expects { companies?: string[] } not pagination params
  const usersQueryParams = allowedCompanyIds === undefined
    ? {}
    : { companies: allowedCompanyIds };

  const { data: users, isLoading: usersLoading } = useUsers(usersQueryParams);
  const { data: roles = [] } = useRoles();
  const deleteUserMutation = useDeleteUser();

  // ✅ Simplified: users is already an array from the hook
  const rawUsers = useMemo(() => {
    if (!users) return [];
    if (Array.isArray(users)) return users;
    return [];
  }, [users]);

  // Filtering logic
  const filteredBySearchAndRole = useMemo(() => {
    let result = rawUsers;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((user: any) => 
        (user.fullName?.toLowerCase() || "").includes(term) ||
        (user.name?.toLowerCase() || "").includes(term) ||
        (user.email?.toLowerCase() || "").includes(term)
      );
    }
    
    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((user: any) => 
        user.roleId?._id === roleFilter || user.roleId === roleFilter
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      result = result.filter((user: any) => 
        (user.isActive !== false) === isActive
      );
    }
    
    return result;
  }, [rawUsers, searchTerm, roleFilter, statusFilter]);

  // Pagination
  // 🛑 TODO: move pagination to the backend API. Currently all users are fetched
  // then paginated client-side, which won't scale. The useUsers query should
  // accept { page, pageSize } params once the backend supports it.
  const totalPages = Math.ceil(filteredBySearchAndRole.length / pageSize);
  const paginatedUsers = filteredBySearchAndRole.slice((page - 1) * pageSize, page * pageSize);

  const handleDeleteUser = async (user: any) => {
    const result = await Swal.fire({
      title: t('deactivateConfirmTitle', 'users'),
      text: t('deactivateConfirmText', 'users', { name: toPlainString(user.fullName || user.name) }),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t('deactivateConfirmButton', 'users')
    });

    if (result.isConfirmed) {
      try {
        await deleteUserMutation.mutateAsync(user._id);
        Swal.fire({ title: t('deactivatedSuccess', 'users'), icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire(t('deactivateError', 'users'), err.message || t('deactivateErrorText', 'users'), "error");
      }
    }
  };

  if (!canRead) {
    return (
      <PageShell title={t('accessDeniedTitle', 'users')}>
        <Card>
          <EmptyState icon={<Shield className="size-6" />} title={t('accessDeniedTitle', 'users')} text={t('accessDeniedText', 'users')} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t('pageHeading', 'users')}
      subtitle={t('pageSubtitle', 'users')}
      actions={
        canCreate && (
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => navigate("/user/add")}>
            {t('createUser', 'users')}
          </Button>
        )
      }
    >
      <PageMeta title={t('metaTitle', 'users')} description={t('metaDescription', 'users')} />

      <Card>
        <CardToolbar>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'users')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className={`${inputClass} ps-9`}
              />
            </div>
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={filterSelectClass} aria-label={t('filtersLabel', 'users')}>
              <option value="all">{t('filterAllAccessLevels', 'users')}</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>{toPlainString((role as any).name)}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterSelectClass} aria-label={t('filtersLabel', 'users')}>
              <option value="all">{t('filterAllStatuses', 'users')}</option>
              <option value="active">{t('filterActive', 'users')}</option>
              <option value="inactive">{t('filterInactive', 'users')}</option>
            </select>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('usersShownOfTotal', 'users', { count: filteredBySearchAndRole.length, total: rawUsers.length })}
          </p>
        </CardToolbar>

        {usersLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredBySearchAndRole.length === 0 ? (
          <EmptyState icon={<UserMinus className="size-6" />} title={t('noPersonnelFound', 'users')} text={t('noPersonnelFoundText', 'users')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {paginatedUsers.map((user: any) => {
              const roleName = user.roleId?.name || toPlainString((roles.find(r => r._id === (user.roleId?._id || user.roleId)) as any)?.name || t('userRoleLabel', 'users'));
              const isActive = user.isActive !== false;
              const name = toPlainString(user.fullName || user.name || t('unknownUser', 'users'));

              return (
                <div
                  key={user._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/user/${user._id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/user/${user._id}`); }}
                  className={`group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${focusRing}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {name.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        <Shield className="size-3 shrink-0" />
                        {roleName}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="-me-1 -mt-1 flex items-center transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <IconButton label={t('edit', 'common')} onClick={(e) => { e.stopPropagation(); navigate(`/user/${user._id}/edit`); }}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={t('deactivateConfirmButton', 'users')} tone="danger" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 shrink-0 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-slate-400" />
                      <span className={`truncate ${user.phone ? '' : 'text-slate-400'}`}>{user.phone || t('noSecureLine', 'users')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-slate-400" />
                      <span className="truncate">{t('companiesCount', 'users', { count: user.companies?.length || 0 })}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge tone={isActive ? 'green' : 'red'}>{isActive ? t('activeDuty', 'users') : t('revoked', 'users')}</Badge>
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {t('detailsLabel', 'users')}
                      <ArrowRight className="size-3.5 rtl:rotate-180" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!usersLoading && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} totalCount={filteredBySearchAndRole.length} onChange={setPage} />
        )}
      </Card>
    </PageShell>
  );
}