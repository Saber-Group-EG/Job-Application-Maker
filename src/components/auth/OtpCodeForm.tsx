// The "enter the 6-digit code" step on the sign-in page, used both after a
// password (two-step verification) and for signing in with a code alone.
import { FormEvent, ReactNode, useState } from 'react';
import Label from '../form/Label';
import { useLocale } from '../../context/LocaleContext';
import { cleanCode } from './otp';

type Props = {
  title: ReactNode;
  description: ReactNode;
  /** Informational line, e.g. "we emailed it because WhatsApp failed". */
  notice?: ReactNode;
  error?: string | null;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (code: string) => void;
  /** Seconds until resend is allowed. */
  resendIn: number;
  resending?: boolean;
  onResend: () => void;
  /** Offer to send the code on another channel instead. */
  switchLabel?: string;
  onSwitch?: () => void;
  onBack: () => void;
};

export default function OtpCodeForm({
  title,
  description,
  notice,
  error,
  submitting,
  submitLabel,
  onSubmit,
  resendIn,
  resending,
  onResend,
  switchLabel,
  onSwitch,
  onBack,
}: Props) {
  const { t } = useLocale();
  const [code, setCode] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.length === 6) onSubmit(code);
  };

  const linkClass =
    'text-sm text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-brand-400 dark:disabled:text-gray-500';

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>

          {notice && (
            <div className="p-4 mb-5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
              {notice}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="otpCode">
                  {t('enter6DigitCode', 'common')} <span className="text-error-500">*</span>
                </Label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-center font-mono text-lg tracking-[0.5em] shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? t('submitting', 'common') : submitLabel || t('otpVerify', 'common')}
              </button>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendIn > 0 || resending}
                  className={linkClass}
                >
                  {resendIn > 0
                    ? t('otpResendIn', 'common', { seconds: resendIn })
                    : t('resendCode', 'common')}
                </button>
                {switchLabel && onSwitch && (
                  <button
                    type="button"
                    onClick={onSwitch}
                    disabled={resendIn > 0 || resending}
                    className={linkClass}
                  >
                    {switchLabel}
                  </button>
                )}
                <button type="button" onClick={onBack} className={linkClass}>
                  {t('backToSignIn', 'common')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
