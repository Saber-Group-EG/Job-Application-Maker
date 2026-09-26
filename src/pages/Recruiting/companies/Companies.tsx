import { useState, useMemo } from "react";
import Swal from '../../../utils/swal';
import PageMeta from "../../../components/common/PageMeta";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import {
  useCompanies,
  useDepartments,
  useDeleteCompany,
} from "../../../hooks/queries";
import { toPlainString } from "../../../utils/strings";
import { 
  Search, 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  Globe, 
  Users,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Button, Card, CardToolbar, EmptyState, IconButton, PageShell, Pagination, StatCard, focusRing, inputClass } from '../../../components/ui/kit';

export default function Companies() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { t, locale } = useLocale();

  // Check permissions
  const canRead = hasPermission("Company Management", "read");
  const canCreate = hasPermission("Company Management", "create");
  const canWrite = hasPermission("Company Management", "write");
  const canManageCompanies = canCreate && canWrite;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Memoize user-derived values
  const { companyId, isAdmin } = useMemo(() => {
    if (!user) return { isAdmin: false, companyId: undefined };

    const isAdminResult = user?.roleId?.name?.toLowerCase().includes("admin");
    const usercompanyIds = user?.companies?.map((c: any) =>
      typeof c.companyId === "string" ? c.companyId : c.companyId?._id
    );

    const companyIdFiltered =
      !isAdminResult && usercompanyIds?.length ? usercompanyIds : undefined;

    return { isAdmin: isAdminResult, companyId: companyIdFiltered };
  }, [user]);

  const singleAssignedCompanyId = useMemo(() => {
    if (isAdmin || !Array.isArray(companyId) || companyId.length !== 1) {
      return undefined;
    }

    return companyId[0];
  }, [companyId, isAdmin]);

  // Use React Query hooks for data fetching
  const {
    data: companies = [],
    isLoading: companiesLoading,
  } = useCompanies(companyId);
  const { data: departments = [] } = useDepartments();
  const deleteCompanyMutation = useDeleteCompany();

  // Calculate department counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((company) => {
      counts[company._id] = departments.filter((dept) => {
        const deptCompanyId =
          typeof dept.companyId === "string"
            ? dept.companyId
            : dept.companyId._id;
        return deptCompanyId === company._id;
      }).length;
    });
    return counts;
  }, [companies, departments]);

  const handleDeleteCompany = async (company: any) => {
    const result = await Swal.fire({
      title: t('deleteTitle', 'companies'),
      text: t('deleteText', 'companies', { name: toPlainString(company.name, locale) }),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t('deleteConfirm', 'companies')
    });

    if (result.isConfirmed) {
      try {
        await deleteCompanyMutation.mutateAsync(company._id);
        Swal.fire({ title: t('deleted', 'companies'), icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire(t('error', 'companies'), err.message || t('deleteFailed', 'companies'), "error");
      }
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((company: any) => {
      const term = searchTerm.toLowerCase();
      const nameStr = toPlainString(company.name).toLowerCase();
      const emailStr = (company.contactEmail || "").toLowerCase();
      const phoneStr = (company.phone || "").toLowerCase();
      
      return nameStr.includes(term) || emailStr.includes(term) || phoneStr.includes(term);
    });
  }, [companies, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / pageSize);
  const paginatedCompanies = filteredCompanies.slice((page - 1) * pageSize, page * pageSize);

  if (!canRead) {
    return (
      <PageShell title={t('accessRestricted', 'companies')}>
        <Card>
          <EmptyState icon={<ShieldAlert className="size-6" />} title={t('accessRestricted', 'companies')} text={t('accessRestrictedDesc', 'companies')} />
        </Card>
      </PageShell>
    );
  }

  if (singleAssignedCompanyId) {
    return <Navigate to={`/company/${singleAssignedCompanyId}`} replace />;
  }

  return (
    <PageShell
      title={t('title', 'companies')}
      subtitle={t('subtitle', 'companies')}
      actions={
        canManageCompanies && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => navigate("/company/add")}>
            {t('createCompany', 'companies')}
          </Button>
        )
      }
    >
      <PageMeta title={t('pageTitle', 'companies')} description={t('pageDesc', 'companies')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t('totalEntities', 'companies')} value={companies.length} icon={<Building2 className="size-4" />} loading={companiesLoading} />
        <StatCard label={t('totalDepartments', 'companies')} value={departments.length} icon={<Users className="size-4" />} loading={companiesLoading} />
      </div>

      <Card>
        <CardToolbar>
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'companies')}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={`${inputClass} ps-9`}
            />
          </div>
        </CardToolbar>

        {companiesLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <EmptyState icon={<Building2 className="size-6" />} title={t('noCompaniesFound', 'companies')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {paginatedCompanies.map((company: any) => {
              const deptCount = departmentCounts[company._id] || 0;
              const name = toPlainString(company.name, locale);
              return (
                <div
                  key={company._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/company/${company._id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/company/${company._id}`); }}
                  className={`group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${focusRing}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {company.logoPath ? (
                        <img src={company.logoPath} alt="" className="size-full object-cover" />
                      ) : (
                        toPlainString(company.name).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Users className="size-3 shrink-0" />
                        {t('departments', 'companies', { count: deptCount })}
                      </p>
                    </div>
                    {canManageCompanies && (
                      <div className="-me-1 -mt-1 flex items-center transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <IconButton label={t('edit', 'common')} onClick={(e) => { e.stopPropagation(); navigate(`/company/${company._id}`); }}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={t('deleteConfirm', 'companies')} tone="danger" onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </div>

                  {(company.contactEmail || company.phone || company.website) && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      {company.contactEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 shrink-0 text-slate-400" />
                          <span className="truncate">{company.contactEmail}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 shrink-0 text-slate-400" />
                          <span className="truncate" dir="ltr">{company.phone}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 shrink-0 text-slate-400" />
                          <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-end pt-4">
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {t('viewOperations', 'companies')}
                      <ArrowRight className="size-3.5 rtl:rotate-180" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!companiesLoading && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} totalCount={filteredCompanies.length} onChange={setPage} />
        )}
      </Card>
    </PageShell>
  );
}
