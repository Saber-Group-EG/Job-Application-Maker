import { useMemo, useState } from 'react';
import {
  FileText,
  PlusCircle,
  DollarSign,
  Clock,
  Hash,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import {
  useJobOfferTemplates,
  useCloneJobOffer,
  useDeleteJobOffer,
} from '../../../hooks/queries/useJobOffers';
import type { JobOffer, WorkType } from '../../../services/jobOffersService';
import JobOfferModal from '../../../components/modals/JobOffersModal/JobOffersModal';
import { Button } from '../../../components/ui/kit';
import type { BadgeTone } from '../../../components/ui/kit';
import SettingsSection from './components/SettingsSection';
import { TemplateCard as TemplateTile, TemplateGrid } from './components/TemplateLibrary';
import SectionTemplatesPanel from '../../../components/settings/SectionTemplatesPanel';
import { useCompanies, useUpdateOfferSectionTemplates } from '../../../hooks/queries/useCompanies';
import type { SectionTemplate } from '../../../types/companies';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_TONES: Record<WorkType, BadgeTone> = {
  'full-time': 'green',
  'part-time': 'blue',
  contract: 'amber',
  internship: 'slate',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string;
  embedded?: boolean;
  hideCompanySelector?: boolean;
};

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  offer,
  canEdit,
  onEdit,
  onClone,
  onDelete,
}: {
  offer: JobOffer;
  canEdit: boolean;
  onEdit: (o: JobOffer) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const workTypeLabels = {
    'full-time': t('jobOffers.fullTime', 'settings'),
    'part-time': t('jobOffers.partTime', 'settings'),
    contract: t('jobOffers.contract', 'settings'),
    internship: t('jobOffers.internship', 'settings'),
  };
  return (
    <TemplateTile
      title={offer.position.en || offer.position.ar || t('jobOffers.untitled', 'settings')}
      badge={{ tone: WORK_TYPE_TONES[offer.workType] ?? 'slate', label: workTypeLabels[offer.workType] ?? offer.workType }}
      meta={[
        offer.salary.basic != null && {
          icon: <DollarSign className="size-3.5" />,
          label: `${offer.salary.basic.toLocaleString()} ${offer.salary.currency}`,
        },
        !!offer.workHours && !!(offer.workHours.en || offer.workHours.ar) && {
          icon: <Clock className="size-3.5" />,
          label: locale === 'ar' ? (offer.workHours.ar ?? offer.workHours.en) : (offer.workHours.en ?? offer.workHours.ar),
        },
        offer.commissions.length > 0 && {
          icon: <Hash className="size-3.5" />,
          label: t('jobOffers.commissionsCount', 'settings', { count: offer.commissions.length }),
        },
        offer.sections.length > 0 && {
          icon: <FileText className="size-3.5" />,
          label: t('jobOffers.sectionsCount', 'settings', { count: offer.sections.length }),
        },
      ]}
      canEdit={canEdit}
      labels={{ edit: t('jobOffers.edit', 'settings'), clone: t('jobOffers.clone', 'settings'), delete: t('jobOffers.delete', 'settings') }}
      onEdit={() => onEdit(offer)}
      onClone={() => onClone(offer._id)}
      onDelete={() => onDelete(offer._id)}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OfferTemplatesTab({
  companyId,
  embedded = true,
}: Props) {
  const { hasPermission } = useAuth();
  const { t } = useLocale();
  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

  const { data: templatesData, isLoading } = useJobOfferTemplates([companyId]);
  const templates = templatesData?.data ?? [];

  // in OfferTemplatesTab
  const { data: companies = [] } = useCompanies();

  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === companyId),
    [companies, companyId]
  );

  const settingsId = selectedCompany?.settings?._id ?? '';
  const offerSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.offerSectionTemplates ?? [];
  const contractSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.contractSectionTemplates ?? [];

  const cloneMutation = useCloneJobOffer();
  const deleteMutation = useDeleteJobOffer();
  const updateOfferSections = useUpdateOfferSectionTemplates();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);

  const openCreate = () => {
    setEditingOffer(null);
    setDrawerOpen(true);
  };
  const openEdit = (offer: JobOffer) => {
    setEditingOffer(offer);
    setDrawerOpen(true);
  };

  const handleClone = async (id: string) => {
    await cloneMutation.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t('jobOffers.deleteTitle', 'settings'),
      text: t('jobOffers.deleteText', 'settings'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonText: t('jobOffers.deleteConfirm', 'settings'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) await deleteMutation.mutateAsync(id);
  };

  const handleSaveSections = async (updated: SectionTemplate[]) => {
    await updateOfferSections.mutateAsync({ settingsId, templates: updated });
  };

  return (
    <SettingsSection
      embedded={embedded}
      icon={<FileText className="size-4" />}
      title={t('jobOffers.title', 'settings')}
      description={t('jobOffers.description', 'settings')}
      actions={
        canEdit && (
          <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openCreate}>
            {t('jobOffers.newTemplate', 'settings')}
          </Button>
        )
      }
      stats={[
        { label: t('jobOffers.totalTemplates', 'settings'), value: templates.length },
        { label: t('jobOffers.withCommissions', 'settings'), value: templates.filter((t) => t.commissions.length > 0).length },
        { label: t('jobOffers.withSections', 'settings'), value: templates.filter((t) => t.sections.length > 0).length },
      ]}
    >
      <TemplateGrid
        isLoading={isLoading}
        isEmpty={templates.length === 0}
        emptyIcon={<FileText className="size-6" />}
        emptyTitle={t('jobOffers.emptyStateTitle', 'settings')}
        emptyText={t('jobOffers.emptyStateDesc', 'settings')}
        createLabel={t('jobOffers.createFirst', 'settings')}
        onCreate={canEdit ? openCreate : undefined}
      >
        {templates.map((offer) => (
          <TemplateCard
            key={offer._id}
            offer={offer}
            canEdit={canEdit}
            onEdit={openEdit}
            onClone={handleClone}
            onDelete={handleDelete}
          />
        ))}
      </TemplateGrid>

      <SectionTemplatesPanel
        type="offer"
        settingsId={settingsId}
        templates={offerSectionTemplates}
        crossTemplates={contractSectionTemplates}
        canEdit={canEdit}
        onSave={handleSaveSections}
        isSaving={updateOfferSections.isPending}
      />

      {companyId && (
        <JobOfferModal
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="template"
          companyId={companyId}
          editing={editingOffer}
        />
      )}
    </SettingsSection>
  );
}
