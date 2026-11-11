import { useState, FormEvent } from "react";
import { Link } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useForgotPasswordMutation } from "../../hooks/queries/useAuth";
import { useLocale } from "../../context/LocaleContext";
import { authService } from "../../services/authService";
import CountryPhoneInput from "../form/CountryPhoneInput";
import AuthMethodTabs, {
  type AuthMethod,
  codeInputClass,
  errorBoxClass,
  infoBoxClass,
  primaryButtonClass,
} from "./AuthMethodTabs";

export default function ForgotPasswordForm() {
  const { t } = useLocale();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // WhatsApp: phone -> code + new password
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await forgotPasswordMutation.mutateAsync({ email });
    setSent(true);
  }

  async function sendCode() {
    setError(null);
    if (phone.replace(/\D/g, "").length < 8) {
      setError(t("enterValidPhone", "common"));
      return;
    }
    setBusy(true);
    try {
      await authService.forgotPasswordWhatsApp(phone);
      setCodeSent(true);
      setCode("");
    } catch (err) {
      setError((err as Error)?.message || t("somethingWentWrong", "common"));
    } finally {
      setBusy(false);
    }
  }

  async function handleWhatsAppSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!codeSent) return sendCode();
    setError(null);
    if (code.length < 6) return setError(t("enter6DigitCode", "common"));
    if (newPassword.length < 8) return setError(t("passwordMin8", "common"));
    if (newPassword !== confirmPassword) return setError(t("passwordsDoNotMatch", "common"));
    setBusy(true);
    try {
      await authService.resetPasswordWhatsApp({ phone, code, newPassword });
      setResetDone(true);
    } catch (err) {
      setError((err as Error)?.message || t("invalidVerificationCode", "common"));
    } finally {
      setBusy(false);
    }
  }

  if (sent || resetDone) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {resetDone ? t("passwordResetDone", "common") : t("resetLinkSent", "common")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {resetDone ? t("passwordResetDoneDesc", "common") : t("resetLinkSentDesc", "common")}
            </p>
          </div>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            {t("backToSignIn", "common")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t("forgotPassword", "common")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {method === "whatsapp"
                ? t("forgotPasswordWhatsAppSubtitle", "common")
                : t("forgotPasswordSubtitle", "common")}
            </p>
          </div>

          <AuthMethodTabs value={method} onChange={setMethod} />

          {method === "whatsapp" ? (
            <form onSubmit={handleWhatsAppSubmit}>
              {error && <div className={errorBoxClass}>{error}</div>}
              {codeSent && !error && <div className={infoBoxClass}>{t("whatsAppCodeSentHint", "common")}</div>}
              <div className="space-y-6">
                <div>
                  <Label>
                    {t("whatsAppNumber", "common")} <span className="text-error-500">*</span>
                  </Label>
                  <CountryPhoneInput
                    onChange={(v) => {
                      setPhone(v);
                      setCodeSent(false);
                    }}
                    disabled={busy}
                  />
                </div>
                {codeSent && (
                  <>
                    <div>
                      <Label htmlFor="resetCode">
                        {t("enter6DigitCode", "common")} <span className="text-error-500">*</span>
                      </Label>
                      <input
                        id="resetCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className={codeInputClass}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={busy}
                        className="mt-2 text-sm text-brand-500 hover:text-brand-600 disabled:opacity-50 dark:text-brand-400"
                      >
                        {t("resendCode", "common")}
                      </button>
                    </div>
                    <div>
                      <Label>
                        {t("newPassword", "common")} <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <Label>
                        {t("confirmNewPassword", "common")} <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </>
                )}
                <button type="submit" disabled={busy} className={primaryButtonClass}>
                  {busy
                    ? t("submitting", "common")
                    : codeSent
                      ? t("resetPassword", "common")
                      : t("sendCodeOnWhatsApp", "common")}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    {t("email", "common")} <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder={t("enterYourEmail", "common")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={forgotPasswordMutation.isPending}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={forgotPasswordMutation.isPending}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                  >
                    {forgotPasswordMutation.isPending ? t("submitting", "common") : t("sendResetLink", "common")}
                  </button>
                </div>
              </div>
            </form>
          )}
          <div className="mt-5 text-center">
            <Link to="/signin" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
              {t("backToSignIn", "common")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
