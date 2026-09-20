import { useState } from "react";
import { Modal } from "../../../components/ui/modal";
import { useLocale } from "../../../context/LocaleContext";
import { ValidationErrorAlert } from "../../../components/common/ValidationErrorAlert";
import { parseMoneyToCents } from "../../../utils/money";
import {
  useCreatePromoCode,
  useUpdatePromoCode,
  useCreateMyPromoCode,
} from "../../../hooks/queries/usePromos";
import type { PromoCode, PromoCodePayload } from "../../../types/promos";
import { Tag, Percent, Coins, CalendarClock, Infinity as InfinityIcon, Plus } from "lucide-react";

type HrUser = {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
};

interface PromoCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "admin" | "my";
  code?: PromoCode | null;
  hrUsers?: HrUser[];
}

type DiscountType = "percent" | "fixed";

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const toNum = (value: string): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export default function PromoCodeFormModal({
  isOpen,
  onClose,
  mode,
  code,
  hrUsers = [],
}: PromoCodeFormModalProps) {
  const { t } = useLocale();
  const isEdit = !!code;

  const createAdmin = useCreatePromoCode();
  const updateAdmin = useUpdatePromoCode();
  const createMy = useCreateMyPromoCode();

  const saving = createAdmin.isPending || updateAdmin.isPending || createMy.isPending;

  const [formError, setFormError] = useState("");

  const [formCode, setFormCode] = useState(code?.code ?? "");
  const [ownerUserId, setOwnerUserId] = useState(
    typeof code?.ownerUserId === "string"
      ? code.ownerUserId
      : code?.ownerUserId?._id ?? ""
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    code?.discountPercent != null ? "percent" : "fixed"
  );
  const [discountPercent, setDiscountPercent] = useState(
    code?.discountPercent != null ? String(code.discountPercent) : ""
  );
  const [discountAmount, setDiscountAmount] = useState(
    code?.discountAmountCents != null
      ? String((code.discountAmountCents / 100))
      : ""
  );
  const [discountCycles, setDiscountCycles] = useState(
    code?.discountCycles != null ? String(code.discountCycles) : ""
  );
  const [commissionPercentOn, setCommissionPercentOn] = useState(
    !!code?.commissionPercent
  );
  const [commissionPercent, setCommissionPercent] = useState(
    code?.commissionPercent != null ? String(code.commissionPercent) : ""
  );
  const [commissionFixedOn, setCommissionFixedOn] = useState(
    !!code?.commissionAmountCents
  );
  const [commissionAmount, setCommissionAmount] = useState(
    code?.commissionAmountCents != null
      ? String(code.commissionAmountCents / 100)
      : ""
  );
  const [maxUses, setMaxUses] = useState(
    code?.maxUses != null ? String(code.maxUses) : ""
  );
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(code?.expiresAt));
  const [isActive, setIsActive] = useState(code?.isActive ?? true);
  const [notes, setNotes] = useState(code?.notes ?? "");

  const selectDiscountType = (type: DiscountType) => {
    setDiscountType(type);
    if (type === "percent") {
      setDiscountAmount("");
    } else {
      setDiscountPercent("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const payload: PromoCodePayload = {};

    // `code` is immutable after creation (backend update allow-list ignores it).
    if (formCode.trim() && !isEdit) payload.code = formCode.trim();

    if (mode === "admin" && !isEdit) {
      if (!ownerUserId) {
        setFormError(t("formNoOwnerError", "promos"));
        return;
      }
      payload.ownerUserId = ownerUserId;
    }

    // Discount — exactly one of percent / fixed.
    const discountPercentNum = toNum(discountPercent);
    const discountAmountNum = parseMoneyToCents(discountAmount);
    if (discountType === "percent") {
      if (!discountPercentNum || discountPercentNum <= 0) {
        setFormError(t("formDiscountError", "promos"));
        return;
      }
      payload.discountPercent = discountPercentNum;
    } else {
      if (discountAmountNum <= 0) {
        setFormError(t("formDiscountError", "promos"));
        return;
      }
      payload.discountAmountCents = discountAmountNum;
    }

    if (discountCycles !== "") {
      const cycles = toNum(discountCycles);
      if (!cycles || cycles <= 0) {
        setFormError(t("formDiscountError", "promos"));
        return;
      }
      payload.discountCycles = cycles;
    }

    // Commission — at least one of percent / fixed (both allowed).
    const commissionPercentNum = toNum(commissionPercent);
    const commissionAmountNum = parseMoneyToCents(commissionAmount);
    if (!commissionPercentOn && !commissionFixedOn) {
      setFormError(t("formCommissionError", "promos"));
      return;
    }
    if (commissionPercentOn) {
      if (!commissionPercentNum || commissionPercentNum <= 0) {
        setFormError(t("formCommissionError", "promos"));
        return;
      }
      payload.commissionPercent = commissionPercentNum;
    }
    if (commissionFixedOn) {
      if (commissionAmountNum <= 0) {
        setFormError(t("formCommissionError", "promos"));
        return;
      }
      payload.commissionAmountCents = commissionAmountNum;
    }

    payload.maxUses = maxUses === "" ? null : toNum(maxUses);
    payload.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    payload.isActive = isActive;
    payload.notes = notes.trim() ? notes.trim() : null;

    try {
      if (mode === "admin") {
        if (isEdit) {
          await updateAdmin.mutateAsync({ id: code!._id, payload });
        } else {
          await createAdmin.mutateAsync(payload);
        }
      } else {
        await createMy.mutateAsync(payload);
      }
      onClose();
    } catch {
      // error toast is handled by the mutation hook
    }
  };

  const inputClass =
    "w-full px-6 py-4 bg-white/40 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-bold dark:text-white";
  const labelClass =
    "text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2";

  const tileClass = (active: boolean) =>
    `flex-1 px-4 py-3 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
      active
        ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400"
        : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-gray-400"
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {isEdit
              ? t("modalEditTitle", "promos")
              : t("modalCreateTitle", "promos")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium italic">
            {isEdit
              ? t("modalEditSubtitle", "promos")
              : t("modalCreateSubtitle", "promos")}
          </p>
        </div>

        {formError && (
          <div className="mb-6">
            <ValidationErrorAlert error={formError} onDismiss={() => setFormError("")} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={labelClass}>
                <Tag className="size-3.5" />
                {t("formCode", "promos")}
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t("formCodePlaceholder", "promos")}
                disabled={isEdit}
                className={`${inputClass} ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {isEdit && (
                <p className="text-[10px] font-bold text-gray-400 italic">
                  {t("formCodeLockedHint", "promos")}
                </p>
              )}
            </div>

            {mode === "admin" && !isEdit && (
              <div className="space-y-2">
                <label className={labelClass}>
                  {t("formOwner", "promos")}
                </label>
                <select
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="">{t("formOwnerPlaceholder", "promos")}</option>
                  {hrUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.fullName || u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "admin" && isEdit && code?.ownerUserId && (
              <div className="space-y-2">
                <label className={labelClass}>{t("formOwner", "promos")}</label>
                <input
                  type="text"
                  value={
                    typeof code.ownerUserId === "object"
                      ? code.ownerUserId.fullName || code.ownerUserId.name || code.ownerUserId.email || ""
                      : ""
                  }
                  readOnly
                  className={`${inputClass} opacity-70`}
                />
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-4 p-6 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className={`${labelClass} !text-gray-500 dark:!text-gray-400`}>
                <Percent className="size-3.5" />
                {t("formDiscount", "promos")}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectDiscountType("percent")}
                  className={tileClass(discountType === "percent")}
                >
                  {t("formDiscountPercent", "promos")}
                </button>
                <button
                  type="button"
                  onClick={() => selectDiscountType("fixed")}
                  className={tileClass(discountType === "fixed")}
                >
                  {t("formDiscountFixed", "promos")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {discountType === "percent" ? (
                <div className="space-y-2">
                  <label className={labelClass}>{t("formDiscountPercent", "promos")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder={t("formDiscountPercentPlaceholder", "promos")}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={labelClass}>{t("formDiscountFixed", "promos")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder={t("formDiscountFixedPlaceholder", "promos")}
                    className={inputClass}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className={labelClass}>
                  <CalendarClock className="size-3.5" />
                  {t("formDiscountCycles", "promos")}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={discountCycles}
                  onChange={(e) => setDiscountCycles(e.target.value)}
                  placeholder={t("formDiscountCyclesPlaceholder", "promos")}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <p className="text-[10px] font-bold text-gray-400 italic pb-2">
                  {t("formXorHint", "promos")}
                </p>
              </div>
            </div>
          </div>

          {/* Commission */}
          <div className="space-y-4 p-6 bg-purple-500/5 dark:bg-purple-500/10 rounded-[2rem] border border-purple-500/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className={`${labelClass} !text-gray-500 dark:!text-gray-400`}>
                <Coins className="size-3.5" />
                {t("formCommission", "promos")}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCommissionPercentOn((v) => !v)}
                  className={tileClass(commissionPercentOn)}
                >
                  {t("formCommissionPercent", "promos")}
                </button>
                <button
                  type="button"
                  onClick={() => setCommissionFixedOn((v) => !v)}
                  className={tileClass(commissionFixedOn)}
                >
                  {t("formCommissionFixed", "promos")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {commissionPercentOn && (
                <div className="space-y-2">
                  <label className={labelClass}>{t("formCommissionPercent", "promos")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder={t("formCommissionPercentPlaceholder", "promos")}
                    className={inputClass}
                  />
                </div>
              )}
              {commissionFixedOn && (
                <div className="space-y-2">
                  <label className={labelClass}>{t("formCommissionFixed", "promos")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(e.target.value)}
                    placeholder={t("formCommissionFixedPlaceholder", "promos")}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 italic">
              {t("formCommissionHint", "promos")}
            </p>
          </div>

          {/* Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className={labelClass}>
                <InfinityIcon className="size-3.5" />
                {t("formMaxUses", "promos")}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t("formMaxUsesPlaceholder", "promos")}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>
                <CalendarClock className="size-3.5" />
                {t("formExpiresAt", "promos")}
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>{t("formIsActive", "promos")}</label>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-green-500 shadow-lg shadow-green-500/20"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 size-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                      isActive ? "left-9" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className={labelClass}>{t("formNotes", "promos")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("formNotesPlaceholder", "promos")}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              {t("formCancel", "promos")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-3 px-10 py-4 bg-brand-500 text-white rounded-[2rem] font-black tracking-widest uppercase text-xs shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="size-4" />
                  {t("formSave", "promos")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}