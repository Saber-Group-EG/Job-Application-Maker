import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";
import { useLocale } from "../../context/LocaleContext";

export default function ForgotPassword() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta
        title={t('forgotPasswordPageTitle', 'common')}
        description={t('forgotPasswordPageDesc', 'common')}
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}
