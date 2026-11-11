import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router';
import { paths } from '../../router/Paths';
import { EyeCloseIcon, EyeIcon } from '../../icons';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import Checkbox from '../form/input/Checkbox';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useVerify2FALoginMutation } from '../../hooks/queries/useAuth';
import { authService } from '../../services/authService';
import type { TwoFactorChannel } from '../../types/auth';
import AuthMethodTabs, {
  type AuthMethod,
  codeInputClass,
  errorBoxClass,
  infoBoxClass,
  primaryButtonClass,
} from './AuthMethodTabs';

export default function SignInForm() {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const { login, error: authError, isLoading, isAuthenticated } = useAuth();
  const [twoFATempToken, setTwoFATempToken] = useState<string | null>(null);
  const [twoFAChannel, setTwoFAChannel] = useState<TwoFactorChannel | null>(null);
  const [method, setMethod] = useState<AuthMethod>('email');
  // WhatsApp sign-in
  const [phone, setPhone] = useState('');
  const [waCode, setWaCode] = useState('');
  const [waCodeSent, setWaCodeSent] = useState(false);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const verify2FALoginMutation = useVerify2FALoginMutation();

  useEffect(() => {
    const notice = sessionStorage.getItem('authNotice');
    if (notice) {
      setSessionNotice(notice);
      sessionStorage.removeItem('authNotice');
    }
  }, []);

  if (!twoFATempToken && !isLoading && isAuthenticated && !isLoggingIn) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError(t('fillAllFields', 'common'));
      return;
    }

    if (!email.includes('@')) {
      setValidationError(t('enterValidEmail', 'common'));
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await login(email, password);
      if (result.type === '2fa') {
        setTwoFATempToken(result.tempToken);
        setTwoFAChannel(result.channel ?? null);
        return;
      }
      setIsLoggingIn(false);
      navigate('/home', { replace: true });
    } catch (err) {
      setIsLoggingIn(false);
    }
  };

  async function sendWhatsAppCode() {
    setWaError(null);
    if (phone.replace(/\D/g, '').length < 8) {
      setWaError(t('enterValidPhone', 'common'));
      return;
    }
    setWaBusy(true);
    try {
      await authService.requestWhatsAppLoginCode(phone);
      setWaCodeSent(true);
      setWaCode('');
    } catch (err) {
      setWaError((err as Error)?.message || t('somethingWentWrong', 'common'));
    } finally {
      setWaBusy(false);
    }
  }

  async function handleWhatsAppSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!waCodeSent) return sendWhatsAppCode();
    setWaError(null);
    if (waCode.length < 6) {
      setWaError(t('enter6DigitCode', 'common'));
      return;
    }
    setWaBusy(true);
    try {
      await authService.verifyWhatsAppLogin(phone, waCode);
      window.location.href = '/home';
    } catch (err) {
      setWaBusy(false);
      setWaError((err as Error)?.message || t('invalidVerificationCode', 'common'));
    }
  }

  async function handleVerify2FA(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTwoFAError(null);

    if (!twoFACode || twoFACode.length < 6) {
      setTwoFAError(t('fillAllFields', 'common'));
      return;
    }

    try {
      await verify2FALoginMutation.mutateAsync({
        tempToken: twoFATempToken!,
        code: twoFACode,
      });
      window.location.href = '/home';
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      if (statusCode === 429) {
        setTwoFAError(t('tooManyAttempts', 'common'));
        setTwoFATempToken(null);
        setTwoFACode('');
      } else {
        setTwoFAError(t('invalidVerificationCode', 'common'));
      }
    }
  }

  const displayError = sessionNotice || validationError || authError;
  if (twoFATempToken) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                {twoFAChannel?.method === 'whatsapp'
                  ? t('checkYourWhatsApp', 'common')
                  : t('checkYourEmail', 'common')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {twoFAChannel?.method === 'whatsapp'
                  ? t('checkYourWhatsAppDesc', 'common').replace('{to}', twoFAChannel.to)
                  : t('checkYourEmailDesc', 'common')}
              </p>
            </div>

            {twoFAError && (
              <div className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {twoFAError}
              </div>
            )}

            <form onSubmit={handleVerify2FA}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="2faCode">
                    {t('enter6DigitCode', 'common')}{' '}
                    <span className="text-error-500">*</span>
                  </Label>
                  <input
                    id="2faCode"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) =>
                      setTwoFACode(
                        e.target.value.replace(/\D/g, '').slice(0, 6)
                      )
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={verify2FALoginMutation.isPending}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                  >
                    {verify2FALoginMutation.isPending
                      ? t('submitting', 'common')
                      : t('verifyAndEnable', 'common')}
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFATempToken(null);
                      setTwoFAChannel(null);
                      setTwoFACode('');
                      setTwoFAError(null);
                      setIsLoggingIn(false);
                    }}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
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

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t('signIn', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('signInSubtitle', 'common')}
            </p>
          </div>
          <div>
            <AuthMethodTabs value={method} onChange={setMethod} />

            {method === 'whatsapp' ? (
              <form onSubmit={handleWhatsAppSubmit}>
                {waError && <div className={errorBoxClass}>{waError}</div>}
                {waCodeSent && !waError && (
                  <div className={infoBoxClass}>{t('whatsAppCodeSentHint', 'common')}</div>
                )}
                <div className="space-y-6">
                  <div>
                    <Label>
                      {t('whatsAppNumber', 'common')} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+20 10 1234 5678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setWaCodeSent(false);
                      }}
                      disabled={waBusy}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {t('whatsAppLoginHint', 'common')}
                    </p>
                  </div>
                  {waCodeSent && (
                    <div>
                      <Label htmlFor="waCode">
                        {t('enter6DigitCode', 'common')} <span className="text-error-500">*</span>
                      </Label>
                      <input
                        id="waCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={waCode}
                        onChange={(e) => setWaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={codeInputClass}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={sendWhatsAppCode}
                        disabled={waBusy}
                        className="mt-2 text-sm text-brand-500 hover:text-brand-600 disabled:opacity-50 dark:text-brand-400"
                      >
                        {t('resendCode', 'common')}
                      </button>
                    </div>
                  )}
                  <button type="submit" className={primaryButtonClass} disabled={waBusy}>
                    {waBusy
                      ? t('submitting', 'common')
                      : waCodeSent
                        ? t('signIn', 'common')
                        : t('sendCodeOnWhatsApp', 'common')}
                  </button>
                </div>
              </form>
            ) : (
            <>
            {/* Error Message */}
            {displayError && (
              <div className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    {t('email', 'common')}{' '}
                    <span className="text-error-500">*</span>{' '}
                  </Label>
                  <Input
                    type="email"
                    placeholder="info@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label>
                    {t('password', 'common')}{' '}
                    <span className="text-error-500">*</span>{' '}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('enterYourPassword', 'common')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute z-30 -translate-y-1/2 cursor-pointer top-1/2 ${dir === 'ltr' ? 'right-4' : 'left-4'}`}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      {t('keepMeLoggedIn', 'common')}
                    </span>
                  </div>
                  <Link
                    to={paths.auth.forgotPassword}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    {t('forgotPassword', 'common')}
                  </Link>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-500"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? t('signingIn', 'common')
                      : t('signIn', 'common')}
                  </button>
                </div>
              </div>
            </form>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
