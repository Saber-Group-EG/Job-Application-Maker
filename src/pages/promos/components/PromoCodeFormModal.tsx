import { useState, useEffect, useId, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Modal } from '../../../components/ui/modal';
import { useLocale } from '../../../context/LocaleContext';
import { ValidationErrorAlert } from '../../../components/common/ValidationErrorAlert';
import { formatMoney, parseMoneyToCents } from '../../../utils/money';
import {
  useCreatePromoCode,
  useUpdatePromoCode,
  useCreateMyPromoCode,
} from '../../../hooks/queries/usePromos';
import type { PromoCode, PromoCodePayload } from '../../../types/promos';
import { Check, Coins, Info, Lock, Percent, Plus, Shuffle, Sparkles } from 'lucide-react';
import {
  AdornedInput,
  Button,
  Field,
  Segmented,
  Switch,
  focusRing,
  inputClass,
  invalidClass,
  selectClass,
} from './PromoUI';

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
  | 'code'
  | 'owner'
  | 'discountPercent'
  | 'discountAmount'
  | 'discountCycles'
  | 'commission'
  | 'commissionPercent'
  | 'commissionAmount';

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

// Unambiguous characters only (no 0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (length = 8) => {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

/**
 * The form only mounts while the modal is open (and is keyed by the code being
 * edited), so every open starts from fresh, correctly pre-filled state.
 */
export default function PromoCodeFormModal(props: PromoCodeFormModalProps) {
  const { isOpen, onClose, code } = props;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-2xl overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
    >
      {isOpen && <PromoCodeForm key={code?._id ?? 'new'} {...props} />}
    </Modal>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 sm:ps-11">{children}</div>
    </section>
  );
}

