import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enHero from '../locales/en/hero.json';
import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enContact from '../locales/en/contact.json';
import enFooter from '../locales/en/footer.json';
import enAbout from '../locales/en/about.json';
import enJoinUs from '../locales/en/joinUs.json';
import arHero from '../locales/ar/hero.json';
import arCommon from '../locales/ar/common.json';
import arNavigation from '../locales/ar/navigation.json';
import arContact from '../locales/ar/contact.json';
import arFooter from '../locales/ar/footer.json';
import arAbout from '../locales/ar/about.json';
import arJoinUs from '../locales/ar/joinUs.json';

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
    },
    ar: {
      hero: arHero,
      common: arCommon,
      navigation: arNavigation,
      contact: arContact,
      footer: arFooter,
      about: arAbout,
      joinUs: arJoinUs,
    },
  },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  ns: ['hero', 'common', 'navigation', 'contact', 'footer', 'about', 'joinUs'],
  defaultNS: 'hero',
  returnObjects: false,
  interpolation: { escapeValue: false },
});

export default i18n;
