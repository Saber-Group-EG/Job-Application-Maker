import { useState, useEffect, useId, useRef } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../../components/ui/modal';
import { useLocale } from '../../../context/LocaleContext';
import { ValidationErrorAlert } from '../../../components/common/ValidationErrorAlert';
import { parseMoneyToCents } from '../../../utils/money';
import {
  useCreatePromoCode,
  useUpdatePromoCode,
  useCreateMyPromoCode,
} from '../../../hooks/queries/usePromos';
import type { PromoCode, PromoCodePayload } from '../../../types/promos';
import {
  Tag,
  Percent,
  Coins,
  CalendarClock,
  Infinity as InfinityIcon,
  Plus,
  Check,
} from 'lucide-react';

type HrUser = {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
};

interface PromoCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'admin' | 'my';
  code?: PromoCode | null;
  hrUsers?: HrUser[];
}

type DiscountType = 'percent' | 'fixed';

type FieldName =
  | 'owner'
  | 'discountPercent'
  | 'discountAmount'
  | 'discountCycles'
  | 'commissionPercent'
  | 'commissionAmount';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const toNum = (value: string): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * The form only mounts while the modal is open (and is keyed by the code being edited),
 * so every open starts from fresh, correctly pre-filled state. Previously the state
 * lived in a component that stayed mounted, so editing a code showed stale/blank values.
 */
export default function PromoCodeFormModal(props: PromoCodeFormModalProps) {
  const { isOpen, onClose, code } = props;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      {isOpen && <PromoCodeForm key={code?._id ?? 'new'} {...props} />}
    </Modal>
  );
}

