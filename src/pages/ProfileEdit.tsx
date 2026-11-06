import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import { authKeys, useChangePasswordMutation, useDisable2FAMutation } from "../hooks/queries/useAuth";
import { authService } from "../services/authService";
import type { OtpChannel } from "../types/auth";
import OtpDialog from "./profile/OtpDialog";
import { useUpdateProfile } from "../hooks/queries/useUsers";
import { useLocale } from "../context/LocaleContext";
import Swal from "../utils/swal";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
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
  // Which code dialog is open: verifying an address, or setting up / moving 2FA.
  const [otpDialog, setOtpDialog] = useState<null | "verifyEmail" | "verifyPhone" | "setup2fa" | "change2fa">(null);
  const queryClient = useQueryClient();
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const changePasswordMutation = useChangePasswordMutation();
  const updateProfileMutation = useUpdateProfile();
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

  const refreshUser = () => queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
  const channelName = (channel: OtpChannel) =>
    channel === "whatsapp" ? t("otpChannelWhatsApp", "common") : t("otpChannelEmail", "common");
  const twoFAChannel: OtpChannel = user?.twoFactorChannel === "whatsapp" ? "whatsapp" : "email";
  // Verifying needs the saved address; unsaved edits would verify the old one.
  const emailDirty = formData.email !== (user?.email || "");
  const phoneDirty = formData.phone !== (user?.phone || "");
  const twoFAChannelOptions = [
    { value: "email" as OtpChannel, label: t("otpChannelEmail", "common"), hint: user?.email },
    {
      value: "whatsapp" as OtpChannel,
      label: t("otpChannelWhatsApp", "common"),
      disabled: !user?.phone,
      hint: user?.phone || t("twoFactorNeedsPhone", "common"),
    },
  ];

  function handleTwoFAToggle(checked: boolean) {
    if (checked) setOtpDialog("setup2fa");
    else setShowDisableModal(true);
  }

  function handleTwoFASetupDone(channel: OtpChannel) {
    const changing = otpDialog === "change2fa";
    setOtpDialog(null);
    setTwoFAEnabled(true);
    refreshUser();
    Swal.fire({
      title: t("success", "common"),
      text: changing
        ? t("twoFactorChannelSaved", "common", { channel: channelName(channel) })
        : t("2FASetupSuccess", "common"),
      icon: "success",
    });
  }

  function handleVerifiedDone(channel: OtpChannel) {
    setOtpDialog(null);
    refreshUser();
    Swal.fire({
      title: t("success", "common"),
      text: channel === "email" ? t("verifyEmailSuccess", "common") : t("verifyPhoneSuccess", "common"),
      icon: "success",
    });
  }

  const verifyRow = (verified: boolean | undefined, dirty: boolean, onVerify: () => void) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={verified && !dirty ? "green" : "amber"}>
        {verified && !dirty ? t("verifiedBadge", "common") : t("notVerifiedBadge", "common")}
      </Badge>
      {!(verified && !dirty) && (
        <Button size="sm" variant="ghost" onClick={onVerify} disabled={dirty} title={dirty ? t("verifySaveFirst", "common") : undefined}>
          {t("verifyAction", "common")}
        </Button>
      )}
      {dirty && <span className="text-xs text-slate-500 dark:text-slate-400">{t("verifySaveFirst", "common")}</span>}
    </div>
  );

  function handleDisable2FA() {
    if (!disablePassword) return;

    disable2FAMutation.mutate(
      { password: disablePassword },
      {
        onSuccess: () => {
          setTwoFAEnabled(false);
          setShowDisableModal(false);
          refreshUser();
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
                  {user?.email && verifyRow(user.emailVerified, emailDirty, () => setOtpDialog("verifyEmail"))}
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
                  {user?.phone && verifyRow(user.phoneVerified, phoneDirty, () => setOtpDialog("verifyPhone"))}
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
                  {twoFAEnabled && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span>{t('twoFactorChannelCurrent', 'common', { channel: channelName(twoFAChannel) })}</span>
                      <Button size="sm" variant="ghost" onClick={() => setOtpDialog("change2fa")}>
                        {t('twoFactorChannelChange', 'common')}
                      </Button>
                    </div>
                  )}
                  {twoFAEnabled && twoFAChannel === "whatsapp" && !user?.phoneVerified && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t('twoFactorWhatsAppFallback', 'common')}</p>
                  )}
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

      {/* 2FA setup / change channel */}
      <OtpDialog
        isOpen={otpDialog === "setup2fa" || otpDialog === "change2fa"}
        onClose={() => setOtpDialog(null)}
        title={otpDialog === "change2fa" ? t('twoFactorChannelChangeTitle', 'common') : t('setupTwoFactorAuth', 'common')}
        intro={t('twoFactorChannelHint', 'common')}
        channels={twoFAChannelOptions}
        initialChannel={otpDialog === "change2fa" && twoFAChannel === "email" && user?.phone ? "whatsapp" : "email"}
        send={async (channel) => (await authService.setup2FA(channel)).data}
        confirm={(_channel, code) => authService.verify2FASetup({ code })}
        confirmLabel={t('verifyAndEnable', 'common')}
        onDone={handleTwoFASetupDone}
      />

      {/* Verify email / WhatsApp number */}
      <OtpDialog
        isOpen={otpDialog === "verifyEmail" || otpDialog === "verifyPhone"}
        onClose={() => setOtpDialog(null)}
        title={otpDialog === "verifyPhone" ? t('verifyPhoneTitle', 'common') : t('verifyEmailTitle', 'common')}
        initialChannel={otpDialog === "verifyPhone" ? "whatsapp" : "email"}
        send={(channel) => authService.sendVerification(channel)}
        confirm={(channel, code) => authService.confirmVerification(channel, code)}
        onDone={handleVerifiedDone}
      />

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
