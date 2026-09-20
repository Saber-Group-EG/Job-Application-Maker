import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useMyCommissions } from "../../hooks/queries";
import { formatMoney } from "../../utils/money";
import { toPlainString } from "../../utils/strings";
import {
  CalendarClock,
  Wallet,
  Clock4,
  History,
} from "lucide-react";
import type {
  MyCommissionByMonthRow,
  MyCommissionRecentRow,
  MyCommissionSummaryRow,
  CompanyName,
} from "../../types/promos";

function companyName(name: CompanyName | undefined, locale: string): string {
  if (!name) return "—";
  if (typeof name === "string") return toPlainString(name);
  return toPlainString(locale === "ar" ? name.ar || name.en : name.en || name.ar);
}

export default function MyCommissions() {
  const { t, locale } = useLocale();

  const [month, setMonth] = useState("");

  const { data: ledger, isLoading } = useMyCommissions(month || undefined);

  const summary: MyCommissionSummaryRow[] = ledger?.summary ?? [];
  const byMonth: MyCommissionByMonthRow[] = ledger?.byMonth ?? [];
  const recent: MyCommissionRecentRow[] = ledger?.recent ?? [];

  const statusChip = (status: string | undefined) => {
    const key = (status || "").toLowerCase();
    if (key === "paid")
      return {
        cls: "bg-green-500/10 text-green-600",
        label: t("ledgerStatusPaid", "promos"),
      };
    if (key === "void")
      return {
        cls: "bg-slate-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400",
        label: t("ledgerStatusVoid", "promos"),
      };
    return {
      cls: "bg-amber-500/10 text-amber-600",
      label: t("ledgerStatusPending", "promos"),
    };
  };

  const formatDate = (value: string | undefined): string => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return toPlainString(value);
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const recentCode = (row: MyCommissionRecentRow): string => {
    const raw = row.promoCodeId;
    if (raw && typeof raw === "object") return toPlainString(raw.code || "");
    return "";
  };

  const money = (value: number | undefined): string =>
    value != null ? formatMoney(value) : "—";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t("myLedgerTitle", "promos")} description={t("myLedgerSubtitle", "promos")} />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t("myLedgerTitle", "promos")} />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t("myLedgerTitle", "promos")}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
              {t("myLedgerSubtitle", "promos")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <CalendarClock className="size-3.5" />
              {t("commissionsMonthLabel", "promos")}
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer dark:text-white dark:[color-scheme:dark]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary */}
            {summary.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {summary.map((row) => {
                  const chip = statusChip(row._id);
                  const accent =
                    String(row._id).toLowerCase() === "paid"
                      ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                      : "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20";
                  return (
                    <div
                      key={row._id}
                      className={`flex flex-col justify-between gap-4 p-6 rounded-[2rem] ${accent} shadow-xl`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {chip.label}
                        </span>
                        {String(row._id).toLowerCase() === "paid" ? (
                          <Wallet className="size-8 text-emerald-500/40" />
                        ) : (
                          <Clock4 className="size-8 text-amber-500/40" />
                        )}
                      </div>
                      <div className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">
                        {money(row.totalCents)}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {t("commissionsCycles", "promos")}: {row.cycles ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* By Month */}
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <CalendarClock className="size-4" />
                  {t("myByMonthTitle", "promos")}
                </h2>
                {byMonth.length === 0 ? (
                  <div className="py-16 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("myLedgerNoMonthData", "promos")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                          <th className="px-6 py-4">{t("commissionsTableMonth", "promos")}</th>
                          <th className="px-6 py-4">{t("commissionsTableStatus", "promos")}</th>
                          <th className="px-6 py-4">{t("commissionsTableAmount", "promos")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {byMonth.map((row, index) => {
                          const chip = statusChip(row._id?.status);
                          return (
                            <tr key={index} className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors">
                              <td className="px-6 py-4 tabular-nums">
                                <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <CalendarClock className="size-3.5 text-gray-400" />
                                  {row._id?.billingPeriodKey || "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${chip.cls}`}>
                                  {chip.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 tabular-nums">
                                {money(row.totalCents)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent */}
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <History className="size-4" />
                  {t("myRecentTitle", "promos")}
                </h2>
                {recent.length === 0 ? (
                  <div className="py-16 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("myRecentNoEntries", "promos")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl divide-y divide-slate-100 dark:divide-white/5">
                    {recent.slice(0, 8).map((row, index) => {
                      const chip = statusChip(row.status);
                      const codeLabel = recentCode(row);
                      return (
                        <div key={index} className="flex items-center justify-between gap-4 px-6 py-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${chip.cls}`}>
                                {chip.label}
                              </span>
                              {codeLabel && (
                                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono text-xs tracking-wide">
                                  {codeLabel}
                                </span>
                              )}
                              <span className="text-xs font-medium text-gray-400">
                                {companyName(
                                  typeof row.companyId === "object"
                                    ? row.companyId?.name
                                    : undefined,
                                  locale
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-400">
                              {formatDate(row.createdAt)}
                            </p>
                          </div>
                          <span className="text-base font-black tabular-nums text-gray-900 dark:text-white shrink-0">
                            {money(row.amountCents)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}