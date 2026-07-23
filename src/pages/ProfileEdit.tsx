import { useState, useRef } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Button from "../components/ui/button/Button";
import Switch from "../components/form/switch/Switch";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import { useChangePasswordMutation, useSetup2FAMutation, useVerify2FASetupMutation, useDisable2FAMutation } from "../hooks/queries/useAuth";
import { useUpdateProfile } from "../hooks/queries/useUsers";
import { useLocale } from "../context/LocaleContext";
import Swal from "../utils/swal";

export default function ProfileEdit() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
  const { t, dir } = useLocale();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
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
          setCodeSent(true);
          Swal.fire({
            title: t('2FACodeSent', 'common'),
            text: t('2FACodeSentDesc', 'common'),
            icon: 'info',
          });
        },
        onError: (err: any) => {
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
        onError: (err: any) => {
          if (err?.statusCode === 429) {
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

  return (
    <div className="space-y-6">
      <PageMeta
        title={t('editProfilePageTitle', 'common', { site: 'Saber Group - Hiring Management System' })}
        description={t('editProfilePageDesc', 'common')}
      />
      <PageBreadcrumb  pageTitle={t('editProfile', 'common')} />

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <div className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-300 ${dir === 'ltr' ? 'left-0 rounded-l-[2.5rem]' : 'right-0 rounded-r-[2.5rem]'}`} />
        <div className="flex flex-col items-center gap-6 xl:flex-row">
          <div className="relative group">
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-brand-500/10 ring-4 ring-brand-500/20">
              {preview ? (
                <img
                  src={preview}
                  alt={t('preview', 'common')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand-500">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z" fill="currentColor" />
                </svg>
              )}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`absolute -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-all hover:bg-brand-600 hover:scale-105 ${dir === 'ltr' ? '-right-1' : '-left-1'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M16.5 2.25C15.335 2.25 14.25 3.075 14.25 4.125V6H5.25C3.59315 6 2.25 7.34315 2.25 9V18.75C2.25 20.4069 3.59315 21.75 5.25 21.75H18.75C20.4069 21.75 21.75 20.4069 21.75 18.75V9C21.75 7.34315 20.4069 6 18.75 6H17.25V4.125C17.25 3.075 16.165 2.25 15 2.25H16.5ZM15 6V4.5H16.5V6H15ZM5.25 7.5H18.75C19.5784 7.5 20.25 8.17157 20.25 9V18.75C20.25 19.5784 19.5784 20.25 18.75 20.25H5.25C4.42157 20.25 3.75 19.5784 3.75 18.75V9C3.75 8.17157 4.42157 7.5 5.25 7.5ZM12 10.5C10.7574 10.5 9.75 11.5074 9.75 12.75C9.75 13.9926 10.7574 15 12 15C13.2426 15 14.25 13.9926 14.25 12.75C14.25 11.5074 13.2426 10.5 12 10.5ZM8.25 12.75C8.25 10.6789 9.92893 9 12 9C14.0711 9 15.75 10.6789 15.75 12.75C15.75 14.8211 14.0711 16.5 12 16.5C9.92893 16.5 8.25 14.8211 8.25 12.75Z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className={`text-center ${dir === 'ltr' ? 'xl:text-left' : 'xl:text-right'}`}>
            <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
              {user?.fullName || t('user', 'common')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Edit Form Card */}
      <div className="rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t('editPersonalInfo', 'users')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('editPersonalInfoDesc', 'users')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <Label htmlFor="fullName">{t('editFullName', 'users')}</Label>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={t('editFullNamePlaceholder', 'users')}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('editEmail', 'users')}</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('editEmailPlaceholder', 'users')}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('editPhone', 'users')}</Label>
              <Input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('editPhonePlaceholder', 'users')}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
            <Button variant="outline" onClick={() => window.history.back()}>
              {t('editCancel', 'users')}
            </Button>
            <button type="submit" disabled={updateProfileMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300">{updateProfileMutation.isPending ? t('submitting', 'common') : t('editSaveChanges', 'users')}</button>
          </div>
        </form>
      </div>

      {/* Security Card */}
      <div className="rounded-[2.5rem] border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C7.718 2.25 4.25 5.718 4.25 10V12.163C3.189 12.598 2.5 13.369 2.5 14.25V19.25C2.5 20.403 3.597 21.5 4.75 21.5H19.25C20.403 21.5 21.5 20.403 21.5 19.25V14.25C21.5 13.369 20.811 12.598 19.75 12.163V10C19.75 5.718 16.282 2.25 12 2.25ZM17.75 12H6.25V10C6.25 6.824 8.824 4.25 12 4.25C15.176 4.25 17.75 6.824 17.75 10V12ZM4.75 14.25C4.612 14.25 4.5 14.362 4.5 14.5V19C4.5 19.138 4.612 19.25 4.75 19.25H19.25C19.388 19.25 19.5 19.138 19.5 19V14.5C19.5 14.362 19.388 14.25 19.25 14.25H4.75Z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {t('security', 'common')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('managePasswordSecurity', 'common')}
            </p>
          </div>
        </div>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <Label htmlFor="currentPassword">{t('currentPassword', 'common')}</Label>
              <Input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder={t('enterCurrentPassword', 'common')}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">{t('newPassword', 'common')}</Label>
              <Input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder={t('enterNewPassword', 'common')}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('confirmNewPassword', 'common')}</Label>
              <Input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder={t('enterConfirmNewPassword', 'common')}
              />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
            >
              {changePasswordMutation.isPending ? t('submitting', 'common') : t('updatePassword', 'common')}
            </button>
          </div>
        </form>

        <div className="my-6 border-t border-gray-100 dark:border-gray-800" />

        {/* Two-Factor Authentication */}
        <div>
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {t('twoFactorAuthentication', 'common')}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('addExtraLayerSecurity', 'common')}
            </p>
          </div>
          <Switch
            label={t('enableTwoFactorAuth', 'common')}
            checked={twoFAEnabled}
            onChange={handleTwoFAToggle}
          />
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal isOpen={twoFAModalOpen} onClose={() => setTwoFAModalOpen(false)} className="max-w-md mx-auto p-6">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C7.718 2.25 4.25 5.718 4.25 10V12.163C3.189 12.598 2.5 13.369 2.5 14.25V19.25C2.5 20.403 3.597 21.5 4.75 21.5H19.25C20.403 21.5 21.5 20.403 21.5 19.25V14.25C21.5 13.369 20.811 12.598 19.75 12.163V10C19.75 5.718 16.282 2.25 12 2.25ZM17.75 12H6.25V10C6.25 6.824 8.824 4.25 12 4.25C15.176 4.25 17.75 6.824 17.75 10V12ZM4.75 14.25C4.612 14.25 4.5 14.362 4.5 14.5V19C4.5 19.138 4.612 19.25 4.75 19.25H19.25C19.388 19.25 19.5 19.138 19.5 19V14.5C19.5 14.362 19.388 14.25 19.25 14.25H4.75Z" fill="currentColor" />
            </svg>
          </span>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-2">
            {t('setupTwoFactorAuth', 'common')}
          </h3>

          {codeSent && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('checkYourEmailDesc', 'common')}
            </p>
          )}

          {twoFAError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {twoFAError}
            </div>
          )}

          <div className="mb-6">
            <Label htmlFor="otpCode">{t('enter6DigitCode', 'common')}</Label>
            <input
              type="text"
              id="otpCode"
              name="otpCode"
              maxLength={6}
              placeholder="000000"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-center text-lg tracking-widest shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          {setup2FAMutation.isPending && (
            <p className="text-sm text-gray-400 mb-4">{t('submitting', 'common')}</p>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setTwoFAModalOpen(false)} className="flex-1">
              {t('cancel', 'common')}
            </Button>
            <button
              onClick={handleVerify2FASetup}
              disabled={verify2FASetupMutation.isPending || setup2FAMutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
            >
              {t('verifyAndEnable', 'common')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2FA Disable Modal */}
      <Modal isOpen={showDisableModal} onClose={() => setShowDisableModal(false)} className="max-w-md mx-auto p-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-2">
            {t('disable2FA', 'common')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('enterPasswordToDisable2FA', 'common')}
          </p>
          <div className="mb-6">
            <Label htmlFor="disablePassword">{t('password', 'common')}</Label>
            <Input
              type="password"
              id="disablePassword"
              name="disablePassword"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder={t('enterYourPassword', 'common')}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowDisableModal(false)} className="flex-1">
              {t('cancel', 'common')}
            </Button>
            <button
              onClick={handleDisable2FA}
              disabled={disable2FAMutation.isPending || !disablePassword}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-3.5 text-sm text-white shadow-theme-xs hover:bg-red-600 disabled:bg-red-300"
            >
              {disable2FAMutation.isPending ? t('submitting', 'common') : t('disable2FA', 'common')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
