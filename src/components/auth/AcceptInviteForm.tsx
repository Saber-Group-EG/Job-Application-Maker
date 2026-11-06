// Landing page of the invite email: a user added by an admin chooses their
// password here and is signed straight in.
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useLocale } from "../../context/LocaleContext";
import { authService } from "../../services/authService";
import { paths } from "../../router/Paths";

type Invite = { fullName: string; email: string };

export default function AcceptInviteForm() {
  const { t, dir } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<Invite | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">(token ? "loading" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authService
      .getInvite(token)
      .then((data) => {
        if (cancelled) return;
        setInvite(data);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("invalid"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("passwordMinLength", "common"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch", "common"));
      return;
    }
    setSaving(true);
    try {
      await authService.acceptInvite(token, password);
      window.location.href = "/home";
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      if (statusCode === 400) setStatus("invalid");
      else setError((err as Error)?.message || t("inviteFailed", "common"));
      setSaving(false);
    }
  }

  const heading = "mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md";

  if (status === "loading") {
    return (
      <div className="flex flex-col flex-1 justify-center w-full max-w-md mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("loading", "common")}</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className={heading}>{t("inviteInvalidTitle", "common")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("inviteInvalidDesc", "common")}</p>
          </div>
          <Link to={paths.auth.signIn} className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
            {t("backToSignIn", "common")}
          </Link>
        </div>
      </div>
    );
  }

  const eye = (
    <span
      onClick={() => setShowPassword(!showPassword)}
      className={`absolute z-30 -translate-y-1/2 cursor-pointer top-1/2 ${dir === "ltr" ? "right-4" : "left-4"}`}
    >
      {showPassword ? (
        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
      ) : (
        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
      )}
    </span>
  );

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className={heading}>{t("inviteWelcome", "common", { name: invite?.fullName || "" })}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("inviteSubtitle", "common", { email: invite?.email || "" })}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  {t("newPassword", "common")} <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enterNewPassword", "common")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {eye}
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t("passwordMinLength", "common")}</p>
              </div>
              <div>
                <Label>
                  {t("confirmNewPassword", "common")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("enterConfirmNewPassword", "common")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? t("submitting", "common") : t("inviteSubmit", "common")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
