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
import type { LoginOtpTarget, OtpChannel, TwoFactorChallenge } from '../../types/auth';
import OtpCodeForm from './OtpCodeForm';
import { isOtpDead, otpErrorMessage, otpResendIn, useCountdown } from './otp';

export default function SignInForm() {
  const navigate = useNavigate();
  const { t, dir } = useLocale();
  const { login, error: authError, isLoading, isAuthenticated } = useAuth();
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [resending, setResending] = useState(false);
  const countdown = useCountdown();

  // Sign in with a code instead of a password.
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [codeChannel, setCodeChannel] = useState<OtpChannel>('email');
  const [phone, setPhone] = useState('');
  const [codeTarget, setCodeTarget] = useState<LoginOtpTarget | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

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

  if (!challenge && !codeTarget && !isLoading && isAuthenticated && !isLoggingIn) {
    return <Navigate to="/home" replace />;
  }

  const resetToStart = () => {
    setChallenge(null);
    setCodeTarget(null);
    setCodeError(null);
    setIsLoggingIn(false);
  };

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
        setCodeError(null);
        setChallenge(
          result.challenge ?? {
            tempToken: result.tempToken,
            channel: 'email',
            channels: { email: true, whatsapp: false },
            expiresIn: 600,
            resendIn: 60,
          }
        );
        countdown.start(result.challenge?.resendIn ?? 60);
        return;
      }
      setIsLoggingIn(false);
      navigate('/home', { replace: true });
    } catch (err) {
      setIsLoggingIn(false);
    }
  };

  async function handleVerify2FA(code: string) {
    setCodeError(null);
    try {
      await verify2FALoginMutation.mutateAsync({ tempToken: challenge!.tempToken, code });
      window.location.href = '/home';
    } catch (err) {
      setCodeError(otpErrorMessage(err, t));
      if (isOtpDead(err)) setChallenge(null);
    }
  }

  async function handleResend2FA(channel?: OtpChannel) {
    if (!challenge) return;
    setCodeError(null);
    setResending(true);
    try {
      const next = await authService.resend2FALogin(challenge.tempToken, channel);
      setChallenge(next);
      countdown.start(next.resendIn);
    } catch (err) {
      setCodeError(otpErrorMessage(err, t));
      const resendIn = otpResendIn(err);
      if (typeof resendIn === 'number') countdown.start(resendIn);
      if (isOtpDead(err)) setChallenge(null);
    } finally {
      setResending(false);
    }
  }

  const buildCodeTarget = (): LoginOtpTarget | null => {
    if (codeChannel === 'email') {
      if (!email.includes('@')) {
        setValidationError(t('enterValidEmail', 'common'));
        return null;
      }
      return { channel: 'email', email: email.trim() };
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setValidationError(t('otpEnterValidPhone', 'common'));
      return null;
    }
    return { channel: 'whatsapp', phone: phone.trim() };
  };

  async function requestCode(target: LoginOtpTarget) {
    setRequestingCode(true);
    try {
      const sent = await authService.requestLoginOtp(target);
      setCodeTarget(target);
      countdown.start(sent?.resendIn ?? 60);
      return true;
    } catch (err) {
      const message = otpErrorMessage(err, t);
      if (codeTarget) setCodeError(message);
      else setValidationError(message);
      return false;
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleRequestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);
    setCodeError(null);
    const target = buildCodeTarget();
    if (target) await requestCode(target);
  }

  async function handleVerifyLoginCode(code: string) {
    if (!codeTarget) return;
    setCodeError(null);
    setVerifyingCode(true);
    try {
      await authService.verifyLoginOtp(codeTarget, code);
      window.location.href = '/home';
    } catch (err) {
      setCodeError(otpErrorMessage(err, t));
      setVerifyingCode(false);
    }
  }

  const channelName = (channel: OtpChannel) =>
    channel === 'whatsapp' ? t('otpChannelWhatsApp', 'common') : t('otpChannelEmail', 'common');

  if (challenge) {
    const other: OtpChannel = challenge.channel === 'email' ? 'whatsapp' : 'email';
    return (
      <OtpCodeForm
        key={`${challenge.channel}-${challenge.tempToken}`}
        title={challenge.channel === 'whatsapp' ? t('otpCheckWhatsApp', 'common') : t('otpCheckEmail', 'common')}
        description={
          challenge.destination
            ? t('otpSentTo', 'common', { destination: challenge.destination })
            : t('checkYourEmailDesc', 'common')
        }
        notice={challenge.fellBack ? t('otpFellBack', 'common') : null}
        error={codeError}
        submitting={verify2FALoginMutation.isPending}
        submitLabel={t('signIn', 'common')}
        onSubmit={handleVerify2FA}
        resendIn={countdown.remaining}
        resending={resending}
        onResend={() => handleResend2FA(challenge.channel)}
        switchLabel={
          challenge.channels?.[other]
            ? other === 'whatsapp'
              ? t('otpUseWhatsApp', 'common')
              : t('otpUseEmail', 'common')
            : undefined
        }
        onSwitch={() => handleResend2FA(other)}
        onBack={resetToStart}
      />
    );
  }

  if (codeTarget) {
    return (
      <OtpCodeForm
        key={codeTarget.channel}
        title={codeTarget.channel === 'whatsapp' ? t('otpCheckWhatsApp', 'common') : t('otpCheckEmail', 'common')}
        description={
          codeTarget.channel === 'whatsapp'
            ? t('otpSentGenericWhatsApp', 'common')
            : t('otpSentGenericEmail', 'common')
        }
        error={codeError}
        submitting={verifyingCode}
        submitLabel={t('signIn', 'common')}
        onSubmit={handleVerifyLoginCode}
        resendIn={countdown.remaining}
        resending={requestingCode}
        onResend={() => requestCode(codeTarget)}
        onBack={resetToStart}
      />
    );
  }

  const displayError = sessionNotice || validationError || authError;
  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {mode === 'code' ? t('otpSignInTitle', 'common') : t('signIn', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'code' ? t('otpSignInDesc', 'common') : t('signInSubtitle', 'common')}
            </p>
          </div>
          <div>
            {/* Error Message */}
            {displayError && (
              <div className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {displayError}
              </div>
            )}

            {mode === 'code' ? (
              <form onSubmit={handleRequestCode}>
                <div className="space-y-6">
                  <div>
                    <Label>{t('otpChannelLabel', 'common')}</Label>
                    <div
                      role="radiogroup"
                      aria-label={t('otpChannelLabel', 'common')}
                      className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
                    >
                      {(['email', 'whatsapp'] as OtpChannel[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={codeChannel === value}
                          onClick={() => {
                            setCodeChannel(value);
                            setValidationError(null);
                          }}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                            codeChannel === value
                              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                          }`}
                        >
                          {channelName(value)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {codeChannel === 'email' ? (
                    <div>
                      <Label>
                        {t('email', 'common')} <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="info@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>
                        {t('otpPhoneLabel', 'common')} <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="tel"
                        placeholder="01012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        hint={t('otpPhoneHint', 'common')}
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={requestingCode}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-500"
                  >
                    {requestingCode ? t('submitting', 'common') : t('otpSendCode', 'common')}
                  </button>
                </div>
              </form>
            ) : (
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
            )}

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'password' ? 'code' : 'password');
                  setValidationError(null);
                  setSessionNotice(null);
                }}
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {mode === 'password' ? t('otpSignInWithCode', 'common') : t('otpSignInWithPassword', 'common')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
