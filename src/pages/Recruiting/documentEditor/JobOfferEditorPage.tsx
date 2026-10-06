import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import JobOfferEditor from '../../../components/modals/JobOffersModal/JobOffersModal';
import PageMeta from '../../../components/common/PageMeta';
import { paths } from '../../../router/Paths';
import type { OfferEditorState } from './editorNavigation';

export default function JobOfferEditorPage() {
  const state = useLocation().state as OfferEditorState | null;
  const navigate = useNavigate();

  // Opened without anything to edit (typed URL, cleared history): go back to the list.
  if (!state) return <Navigate to={paths.jobs.offers} replace />;

  return (
    <>
      <PageMeta title="Job Offer" description="Write a job offer" />
      <JobOfferEditor {...state} onClose={() => navigate(-1)} />
    </>
  );
}
