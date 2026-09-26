import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useInquiries, useDeleteInquiry, useUpdateInquiry } from "../../hooks/queries";
import { toPlainString } from "../../utils/strings";
import Swal from "../../utils/swal";
import { useCompanyFilter } from "../../context/CompanyFilterContext";
import type { InquiryStatus } from "../../services/inquiriesService";
import MessageModal from "../../components/modals/MessageModal";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  IconButton,
  PageShell,
  Pagination,
  Table,
  Td,
  Th,
  filterSelectClass,
  inputClass,
  rowClass,
  type BadgeTone,
} from "../../components/ui/kit";
import {
  TrashBinIcon,
  MailIcon,
  ChatIcon,
} from "../../icons";

const statusColors: Record<InquiryStatus, { tone: BadgeTone; label: string }> = {
  new: { tone: "blue", label: "statusNew" },
  in_progress: { tone: "amber", label: "statusInProgress" },
  resolved: { tone: "green", label: "statusResolved" },
  closed: { tone: "slate", label: "statusClosed" },
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
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
    <PageShell title={t("inquiriesHeading", "inquiries")} subtitle={t("inquiriesSubtitle", "inquiries")}>
      <PageMeta
        title={t("inquiriesListPageTitle", "inquiries")}
        description={t("inquiriesListPageDesc", "inquiries")}
      />

      <Card>
        <CardToolbar>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <IconSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("searchInquiries", "inquiries")}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className={`${inputClass} ps-9`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className={filterSelectClass}
              aria-label={t("tableStatus", "inquiries")}
            >
              <option value="all">{t("filterAllStatuses", "users")}</option>
              <option value="new">{t("statusNew", "inquiries")}</option>
              <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
              <option value="resolved">{t("statusResolved", "inquiries")}</option>
              <option value="closed">{t("statusClosed", "inquiries")}</option>
            </select>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium tabular-nums text-slate-900 dark:text-white">{filtered.length}</span> {t("results", "inquiries")}
          </p>
        </CardToolbar>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-brand-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-brand-500/10">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
              {t("selectedCount", "inquiries", { count: selectedIds.size })}
            </span>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleBulkStatusChange(val as InquiryStatus);
                e.target.value = "";
              }}
              defaultValue=""
              className={filterSelectClass}
              aria-label={t("changeStatusTo", "inquiries")}
            >
              <option value="" disabled>{t("changeStatusTo", "inquiries")}</option>
              <option value="new">{t("statusNew", "inquiries")}</option>
              <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
              <option value="resolved">{t("statusResolved", "inquiries")}</option>
              <option value="closed">{t("statusClosed", "inquiries")}</option>
            </select>
            {canWrite && (
              <Button variant="danger" size="sm" icon={<TrashBinIcon className="size-3.5" />} onClick={handleBulkDelete}>
                {t("delete", "common")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setSelectedIds(new Set())}>
              {t("cancel", "common")}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState icon={<ChatIcon className="size-6" />} title={t("noInquiriesFound", "inquiries")} text={t("noInquiriesFoundText", "inquiries")} />
        ) : (
          <Table minWidth={selectedCompanyId ? 760 : 880}>
            <thead>
              <tr>
                <Th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label={t("selectAll", "common")}
                    className="size-4 cursor-pointer rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
                  />
                </Th>
                <Th>{t("tableSubject", "inquiries")}</Th>
                <Th>{t("tableName", "inquiries")}</Th>
                <Th>{t("tableEmail", "inquiries")}</Th>
                {!selectedCompanyId && <Th>{t("tableCompany", "inquiries")}</Th>}
                <Th>{t("tableStatus", "inquiries")}</Th>
                <Th>{t("tableDate", "inquiries")}</Th>
                <Th align="end">{t("tableActions", "inquiries")}</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((inquiry: any) => {
                const statusInfo = statusColors[inquiry.status as InquiryStatus] || statusColors.new;
                const isSelected = selectedIds.has(inquiry._id);
                return (
                  <tr
                    key={inquiry._id}
                    onClick={() => navigate(`/inquiries/${inquiry._id}`)}
                    className={`${rowClass} cursor-pointer ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/10" : ""}`}
                  >
                    <Td className="w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(inquiry._id)}
                        aria-label={toPlainString(inquiry.subject)}
                        className="size-4 cursor-pointer rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
                      />
                    </Td>
                    <Td>
                      <span className="line-clamp-1 font-medium text-slate-900 dark:text-white">{toPlainString(inquiry.subject)}</span>
                    </Td>
                    <Td>{inquiry.name}</Td>
                    <Td className="text-slate-500 dark:text-slate-400">{inquiry.email}</Td>
                    {!selectedCompanyId && (
                      <Td>
                        {!inquiry.companyId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <IconMonitor className="size-3.5" />
                            {t("systemInquiry", "inquiries")}
                          </span>
                        ) : showCompanyTag ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <IconBuilding className="size-3.5 text-slate-400" />
                            {toPlainString(companyMap[inquiry.companyId._id || inquiry.companyId]?.name || inquiry.companyId.name)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                    )}
                    <Td>
                      <Badge tone={statusInfo.tone}>{t(statusInfo.label, "inquiries")}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(inquiry.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Td>
                    <Td align="end">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          label={t("reply", "inquiries")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyInquiry(inquiry);
                            setIsMessageModalOpen(true);
                          }}
                        >
                          <MailIcon className="size-4" />
                        </IconButton>
                        {canWrite && (
                          <IconButton
                            label={t("delete", "common")}
                            tone="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(inquiry);
                            }}
                          >
                            <TrashBinIcon className="size-4" />
                          </IconButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {!isLoading && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} onChange={setPage} />
        )}
      </Card>

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
    </PageShell>
  );
}
