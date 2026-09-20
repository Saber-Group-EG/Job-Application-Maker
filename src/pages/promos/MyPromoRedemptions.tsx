import { useState, useMemo } from "react";
import { useLocale } from "../../context/LocaleContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useMyPromoRedemptions } from "../../hooks/queries";
import PromoRedemptionsTable from "./components/PromoRedemptionsTable";
import { Filter, Clock4, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_OPTIONS = ["active", "expired", "revoked"];

export default function MyPromoRedemptions() {
  const { t, locale } = useLocale();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: { status?: string; page: number } = { page };
    if (statusFilter !== "all") p.status = statusFilter;
    return p;
  }, [statusFilter, page]);

  const { data: envelope, isLoading } = useMyPromoRedemptions(params);

  const redemptions = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t("myRedemptionsTitle", "promos")} description={t("myRedemptionsSubtitle", "promos")} />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t("myRedemptionsTitle", "promos")} />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t("myRedemptionsTitle", "promos")}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
              {t("myRedemptionsSubtitle", "promos")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-2 px-2 text-gray-400">
              <Filter className="size-4" />
              <span className="text-xs font-black uppercase tracking-widest">
                {t("filtersLabel", "promos")}
              </span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
            >
              <option value="all">{t("ledgerFilterAllStatuses", "promos")}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20">
              <Clock4 className="size-4" />
              <span className="text-sm font-black tabular-nums">
                {t("resultsFound", "promos", { count: totalCount })}
              </span>
            </div>
          </div>
        </div>

        <PromoRedemptionsTable data={redemptions} isLoading={isLoading} />

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
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
    </div>
  );
}