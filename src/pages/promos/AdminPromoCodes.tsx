import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { usePromoCodes, useUsers, useUpdatePromoCode } from "../../hooks/queries";
import { formatMoney } from "../../utils/money";
import { toPlainString } from "../../utils/strings";
import Swal from "../../utils/swal";
import {
  Search,
  Plus,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Users,
  Percent,
  Coins,
  CalendarX2,
} from "lucide-react";
import PromoCodeFormModal from "./components/PromoCodeFormModal";
import type { PromoCode } from "../../types/promos";

type HrUser = {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
};

export default function AdminPromoCodes() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const params = useMemo(() => {
    const p: { search?: string; ownerUserId?: string; isActive?: boolean; page: number; limit: number } = {
      page,
      limit: pageSize,
    };
    if (searchTerm.trim()) p.search = searchTerm.trim();
    if (ownerFilter !== "all") p.ownerUserId = ownerFilter;
    if (statusFilter !== "all") p.isActive = statusFilter === "active";
    return p;
  }, [searchTerm, ownerFilter, statusFilter, page]);

  const { data: envelope, isLoading } = usePromoCodes(params);
  const { data: rawUsers = [] } = useUsers();
  const updateMutation = useUpdatePromoCode();

  const hrUsers = useMemo<HrUser[]>(() => {
    return rawUsers
      .filter((u) => String(u?.roleId?.name || "").toLowerCase().trim() === "hr manager")
      .map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        name: u.name,
        email: u.email,
      }));
  }, [rawUsers]);

  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);

  const ownerName = (code: PromoCode): string => {
    const owner =
      typeof code.ownerUserId === "object" ? code.ownerUserId : null;
    return toPlainString(owner?.fullName || owner?.name || owner?.email || "");
  };

  const discountLabel = (code: PromoCode): string => {
    if (code.discountPercent != null) return `${code.discountPercent}%`;
    if (code.discountAmountCents != null) return formatMoney(code.discountAmountCents);
    return "—";
  };

  const commissionLabel = (code: PromoCode): string => {
    const parts: string[] = [];
    if (code.commissionPercent != null) parts.push(`${code.commissionPercent}%`);
    if (code.commissionAmountCents != null) parts.push(formatMoney(code.commissionAmountCents));
    return parts.length ? parts.join(" + ") : "—";
  };

  const handleToggleActive = async (code: PromoCode) => {
    const next = !code.isActive;
    const result = await Swal.fire({
      title: t("activeToggleConfirmTitle", "promos"),
      text: next
        ? t("activeToggleOnText", "promos")
        : t("activeToggleOffText", "promos"),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t("cancel", "common"),
      confirmButtonColor: next ? "#22c55e" : "#ef4444",
      confirmButtonText: t("toggleConfirmButton", "promos"),
    });
    if (!result.isConfirmed) return;
    try {
      await updateMutation.mutateAsync({
        id: code._id,
        payload: { isActive: next },
      });
      Swal.fire({
        title: next ? t("codeActivated", "promos") : t("codeDeactivated", "promos"),
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire(t("error", "common"), t("codeToggleFailed", "promos"), "error");
    }
  };

  const isHr = String(user?.roleId?.name || "").toLowerCase().trim() === "hr manager";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t("metaTitle", "promos")} description={t("metaDescription", "promos")} />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb
          pageTitle={t("pageTitle", "promos")}
          actions={
            !isHr && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="size-5" />
                {t("createButton", "promos")}
              </button>
            )
          }
        />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t("pageTitle", "promos")}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
              {t("pageSubtitle", "promos")}
            </p>
          </div>

          <div className="relative flex-1 min-w-[300px] max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder", "promos")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>

        {/* Filters & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 flex flex-wrap gap-4 items-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-2 px-3 text-gray-400">
              <Filter className="size-4" />
              <span className="text-xs font-black uppercase tracking-widest">
                {t("filtersLabel", "promos")}
              </span>
            </div>

            <select
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
            >
              <option value="all">{t("filterAllOwners", "promos")}</option>
              {hrUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName || u.name || u.email}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
            >
              <option value="all">{t("filterAllStatuses", "promos")}</option>
              <option value="active">{t("filterActive", "promos")}</option>
              <option value="inactive">{t("filterInactive", "promos")}</option>
            </select>

            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20">
              <Tag className="size-4" />
              <span className="text-sm font-black tabular-nums">
                {t("resultsFound", "promos", { count: totalCount })}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-[2rem] shadow-xl shadow-purple-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
              {t("tableStats", "promos")}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black text-white tabular-nums">{totalCount}</span>
              <Tag className="size-8 text-white/30" />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                  <th className="px-4 py-4 min-w-[120px]">{t("tableCode", "promos")}</th>
                  <th className="px-4 py-4 min-w-[110px]">{t("tableOwner", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableDiscount", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableCommission", "promos")}</th>
                  <th className="px-4 py-4 w-[70px]">{t("tableCycles", "promos")}</th>
                  <th className="px-4 py-4 w-[90px]">{t("tableStats", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableStatus", "promos")}</th>
                  <th className="px-4 py-4 min-w-[100px]">{t("tableExpires", "promos")}</th>
                  <th className="px-4 py-4 text-right w-[90px]">{t("tableActions", "promos")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {codes.map((code) => {
                  const isActive = code.isActive !== false;
                  const expiresLabel = code.expiresAt
                    ? new Date(code.expiresAt).toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )
                    : t("detailNever", "promos");
                  return (
                    <tr
                      key={code._id}
                      onClick={() => navigate(`/promos/${code._id}`)}
                      className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide text-xs">
                          {toPlainString(code.code)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-xs">
                          <Users className="size-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{ownerName(code) || "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                          {code.discountPercent != null ? (
                            <Percent className="size-3.5 shrink-0" />
                          ) : (
                            <Coins className="size-3.5 shrink-0" />
                          )}
                          {discountLabel(code)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs">
                          <Coins className="size-3.5 shrink-0" />
                          {commissionLabel(code)}
                        </span>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-xs">
                        {code.discountCycles ?? 1}
                      </td>
                      <td className="px-4 py-4 tabular-nums text-gray-500 dark:text-gray-400 text-xs">
                        {code.stats?.redemptions ?? 0}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg whitespace-nowrap ${
                            isActive
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {isActive
                            ? t("statusActive", "promos")
                            : t("statusInactive", "promos")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {code.expiresAt ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarX2 className="size-3.5 shrink-0" />
                            {expiresLabel}
                          </span>
                        ) : (
                          expiresLabel
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCode(code);
                            }}
                            className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                            title={t("modalEditTitle", "promos")}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(code);
                            }}
                            className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                              isActive
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                : "bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white"
                            }`}
                            title={t("activeToggleConfirmTitle", "promos")}
                          >
                            <Power className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {codes.length === 0 && !isLoading && (
              <div className="py-24 text-center">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
                  <Tag className="size-8 text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {t("noCodesFound", "promos")}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
                  {t("noCodesFoundText", "promos")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === "ar" ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
            </button>
            <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black tracking-widest text-sm uppercase">
              {t("phaseLabel", "promos", { page })} <span className="opacity-30 mx-2">/</span> {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === "ar" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
            </button>
          </div>
        )}
      </div>

      <PromoCodeFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="admin"
        hrUsers={hrUsers}
      />
      <PromoCodeFormModal
        isOpen={!!editingCode}
        onClose={() => setEditingCode(null)}
        mode="admin"
        code={editingCode}
        hrUsers={hrUsers}
      />
    </div>
  );
}