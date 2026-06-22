// ApplicantPageView.tsx
import PageMeta from '../../../../components/common/PageMeta';
import Applicants from './ApplicantsTable';

interface ApplicantPageViewProps {
  title: string;
  description?: string;
  statuses: string[];
  jobPositions?: string[];
  companyId?: string;
  layoutKey: string;
}

export default function ApplicantPageView({
  title,
  description,
  statuses,
  jobPositions,
  companyId,
  layoutKey,
}: ApplicantPageViewProps) {
  return (
    <>
      <PageMeta title={title} description={description ?? ''} />
      <div className="grid gap-6">
        <Applicants
          layoutKey={layoutKey}
          onlyStatus={statuses}
          onlyJobPositions={jobPositions}
          companyIdOverride={companyId}
        />
      </div>
    </>
  );
}
