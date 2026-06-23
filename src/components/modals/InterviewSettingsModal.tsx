import Swal from '../../utils/swal';
import { Modal } from '../ui/modal';
import Label from '../form/Label';
import Select from '../form/Select';
import TextArea from '../form/input/TextArea';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  applicant: any;
  selectedInterview: any;
  setSelectedInterview: (v: any) => void;
  setShowInterviewSettingsModal: (v: boolean) => void;
  updateInterviewMutation: any;
};

export default function InterviewSettingsModal({
  isOpen,
  onClose,
  applicant,
  selectedInterview,
  setSelectedInterview,
  setShowInterviewSettingsModal,
  updateInterviewMutation,
}: Props) {
  const { t } = useLocale();
  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setSelectedInterview(null); }} className="max-w-md p-6" closeOnBackdrop={false}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('interviewSettings', 'modals')}</h2>

        {applicant?.interviews && applicant.interviews.length > 0 && (
          <div>
            <Label>{t('selectInterviewManage', 'modals')}</Label>
            <Select
              placeholder={t('chooseInterview', 'modals')}
              value={selectedInterview?._id}
              options={applicant.interviews.map((iv: any) => ({
                value: iv._id,
                label: `${iv.type ? iv.type.charAt(0).toUpperCase() + iv.type.slice(1) : 'Interview'} - ${iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString() : 'No date'}${iv.status ? ` - ${iv.status}` : ''}`,
              }))}
              onChange={(val) => {
                const found = applicant.interviews?.find((it: any) => it._id === val) || null;
                setSelectedInterview(found);
              }}
            />
          </div>
        )}

        {selectedInterview && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('currentInterview', 'modals')}</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">{t('date', 'modals')}</span>{' '}{selectedInterview.scheduledAt ? new Date(selectedInterview.scheduledAt).toLocaleString() : t('notScheduled', 'modals')}</p>
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">{t('type', 'modals')}</span>{' '}{selectedInterview.type || t('notScheduled', 'modals')}</p>
                <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">{t('status', 'modals')}</span>{' '}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${selectedInterview.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : selectedInterview.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {selectedInterview.status || 'scheduled'}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('updateStatus', 'modals')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {(!selectedInterview.status || selectedInterview.status !== 'scheduled') && (
                      <button
                    onClick={() => {
                      setSelectedInterview({ ...selectedInterview, status: 'scheduled' });
                      setShowInterviewSettingsModal(false);
                      setSelectedInterview(null);
                      updateInterviewMutation.mutate({
                        applicantId: applicant._id,
                        interviewId: selectedInterview._id,
                        data: { status: 'scheduled' },
                      });
                      Swal.fire({ title: t('success', 'modals'), text: t('successStatusUpdated', 'modals'), icon: 'success', position: 'center', timer: 2000, showConfirmButton: false, customClass: { container: '!mt-16' } });
                    }}
                    className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📅 {t('scheduled', 'modals')}
                  </button>
                )}

                {(!selectedInterview.status || selectedInterview.status !== 'completed') && (
                      <button
                    onClick={() => {
                      setSelectedInterview({ ...selectedInterview, status: 'completed' });
                      setShowInterviewSettingsModal(false);
                      setSelectedInterview(null);
                      updateInterviewMutation.mutate({
                        applicantId: applicant._id,
                        interviewId: selectedInterview._id,
                        data: { status: 'completed' },
                      });
                      Swal.fire({ title: t('success', 'modals'), text: t('successMarkedCompleted', 'modals'), icon: 'success', position: 'center', timer: 2000, showConfirmButton: false, customClass: { container: '!mt-16' } });
                    }}
                    className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ {t('completed', 'modals')}
                  </button>
                )}

                {(!selectedInterview.status || selectedInterview.status !== 'cancelled') && (
                      <button
                    onClick={() => {
                      setSelectedInterview({ ...selectedInterview, status: 'cancelled' });
                      setShowInterviewSettingsModal(false);
                      setSelectedInterview(null);
                      updateInterviewMutation.mutate({
                        applicantId: applicant._id,
                        interviewId: selectedInterview._id,
                        data: { status: 'cancelled' },
                      });
                      Swal.fire({ title: t('success', 'modals'), text: t('successCancelled', 'modals'), icon: 'success', position: 'center', timer: 2000, showConfirmButton: false, customClass: { container: '!mt-16' } });
                    }}
                    className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕ {t('cancelled', 'modals')}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('addCommentOptional', 'modals')}</Label>
              <TextArea placeholder={t('commentStatusPlaceholder', 'modals')} rows={3} className="w-full" />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowInterviewSettingsModal(false);
              setSelectedInterview(null);
            }}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {t('close', 'modals')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
