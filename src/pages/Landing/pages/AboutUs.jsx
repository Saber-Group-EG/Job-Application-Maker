import React from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { valueIcons } from '../components/icons/ValueIcons';

const AboutUs = () => {
  const { t, isArabic } = useTranslation();

  const stats = t('about:stats', { returnObjects: true });
  const valuesList = t('about:values.list', { returnObjects: true });

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* ── Hero ── */}
        <div className="text-center mb-16 mt-12">
          <h1 className="text-5xl md:text-6xl font-bold text-light-900 dark:text-white mb-6 tracking-tight">
            {t('about:headline')}
          </h1>
          <p className="text-lg text-light-600 dark:text-light-400 max-w-2xl mx-auto leading-relaxed">
            {t('about:subheadline')}
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 text-center"
            >
              <p className="text-3xl font-bold text-primary-500 mb-1 tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm text-light-500 dark:text-light-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Story + Vision ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            { title: t('about:story.title'), body: t('about:story.body') },
            { title: t('about:vision.title'), body: t('about:vision.body') },
          ].map((block, i) => (
            <div
              key={i}
              className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-8"
            >
              <h2 className="text-xl font-bold text-light-900 dark:text-white mb-4">
                {block.title}
              </h2>
              <p className="text-light-600 dark:text-light-400 leading-relaxed">
                {block.body}
              </p>
            </div>
          ))}
        </div>

        {/* ── Values ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-8 text-center">
            {t('about:values.title')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {valuesList.map((val, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 hover:border-primary-500/40 transition-colors"
              >
                <div className={`flex items-center gap-3 mb-3 ${isArabic ? 'justify-end' : 'justify-start'}`}>
                  <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4">
                    {valueIcons[i]}
                  </div>
                  <h3 className="font-bold text-light-900 dark:text-white">
                    {val.title}
                  </h3>
                </div>
                <p className="text-sm text-light-500 dark:text-light-400 leading-relaxed">
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-3">
            {t('about:cta.title')}
          </h2>
          <p className="text-light-600 dark:text-light-400 mb-8">
            {t('about:cta.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:info@sabergroup-eg.com"
              className="px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              info@sabergroup-eg.com
            </a>
            <a
              href="tel:+201080099757"
              dir="ltr"
              className="px-6 py-3 border border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-500 hover:text-white transition-colors"
            >
              01080099757
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
