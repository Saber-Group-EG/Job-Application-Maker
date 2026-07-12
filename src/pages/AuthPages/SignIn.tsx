import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { useLocale } from "../../context/LocaleContext";

export default function SignIn() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta
        title={t('signInPageTitle', 'common')}
        description={t('signInPageDesc', 'common')}
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
