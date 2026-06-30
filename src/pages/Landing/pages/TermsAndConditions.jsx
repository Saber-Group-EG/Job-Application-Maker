import React from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import termsContent from '../content/TermsContent.js';

const TermsAndConditions = () => {
  const { isArabic } = useTranslation();
  const { intro, sections } = termsContent[isArabic ? 'ar' : 'en'];

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 mt-12">
          <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white mb-3">
            {isArabic ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </h1>
          <p className="text-light-400 dark:text-light-500 text-xs">
            {isArabic ? 'آخر تحديث: يونيو 2025' : 'Last updated: June 2025'}
          </p>
        </div>

        {/* Intro */}
        <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6 mb-8 text-light-700 dark:text-light-300 leading-relaxed">
          {intro}
        </div>

        {/* Sections — all open */}
        <div className="space-y-6 mb-10">
          {sections.map((sec, i) => (
            <div
              key={i}
              className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 md:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-light-900 dark:text-white mb-3">
                    {sec.title}
                  </h2>
                  <p className="text-light-600 dark:text-light-400 leading-relaxed">
                    {sec.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="text-center bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-8">
          <p className="text-light-600 dark:text-light-400 mb-3">
            {isArabic
              ? 'للاستفسار عن هذه الشروط:'
              : 'For questions about these terms:'}
          </p>
          <a
            href="mailto:info@sabergroup-eg.com"
            className="text-primary-500 font-semibold hover:underline"
          >
            info@sabergroup-eg.com
          </a>
        </div>
      </div>
    </section>
  );
};

export default TermsAndConditions;
