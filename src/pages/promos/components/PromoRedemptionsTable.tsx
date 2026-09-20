import { useLocale } from "../../../context/LocaleContext";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatMoney } from "../../../utils/money";
import { toPlainString } from "../../../utils/strings";
import { Ticket } from "lucide-react";
import type { PromoRedemption } from "../../../types/promos";

interface PromoRedemptionsTableProps {
  data?: PromoRedemption[];
  isLoading?: boolean;
}

function companyName(
  companyId: PromoRedemption["companyId"],
  locale: string
): string {
  if (!companyId) return "—";
  if (typeof companyId === "string") return "—";
  const name = companyId.name;
  if (!name) return "—";
  if (typeof name === "string") return toPlainString(name);
  return toPlainString(locale === "ar" ? name.ar || name.en : name.en || name.ar);
}

function redemptionStatus(
  status: string | undefined
): { dot: string; labelKey: string } {
  const key = (status || "").toLowerCase().trim();
  switch (key) {
    case "active":
      return { dot: "bg-green-500", labelKey: "redemptionsStatusActive" };
    case "expired":
      return { dot: "bg-gray-400", labelKey: "redemptionsStatusExpired" };
    case "revoked":
      return { dot: "bg-red-500", labelKey: "redemptionsStatusRevoked" };
    default:
      return { dot: "bg-gray-300 dark:bg-gray-700", labelKey: "" };
  }
}

function planCents(
  plan: PromoRedemption["standardPlanId"]
): number | undefined {
  if (!plan || typeof plan === "string") return undefined;
  return plan.priceCents;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PromoRedemptionsTable({
  data,
  isLoading,
}: PromoRedemptionsTableProps) {
  const { t, locale } = useLocale();

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
        <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
          <Ticket className="size-8 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white">
          {t("redemptionsNoResults", "promos")}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
          {t("redemptionsNoResultsText", "promos")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
            <th className="px-6 py-4">{t("redemptionsTableCompany", "promos")}</th>
            <th className="px-6 py-4">{t("redemptionsTableCode", "promos")}</th>
            <th className="px-6 py-4">{t("redemptionsTableStatus", "promos")}</th>
            <th className="px-6 py-4">{t("redemptionsTableCycle", "promos")}</th>
            <th className="px-6 py-4">{t("redemptionsTableSaved", "promos")}</th>
            <th className="px-6 py-4">{t("redemptionsTableDate", "promos")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {data.map((redemption) => {
            const status = redemptionStatus(redemption.status);
            const code =
              typeof redemption.promoCodeId === "string"
                ? "—"
                : redemption.promoCodeId?.code || "—";
            const standardCents = planCents(redemption.standardPlanId);
            const discountCents = planCents(redemption.discountPlanId);
            const savedPerCycle =
              standardCents != null &&
              discountCents != null &&
              standardCents > discountCents
                ? standardCents - discountCents
                : undefined;
            const saved =
              savedPerCycle != null && redemption.discountCyclesUsed != null
                ? formatMoney(savedPerCycle * redemption.discountCyclesUsed)
                : "—";
            return (
              <tr
                key={redemption._id}
                className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
              >
                <td className="px-6 py-4">
                  {companyName(redemption.companyId, locale)}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide">
                    {code}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 capitalize">
                    <span className={`size-2 rounded-full ${status.dot}`} />
                    {status.labelKey
                      ? t(status.labelKey, "promos")
                      : toPlainString(redemption.status || "—")}
                  </span>
                </td>
                <td className="px-6 py-4 tabular-nums">
                  {redemption.discountCyclesUsed != null
                    ? redemption.discountCyclesUsed
                    : "—"}
                </td>
                <td className="px-6 py-4 text-green-600 dark:text-green-400 tabular-nums">
                  {saved}
                </td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                  {formatDate(redemption.createdAt, locale)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}