import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import JobContractEditor from '../../../components/modals/ContractModal/ContractModal';
import PageMeta from '../../../components/common/PageMeta';
import { paths } from '../../../router/Paths';
import type { ContractEditorState } from './editorNavigation';

export default function ContractEditorPage() {
  const state = useLocation().state as ContractEditorState | null;
  const navigate = useNavigate();

  if (!state) return <Navigate to={paths.jobs.contracts} replace />;

  return (
    <>
      <PageMeta title="Job Contract" description="Write a job contract" />
      <JobContractEditor {...state} onClose={() => navigate(-1)} />
    </>
  );
}
