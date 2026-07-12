import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";
import { useLocale } from "../../context/LocaleContext";

export default function SignUp() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta
        title={t('signUpPageTitle', 'common')}
        description={t('signUpPageDesc', 'common')}
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
