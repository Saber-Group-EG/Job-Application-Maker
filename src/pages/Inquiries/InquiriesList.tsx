import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useInquiries, useDeleteInquiry, useUpdateInquiry } from "../../hooks/queries";
import { toPlainString } from "../../utils/strings";
import Swal from "../../utils/swal";
import { useCompanyFilter } from "../../context/CompanyFilterContext";
import type { InquiryStatus } from "../../services/inquiriesService";
import MessageModal from "../../components/modals/MessageModal";
import {
  TrashBinIcon,
  MailIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  ChatIcon,
} from "../../icons";

const statusColors: Record<InquiryStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-600", label: "statusNew" },
  in_progress: { bg: "bg-amber-500/10", text: "text-amber-600", label: "statusInProgress" },
  resolved: { bg: "bg-green-500/10", text: "text-green-600", label: "statusResolved" },
  closed: { bg: "bg-gray-500/10", text: "text-gray-600", label: "statusClosed" },
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconFilter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconMonitor({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
}

export default function InquiriesList() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { selectedCompanyId, companyMap } = useCompanyFilter();

  const canWrite = hasPermission("Inquiry Management", "write");
  const isSystemUser = (user as any)?.roleId?.isSystemRole === true;
  const showCompanyTag = !selectedCompanyId;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data: inquiries, isLoading } = useInquiries();
  const deleteMutation = useDeleteInquiry();
  const updateMutation = useUpdateInquiry();
  const [replyInquiry, setReplyInquiry] = useState<any>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: t("confirmDelete", "common"),
      text: t("actionCannotBeUndone", "common") + ` (${selectedIds.size} items)`,
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t("cancel", "common"),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t("delete", "common"),
    });
    if (result.isConfirmed) {
      await Promise.all([...selectedIds].map((id) => deleteMutation.mutateAsync(id)));
      setSelectedIds(new Set());
    }
  };

  const handleBulkStatusChange = async (status: InquiryStatus) => {
    await Promise.all(
      [...selectedIds].map((id) => updateMutation.mutateAsync({ id, payload: { status } }))
    );
    setSelectedIds(new Set());
  };

  const rawInquiries = useMemo(() => {
    if (!inquiries) return [];
    return Array.isArray(inquiries) ? inquiries : [];
  }, [inquiries]);

  const filtered = useMemo(() => {
    let result = rawInquiries;
    if (selectedCompanyId) {
      result = result.filter(
        (q: any) => q.companyId && (typeof q.companyId === "string" ? q.companyId : q.companyId._id) === selectedCompanyId
      );
    } else if (!isSystemUser) {
      result = result.filter((q: any) => !q.companyId);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (q: any) =>
          (q.name?.toLowerCase() || "").includes(term) ||
          (q.email?.toLowerCase() || "").includes(term) ||
          (q.subject?.toLowerCase() || "").includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((q: any) => q.status === statusFilter);
    }
    return result;
  }, [rawInquiries, searchTerm, statusFilter, isSystemUser, selectedCompanyId]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allSelected = paginated.length > 0 && paginated.every((q: any) => selectedIds.has(q._id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((q: any) => q._id)));
    }
  }, [allSelected, paginated]);

  const handleDelete = async (inquiry: any) => {
    const result = await Swal.fire({
      title: t("confirmDelete", "common"),
      text: t("actionCannotBeUndone", "common"),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t("cancel", "common"),
      confirmButtonColor: "#ef4444",
      confirmButtonText: t("delete", "common"),
    });
    if (result.isConfirmed) {
      deleteMutation.mutate(inquiry._id);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t("inquiriesListPageTitle", "inquiries")}
        description={t("inquiriesListPageDesc", "inquiries")}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t("inquiryPreview", "sidebar")} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t("inquiriesHeading", "inquiries")}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
              {t("inquiriesSubtitle", "inquiries")}
            </p>
          </div>

          <div className="relative flex-1 min-w-[300px]">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchInquiries", "inquiries")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-2 px-3 text-gray-400">
            <IconFilter className="size-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              {t("filtersLabel", "users")}
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
          >
            <option value="all">{t("filterAllStatuses", "users")}</option>
            <option value="new">{t("statusNew", "inquiries")}</option>
            <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
            <option value="resolved">{t("statusResolved", "inquiries")}</option>
            <option value="closed">{t("statusClosed", "inquiries")}</option>
          </select>

          <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20">
            <ChatIcon className="size-4" />
            <span className="text-sm font-black tabular-nums">
              {filtered.length} {t("results", "inquiries")}
            </span>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-brand-500/10 rounded-xl">
              <svg className="size-4 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /><path d="M6.5 10.2a8 8 0 0 1 11 0" /><path d="M12 14v4" /><path d="M12 22v-2" />
                <circle cx="12" cy="16" r="6" fill="none" />
              </svg>
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                {t("selectedCount", "inquiries", { count: selectedIds.size })}
              </span>
            </div>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

            <div className="relative">
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) handleBulkStatusChange(val as InquiryStatus);
                  e.target.value = "";
                }}
                defaultValue=""
                className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-600"
              >
                <option value="" disabled>{t("changeStatusTo", "inquiries") || "Change status to..."}</option>
                <option value="new">{t("statusNew", "inquiries")}</option>
                <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
                <option value="resolved">{t("statusResolved", "inquiries")}</option>
                <option value="closed">{t("statusClosed", "inquiries")}</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {canWrite && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white text-xs font-semibold transition-all"
              >
                <TrashBinIcon className="size-3.5" />
                {t("delete", "common")}
              </button>
            )}

            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all ml-auto"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {t("cancel", "common")}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="w-12 px-4 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 peer-checked:bg-brand-500 peer-checked:border-brand-500 peer-hover:border-brand-400 transition-all duration-200" />
                        <svg
                          className="absolute inset-0 size-5 pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </label>
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableSubject", "inquiries")}</th>
                    <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableName", "inquiries")}</th>
                    <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableEmail", "inquiries")}</th>
                    {!selectedCompanyId && <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableCompany", "inquiries")}</th>}
                    <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableStatus", "inquiries")}</th>
                    <th className="text-left px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableDate", "inquiries")}</th>
                    <th className="text-right px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("tableActions", "inquiries")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={selectedCompanyId ? 7 : 8} className="px-6 py-24 text-center">
                        <div className="py-16 text-center">
                          <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-4 flex items-center justify-center">
                            <ChatIcon className="size-8 text-slate-300 dark:text-slate-700" />
                          </div>
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">
                            {t("noInquiriesFound", "inquiries")}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                            {t("noInquiriesFoundText", "inquiries")}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inquiry: any) => {
                      const statusInfo = statusColors[inquiry.status as InquiryStatus] || statusColors.new;
                      const isSelected = selectedIds.has(inquiry._id);
                      return (
                        <tr
                          key={inquiry._id}
                          onClick={() => navigate(`/inquiries/${inquiry._id}`)}
                          className={`border-b border-slate-100 dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group ${isSelected ? "bg-brand-500/5" : ""}`}
                        >
                          <td className="w-12 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(inquiry._id)}
                                className="peer sr-only"
                              />
                              <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 peer-checked:bg-brand-500 peer-checked:border-brand-500 peer-hover:border-brand-400 transition-all duration-200" />
                              <svg
                                className="absolute inset-0 size-5 pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </label>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 flex items-center justify-center text-sm font-black text-brand-500 shrink-0">
                                {inquiry.name?.charAt(0) || "?"}
                              </div>
                              <p className="font-bold text-gray-900 dark:text-white line-clamp-1">
                                {toPlainString(inquiry.subject)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{inquiry.name}</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{inquiry.email}</td>
                          {!selectedCompanyId && (
                          <td className="px-6 py-4">
                            {!inquiry.companyId ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-purple-500/10 text-purple-600">
                                <IconMonitor className="size-3" />
                                System
                              </span>
                            ) : showCompanyTag ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-600">
                                <IconBuilding className="size-3" />
                                {toPlainString(
                                  companyMap[inquiry.companyId._id || inquiry.companyId]?.name || inquiry.companyId.name
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          )}
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${statusInfo.bg} ${statusInfo.text}`}>
                              {t(statusInfo.label, "inquiries")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-medium whitespace-nowrap">
                            {new Date(inquiry.createdAt).toLocaleDateString(
                              locale === "ar" ? "ar-EG" : "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyInquiry(inquiry);
                                  setIsMessageModalOpen(true);
                                }}
                                className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                              >
                                <MailIcon className="size-3.5" />
                              </button>
                              {canWrite && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(inquiry);
                                  }}
                                  className="size-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                >
                                  <TrashBinIcon className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === "ar" ? <AngleRightIcon className="size-5" /> : <ChevronLeftIcon className="size-5" />}
            </button>
            <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-semibold text-sm">
              {t("phaseLabel", "users", { page })} <span className="opacity-30 mx-2">/</span> {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === "ar" ? <ChevronLeftIcon className="size-5" /> : <AngleRightIcon className="size-5" />}
            </button>
          </div>
        )}
      </div>
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setReplyInquiry(null);
        }}
        applicant={replyInquiry ? { email: replyInquiry.email, _id: replyInquiry._id, name: replyInquiry.name } : {}}
        id={replyInquiry?._id || ""}
        company={replyInquiry?.companyId || undefined}
        defaultFrom={replyInquiry && !replyInquiry.companyId ? "noreply@sabergroup-eg.com" : undefined}
        isInquiry
      />
    </div>
  );
}
