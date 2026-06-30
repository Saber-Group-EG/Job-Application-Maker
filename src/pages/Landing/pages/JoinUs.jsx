import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { getJobPositions } from '../store/slices/jobPositionsSlice';
import { getFullUrl, getDefaultOgImage, SITE_NAME } from '../utils/ogMeta';

const JoinUs = () => {
  const { t, isArabic } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { positions, loading } = useSelector((state) => state.jobPositions);

  useEffect(() => {
    dispatch(getJobPositions());
  }, [dispatch]);

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <Helmet>
        <title>{t('joinUs:title') || `Join Us - ${SITE_NAME}`}</title>
        <meta name="description" content={t('joinUs:subtitle') || `Explore career opportunities at ${SITE_NAME}.`} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:url" content={getFullUrl('/join-us')} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={getDefaultOgImage()} />
        <meta property="og:title" content={t('joinUs:title') || `Join Us - ${SITE_NAME}`} />
        <meta property="og:description" content={t('joinUs:subtitle') || `Explore career opportunities at ${SITE_NAME} and join our growing team.`} />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 mt-12">
          <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
            {t('joinUs:tagline') || 'Career Opportunities'}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white mt-3 mb-5 leading-tight">
            {t('joinUs:title') || 'Join Our Team'}
          </h1>
          <p className="text-light-600 dark:text-light-400 max-w-2xl mx-auto leading-relaxed">
            {t('joinUs:subtitle') || 'Explore career opportunities and be part of our growing team.'}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-light-500 mt-4">{t('joinUs:loading') || 'Loading job positions...'}</p>
          </div>
        )}

        {/* Positions Grid */}
        {!loading && positions.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-3">
              {t('joinUs:noPositions') || 'No Open Positions'}
            </h2>
            <p className="text-light-500 max-w-md mx-auto">
              {t('joinUs:noPositionsDesc') || 'There are no open positions at the moment. Please check back later.'}
            </p>
          </div>
        )}

        {!loading && positions.length > 0 && (
          <div className="grid gap-5">
            {positions.map((job) => (
              <div
                key={job._id || job.id}
                className="group bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 md:p-8 hover:border-primary-500/50 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-light-900 dark:text-white mb-2">
                      {job.title || job.name}
                    </h3>
                    <p className="text-light-500 dark:text-light-400 text-sm leading-relaxed line-clamp-2">
                      {job.description || job.summary}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-4">
                      {job.openings && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.openings} {t('joinUs:openings') || 'openings'}
                        </span>
                      )}
                      {job.deadline && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-500/10 text-warning-600 dark:text-warning-400 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {t('joinUs:deadline') || 'Apply before'}: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => navigate(`/join-us/${job.slug || job._id || job.id}/apply`)}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
                    >
                      {t('joinUs:applyNow') || 'Apply Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default JoinUs;
