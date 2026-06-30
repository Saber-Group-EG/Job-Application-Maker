import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  const isArabic = i18n.language?.startsWith('ar');

  const switchLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('landing-lang', lang);
    localStorage.setItem('locale', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  return { t, i18n, isArabic, switchLanguage };
}
