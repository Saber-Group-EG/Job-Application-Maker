import { useMemo, useState } from 'react';
import {
  FileSignature,
  PlusCircle,
  DollarSign,
  Calendar,
  Gift,
  FileText,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import {
  useJobContractTemplates,
  useCloneJobContract,
  useDeleteJobContract,
} from '../../../hooks/queries/useContracts';
import type {
  JobContract,
  ContractType,
} from '../../../services/contractsService';
import JobContractModal from '../../../components/modals/ContractModal/ContractModal';
import { Button } from '../../../components/ui/kit';
import type { BadgeTone } from '../../../components/ui/kit';
import SettingsSection from './components/SettingsSection';
import { TemplateCard as TemplateTile, TemplateGrid } from './components/TemplateLibrary';
import SectionTemplatesPanel from '../../../components/settings/SectionTemplatesPanel';
import {
  useCompanies,
  useUpdateContractSectionTemplates,
} from '../../../hooks/queries/useCompanies';
import type { SectionTemplate } from '../../../types/companies';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_TONES: Record<ContractType, BadgeTone> = {
  permanent: 'green',
  'fixed-term': 'blue',
  freelance: 'amber',
  probation: 'slate',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  companyId: string;
  embedded?: boolean;
  hideCompanySelector?: boolean;
};

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  contract,
  canEdit,
  onEdit,
  onClone,
  onDelete,
}: {
  contract: JobContract;
  canEdit: boolean;
  onEdit: (c: JobContract) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const typeLabels = {
    permanent: t('contracts.permanent', 'settings'),
    'fixed-term': t('contracts.fixedTerm', 'settings'),
    freelance: t('contracts.freelance', 'settings'),
    probation: t('contracts.probation', 'settings'),
  };
  return (
    <TemplateTile
      title={locale === 'ar' ? (contract.position?.ar || contract.position?.en || t('contracts.untitled', 'settings')) : (contract.position?.en || contract.position?.ar || t('contracts.untitled', 'settings'))}
      badge={{ tone: CONTRACT_TYPE_TONES[contract.contractType] ?? 'slate', label: typeLabels[contract.contractType] ?? contract.contractType }}
      meta={[
        contract.salary.basic != null && {
          icon: <DollarSign className="size-3.5" />,
          label: `${contract.salary.basic.toLocaleString()} ${contract.salary.currency}`,
        },
        contract.probationPeriod != null && {
          icon: <Calendar className="size-3.5" />,
          label: t('contracts.probationPeriod', 'settings', { months: contract.probationPeriod }),
        },
        contract.benefits.length > 0 && {
          icon: <Gift className="size-3.5" />,
          label: t('contracts.benefitsCount', 'settings', { count: contract.benefits.length }),
        },
        contract.sections.length > 0 && {
          icon: <FileText className="size-3.5" />,
          label: t('contracts.sectionsCount', 'settings', { count: contract.sections.length }),
        },
      ]}
      canEdit={canEdit}
      labels={{ edit: t('contracts.edit', 'settings'), clone: t('contracts.clone', 'settings'), delete: t('contracts.delete', 'settings') }}
      onEdit={() => onEdit(contract)}
      onClone={() => onClone(contract._id)}
      onDelete={() => onDelete(contract._id)}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractTemplatesTab({
  companyId,
  embedded = true,
}: Props) {
  const { hasPermission } = useAuth();
  const { t } = useLocale();
  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

  const { data: templatesData, isLoading } = useJobContractTemplates([
    companyId,
  ]);
  const templates = templatesData?.data ?? [];

  // in OfferTemplatesTab
  const { data: companies = [] } = useCompanies();

  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === companyId),
    [companies, companyId]
  );

  const settingsId = selectedCompany?.settings?._id ?? '';
  const contractSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.contractSectionTemplates ?? [];
  const offerSectionTemplates: SectionTemplate[] =
    selectedCompany?.settings?.offerSectionTemplates ?? [];

  const cloneMutation = useCloneJobContract();
  const deleteMutation = useDeleteJobContract();
  const updateContractSections = useUpdateContractSectionTemplates();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<JobContract | null>(
    null
  );

  const openCreate = () => {
    setEditingContract(null);
    setDrawerOpen(true);
  };
  const openEdit = (contract: JobContract) => {
    setEditingContract(contract);
    setDrawerOpen(true);
  };
  const handleClone = async (id: string) => {
    await cloneMutation.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t('contracts.deleteTitle', 'settings'),
      text: t('contracts.deleteText', 'settings'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonText: t('contracts.deleteConfirm', 'settings'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) await deleteMutation.mutateAsync(id);
  };

  const handleSaveSections = async (updated: SectionTemplate[]) => {
    await updateContractSections.mutateAsync({
      settingsId,
      templates: updated,
    });
  };

  const withBenefits = templates.filter((t) => t.benefits.length > 0).length;
  const withSections = templates.filter((t) => t.sections.length > 0).length;

  return (
    <SettingsSection
      embedded={embedded}
      icon={<FileSignature className="size-4" />}
      title={t('contracts.title', 'settings')}
      description={t('contracts.description', 'settings')}
      actions={
        canEdit && (
          <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openCreate}>
            {t('contracts.newTemplate', 'settings')}
          </Button>
        )
      }
      stats={[
        { label: t('contracts.totalTemplates', 'settings'), value: templates.length },
        { label: t('contracts.withBenefits', 'settings'), value: withBenefits },
        { label: t('contracts.withSections', 'settings'), value: withSections },
      ]}
    >
      <TemplateGrid
        isLoading={isLoading}
        isEmpty={templates.length === 0}
        emptyIcon={<FileSignature className="size-6" />}
        emptyTitle={t('contracts.emptyStateTitle', 'settings')}
        emptyText={t('contracts.emptyStateDesc', 'settings')}
        createLabel={t('contracts.createFirst', 'settings')}
        onCreate={canEdit ? openCreate : undefined}
      >
        {templates.map((contract) => (
          <TemplateCard
            key={contract._id}
            contract={contract}
            canEdit={canEdit}
            onEdit={openEdit}
            onClone={handleClone}
            onDelete={handleDelete}
          />
        ))}
      </TemplateGrid>

      <SectionTemplatesPanel
        type="contract"
        settingsId={settingsId}
        templates={contractSectionTemplates}
        crossTemplates={offerSectionTemplates}
        canEdit={canEdit}
        onSave={handleSaveSections}
        isSaving={updateContractSections.isPending}
      />

      {companyId && (
        <JobContractModal
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="template"
          companyId={companyId}
          editing={editingContract}
        />
      )}
    </SettingsSection>
  );
}
