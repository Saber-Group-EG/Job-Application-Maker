import { useParams, useSearchParams } from 'react-router';
import ApplicantPageView from './ApplicantPageView';

export default function ApplicantDynamicPage() {
  const { pageName } = useParams();
  const [searchParams] = useSearchParams();

  const queryStatuses =
    searchParams
      .get('statuses')
      ?.split(',')
      .map(decodeURIComponent)
      .filter(Boolean) ?? [];

  const routeStatuses = pageName
    ? decodeURIComponent(pageName)
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean)
    : [];

  const statuses = queryStatuses.length > 0 ? queryStatuses : routeStatuses;

  const decoded = decodeURIComponent(pageName ?? '');

  return (
    <ApplicantPageView
      title={decoded}
      statuses={statuses}
      layoutKey={`applicant_page_${pageName}`}
    />
  );
}
