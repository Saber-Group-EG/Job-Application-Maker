import { useState, FormEvent } from "react";
import { Link } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useForgotPasswordMutation } from "../../hooks/queries/useAuth";
import { useLocale } from "../../context/LocaleContext";

export default function ForgotPasswordForm() {
  const { t } = useLocale();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await forgotPasswordMutation.mutateAsync({ email });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t('resetLinkSent', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('resetLinkSentDesc', 'common')}
            </p>
          </div>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            {t('backToSignIn', 'common')}
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
              {t('forgotPassword', 'common')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('forgotPasswordSubtitle', 'common')}
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  {t('email', 'common')} <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={t('enterYourEmail', 'common')}
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
                  {forgotPasswordMutation.isPending ? t('submitting', 'common') : t('sendResetLink', 'common')}
                </button>
              </div>
            </div>
          </form>
          <div className="mt-5 text-center">
            <Link
              to="/signin"
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              {t('backToSignIn', 'common')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
