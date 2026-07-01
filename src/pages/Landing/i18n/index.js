import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enHero from '../locales/en/hero.json';
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enContact from '../locales/en/contact.json';
import enFooter from '../locales/en/footer.json';
import enAbout from '../locales/en/about.json';
import enJoinUs from '../locales/en/joinUs.json';
import enHome from '../locales/en/home.json';
import enServices from '../locales/en/services.json';
import enTerms from '../locales/en/terms.json';
import enPolicies from '../locales/en/policies.json';
import arHero from '../locales/ar/hero.json';
import arCommon from '../locales/ar/common.json';
import arNavigation from '../locales/ar/navigation.json';
import arContact from '../locales/ar/contact.json';
import arFooter from '../locales/ar/footer.json';
import arAbout from '../locales/ar/about.json';
import arJoinUs from '../locales/ar/joinUs.json';
import arHome from '../locales/ar/home.json';
import arServices from '../locales/ar/services.json';
import arTerms from '../locales/ar/terms.json';
import arPolicies from '../locales/ar/policies.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('landing-lang') : null;

i18n.use(initReactI18next).init({
  resources: {
    en: {
      hero: enHero,
      common: enCommon,
      navigation: enNavigation,
      contact: enContact,
      footer: enFooter,
      about: enAbout,
      joinUs: enJoinUs,
      home: enHome,
      services: enServices,
      terms: enTerms,
      policies: enPolicies,
    },
    ar: {
      hero: arHero,
      common: arCommon,
      navigation: arNavigation,
      contact: arContact,
      footer: arFooter,
      about: arAbout,
      joinUs: arJoinUs,
      home: arHome,
      services: arServices,
      terms: arTerms,
      policies: arPolicies,
    },
  },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  ns: ['hero', 'common', 'navigation', 'contact', 'footer', 'about', 'joinUs', 'home', 'services', 'terms', 'policies'],
  defaultNS: 'hero',
  returnObjects: false,
  interpolation: { escapeValue: false },
});

export default i18n;
