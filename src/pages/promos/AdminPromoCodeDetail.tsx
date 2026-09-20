import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useLocale } from "../../context/LocaleContext";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  usePromoCode,
  usePromoRedemptions,
  useUsers,
} from "../../hooks/queries";
import { formatMoney } from "../../utils/money";
import { toPlainString } from "../../utils/strings";
import PromoCodeFormModal from "./components/PromoCodeFormModal";
import PromoRedemptionsTable from "./components/PromoRedemptionsTable";
import {
  ChevronLeft,
  Pencil,
  Percent,
  Coins,
  CalendarClock,
  CalendarX2,
  Infinity as InfinityIcon,
  Receipt,
  CircleCheck,
  CircleDollarSign,
  CirclePlay,
  User,
  AlignLeft,
  ChevronRight,
} from "lucide-react";

function statCardClass(color: string) {
  return `flex flex-col justify-between gap-4 p-6 rounded-[2rem] ${color} shadow-xl`;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPromoCodeDetail() {
  const { t, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"overview" | "redemptions">("overview");
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: code, isLoading } = usePromoCode(id ?? null);
  const { data: hrUsers = [] } = useUsers();
  const hrUserOptions = hrUsers
    .filter((u) => String(u?.roleId?.name || "").toLowerCase().trim() === "hr manager")
    .map((u) => ({ _id: u._id, fullName: u.fullName, name: u.name, email: u.email }));

  const {
    data: redemptionsEnvelope,
    isLoading: redemptionsLoading,
  } = usePromoRedemptions({
    promoCodeId: id ?? "",
    page: redemptionsPage,
  });
  const redemptions = redemptionsEnvelope?.data ?? [];
  const redemptionsTotalPages = redemptionsEnvelope?.totalPages ?? 1;

  if (isLoading) return <LoadingSpinner fullPage />;

  if (!code) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-8 flex items-center justify-center">
        <div className="text-center space-y-5 max-w-md">
          <div className="size-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
            <Receipt className="size-10 text-purple-500" />
          </div>
          <h1 className="text-2xl font-black dark:text-white">
            {t("detailNotFoundTitle", "promos")}
          </h1>
          <p className="text-gray-500 font-medium">{t("detailNotFoundText", "promos")}</p>
          <button
            onClick={() => navigate("/promos")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:scale-105 transition-all"
          >
            <ChevronLeft className="size-4" />
            {t("detailNotFoundButton", "promos")}
          </button>
        </div>
      </div>
    );
  }

  const isActive = code.isActive !== false;
  const owner =
    typeof code.ownerUserId === "object" ? code.ownerUserId : null;
  const ownerLabel = toPlainString(owner?.fullName || owner?.name || owner?.email);
  const stats = code.stats;
  const discountValue =
    code.discountPercent != null
      ? `${code.discountPercent}%`
      : code.discountAmountCents != null
        ? formatMoney(code.discountAmountCents)
        : "—";
  const commissionParts: string[] = [];
  if (code.commissionPercent != null) commissionParts.push(`${code.commissionPercent}%`);
  if (code.commissionAmountCents != null) commissionParts.push(formatMoney(code.commissionAmountCents));
  const commissionValue = commissionParts.length ? commissionParts.join(" + ") : "—";

  const tabs = [
    { key: "overview" as const, label: t("detailSectionOverview", "promos") },
    { key: "redemptions" as const, label: t("redemptionsTitle", "promos") },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta title={t("detailTitle", "promos")} description={t("pageSubtitle", "promos")} />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/promos")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
          >
            {locale === "ar" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            {t("detailBackButton", "promos")}
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 text-blue-500 rounded-2xl font-bold hover:bg-blue-500 hover:text-white transition-all"
          >
            <Pencil className="size-4" />
            {t("modalEditTitle", "promos")}
          </button>
        </div>

        {/* Hero card */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 rounded-[2.5rem] shadow-2xl shadow-purple-500/20 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur font-mono font-black tracking-widest text-xl sm:text-2xl">
                  {toPlainString(code.code)}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                    isActive ? "bg-green-400/20 text-green-300" : "bg-red-400/20 text-red-300"
                  }`}
                >
                  {isActive ? t("statusActive", "promos") : t("statusInactive", "promos")}
                </span>
              </div>
              {code.notes && (
                <p className="text-sm text-white/70 italic flex items-center gap-2">
                  <AlignLeft className="size-4" />
                  {toPlainString(code.notes)}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <CirclePlay className="size-5 text-white/50 mb-2" />
                <div className="text-2xl font-black tabular-nums">{stats?.redemptions ?? 0}</div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                  {t("statRedemptions", "promos")}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <CircleCheck className="size-5 text-white/50 mb-2" />
                <div className="text-2xl font-black tabular-nums">{stats?.activeRedemptions ?? 0}</div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                  {t("statActiveRedemptions", "promos")}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <CircleDollarSign className="size-5 text-white/50 mb-2" />
                <div className="text-2xl font-black tabular-nums">
                  {formatMoney(stats?.commissionPaidCents ?? 0)}
                </div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                  {t("statCommissionPaid", "promos")}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <CircleDollarSign className="size-5 text-white/50 mb-2" />
                <div className="text-2xl font-black tabular-nums">
                  {formatMoney(stats?.commissionPendingCents ?? 0)}
                </div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                  {t("statCommissionPending", "promos")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                tab === item.key
                  ? "bg-brand-500 text-white shadow-xl shadow-brand-500/20"
                  : "bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-gray-500"
              }`}
            >
              {item.label}
              {item.key === "redemptions" && ` (${stats?.redemptions ?? 0})`}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: discount & commission */}
            <div className="space-y-6">
              <div className={`${statCardClass("bg-emerald-500/10 border border-emerald-500/20")} text-emerald-600 dark:text-emerald-400`}>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t("detailDiscount", "promos")}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black">{discountValue}</span>
                  {code.discountPercent != null ? (
                    <Percent className="size-9 opacity-40" />
                  ) : (
                    <Coins className="size-9 opacity-40" />
                  )}
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {t("detailCycles", "promos")}: {code.discountCycles ?? 1}
                </span>
              </div>

              <div className={`${statCardClass("bg-purple-500/10 border border-purple-500/20")} text-purple-600 dark:text-purple-400`}>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t("detailCommission", "promos")}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black">{commissionValue}</span>
                  <Coins className="size-9 opacity-40" />
                </div>
              </div>
            </div>

            {/* Middle: limits */}
            <div className="space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {t("detailSectionOverview", "promos")}
              </h2>
              <div className="rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl divide-y divide-slate-100 dark:divide-white/5">
                <DetailRow icon={<InfinityIcon className="size-4" />} label={t("detailMaxUses", "promos")}>
                  {code.maxUses != null ? code.maxUses : t("detailUnlimited", "promos")}
                </DetailRow>
                <DetailRow icon={<CalendarClock className="size-4" />} label={t("detailExpires", "promos")}>
                  {code.expiresAt ? formatDate(code.expiresAt, locale) : t("detailNever", "promos")}
                </DetailRow>
                <DetailRow icon={<CalendarX2 className="size-4" />} label={t("detailCreatedAt", "promos")}>
                  {formatDate(code.createdAt, locale)}
                </DetailRow>
                <DetailRow icon={<User className="size-4" />} label={t("detailOwner", "promos")}>
                  {ownerLabel || "—"}
                </DetailRow>
              </div>
            </div>

            {/* Right: notes */}
            <div className="space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {t("detailNotes", "promos")}
              </h2>
              <div className="rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 min-h-[12rem]">
                {code.notes ? (
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium whitespace-pre-wrap">
                    {toPlainString(code.notes)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">{t("detailNoNotes", "promos")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "redemptions" && (
          <div className="space-y-6">
            <PromoRedemptionsTable data={redemptions} isLoading={redemptionsLoading} />
            {!redemptionsLoading && redemptionsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  disabled={redemptionsPage === 1}
                  onClick={() => setRedemptionsPage((p) => Math.max(1, p - 1))}
                  className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                >
                  {locale === "ar" ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
                </button>
                <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black tracking-widest text-sm uppercase">
                  {t("phaseLabel", "promos", { page: redemptionsPage })}{" "}
                  <span className="opacity-30 mx-2">/</span> {redemptionsTotalPages}
                </div>
                <button
                  disabled={redemptionsPage === redemptionsTotalPages}
                  onClick={() => setRedemptionsPage((p) => Math.min(redemptionsTotalPages, p + 1))}
                  className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                >
                  {locale === "ar" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PromoCodeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="admin"
        code={code}
        hrUsers={hrUserOptions}
      />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <span className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400">
        <span className="text-brand-500">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100 text-right">
        {children}
      </span>
    </div>
  );
}