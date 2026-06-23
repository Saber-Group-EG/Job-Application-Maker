import { useState, useMemo } from "react";
import Swal from '../../../utils/swal';
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
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
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRight,
  ShieldAlert
} from "lucide-react";

export default function Companies() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { t } = useLocale();

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
      typeof c.companyId === "string" ? c.companyId : c.companyId._id
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
      text: t('deleteText', 'companies', { name: toPlainString(company.name) }),
      icon: "warning",
      showCancelButton: true,
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="size-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black dark:text-white">{t('accessRestricted', 'companies')}</h1>
          <p className="text-gray-500 max-w-xs mx-auto font-medium">{t('accessRestrictedDesc', 'companies')}</p>
        </div>
      </div>
    );
  }

  if (singleAssignedCompanyId) {
    return <Navigate to={`/company/${singleAssignedCompanyId}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t('pageTitle', 'companies')} description={t('pageDesc', 'companies')} />
      <PageBreadcrumb pageTitle={t('breadcrumb', 'companies')} />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t('title', 'companies')}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">{t('subtitle', 'companies')}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'companies')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white placeholder:text-gray-400 font-medium"
              />
            </div>
            {canManageCompanies && (
              <button
                onClick={() => navigate("/company/add")}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="size-5" />
                {t('createCompany', 'companies')}
              </button>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 flex items-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-4 px-4 border-r border-white/10">
              <div className="size-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500">
                <Building2 className="size-5" />
              </div>
              <div>
                  <span className="block text-[10px] font-black uppercase text-gray-400">{t('totalEntities', 'companies')}</span>
                <span className="text-xl font-bold">{companies.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 px-6">
              <div className="size-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Users className="size-5" />
              </div>
              <div>
                  <span className="block text-[10px] font-black uppercase text-gray-400">{t('totalDepartments', 'companies')}</span>
                <span className="text-xl font-bold">{departments.length}</span>
              </div>
            </div>
          </div>
          
         
        </div>

        {/* Company Grid */}
        {companiesLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedCompanies.map((company: any) => {
              const deptCount = departmentCounts[company._id] || 0;
              
              return (
                <div 
                  key={company._id}
                  onClick={() => navigate(`/company/${company._id}`)}
                  className="group relative bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 bg-brand-500/30 group-hover:bg-brand-500" />
                  
                  <div className="space-y-6 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="relative">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-2xl font-black text-gray-500 dark:text-gray-400 overflow-hidden border border-white/20">
                          {company.logoPath ? (
                            <img src={company.logoPath} alt="" className="w-full h-full object-cover" />
                          ) : (
                            toPlainString(company.name).charAt(0)
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                        {canManageCompanies && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/company/${company._id}`); }}
                            className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {canManageCompanies && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }}
                            className="size-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white line-clamp-1 tracking-tight">
                        {toPlainString(company.name)}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-brand-500 px-2.5 py-1 bg-brand-500/10 rounded-full w-fit">
                        <Users className="size-3" />
                        {t('departments', 'companies', { count: deptCount })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                      {company.contactEmail && (
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item hover:text-brand-500 transition-colors">
                          <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover/item:bg-brand-500/10 transition-colors">
                            <Mail className="size-3.5" />
                          </div>
                          <span className="text-xs font-medium truncate">{company.contactEmail}</span>
                        </div>
                      )}
                      
                      {company.phone && (
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item hover:text-brand-500 transition-colors">
                          <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover/item:bg-brand-500/10 transition-colors">
                            <Phone className="size-3.5" />
                          </div>
                          <span className="text-xs font-medium">{company.phone}</span>
                        </div>
                      )}

                      {company.website && (
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item hover:text-brand-500 transition-colors">
                          <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover/item:bg-brand-500/10 transition-colors">
                            <Globe className="size-3.5" />
                          </div>
                          <span className="text-xs font-medium truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between group/btn">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest group-hover/btn:text-brand-500 transition-colors">{t('viewOperations', 'companies')}</span>
                    <div className="size-8 rounded-full border border-gray-100 dark:border-white/10 flex items-center justify-center group-hover/btn:bg-brand-500 group-hover/btn:border-brand-500 transition-all">
                      <ArrowRight className="size-4 group-hover/btn:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-8 border-t border-white/10">
            <p className="text-sm font-bold text-gray-500">
              {t('showing', 'companies', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, filteredCompanies.length), total: filteredCompanies.length })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="size-10 rounded-xl border border-white/20 dark:border-white/10 flex items-center justify-center hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 transition-all font-bold"
              >
                <ChevronLeft className="size-5" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`size-10 rounded-xl text-sm font-black transition-all ${page === i + 1 ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "hover:bg-white dark:hover:bg-white/5"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="size-10 rounded-xl border border-white/20 dark:border-white/10 flex items-center justify-center hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 transition-all font-bold"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
