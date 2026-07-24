import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useInquiries, useDeleteInquiry } from "../../hooks/queries";
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
  AngleLeftIcon,
  ArrowRightIcon,
  ChatIcon,
  UserIcon,
  TimeIcon,
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
  const [replyInquiry, setReplyInquiry] = useState<any>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const rawInquiries = useMemo(() => {
    if (!inquiries) return [];
    return Array.isArray(inquiries) ? inquiries : [];
  }, [inquiries]);

  const filtered = useMemo(() => {
    let result = rawInquiries;
    if (!isSystemUser || selectedCompanyId) {
      result = result.filter((q: any) => !q.companyId);
    }
    if (selectedCompanyId) {
      result = result.filter(
        (q: any) => q.companyId && (typeof q.companyId === "string" ? q.companyId : q.companyId._id) === selectedCompanyId
      );
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

        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((inquiry: any) => {
              const statusInfo = statusColors[inquiry.status as InquiryStatus] || statusColors.new;
              return (
                <div
                  key={inquiry._id}
                  onClick={() => navigate(`/inquiries/${inquiry._id}`)}
                  className="group relative bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 ${statusInfo.bg.replace("/10", "/30").replace("text-", "bg-")} group-hover:${statusInfo.text.replace("text-", "bg-")}`} />

                  <div className="space-y-5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="size-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 flex items-center justify-center text-2xl font-black text-brand-500 border border-white/20">
                          {inquiry.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {!inquiry.companyId && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-purple-500/10 text-purple-600">
                              <IconMonitor className="size-3" />
                              System
                            </span>
                          )}
                          {showCompanyTag && inquiry.companyId && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-600">
                              <IconBuilding className="size-3" />
                              {toPlainString(
                                companyMap[inquiry.companyId._id || inquiry.companyId]?.name || inquiry.companyId.name
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyInquiry(inquiry);
                            setIsMessageModalOpen(true);
                          }}
                          className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        >
                          <MailIcon className="size-3.5" />
                        </button>
                        {canWrite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(inquiry);
                            }}
                            className="size-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                          >
                            <TrashBinIcon className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white line-clamp-1 tracking-tight">
                        {toPlainString(inquiry.subject)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {inquiry.message}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <UserIcon className="size-4 opacity-50" />
                        <span className="truncate">{inquiry.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <MailIcon className="size-4 opacity-50" />
                        <span className="truncate">{inquiry.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <TimeIcon className="size-4 opacity-50" />
                        <span>
                          {new Date(inquiry.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-EG" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {t(statusInfo.label, "inquiries")}
                      </span>
                      <div className="flex items-center gap-1 text-brand-500 font-black text-[10px] uppercase tracking-widest group-hover:gap-2 transition-all">
                        {t("detailsLabel", "users")} <ArrowRightIcon className="size-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                <div className="size-20 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-6 flex items-center justify-center">
                  <ChatIcon className="size-10 text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {t("noInquiriesFound", "inquiries")}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
                  {t("noInquiriesFoundText", "inquiries")}
                </p>
              </div>
            )}
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
            <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black tracking-widest text-sm uppercase">
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
