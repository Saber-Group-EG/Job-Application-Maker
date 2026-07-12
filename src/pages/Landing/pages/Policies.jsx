import React from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from '../i18n/hooks/useTranslation';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'privacy' },
  { key: 'refund' },
  { key: 'service' },
];

// ─── Shared components ────────────────────────────────────────────────────────

const SectionCard = ({ index, title, content, badge }) => (
  <div className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 md:p-8">
    <div className="flex items-start gap-4">
      <span className="shrink-0 w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-bold">
        {index}
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-light-900 dark:text-white">
            {title}
          </h2>
          {badge && (
            <span className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-semibold">
              {badge}
            </span>
          )}
        </div>
        <p className="text-light-600 dark:text-light-400 leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  </div>
);

const ContactFooter = ({ showPhone, contactKey }) => (
  <div className="text-center bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-8">
    <p className="text-light-600 dark:text-light-400 mb-3">
      {contactKey}
    </p>
    <a
      href="mailto:info@sabergroup-eg.com"
      className="text-primary-500 font-semibold hover:underline"
    >
      info@sabergroup-eg.com
    </a>
    {showPhone && (
      <>
        <span className="mx-4 text-light-300 dark:text-light-600">|</span>
        <a
          href="tel:+201080099757"
          dir="ltr"
          className="text-primary-500 font-semibold hover:underline"
        >
          01080099757
        </a>
      </>
    )}
  </div>
);

// ─── Tab panels ───────────────────────────────────────────────────────────────

const PrivacyPanel = ({ t }) => {
  const privacySections = t('policies:privacy.sections', { returnObjects: true });
  return (
    <div className="space-y-6">
      <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6 text-light-700 dark:text-light-300 leading-relaxed">
        {t('policies:privacy.intro')}
      </div>
      {privacySections.map((sec, i) => (
        <SectionCard
          key={i}
          index={i + 1}
          title={sec.title}
          content={sec.content}
        />
      ))}
      <ContactFooter contactKey={t('policies:privacy.contact')} />
    </div>
  );
};

const RefundPanel = ({ t }) => {
  const refundSections = t('policies:refund.sections', { returnObjects: true });
  return (
    <div className="space-y-6">
      {refundSections.map((sec, i) => (
        <SectionCard
          key={i}
          index={i + 1}
          title={sec.title}
          content={sec.content}
        />
      ))}
      <ContactFooter showPhone contactKey={t('policies:refund.contact')} />
    </div>
  );
};

const ServicePanel = ({ t }) => {
  const serviceSections = t('policies:service.sections', { returnObjects: true });
  const sla = t('policies:service.sla', { returnObjects: true });
  return (
    <div className="space-y-6">
      {serviceSections.map((sec, i) => (
        <SectionCard
          key={i}
          index={i + 1}
          title={sec.title}
          content={sec.content}
          badge={sec.badge}
        />
      ))}

      <div className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 md:p-8">
        <div className="flex items-start gap-4 mb-6">
          <span className="shrink-0 w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-bold">
            {serviceSections.length + 1}
          </span>
          <h2 className="text-lg font-bold text-light-900 dark:text-white mt-1">
            {t('policies:service.slaTitle')}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 ps-12">
          {sla.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-light-50 dark:bg-dark-700/50 rounded-xl px-4 py-3"
            >
              <span className="text-light-500 dark:text-light-400 text-sm">
                {item.label}
              </span>
              <span className="font-semibold text-light-900 dark:text-white text-sm">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6 text-light-600 dark:text-light-400 leading-relaxed text-sm">
        {t('policies:service.note')}
      </div>

      <ContactFooter contactKey={t('policies:service.contact')} />
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const PoliciesPage = () => {
  const { t, isArabic } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validKeys = TABS.map((tab) => tab.key);
  const activeTab = validKeys.includes(tabParam) ? tabParam : 'privacy';

  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 mt-12">
          <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white mb-3">
            {t('policies:title')}
          </h1>
          <p className="text-light-500 dark:text-light-400 mb-2">
            {t('policies:subtitle')}
          </p>
          <p className="text-light-400 dark:text-light-500 text-xs">
            {t('policies:lastUpdated')}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-1.5 gap-1 flex-wrap justify-center">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-linear-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'text-light-500 dark:text-light-400 hover:text-light-900 dark:hover:text-white'
                }`}
              >
                {t(`policies:tabs.${tab.key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        {activeTab === 'privacy' && <PrivacyPanel t={t} />}
        {activeTab === 'refund' && <RefundPanel t={t} />}
        {activeTab === 'service' && <ServicePanel t={t} />}
      </div>
    </section>
  );
};

export default PoliciesPage;
