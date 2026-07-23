import { useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useResetPasswordMutation } from "../../hooks/queries/useAuth";
import { useLocale } from "../../context/LocaleContext";

export default function ResetPasswordForm() {
  const { t, dir } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const resetPasswordMutation = useResetPasswordMutation();

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    await resetPasswordMutation.mutateAsync({ token, newPassword });
    setDone(true);
  }

  if (!token) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t('invalidResetLink', 'common')}
            </h1>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            {t('sendResetLink', 'common')}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t('resetPasswordSuccess', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('resetPasswordSuccessDesc', 'common')}
            </p>
          </div>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            {t('signIn', 'common')}
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
              {t('resetPassword', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('resetPasswordSubtitle', 'common')}
            </p>
          </div>

          {resetPasswordMutation.isError && (
            <div className="p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {t('invalidResetLink', 'common')}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  {t('newPassword', 'common')} <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t('enterNewPassword', 'common')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={resetPasswordMutation.isPending}
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
              <div>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
                >
                  {resetPasswordMutation.isPending ? t('submitting', 'common') : t('resetPassword', 'common')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
