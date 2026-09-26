import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { 
  useUsers, 
  useRoles, 
  useCompanies,
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
  ArrowRight,
  LayoutGrid,
  List
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
  Segmented,
  Table,
  Td,
  Th,
  filterSelectClass,
  focusRing,
  inputClass,
  rowClass,
} from '../../../components/ui/kit';

type UsersView = 'cards' | 'table';
const VIEW_STORAGE_KEY = 'users.view';

function readStoredView(): UsersView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

// A user's company entries hold companyId as either an id string or a populated doc.
function companyRefsOf(user: any): Array<{ id: string; name: string }> {
  if (!Array.isArray(user?.companies)) return [];
  return user.companies
    .map((c: any) => {
      const cid = c?.companyId;
      if (!cid) return null;
      if (typeof cid === 'string') return { id: cid, name: '' };
      const id = String(cid._id || cid.id || '');
      return id ? { id, name: toPlainString(cid.name || '') } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string }>;
}

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
  const [companyFilter, setCompanyFilter] = useState("all");
  const [view, setView] = useState<UsersView>(readStoredView);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ✅ Fixed: useUsers expects { companies?: string[] } not pagination params
  const usersQueryParams = allowedCompanyIds === undefined
    ? {}
    : { companies: allowedCompanyIds };

  const { data: users, isLoading: usersLoading } = useUsers(usersQueryParams);
  const { data: roles = [] } = useRoles();
  const { data: companies = [] } = useCompanies();
  const deleteUserMutation = useDeleteUser();

  // ✅ Simplified: users is already an array from the hook
  const rawUsers = useMemo(() => {
    if (!users) return [];
    if (Array.isArray(users)) return users;
    return [];
  }, [users]);

  const companyOptions = useMemo(() => {
    const knownNames = new Map<string, string>(
      (companies as any[]).map((c) => [String(c._id), toPlainString(c.name || '')])
    );
    const byId = new Map<string, string>();
    rawUsers.forEach((user: any) => {
      companyRefsOf(user).forEach(({ id, name }) => {
        byId.set(id, name || byId.get(id) || knownNames.get(id) || '');
      });
    });
    return Array.from(byId, ([id, name]) => ({ id, name }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawUsers, companies]);

  const companyNamesOf = (user: any) =>
    companyRefsOf(user)
      .map(({ id, name }) => name || companyOptions.find((c) => c.id === id)?.name || '')
      .filter(Boolean);

  const changeView = (next: UsersView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Storage unavailable; the choice just won't be remembered.
    }
  };

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
    
    // Company filter
    if (companyFilter !== "all") {
      result = result.filter((user: any) =>
        companyRefsOf(user).some((c) => c.id === companyFilter)
      );
    }

    return result;
  }, [rawUsers, searchTerm, roleFilter, statusFilter, companyFilter]);

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
            {companyOptions.length > 1 && (
              <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }} className={filterSelectClass} aria-label={t('filterCompany', 'users')}>
                <option value="all">{t('filterAllCompanies', 'users')}</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('usersShownOfTotal', 'users', { count: filteredBySearchAndRole.length, total: rawUsers.length })}
            </p>
            <Segmented
              ariaLabel={t('viewLabel', 'users')}
              value={view}
              onChange={changeView}
              options={[
                { value: 'cards', label: <span className="sr-only sm:not-sr-only">{t('viewCards', 'users')}</span>, icon: <LayoutGrid className="size-4" /> },
                { value: 'table', label: <span className="sr-only sm:not-sr-only">{t('viewTable', 'users')}</span>, icon: <List className="size-4" /> },
              ]}
            />
          </div>
        </CardToolbar>

        {usersLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredBySearchAndRole.length === 0 ? (
          <EmptyState icon={<UserMinus className="size-6" />} title={t('noPersonnelFound', 'users')} text={t('noPersonnelFoundText', 'users')} />
        ) : view === 'table' ? (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>{t('tableName', 'users')}</Th>
                <Th>{t('tableRole', 'users')}</Th>
                <Th>{t('tablePhone', 'users')}</Th>
                <Th>{t('tableCompanies', 'users')}</Th>
                <Th>{t('tableStatus', 'users')}</Th>
                {canWrite && <Th align="end"><span className="sr-only">{t('tableActions', 'users')}</span></Th>}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user: any) => {
                const roleName = user.roleId?.name || toPlainString((roles.find(r => r._id === (user.roleId?._id || user.roleId)) as any)?.name || t('userRoleLabel', 'users'));
                const isActive = user.isActive !== false;
                const name = toPlainString(user.fullName || user.name || t('unknownUser', 'users'));
                const names = companyNamesOf(user);
                return (
                  <tr key={user._id} onClick={() => navigate(`/user/${user._id}`)} className={`${rowClass} cursor-pointer`}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {name.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white">{name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">{roleName}</Td>
                    <Td className={`whitespace-nowrap ${user.phone ? '' : 'text-slate-400'}`}><span dir="ltr">{user.phone || t('noSecureLine', 'users')}</span></Td>
                    <Td>
                      <span className="line-clamp-1 max-w-[16rem]" title={names.join(', ')}>
                        {names.length ? names.join(', ') : <span className="text-slate-400">—</span>}
                      </span>
                    </Td>
                    <Td><Badge tone={isActive ? 'green' : 'red'}>{isActive ? t('activeDuty', 'users') : t('revoked', 'users')}</Badge></Td>
                    {canWrite && (
                      <Td align="end">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label={t('edit', 'common')} onClick={(e) => { e.stopPropagation(); navigate(`/user/${user._id}/edit`); }}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton label={t('deactivateConfirmButton', 'users')} tone="danger" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
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