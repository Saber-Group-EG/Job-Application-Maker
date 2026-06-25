import React, { useState } from 'react';
import { CalenderIcon, ChatIcon, PrintIcon, DocsIcon, FileIcon } from '../../../../../icons';
import type { Applicant, ApplicantView, PersonalInfoProps } from '../../../../../types/applicants';
import { toPlainString } from '../../../../../utils/strings';
import { useLocale } from '../../../../../context/LocaleContext';

const buildResumeUrl = (raw?: string): string | null => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed}`;
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getInitials = (name: string): string => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const PersonalInfo: React.FC<PersonalInfoProps> = ({
  applicant,
  isEditing = false,
  editedApplicant,
  onChange,
  onChangeStatus,
  onScheduleInterview,
  onSendMessage,
  onPrint,
  onCreateJobOffer,
  onCreateContract,
  onRestore,
}) => {
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const { t } = useLocale();

  const data: ApplicantView = {
    ...(applicant as ApplicantView),
    ...(editedApplicant || {}),
  };

  const fullName = String(
    data.fullName ||
      `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
      t('applicant', 'personalInfo')
  );
  const resumeUrl = buildResumeUrl(data.cvFilePath || data.resume);
  const submittedAt = data.submittedAt || data.createdAt;

  const handleField =
    (field: keyof Applicant) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (!onChange) return;
      onChange({ ...(editedApplicant || {}), [field]: event.target.value });
    };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-19">
      <div className="p-5">
        <div className="flex flex-col items-center text-center mb-5 mt-8">
          {data.profilePhoto ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoPreviewOpen(true)}
                className="focus:outline-none"
              >
                <img
                  src={data.profilePhoto}
                  alt={fullName}
                  className="w-32 h-32 rounded-full object-cover mb-3 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                />
              </button>
              {photoPreviewOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                  onClick={() => setPhotoPreviewOpen(false)}
                >
                  <div className="relative max-w-[90vw] max-h-[90vh]">
                    <img
                      src={data.profilePhoto}
                      alt={fullName}
                      className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreviewOpen(false)}
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-gray-900 text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-md">
              <span className="text-white text-2xl font-bold">{getInitials(fullName)}</span>
            </div>
          )}

          {isEditing ? (
            <input
              type="text"
              value={data.fullName || ''}
              onChange={handleField('fullName')}
              placeholder={t('fullName', 'personalInfo')}
              className="w-full text-center text-lg font-bold text-gray-800 border-b border-gray-200 focus:border-blue-400 focus:outline-none mb-1"
            />
          ) : (
            <h2 className="text-lg font-bold text-gray-800 mb-0.5">{fullName}</h2>
          )}

          <p className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors mt-2">
            {(typeof data.jobPositionId === 'object'
              ? toPlainString(data.jobPositionId?.title)
              : null) || t('positionAppliedFor', 'personalInfo')}
          </p>

          <div className="flex items-center justify-center gap-3 mt-3 mb-3">
            <button
              type="button"
              title={t('scheduleInterview', 'personalInfo')}
              onClick={onScheduleInterview}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <CalenderIcon className="w-4 h-4" />
            </button>
           
            <button
              type="button"
              title={t('sendMessage', 'personalInfo')}
              onClick={onSendMessage}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            >
              <ChatIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              title={t('print', 'personalInfo')}
              onClick={onPrint}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            >
              <PrintIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              title={t('createJobOffer', 'personalInfo')}
              onClick={onCreateJobOffer}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
            >
              <DocsIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              title={t('createContract', 'personalInfo')}
              onClick={onCreateContract}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors"
            >
              <FileIcon className="w-4 h-4" />
            </button>
          </div>
         </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-800">{t('details', 'personalInfo')}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onChangeStatus}
              className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              {data.status || t('status', 'applicants')}
            </button>
            {data.status === 'trashed' && onRestore && (
              <button
                type="button"
                onClick={onRestore}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                {t('restore', 'common')}
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 mb-5 mt-5" />

        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('phone', 'applicants')}</div>
            {isEditing ? (
              <input
                type="tel"
                value={data.phone || ''}
                onChange={handleField('phone')}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none"
              />
            ) : (
              <a
                href={data.phone ? `tel:${data.phone}` : '#'}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors break-all"
              >
                {data.phone || '-'}
              </a>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('email', 'applicants')}</div>
            {isEditing ? (
              <input
                type="email"
                value={data.email || ''}
                onChange={handleField('email')}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none"
              />
            ) : (
              <a
                href={data.email ? `mailto:${data.email}` : '#'}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors break-all"
              >
                {data.email || '-'}
              </a>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('dateOfBirth', 'personalInfo')}</div>
            {isEditing ? (
              <input
                type="date"
                value={data.birthDate ? data.birthDate.split('T')[0] : ''}
                onChange={handleField('birthDate')}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none"
              />
            ) : (
              <div className="text-sm text-gray-600">{formatDate(data.birthDate)}</div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('gender', 'applicants')}</div>
            {isEditing ? (
              <select
                value={data.gender || ''}
                onChange={handleField('gender')}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none"
              >
                <option value="">{t('selectGender', 'personalInfo')}</option>
                <option value="Male">{t('male', 'personalInfo')}</option>
                <option value="Female">{t('female', 'personalInfo')}</option>
              </select>
            ) : (
              <div className="text-sm text-gray-600">{data.gender || '-'}</div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('address', 'personalInfo')}</div>
            {isEditing ? (
              <textarea
                value={data.address || ''}
                onChange={handleField('address')}
                rows={2}
                className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none resize-none"
              />
            ) : (
              <div className="text-sm text-gray-600 leading-relaxed">{data.address || '-'}</div>
            )}
          </div>

          <div className="text-sm font-semibold text-gray-800 -mb-0.5">{t('expectedSalary', 'applicants')}</div>
          {isEditing ? (
            <input
              type="text"
              value={data.expectedSalary || ''}
              onChange={handleField('expectedSalary')}
              className="w-full text-sm border-b border-gray-200 focus:border-blue-400 focus:outline-none"
            />
          ) : (
            <div className="text-sm text-gray-600">{data.expectedSalary || '-'}</div>
          )}

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-1">{t('resumeCv', 'personalInfo')}</div>
            {resumeUrl ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(resumeUrl);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    window.open(resumeUrl, '_blank', 'noopener');
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>{t('downloadCv', 'applicants')}</span>
              </button>
            ) : (
              <span className="text-sm text-gray-400">{t('noResumeAttached', 'personalInfo')}</span>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 -mb-1">{t('submittedAt', 'personalInfo')}</div>
            <div className="text-sm text-gray-600">{formatDate(submittedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
