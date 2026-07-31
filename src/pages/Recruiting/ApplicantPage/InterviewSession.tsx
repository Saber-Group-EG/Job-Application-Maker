import { useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import InterviewQuestions from './components/InterviewData/InterviewQuestions';
import { paths } from '../../../router/Paths';
import { useLocale } from '../../../context/LocaleContext';
import { useAuth } from '../../../context/AuthContext';

const InterviewSession = () => {
  const { id, interviewId } = useParams<{ id: string; interviewId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(paths.applicants.details(id || ''))}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back', 'interview')}
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{t('interviewAssessment', 'interview')}</h1>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <InterviewQuestions
          applicantId={id}
          autoSelectInterviewId={interviewId || null}
          authUser={user}
        />
      </div>
    </div>
  );
};

export default InterviewSession;
