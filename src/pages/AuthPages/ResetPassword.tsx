import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";
import { useLocale } from "../../context/LocaleContext";

export default function ResetPassword() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta
        title={t('resetPasswordPageTitle', 'common')}
        description={t('resetPasswordPageDesc', 'common')}
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}
