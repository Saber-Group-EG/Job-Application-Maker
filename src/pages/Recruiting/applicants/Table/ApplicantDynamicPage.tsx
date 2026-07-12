import { useParams, useSearchParams } from 'react-router';
import ApplicantPageView from './ApplicantPageView';

export default function ApplicantDynamicPage() {
  const { pageName } = useParams();
  const [searchParams] = useSearchParams();

  const rawStatuses = searchParams.get('statuses');
  const hasStatusesParam = rawStatuses !== null;

  const queryStatuses = hasStatusesParam
    ? rawStatuses
        .split(',')
        .map(decodeURIComponent)
        .filter(Boolean)
    : [];

  const routeStatuses = !hasStatusesParam && pageName
    ? decodeURIComponent(pageName)
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean)
    : [];

  const statuses = queryStatuses.length > 0 ? queryStatuses : routeStatuses;

  const jobPositions =
    searchParams
      .get('jobPositions')
      ?.split(',')
      .map(decodeURIComponent)
      .filter(Boolean) ?? [];

  const decoded = decodeURIComponent(pageName ?? '');

  return (
    <ApplicantPageView
      title={decoded}
      statuses={statuses}
      jobPositions={jobPositions}
      layoutKey={`applicant_page_${pageName}`}
    />
  );
}
