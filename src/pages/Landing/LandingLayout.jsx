import React, { useEffect } from 'react';
import { Outlet } from 'react-router';
import Navbar from './components/Navbar';
import Footer from './components/footer';
import './i18n/index';

const LandingLayout = () => {
  useEffect(() => {
    const savedLang = localStorage.getItem('landing-lang') || 'en';
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
};

export default LandingLayout;
