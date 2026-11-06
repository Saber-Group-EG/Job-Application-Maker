import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import AcceptInviteForm from "../../components/auth/AcceptInviteForm";
import { useLocale } from "../../context/LocaleContext";

export default function AcceptInvite() {
  const { t } = useLocale();
  return (
    <>
      <PageMeta title={t('invitePageTitle', 'common')} description={t('invitePageDesc', 'common')} />
      <AuthLayout>
        <AcceptInviteForm />
      </AuthLayout>
    </>
  );
}
