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
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{isArabic ? 'EN' : 'AR'}</span>
    </button>
  );
};

export default LanguageSwitcher;
