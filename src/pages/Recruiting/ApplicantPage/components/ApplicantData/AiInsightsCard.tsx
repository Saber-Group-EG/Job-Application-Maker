import React, { useState, useEffect } from 'react';
import { useGenerateCandidateSummary } from '../../../../../hooks/queries';
import { getErrorMessage } from '../../../../../utils/errorHandler';
import { useLocale } from '../../../../../context/LocaleContext';
import type { Applicant } from '../../../../../types/applicants';

interface AiInsightsCardProps {
  applicantId: string;
  companyId: string;
  aiSummary?: Applicant['aiSummary'];
  matchScore?: Applicant['matchScore'];
}

const AiInsightsCard: React.FC<AiInsightsCardProps> = ({
  applicantId,
  companyId,
  aiSummary,
  matchScore,
}) => {
  const { t } = useLocale();
  const generateSummary = useGenerateCandidateSummary();
  const [result, setResult] = useState(aiSummary?.summary ? aiSummary : null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (aiSummary?.summary) {
      setResult(aiSummary);
    }
  }, [aiSummary]);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't toggle collapse when clicking the button
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

  const hasScore = typeof matchScore?.score === 'number';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-shrink-0 overflow-hidden">
      {/* Header — always visible, click anywhere to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-800">
            {t('aiInsights', 'applicants')}
          </h3>
          {hasScore && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
              {matchScore!.score}%
            </span>
          )}
          {result && !result.updated && (
            <span
              className="inline-flex h-2 w-2 rounded-full bg-amber-500"
              title={t('summaryMayBeStale', 'applicants')}
            />
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          {/* Match score section — read-only, no manual trigger for this feature */}
          {hasScore && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-gray-600 uppercase">
                  {t('aiMatchScore', 'applicants')}
                </h4>
                <span className="text-sm font-bold text-brand-600">
                  {matchScore!.score}%
                </span>
              </div>

              {matchScore!.reasoning && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {matchScore!.reasoning}
                </p>
              )}

              {matchScore!.breakdown?.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBreakdown((v) => !v);
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {showBreakdown
                      ? t('hideBreakdown', 'applicants')
                      : t('showBreakdown', 'applicants')}
                  </button>

                  {showBreakdown && (
                    <ul className="mt-2 space-y-2">
                      {matchScore!.breakdown.map((b, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium text-gray-800">
                            {b.criterion}
                          </span>
                          {b.note && (
                            <span className="text-gray-500"> — {b.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {hasScore && <div className="border-t border-gray-100" />}

          {/* Candidate summary section — on-demand, has its own generate/regenerate action */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase">
                {t('aiCandidateSummary', 'applicants')}
              </h4>
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
        </div>
      )}
    </div>
  );
};

export default AiInsightsCard;
