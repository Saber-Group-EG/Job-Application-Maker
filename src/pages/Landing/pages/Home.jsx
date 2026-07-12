import { Link } from 'react-router';
import { useTranslation } from '../i18n/hooks/useTranslation';

const Home = () => {
  const { t, isArabic } = useTranslation();
  const items = t('home:software.items', { returnObjects: true });
  const features = t('home:software.features', { returnObjects: true });
  const statsItems = t('home:stats.items', { returnObjects: true });

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900"
    >
      {/* Hero — plain headline, no centerpiece, doesn't favor either half */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-28 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white leading-tight mb-6">
          {t('home:hero.title')}
        </h1>
        <p className="text-lg text-light-600 dark:text-light-400 leading-relaxed max-w-xl mx-auto">
          {t('home:hero.subtitle')}
        </p>
      </div>

      {/* Software section */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 border-t border-light-200/60 dark:border-dark-700/60">
        <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
          {t('home:software.eyebrow')}
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-light-900 dark:text-white mt-3 mb-2 max-w-2xl">
          {t('home:software.title')}
        </h2>
        <p className="text-light-600 dark:text-light-400 max-w-2xl mb-8">
          {t('home:software.subtitle')}
        </p>

        <div className="max-w-lg mb-8">
          {items.map((p) => (
            <Link
              key={p.name}
              to="/services"
              className="group block bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-7 hover:border-primary-500/50 transition-colors"
            >
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-xl font-bold text-light-900 dark:text-white">
                  {p.name}
                </h3>
                <span className="text-sm text-light-500 dark:text-light-400">
                  {p.tagline}
                </span>
              </div>
              <p className="text-light-600 dark:text-light-400 leading-relaxed text-sm">
                {p.line}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 mt-4 group-hover:gap-2.5 transition-all">
                {t('home:software.cta')}
                <svg
                  className="w-3.5 h-3.5 rtl:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Features grid */}
        {features && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-xl p-5 hover:border-primary-500/30 transition-colors"
              >
                <h4 className="text-sm font-bold text-light-900 dark:text-white mb-1.5">
                  {f.title}
                </h4>
                <p className="text-xs text-light-500 dark:text-light-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        )}

      {/* Stats strip */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 border-t border-light-200/60 dark:border-dark-700/60">
        <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
          {t('home:stats.eyebrow')}
        </span>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {statsItems.map((s, i) => (
            <div key={i} className="text-center md:text-start">
              <p className="text-3xl md:text-4xl font-bold text-light-900 dark:text-white tracking-tight">
                {s.value}
              </p>
              <p className="text-sm text-light-500 dark:text-light-400 mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 border-t border-light-200/60 dark:border-dark-700/60 text-center">
        <div className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-3">
            {t('home:closing.title')}
          </h2>
          <p className="text-light-600 dark:text-light-400 mb-7">
            {t('home:closing.subtitle')}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors"
          >
            {t('home:closing.cta')}
          </Link>
        </div>
      </div>
      </div>
    </section>
  );
};

export default Home;
