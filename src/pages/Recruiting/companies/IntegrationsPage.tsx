// Integrations: the outside services a company connects — WhatsApp, applicant
// verification codes, Telegram channels and Facebook & Instagram pages.
// They used to sit on the Mail Settings page, which is now only about email.
import { Building2 } from 'lucide-react';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import PageMeta from '../../../components/common/PageMeta';
import { Card, EmptyState, PageShell } from '../../../components/ui/kit';
import WhatsAppConnectionCard from './components/WhatsAppConnectionCard';
import ApplicantVerificationCard from './components/ApplicantVerificationCard';
import TelegramChannelsCard from './components/TelegramChannelsCard';
import FacebookPagesCard from './components/FacebookPagesCard';

export default function IntegrationsPage() {
  const { selectedCompanyId } = useCompanyFilter();
  const { hasPermission } = useAuth();
  const { t } = useLocale();

  const companyId = selectedCompanyId ?? undefined;
  // Same rules the cards had on the Mail Settings page.
  const canEditMessaging = hasPermission('Mail Management', 'write') && hasPermission('Mail Management', 'create');
  const canEditChannels = hasPermission('Company Management', 'write');

  return (
    <PageShell title={t('integrationsTitle', 'companies')} subtitle={t('integrationsDesc', 'companies')}>
      <PageMeta title={t('integrationsTitle', 'companies')} description={t('integrationsDesc', 'companies')} />
      {!companyId ? (
        <Card>
          <EmptyState icon={<Building2 className="size-6" />} title={t('noCompanySelected', 'companies')} />
        </Card>
      ) : (
        <>
          <WhatsAppConnectionCard companyId={companyId} canEdit={canEditMessaging} />
          <ApplicantVerificationCard companyId={companyId} canEdit={canEditMessaging} />
          <TelegramChannelsCard companyId={companyId} canEdit={canEditChannels} />
          <FacebookPagesCard companyId={companyId} canEdit={canEditChannels} />
        </>
      )}
    </PageShell>
  );
}
