import { useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import InterviewQuestions from './components/InterviewData/InterviewQuestions';
import PersonalInfo from './components/ApplicantData/PersonalInfo';
import { StickyTopBar, Stickysidebar } from './components/common/StickyLayout';
import { paths } from '../../../router/Paths';
import { useLocale } from '../../../context/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import { useApplicant } from '../../../hooks/queries/useApplicants';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const InterviewSession = () => {
  const { id, interviewId } = useParams<{ id: string; interviewId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user } = useAuth();
  const { data: applicant, isLoading } = useApplicant(id || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyTopBar>
        <div className="flex items-center justify-between py-3 px-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span
              onClick={() => navigate(paths.applicants.details(id || ''))}
              className="hover:text-gray-700 cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('back', 'interview')}
            </span>
            <span>-›</span>
            <span className="text-gray-800">{t('interviewAssessment', 'interview')}</span>
          </div>
        </div>
      </StickyTopBar>

      {isLoading ? (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="max-w-8xl mx-auto p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <Stickysidebar>
              {applicant && (
                <PersonalInfo
                  applicant={applicant}
                  isEditing={false}
                  onChangeStatus={() => undefined}
                  onScheduleInterview={() => undefined}
                  onSendMessage={() => undefined}
                  onPrint={() => undefined}
                  onRestore={() => undefined}
                  onCreateJobOffer={() => undefined}
                  onCreateContract={() => undefined}
                />
              )}
            </Stickysidebar>

            <div className="flex-1 min-w-0">
              <InterviewQuestions
                applicantId={id}
                autoSelectInterviewId={interviewId || null}
                applicantData={applicant}
                authUser={user}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
