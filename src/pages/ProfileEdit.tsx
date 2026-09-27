import { useState } from "react";
import PageMeta from "../components/common/PageMeta";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import { useChangePasswordMutation, useSetup2FAMutation, useVerify2FASetupMutation, useDisable2FAMutation } from "../hooks/queries/useAuth";
import { useUpdateProfile } from "../hooks/queries/useUsers";
import { useLocale } from "../context/LocaleContext";
import Swal from "../utils/swal";
import { KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  Field,
  PageShell,
  SectionTitle,
  Switch,
  inputClass,
} from "../components/ui/kit";

export default function ProfileEdit() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [twoFAModalOpen, setTwoFAModalOpen] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const changePasswordMutation = useChangePasswordMutation();
  const updateProfileMutation = useUpdateProfile();
  const setup2FAMutation = useSetup2FAMutation();
  const verify2FASetupMutation = useVerify2FASetupMutation();
  const disable2FAMutation = useDisable2FAMutation();
  const { t } = useLocale();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user?._id) return;

    updateProfileMutation.mutate({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Swal.fire({ title: t('validation', 'common'), text: t('fillAllFields', 'common'), icon: 'warning' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Swal.fire({ title: t('validation', 'common'), text: t('passwordMinLength', 'common'), icon: 'warning' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire({ title: t('validation', 'common'), text: t('passwordsDoNotMatch', 'common'), icon: 'warning' });
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
      {
        onSuccess: () => {
          Swal.fire({ title: t('success', 'common'), text: t('changePasswordSuccess', 'common'), icon: 'success' });
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        },
      }
    );
  }

  function handleTwoFAToggle(checked: boolean) {
    if (checked) {
      setTwoFAModalOpen(true);
      setCodeSent(false);
      setTwoFACode("");
      setTwoFAError(null);
      setup2FAMutation.mutate(undefined, {
        onSuccess: () => {
          // The dialog itself says the code was sent; a SweetAlert here
          // would open underneath the modal and block nothing but the view.
          setCodeSent(true);
        },
        onError: (err) => {
          setTwoFAError(err.message);
        },
      });
    } else {
      setShowDisableModal(true);
    }
  }

  function handleVerify2FASetup() {
    if (!twoFACode || twoFACode.length < 6) {
      setTwoFAError(t('fillAllFields', 'common'));
      return;
    }

    verify2FASetupMutation.mutate(
      { code: twoFACode },
      {
        onSuccess: () => {
          setTwoFAEnabled(true);
          setTwoFAModalOpen(false);
          setTwoFACode("");
          setTwoFAError(null);
          Swal.fire({
            title: t('success', 'common'),
            text: t('2FASetupSuccess', 'common'),
            icon: 'success',
          });
        },
        onError: (err) => {
          if ((err as { statusCode?: number })?.statusCode === 429) {
            setTwoFAModalOpen(false);
            setTwoFAEnabled(false);
            setTwoFAError(null);
            setTwoFACode("");
            Swal.fire({
              title: t('error', 'common'),
              text: t('tooManyAttempts', 'common'),
              icon: 'error',
            });
          } else {
            setTwoFAError(t('invalidVerificationCode', 'common'));
          }
        },
      }
    );
  }

  function handleDisable2FA() {
    if (!disablePassword) return;

    disable2FAMutation.mutate(
      { password: disablePassword },
      {
        onSuccess: () => {
          setTwoFAEnabled(false);
          setShowDisableModal(false);
          setDisablePassword("");
          Swal.fire({
            title: t('success', 'common'),
            text: t('2FADisableSuccess', 'common'),
            icon: 'success',
          });
        },
        onError: () => {
          Swal.fire({
            title: t('error', 'common'),
            text: t('incorrectPassword', 'common'),
            icon: 'error',
          });
        },
      }
    );
  }

  const initial = (user?.fullName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <>
      <PageMeta
        title={t('editProfilePageTitle', 'common', { site: 'Saber Group - Hiring Management System' })}
        description={t('editProfilePageDesc', 'common')}
      />
      <PageShell
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{user?.fullName || t('user', 'common')}</span>
              <span className="block truncate text-sm font-normal text-slate-500 dark:text-slate-400">{user?.email || ""}</span>
            </span>
          </span>
        }
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardToolbar>
                <div>
                  <SectionTitle icon={<UserRound className="size-4" />}>{t('editPersonalInfo', 'users')}</SectionTitle>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('editPersonalInfoDesc', 'users')}</p>
                </div>
              </CardToolbar>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Field label={t('editFullName', 'users')} htmlFor="fullName">
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('editFullNamePlaceholder', 'users')}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('editEmail', 'users')} htmlFor="email">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    dir="ltr"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('editEmailPlaceholder', 'users')}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('editPhone', 'users')} htmlFor="phone" optional>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    dir="ltr"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('editPhonePlaceholder', 'users')}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <Button onClick={() => window.history.back()}>{t('editCancel', 'users')}</Button>
                <Button type="submit" variant="primary" loading={updateProfileMutation.isPending}>
                  {t('editSaveChanges', 'users')}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <form onSubmit={handleChangePassword}>
              <CardToolbar>
                <div>
                  <SectionTitle icon={<KeyRound className="size-4" />}>{t('security', 'common')}</SectionTitle>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('managePasswordSecurity', 'common')}</p>
                </div>
              </CardToolbar>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
                <Field label={t('currentPassword', 'common')} htmlFor="currentPassword">
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder={t('enterCurrentPassword', 'common')}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('newPassword', 'common')} htmlFor="newPassword" hint={t('passwordMinLength', 'common')}>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder={t('enterNewPassword', 'common')}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('confirmNewPassword', 'common')} htmlFor="confirmPassword">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder={t('enterConfirmNewPassword', 'common')}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-800">
                <Button type="submit" variant="primary" loading={changePasswordMutation.isPending}>
                  {t('updatePassword', 'common')}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {t('twoFactorAuthentication', 'common')}
                    <Badge tone={twoFAEnabled ? "green" : "slate"}>
                      {twoFAEnabled ? t('on', 'common') : t('off', 'common')}
                    </Badge>
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('addExtraLayerSecurity', 'common')}</p>
                </div>
              </div>
              <Switch
                checked={twoFAEnabled}
                onChange={handleTwoFAToggle}
                label={t('enableTwoFactorAuth', 'common')}
              />
            </div>
          </Card>
        </div>
      </PageShell>

      {/* 2FA setup */}
      <Modal
        isOpen={twoFAModalOpen}
        onClose={() => setTwoFAModalOpen(false)}
        className="mx-4 max-w-md overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
      >
        <div className="-m-4">
          <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('setupTwoFactorAuth', 'common')}</h2>
            {codeSent && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('checkYourEmailDesc', 'common')}</p>}
          </div>
          <div className="space-y-4 px-6 py-5">
            {twoFAError && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {twoFAError}
              </p>
            )}
            <Field label={t('enter6DigitCode', 'common')} htmlFor="otpCode">
              <input
                type="text"
                id="otpCode"
                name="otpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                placeholder="000000"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
              />
            </Field>
            {setup2FAMutation.isPending && (
              <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                {t('submitting', 'common')}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
            <Button onClick={() => setTwoFAModalOpen(false)}>{t('cancel', 'common')}</Button>
            <Button
              variant="primary"
              onClick={handleVerify2FASetup}
              loading={verify2FASetupMutation.isPending}
              disabled={setup2FAMutation.isPending}
            >
              {t('verifyAndEnable', 'common')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2FA disable */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        className="mx-4 max-w-md overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900"
      >
        <div className="-m-4">
          <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('disable2FA', 'common')}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('enterPasswordToDisable2FA', 'common')}</p>
          </div>
          <div className="px-6 py-5">
            <Field label={t('password', 'common')} htmlFor="disablePassword">
              <input
                type="password"
                id="disablePassword"
                name="disablePassword"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t('enterYourPassword', 'common')}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
            <Button onClick={() => setShowDisableModal(false)}>{t('cancel', 'common')}</Button>
            <Button
              variant="danger"
              onClick={handleDisable2FA}
              loading={disable2FAMutation.isPending}
              disabled={!disablePassword}
            >
              {t('disable2FA', 'common')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
