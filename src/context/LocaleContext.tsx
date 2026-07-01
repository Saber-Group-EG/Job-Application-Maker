import { createContext, useContext, useEffect, useState } from 'react';
// @ts-expect-error - JS module without declarations
import i18n from '../pages/Landing/i18n/index';

import enSidebar from '../../locales/en/sidebar.json';
import arSidebar from '../../locales/ar/sidebar.json';
import enCommon from '../../locales/en/common.json';
import arCommon from '../../locales/ar/common.json';
import enHome from '../../locales/en/home.json';
import arHome from '../../locales/ar/home.json';
import enInterview from '../../locales/en/interview.json';
import arInterview from '../../locales/ar/interview.json';
import enRejection from '../../locales/en/rejection.json';
import arRejection from '../../locales/ar/rejection.json';
import enApplicants from '../../locales/en/applicants.json';
import arApplicants from '../../locales/ar/applicants.json';
import enCompanies from '../../locales/en/companies.json';
import arCompanies from '../../locales/ar/companies.json';
import enSettings from '../../locales/en/settings.json';
import arSettings from '../../locales/ar/settings.json';
import enJobs from '../../locales/en/jobs.json';
import arJobs from '../../locales/ar/jobs.json';
import enJobContracts from '../../locales/en/jobContracts.json';
import arJobContracts from '../../locales/ar/jobContracts.json';
import enJobOffers from '../../locales/en/jobOffers.json';
import arJobOffers from '../../locales/ar/jobOffers.json';
import enMailPreview from '../../locales/en/mailPreview.json';
import arMailPreview from '../../locales/ar/mailPreview.json';
import enSavedFields from '../../locales/en/savedFields.json';
import arSavedFields from '../../locales/ar/savedFields.json';
import enRoles from '../../locales/en/roles.json';
import arRoles from '../../locales/ar/roles.json';
import enSystemSettings from '../../locales/en/systemSettings.json';
import arSystemSettings from '../../locales/ar/systemSettings.json';
import enUsers from '../../locales/en/users.json';
import arUsers from '../../locales/ar/users.json';
import enModals from '../../locales/en/modals.json';
import arModals from '../../locales/ar/modals.json';
import enHistory from '../../locales/en/history.json';
import arHistory from '../../locales/ar/history.json';
import enCompletedInterview from '../../locales/en/completedInterview.json';
import arCompletedInterview from '../../locales/ar/completedInterview.json';
import enActivity from '../../locales/en/activity.json';
import arActivity from '../../locales/ar/activity.json';
import enJobSpec from '../../locales/en/jobSpec.json';
import arJobSpec from '../../locales/ar/jobSpec.json';
import enBlueCaller from '../../locales/en/blueCaller.json';
import arBlueCaller from '../../locales/ar/blueCaller.json';
import enApplicantDetails from '../../locales/en/applicantDetails.json';
import arApplicantDetails from '../../locales/ar/applicantDetails.json';
import enPersonalInfo from '../../locales/en/personalInfo.json';
import arPersonalInfo from '../../locales/ar/personalInfo.json';
import enLanding from '../../locales/en/landing.json';
import arLanding from '../../locales/ar/landing.json';

type Locale = 'en' | 'ar';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  t: (key: string, namespace?: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Locale, Record<string, Record<string, string>>> = {
  en: { sidebar: enSidebar, common: enCommon, home: enHome, interview: enInterview, rejection: enRejection, applicants: enApplicants, companies: enCompanies, settings: enSettings, jobs: enJobs, jobContracts: enJobContracts, jobOffers: enJobOffers, mailPreview: enMailPreview, savedFields: enSavedFields, roles: enRoles, systemSettings: enSystemSettings, users: enUsers, modals: enModals, completedInterview: enCompletedInterview, activity: enActivity, jobSpec: enJobSpec, history: enHistory, blueCaller: enBlueCaller, applicantDetails: enApplicantDetails, personalInfo: enPersonalInfo, landing: enLanding },
  ar: { sidebar: arSidebar, common: arCommon, home: arHome, interview: arInterview, rejection: arRejection, applicants: arApplicants, companies: arCompanies, settings: arSettings, jobs: arJobs, jobContracts: arJobContracts, jobOffers: arJobOffers, mailPreview: arMailPreview, savedFields: arSavedFields, roles: arRoles, systemSettings: arSystemSettings, users: arUsers, modals: arModals, completedInterview: arCompletedInterview, activity: arActivity, jobSpec: arJobSpec, history: arHistory, blueCaller: arBlueCaller, applicantDetails: arApplicantDetails, personalInfo: arPersonalInfo, landing: arLanding },
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

const getInitialLocale = (): Locale => {
  const stored = localStorage.getItem('locale') || localStorage.getItem('landing-lang');
  if (stored === 'ar' || stored === 'en') return stored;
  return 'en';
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string, namespace = 'sidebar', params?: Record<string, string | number>): string => {
    let value = translations[locale]?.[namespace]?.[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    return value;
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  useEffect(() => {
    const handler = (lang: string) => {
      if (lang === 'ar' || lang === 'en') {
        setLocaleState(lang);
        localStorage.setItem('locale', lang);
      }
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, t }}>
      {children}
    </LocaleContext.Provider>
  );
};