function PromoCodeForm({ onClose, mode, code, hrUsers = [] }: PromoCodeFormModalProps) {
  const { t } = useLocale();
  const isEdit = !!code;

  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const createAdmin = useCreatePromoCode();
  const updateAdmin = useUpdatePromoCode();
  const createMy = useCreateMyPromoCode();
  const saving = createAdmin.isPending || updateAdmin.isPending || createMy.isPending;

  const [formError, setFormError] = useState('');
  const [errorField, setErrorField] = useState<FieldName | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const errorRef = useRef<HTMLDivElement>(null);

  const [formCode, setFormCode] = useState(code?.code ?? '');
  const [ownerUserId, setOwnerUserId] = useState(
    typeof code?.ownerUserId === 'string' ? code.ownerUserId : (code?.ownerUserId?._id ?? '')
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    code?.discountPercent != null ? 'percent' : code ? 'fixed' : 'percent'
  );
  const [discountPercent, setDiscountPercent] = useState(
    code?.discountPercent != null ? String(code.discountPercent) : ''
  );
  const [discountAmount, setDiscountAmount] = useState(
    code?.discountAmountCents != null ? String(code.discountAmountCents / 100) : ''
  );
  const [discountCycles, setDiscountCycles] = useState(
    code?.discountCycles != null ? String(code.discountCycles) : ''
  );
  // New codes start with a percent commission switched on.
  const [commissionPercentOn, setCommissionPercentOn] = useState(
    code ? !!code.commissionPercent : true
  );
  const [commissionPercent, setCommissionPercent] = useState(
    code?.commissionPercent != null ? String(code.commissionPercent) : ''
  );
  const [commissionFixedOn, setCommissionFixedOn] = useState(!!code?.commissionAmountCents);
  const [commissionAmount, setCommissionAmount] = useState(
    code?.commissionAmountCents != null ? String(code.commissionAmountCents / 100) : ''
  );
  const [maxUses, setMaxUses] = useState(code?.maxUses != null ? String(code.maxUses) : '');
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(code?.expiresAt));
  const [isActive, setIsActive] = useState(code?.isActive ?? true);
  const [notes, setNotes] = useState(code?.notes ?? '');

  // Bring the error banner into view (the body scrolls).
  useEffect(() => {
    if (errorTick > 0) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [errorTick]);

  const fail = (message: string, field: FieldName | null = null) => {
    setFormError(message);
    setErrorField(field);
    setErrorTick((n) => n + 1);
    if (field) document.getElementById(fid(field))?.focus({ preventScroll: true });
  };

  const clearError = () => {
    setFormError('');
    setErrorField(null);
  };

  const invalid = (name: FieldName) => (errorField === name ? invalidClass : '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    const payload: PromoCodePayload = {};

    // `code` is immutable after creation (backend update allow-list ignores it).
    if (formCode.trim() && !isEdit) {
      if (formCode.trim().length < 3) return fail(t('formCodeLengthError', 'promos'), 'code');
      payload.code = formCode.trim().toUpperCase();
    }

    if (mode === 'admin' && !isEdit) {
      if (!ownerUserId) return fail(t('formNoOwnerError', 'promos'), 'owner');
      payload.ownerUserId = ownerUserId;
    }

    // Discount: exactly one of percent / fixed.
    const discountPercentNum = toNum(discountPercent);
    const discountAmountNum = parseMoneyToCents(discountAmount);
    if (discountType === 'percent') {
      // Whole percent, 1–99 (backend: promo.validation.js).
      if (!discountPercentNum || !Number.isInteger(discountPercentNum) || discountPercentNum < 1 || discountPercentNum > 99)
        return fail(t('formDiscountPercentError', 'promos'), 'discountPercent');
      payload.discountPercent = discountPercentNum;
    } else {
      if (discountAmountNum <= 0) return fail(t('formDiscountAmountError', 'promos'), 'discountAmount');
      payload.discountAmountCents = discountAmountNum;
    }

    if (discountCycles !== '') {
      const cycles = toNum(discountCycles);
      if (!cycles || cycles <= 0 || !Number.isInteger(cycles))
        return fail(t('formCyclesError', 'promos'), 'discountCycles');
      payload.discountCycles = cycles;
    }

    // Commission: at least one of percent / fixed (both allowed).
    const commissionPercentNum = toNum(commissionPercent);
    const commissionAmountNum = parseMoneyToCents(commissionAmount);
    if (!commissionPercentOn && !commissionFixedOn)
      return fail(t('formCommissionError', 'promos'), 'commission');
    if (commissionPercentOn) {
      if (!commissionPercentNum || !Number.isInteger(commissionPercentNum) || commissionPercentNum < 1 || commissionPercentNum > 100)
        return fail(t('formCommissionPercentError', 'promos'), 'commissionPercent');
      payload.commissionPercent = commissionPercentNum;
    } else if (isEdit) {
      payload.commissionPercent = null;
    }
    if (commissionFixedOn) {
      if (commissionAmountNum <= 0)
        return fail(t('formCommissionAmountError', 'promos'), 'commissionAmount');
      payload.commissionAmountCents = commissionAmountNum;
    } else if (isEdit) {
      payload.commissionAmountCents = null;
    }

    payload.maxUses = maxUses === '' ? null : toNum(maxUses);
    payload.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    payload.isActive = isActive;
    payload.notes = notes.trim() ? notes.trim() : null;

    try {
      if (mode === 'admin') {
        if (isEdit) await updateAdmin.mutateAsync({ id: code!._id, payload });
        else await createAdmin.mutateAsync(payload);
      } else {
        await createMy.mutateAsync(payload);
      }
      onClose();
    } catch {
      // error toast is handled by the mutation hook
    }
  };

  const ownerDisplay =
    typeof code?.ownerUserId === 'object' && code?.ownerUserId
      ? code.ownerUserId.fullName || code.ownerUserId.name || code.ownerUserId.email || ''
      : '';

  // ─── Live summary ──────────────────────────────────────────────────────────
  const discountText = (() => {
    if (discountType === 'percent') {
      const n = toNum(discountPercent);
      return n && n > 0 ? `${n}%` : null;
    }
    const cents = parseMoneyToCents(discountAmount);
    return cents > 0 ? formatMoney(cents) : null;
  })();
  const cyclesNum = toNum(discountCycles) || 1;
  const commissionText = [
    commissionPercentOn && toNum(commissionPercent) ? `${toNum(commissionPercent)}%` : null,
    commissionFixedOn && parseMoneyToCents(commissionAmount) > 0
      ? formatMoney(parseMoneyToCents(commissionAmount))
      : null,
  ]
    .filter(Boolean)
    .join(' + ');
  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  return (
    // The shared Modal wraps content in a padded, 85vh scroll box; -m-4 cancels
    // its padding and max-h matches it, so only the body scrolls and the
    // header/footer stay in view.
    <form onSubmit={handleSubmit} className="-m-4 flex max-h-[85vh] flex-col" noValidate>
      {/* Header (the modal's close button sits in the top corner) */}
      <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? t('modalEditTitle', 'promos') : t('modalCreateTitle', 'promos')}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {isEdit ? t('modalEditSubtitle', 'promos') : t('modalCreateSubtitle', 'promos')}
        </p>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
        {formError && (
          <div ref={errorRef} role="alert">
            <ValidationErrorAlert error={formError} onDismiss={clearError} />
          </div>
        )}

        <Section icon={<Sparkles className="size-4" />} title={t('formSectionCode', 'promos')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('formCode', 'promos')}
              htmlFor={fid('code')}
              optional={!isEdit}
              hint={isEdit ? t('formCodeLockedHint', 'promos') : t('formCodePlaceholder', 'promos')}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id={fid('code')}
                    type="text"
                    dir="ltr"
                    autoFocus={!isEdit}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    aria-invalid={errorField === 'code'}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="SUMMER25"
                    disabled={isEdit}
                    className={`${inputClass} font-mono tracking-wide ${isEdit ? 'pe-9' : ''} ${invalid('code')}`}
                  />
                  {isEdit && (
                    <Lock className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
                {!isEdit && (
                  <Button
                    onClick={() => setFormCode(randomCode())}
                    icon={<Shuffle className="size-4" />}
                    title={t('formGenerate', 'promos')}
                  >
                    <span className="hidden sm:inline">{t('formGenerate', 'promos')}</span>
                  </Button>
                )}
              </div>
            </Field>

            {mode === 'admin' && !isEdit && (
              <Field label={t('formOwner', 'promos')} htmlFor={fid('owner')}>
                <select
                  id={fid('owner')}
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  aria-invalid={errorField === 'owner'}
                  className={`${selectClass} ${invalid('owner')}`}
                >
                  <option value="">{t('formOwnerPlaceholder', 'promos')}</option>
                  {hrUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.fullName || u.name || u.email}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {mode === 'admin' && isEdit && ownerDisplay && (
              <Field label={t('formOwner', 'promos')} htmlFor={fid('owner-readonly')}>
                <input id={fid('owner-readonly')} value={ownerDisplay} readOnly disabled className={inputClass} />
              </Field>
            )}
          </div>
        </Section>

        <Section
          icon={<Percent className="size-4" />}
          title={t('formSectionDiscount', 'promos')}
          description={t('formSectionDiscountHint', 'promos')}
        >
          <Segmented<DiscountType>
            ariaLabel={t('formDiscount', 'promos')}
            value={discountType}
            onChange={(type) => {
              setDiscountType(type);
              if (type === 'percent') setDiscountAmount('');
              else setDiscountPercent('');
            }}
            options={[
              { value: 'percent', label: t('formDiscountTypePercent', 'promos') },
              { value: 'fixed', label: t('formDiscountTypeFixed', 'promos') },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {discountType === 'percent' ? (
              <Field label={t('formDiscountValue', 'promos')} htmlFor={fid('discountPercent')}>
                <AdornedInput
                  id={fid('discountPercent')}
                  unit="%"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  step="1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="10"
                  aria-invalid={errorField === 'discountPercent'}
                  className={invalid('discountPercent')}
                />
              </Field>
            ) : (
              <Field label={t('formDiscountValue', 'promos')} htmlFor={fid('discountAmount')}>
                <AdornedInput
                  id={fid('discountAmount')}
                  unit={t('unitCurrency', 'promos')}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="50"
                  aria-invalid={errorField === 'discountAmount'}
                  className={invalid('discountAmount')}
                />
              </Field>
            )}
            <Field
              label={t('formDiscountCycles', 'promos')}
              htmlFor={fid('discountCycles')}
              optional
              hint={t('formDiscountCyclesHint', 'promos')}
            >
              <AdornedInput
                id={fid('discountCycles')}
                unit={t('unitCycles', 'promos')}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={discountCycles}
                onChange={(e) => setDiscountCycles(e.target.value)}
                placeholder="1"
                aria-invalid={errorField === 'discountCycles'}
                className={invalid('discountCycles')}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={<Coins className="size-4" />}
          title={t('formSectionCommission', 'promos')}
          description={t('formCommissionHint', 'promos')}
        >
          <div
            id={fid('commission')}
            tabIndex={-1}
            className={`divide-y divide-slate-200 rounded-xl border dark:divide-slate-800 ${
              errorField === 'commission' ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <CommissionOption
              checked={commissionPercentOn}
              onToggle={setCommissionPercentOn}
              label={t('formCommissionPercentLabel', 'promos')}
              description={t('formCommissionPercentDesc', 'promos')}
            >
              <AdornedInput
                id={fid('commissionPercent')}
                aria-label={t('formCommissionPercentLabel', 'promos')}
                unit="%"
                type="number"
                inputMode="numeric"
                min="1"
                max="100"
                step="1"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                placeholder="5"
                disabled={!commissionPercentOn}
                aria-invalid={errorField === 'commissionPercent'}
                className={invalid('commissionPercent')}
              />
            </CommissionOption>
            <CommissionOption
              checked={commissionFixedOn}
              onToggle={setCommissionFixedOn}
              label={t('formCommissionFixedLabel', 'promos')}
              description={t('formCommissionFixedDesc', 'promos')}
            >
              <AdornedInput
                id={fid('commissionAmount')}
                aria-label={t('formCommissionFixedLabel', 'promos')}
                unit={t('unitCurrency', 'promos')}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                placeholder="20"
                disabled={!commissionFixedOn}
                aria-invalid={errorField === 'commissionAmount'}
                className={invalid('commissionAmount')}
              />
            </CommissionOption>
          </div>
        </Section>

        <Section icon={<Lock className="size-4" />} title={t('formSectionLimits', 'promos')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('formMaxUses', 'promos')} htmlFor={fid('maxUses')} optional hint={t('formMaxUsesPlaceholder', 'promos')}>
              <AdornedInput
                id={fid('maxUses')}
                unit={t('unitUses', 'promos')}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="∞"
              />
            </Field>
            <Field label={t('formExpiresAt', 'promos')} htmlFor={fid('expiresAt')} optional hint={t('formExpiresAtPlaceholder', 'promos')}>
              <input
                id={fid('expiresAt')}
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <label htmlFor={fid('isActive')} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('formIsActive', 'promos')}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('formIsActiveHint', 'promos')}</p>
            </div>
            <Switch id={fid('isActive')} checked={isActive} onChange={setIsActive} label={t('formIsActive', 'promos')} />
          </div>
          <Field label={t('formNotes', 'promos')} htmlFor={fid('notes')} optional>
            <textarea
              id={fid('notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('formNotesPlaceholder', 'promos')}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </Section>

        {/* What this code will do, in words */}
        {/* Neutral on purpose: the brand colour is red and would read as an error. */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
          <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
            <Info className="size-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            {t('formSummaryTitle', 'promos')}
          </p>
          <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
            <li>
              {discountText
                ? t(cyclesNum === 1 ? 'formSummaryDiscountOne' : 'formSummaryDiscount', 'promos', {
                    value: discountText,
                    cycles: cyclesNum,
                  })
                : t('formSummaryNoDiscount', 'promos')}
            </li>
            <li>
              {commissionText
                ? t('formSummaryCommission', 'promos', { value: commissionText })
                : t('formSummaryNoCommission', 'promos')}
            </li>
            <li>
              {[
                maxUses ? t('formSummaryMaxUses', 'promos', { count: maxUses }) : t('formSummaryUnlimited', 'promos'),
                expiresText ? t('formSummaryExpires', 'promos', { date: expiresText }) : t('formSummaryNeverExpires', 'promos'),
                isActive ? null : t('formSummaryInactive', 'promos'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:justify-end">
        <Button onClick={onClose} disabled={saving}>
          {t('formCancel', 'promos')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={saving}
          icon={isEdit ? <Check className="size-4" /> : <Plus className="size-4" />}
        >
          {saving
            ? t('formSaving', 'promos')
            : isEdit
              ? t('formSaveChanges', 'promos')
              : t('formCreate', 'promos')}
        </Button>
      </div>
    </form>
  );
}

function CommissionOption({
  checked,
  onToggle,
  label,
  description,
  children,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <label className="flex flex-1 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className={`mt-0.5 size-4 rounded border-slate-300 text-brand-500 accent-brand-500 ${focusRing}`}
        />
        <span>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
        </span>
      </label>
      <div className={`w-full sm:w-40 ${checked ? '' : 'opacity-50'}`}>{children}</div>
    </div>
  );
}
