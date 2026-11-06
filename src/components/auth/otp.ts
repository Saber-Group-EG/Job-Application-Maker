// Shared bits for the one-time code screens (sign-in, 2FA, verification).
import { useCallback, useEffect, useState } from 'react';

type T = (key: string, ns?: string, params?: Record<string, string | number>) => string;

/** Seconds left until a code can be re-sent; `start(n)` restarts it. */
export function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + Math.max(0, seconds) * 1000);
  }, []);

  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start };
}

/** Keeps only digits, at most 6. */
export const cleanCode = (value: string) => value.replace(/\D/g, '').slice(0, 6);

/** The parts of a failed request (ApiError) the code screens read. */
type OtpFailure = {
  statusCode?: number;
  code?: string;
  message?: string;
  data?: { code?: string; data?: { attemptsLeft?: number; resendIn?: number } };
} | null;

/** Seconds the server says to wait before asking again, if it said. */
export const otpResendIn = (err: unknown): number | undefined =>
  (err as OtpFailure)?.data?.data?.resendIn;

/** A readable message for a failed code request or check. */
export function otpErrorMessage(err: unknown, t: T): string {
  const e = err as OtpFailure;
  const code = e?.code || e?.data?.code;
  const attemptsLeft = e?.data?.data?.attemptsLeft;
  if (code === 'OTP_RESEND_COOLDOWN') return t('otpTooManyRequests', 'common');
  if (code === 'OTP_TOO_MANY_ATTEMPTS') return t('tooManyAttempts', 'common');
  if (code === 'OTP_INVALID' && typeof attemptsLeft === 'number')
    return t('otpAttemptsLeft', 'common', { count: attemptsLeft });
  if (code === 'OTP_INVALID') return t('invalidVerificationCode', 'common');
  if (code === 'OTP_EXPIRED') return t('otpExpired', 'common');
  if (code === 'PASSWORD_REQUIRED') return t('otpPasswordRequired', 'common');
  if (e?.statusCode === 503) return t('otpWhatsAppUnavailable', 'common');
  if (e?.statusCode === 429) return t('otpTooManyRequests', 'common');
  return e?.message || t('invalidVerificationCode', 'common');
}

/** True when the code can't be retried and the flow must start over. */
export const isOtpDead = (err: unknown) => {
  const e = err as OtpFailure;
  const code = e?.code || e?.data?.code;
  return code === 'OTP_TOO_MANY_ATTEMPTS' || code === 'TEMP_TOKEN_INVALID' || e?.statusCode === 401;
};