function PromoCodeForm({
  onClose,
  mode,
  code,
  hrUsers = [],
}: PromoCodeFormModalProps) {
  const { t, locale } = useLocale();
  const isEdit = !!code;

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const createAdmin = useCreatePromoCode();
  const updateAdmin = useUpdatePromoCode();
  const createMy = useCreateMyPromoCode();

  const saving =
    createAdmin.isPending || updateAdmin.isPending || createMy.isPending;

  const [formError, setFormError] = useState('');
  const [errorField, setErrorField] = useState<FieldName | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const errorRef = useRef<HTMLDivElement>(null);

  const [formCode, setFormCode] = useState(code?.code ?? '');
  const [ownerUserId, setOwnerUserId] = useState(
    typeof code?.ownerUserId === 'string'
      ? code.ownerUserId
      : (code?.ownerUserId?._id ?? '')
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    code?.discountPercent != null ? 'percent' : code ? 'fixed' : 'percent'
  );
  const [discountPercent, setDiscountPercent] = useState(
    code?.discountPercent != null ? String(code.discountPercent) : ''
  );
  const [discountAmount, setDiscountAmount] = useState(
    code?.discountAmountCents != null
      ? String(code.discountAmountCents / 100)
      : ''
  );
  const [discountCycles, setDiscountCycles] = useState(
    code?.discountCycles != null ? String(code.discountCycles) : ''
  );
  // New codes start with a percent commission switched on so the section isn't an empty box.
  const [commissionPercentOn, setCommissionPercentOn] = useState(
    code ? !!code.commissionPercent : true
  );
  const [commissionPercent, setCommissionPercent] = useState(
    code?.commissionPercent != null ? String(code.commissionPercent) : ''
  );
  const [commissionFixedOn, setCommissionFixedOn] = useState(
    !!code?.commissionAmountCents
  );
  const [commissionAmount, setCommissionAmount] = useState(
    code?.commissionAmountCents != null
      ? String(code.commissionAmountCents / 100)
      : ''
  );
  const [maxUses, setMaxUses] = useState(
    code?.maxUses != null ? String(code.maxUses) : ''
  );
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(code?.expiresAt));
  const [isActive, setIsActive] = useState(code?.isActive ?? true);
  const [notes, setNotes] = useState(code?.notes ?? '');

  // Bring the error banner into view (the form can be taller than the screen on mobile).
  useEffect(() => {
    if (errorTick > 0) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [errorTick]);

  const fail = (message: string, field: FieldName | null = null) => {
    setFormError(message);
    setErrorField(field);
    setErrorTick((n) => n + 1);
    // Focus the offending field without scrolling away from the banner.
    if (field)
      document.getElementById(fid(field))?.focus({ preventScroll: true });
  };

  const clearError = () => {
    setFormError('');
    setErrorField(null);
  };

  const selectDiscountType = (type: DiscountType) => {
    setDiscountType(type);
    if (type === 'percent') {
      setDiscountAmount('');
    } else {
      setDiscountPercent('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    const payload: PromoCodePayload = {};

    // `code` is immutable after creation (backend update allow-list ignores it).
    if (formCode.trim() && !isEdit) payload.code = formCode.trim();

    if (mode === 'admin' && !isEdit) {
      if (!ownerUserId) {
        fail(t('formNoOwnerError', 'promos'), 'owner');
        return;
      }
      payload.ownerUserId = ownerUserId;
    }

    // Discount — exactly one of percent / fixed.
    const discountPercentNum = toNum(discountPercent);
    const discountAmountNum = parseMoneyToCents(discountAmount);
    if (discountType === 'percent') {
      if (
        !discountPercentNum ||
        discountPercentNum <= 0 ||
        discountPercentNum > 100
      ) {
        fail(t('formDiscountError', 'promos'), 'discountPercent');
        return;
      }
      payload.discountPercent = discountPercentNum;
    } else {
      if (discountAmountNum <= 0) {
        fail(t('formDiscountError', 'promos'), 'discountAmount');
        return;
      }
      payload.discountAmountCents = discountAmountNum;
    }

    if (discountCycles !== '') {
      const cycles = toNum(discountCycles);
      if (!cycles || cycles <= 0) {
        fail(t('formDiscountError', 'promos'), 'discountCycles');
        return;
      }
      payload.discountCycles = cycles;
    }

    // Commission — at least one of percent / fixed (both allowed).
    const commissionPercentNum = toNum(commissionPercent);
    const commissionAmountNum = parseMoneyToCents(commissionAmount);
    if (!commissionPercentOn && !commissionFixedOn) {
      fail(t('formCommissionError', 'promos'));
      return;
    }
    if (commissionPercentOn) {
      if (
        !commissionPercentNum ||
        commissionPercentNum <= 0 ||
        commissionPercentNum > 100
      ) {
        fail(t('formCommissionError', 'promos'), 'commissionPercent');
        return;
      }
      payload.commissionPercent = commissionPercentNum;
    }
    if (commissionFixedOn) {
      if (commissionAmountNum <= 0) {
        fail(t('formCommissionError', 'promos'), 'commissionAmount');
        return;
      }
      payload.commissionAmountCents = commissionAmountNum;
    }

    payload.maxUses = maxUses === '' ? null : toNum(maxUses);
    payload.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    payload.isActive = isActive;
    payload.notes = notes.trim() ? notes.trim() : null;

    try {
      if (mode === 'admin') {
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
    'w-full px-6 py-4 bg-white/40 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-bold dark:text-white';
  const labelClass = `text-[10px] font-black text-gray-400 uppercase ${tracking} ms-1 flex items-center gap-2`;

  const fieldClass = (name: FieldName, extra = '') =>
    `${inputClass} ${extra} ${
      errorField === name
        ? '!border-red-500/60 focus:!border-red-500 focus:!ring-red-500/10'
        : ''
    }`;

  const tileClass = (active: boolean) =>
    `flex-1 px-4 py-3 rounded-xl border-2 font-black text-xs uppercase ${tracking} transition-all cursor-pointer ${focusRing} ${
      active
        ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
        : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-gray-400'
    }`;

  const ownerDisplay =
    typeof code?.ownerUserId === 'object' && code?.ownerUserId
      ? code.ownerUserId.fullName ||
        code.ownerUserId.name ||
        code.ownerUserId.email ||
        ''
      : '';

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h2
          className={`text-2xl font-black text-gray-900 dark:text-white ${
            isRtl ? '' : 'tracking-tight'
          }`}
        >
          {isEdit
            ? t('modalEditTitle', 'promos')
            : t('modalCreateTitle', 'promos')}
        </h2>
        <p
          className={`mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium ${
            isRtl ? '' : 'italic'
          }`}
        >
          {isEdit
            ? t('modalEditSubtitle', 'promos')
            : t('modalCreateSubtitle', 'promos')}
        </p>
      </div>

      {formError && (
        <div ref={errorRef} role="alert" className="mb-6">
          <ValidationErrorAlert error={formError} onDismiss={clearError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor={fid('code')} className={labelClass}>
              <Tag className="size-3.5" />
              {t('formCode', 'promos')}
            </label>
            <input
              id={fid('code')}
              type="text"
              dir="ltr"
              autoFocus={!isEdit}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder={t('formCodePlaceholder', 'promos')}
              disabled={isEdit}
              aria-describedby={isEdit ? fid('code-hint') : undefined}
              className={`${inputClass} font-mono ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {isEdit && (
              <p
                id={fid('code-hint')}
                className={`text-[10px] font-bold text-gray-400 ${isRtl ? '' : 'italic'}`}
              >
                {t('formCodeLockedHint', 'promos')}
              </p>
            )}
          </div>

          {mode === 'admin' && !isEdit && (
            <div className="space-y-2">
              <label htmlFor={fid('owner')} className={labelClass}>
                {t('formOwner', 'promos')}
              </label>
              <select
                id={fid('owner')}
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
                aria-invalid={errorField === 'owner'}
                className={fieldClass(
                  'owner',
                  'appearance-none cursor-pointer'
                )}
              >
                <option value="">{t('formOwnerPlaceholder', 'promos')}</option>
                {hrUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName || u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'admin' && isEdit && code?.ownerUserId && (
            <div className="space-y-2">
              <label htmlFor={fid('owner-readonly')} className={labelClass}>
                {t('formOwner', 'promos')}
              </label>
              <input
                id={fid('owner-readonly')}
                type="text"
                value={ownerDisplay}
                readOnly
                className={`${inputClass} opacity-70`}
              />
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="space-y-4 p-6 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span
              className={`${labelClass} !text-gray-500 dark:!text-gray-400`}
            >
              <Percent className="size-3.5" />
              {t('formDiscount', 'promos')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={discountType === 'percent'}
                onClick={() => selectDiscountType('percent')}
                className={tileClass(discountType === 'percent')}
              >
                {t('formDiscountPercent', 'promos')}
              </button>
              <button
                type="button"
                aria-pressed={discountType === 'fixed'}
                onClick={() => selectDiscountType('fixed')}
                className={tileClass(discountType === 'fixed')}
              >
                {t('formDiscountFixed', 'promos')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {discountType === 'percent' ? (
              <div className="space-y-2">
                <label htmlFor={fid('discountPercent')} className={labelClass}>
                  {t('formDiscountPercent', 'promos')}
                </label>
                <input
                  id={fid('discountPercent')}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder={t('formDiscountPercentPlaceholder', 'promos')}
                  aria-invalid={errorField === 'discountPercent'}
                  className={fieldClass('discountPercent')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor={fid('discountAmount')} className={labelClass}>
                  {t('formDiscountFixed', 'promos')}
                </label>
                <input
                  id={fid('discountAmount')}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder={t('formDiscountFixedPlaceholder', 'promos')}
                  aria-invalid={errorField === 'discountAmount'}
                  className={fieldClass('discountAmount')}
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor={fid('discountCycles')} className={labelClass}>
                <CalendarClock className="size-3.5" />
                {t('formDiscountCycles', 'promos')}
              </label>
              <input
                id={fid('discountCycles')}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={discountCycles}
                onChange={(e) => setDiscountCycles(e.target.value)}
                placeholder={t('formDiscountCyclesPlaceholder', 'promos')}
                aria-invalid={errorField === 'discountCycles'}
                className={fieldClass('discountCycles')}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <p
                className={`text-[10px] font-bold text-gray-400 pb-2 ${isRtl ? '' : 'italic'}`}
              >
                {t('formXorHint', 'promos')}
              </p>
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="space-y-4 p-6 bg-purple-500/5 dark:bg-purple-500/10 rounded-[2rem] border border-purple-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span
              className={`${labelClass} !text-gray-500 dark:!text-gray-400`}
            >
              <Coins className="size-3.5" />
              {t('formCommission', 'promos')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={commissionPercentOn}
                onClick={() => setCommissionPercentOn((v) => !v)}
                className={tileClass(commissionPercentOn)}
              >
                {t('formCommissionPercent', 'promos')}
              </button>
              <button
                type="button"
                aria-pressed={commissionFixedOn}
                onClick={() => setCommissionFixedOn((v) => !v)}
                className={tileClass(commissionFixedOn)}
              >
                {t('formCommissionFixed', 'promos')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {commissionPercentOn && (
              <div className="space-y-2">
                <label
                  htmlFor={fid('commissionPercent')}
                  className={labelClass}
                >
                  {t('formCommissionPercent', 'promos')}
                </label>
                <input
                  id={fid('commissionPercent')}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder={t('formCommissionPercentPlaceholder', 'promos')}
                  aria-invalid={errorField === 'commissionPercent'}
                  className={fieldClass('commissionPercent')}
                />
              </div>
            )}
            {commissionFixedOn && (
              <div className="space-y-2">
                <label htmlFor={fid('commissionAmount')} className={labelClass}>
                  {t('formCommissionFixed', 'promos')}
                </label>
                <input
                  id={fid('commissionAmount')}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                  placeholder={t('formCommissionFixedPlaceholder', 'promos')}
                  aria-invalid={errorField === 'commissionAmount'}
                  className={fieldClass('commissionAmount')}
                />
              </div>
            )}
          </div>
          <p
            className={`text-[10px] font-bold text-gray-400 ${isRtl ? '' : 'italic'}`}
          >
            {t('formCommissionHint', 'promos')}
          </p>
        </div>

        {/* Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label htmlFor={fid('maxUses')} className={labelClass}>
              <InfinityIcon className="size-3.5" />
              {t('formMaxUses', 'promos')}
            </label>
            <input
              id={fid('maxUses')}
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={t('formMaxUsesPlaceholder', 'promos')}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={fid('expiresAt')} className={labelClass}>
              <CalendarClock className="size-3.5" />
              {t('formExpiresAt', 'promos')}
            </label>
            <input
              id={fid('expiresAt')}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={fid('isActive')} className={labelClass}>
              {t('formIsActive', 'promos')}
            </label>
            <div className="pt-2 flex items-center gap-3">
              <button
                id={fid('isActive')}
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`relative shrink-0 w-16 h-8 rounded-full transition-all duration-300 motion-reduce:transition-none ${focusRing} ${
                  isActive
                    ? 'bg-green-500 shadow-lg shadow-green-500/20'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {/* start-* is direction-aware, so the knob slides the right way in RTL too */}
                <span
                  className={`absolute top-1 size-6 bg-white rounded-full shadow-md transition-all duration-300 motion-reduce:transition-none ${
                    isActive ? 'start-9' : 'start-1'
                  }`}
                />
              </button>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                {isActive
                  ? t('statusActive', 'promos')
                  : t('statusInactive', 'promos')}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label htmlFor={fid('notes')} className={labelClass}>
            {t('formNotes', 'promos')}
          </label>
          <textarea
            id={fid('notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('formNotesPlaceholder', 'promos')}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`w-full sm:w-auto px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 rounded-3xl font-black text-xs uppercase ${tracking} hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${focusRing}`}
          >
            {t('formCancel', 'promos')}
          </button>
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-brand-500 text-white rounded-[2rem] font-black uppercase ${tracking} text-xs shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 motion-reduce:transform-none disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100 transition-all ${focusRing}`}
          >
            {saving ? (
              <span
                className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : isEdit ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('formSave', 'promos')}
          </button>
        </div>
      </form>
    </div>
  );
}
