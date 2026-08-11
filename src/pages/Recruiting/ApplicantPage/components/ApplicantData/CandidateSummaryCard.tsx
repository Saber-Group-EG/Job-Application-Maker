import React, { useState, useEffect } from 'react';
import { useGenerateCandidateSummary } from '../../../../../hooks/queries';
import { getErrorMessage } from '../../../../../utils/errorHandler';
import { useLocale } from '../../../../../context/LocaleContext';
import type { Applicant } from '../../../../../types/applicants';

interface CandidateSummaryCardProps {
  applicantId: string;
  companyId: string;
  aiSummary?: Applicant['aiSummary'];
}

const CandidateSummaryCard: React.FC<CandidateSummaryCardProps> = ({
  applicantId,
  companyId,
  aiSummary,
}) => {
  const { t } = useLocale();
  const generateSummary = useGenerateCandidateSummary();
  const [result, setResult] = useState(aiSummary?.summary ? aiSummary : null);
  const [error, setError] = useState('');

    useEffect(() => {
    console.log('aiSummary changed:', aiSummary);
    if (aiSummary?.summary) {
      setResult(aiSummary);
    }
  }, [aiSummary]);

  const handleGenerate = async () => {
    setError('');
    try {
      const data = await generateSummary.mutateAsync({
        applicantId,
        companyId,
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">
          {t('aiCandidateSummary', 'applicants')}
        </h3>
        <button
          onClick={handleGenerate}
          disabled={generateSummary.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generateSummary.isPending
            ? t('generating', 'applicants')
            : result
              ? t('regenerate', 'applicants')
              : t('generateSummary', 'applicants')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {generateSummary.isPending && (
        <p className="text-sm text-gray-400">
          {t('generatingSummaryText', 'applicants')}
        </p>
      )}

      {!generateSummary.isPending && !result && !error && (
        <p className="text-sm text-gray-400">
          {t('noSummaryYet', 'applicants')}
        </p>
      )}

      {result && !result.updated && (
        <p className="text-xs text-amber-600 mb-2">
          {t('summaryMayBeStale', 'applicants')}
        </p>
      )}

      {result && !generateSummary.isPending && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {result.summary}
          </p>

          {result.strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 uppercase mb-1">
                {t('strengths', 'applicants')}
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.weaknesses.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-700 uppercase mb-1">
                {t('weaknesses', 'applicants')}
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateSummaryCard;
