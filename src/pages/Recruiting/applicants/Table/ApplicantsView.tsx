// The applicants list at one address: the desktop table on wide screens,
// the card layout on phones. Each view is loaded only when it's shown.
import { lazy, Suspense } from 'react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import Spinner from '../../../../components/common/Spinner';

const ApplicantsTable = lazy(() => import('./ApplicantsTable'));
const ApplicantsMobilePage = lazy(() => import('./ApplicantsMobilePage'));

// Below Tailwind's md breakpoint the table's columns don't fit.
const MOBILE_QUERY = '(max-width: 767px)';

type Props = {
  layoutKey?: string;
  onlyStatus?: string | string[];
  onlyJobPositions?: string[];
  companyIdOverride?: string | string[];
};

export default function ApplicantsView(props: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return (
    <Suspense fallback={<Spinner />}>
      {isMobile ? (
        <ApplicantsMobilePage
          onlyStatus={props.onlyStatus}
          onlyJobPositions={props.onlyJobPositions}
          companyIdOverride={props.companyIdOverride}
        />
      ) : (
        <ApplicantsTable {...props} />
      )}
    </Suspense>
  );
}
