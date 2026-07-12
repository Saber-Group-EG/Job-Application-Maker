import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useLocale } from '../../../../context/LocaleContext';

const LanguageSwitcher = ({ className = '' }) => {
  const { isArabic, switchLanguage } = useTranslation();
  const { setLocale } = useLocale();

  const handleToggle = () => {
    const newLang = isArabic ? 'en' : 'ar';
    switchLanguage(newLang);
    setLocale(newLang);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 
        bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 
        text-light-700 dark:text-light-300 hover:border-primary-500/50 hover:text-primary-500 
        backdrop-blur-sm ${className}`}
      aria-label={isArabic ? 'Switch to English' : 'Switch to Arabic'}
    >
 
      <span>{isArabic ? 'EN' : 'AR'}</span>
    </button>
  );
};

export default LanguageSwitcher;
