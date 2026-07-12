import React from "react";
import { Helmet } from 'react-helmet-async';
import Footer from '../components/footer';
import mainLogo from '/auth-logo.png';
import { getFullUrl, getDefaultOgImage, SITE_NAME } from '../utils/ogMeta';

const ComingSoon = () => {
  const pageUrl = getFullUrl('/coming-soon');
  const ogImage = getDefaultOgImage();

  return (
    <>
      <Helmet>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap"
        />
        <title>Coming Soon - {SITE_NAME}</title>
        <meta name="description" content={`We're working on something great at ${SITE_NAME}. Stay tuned.`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={`Coming Soon - ${SITE_NAME}`} />
        <meta property="og:description" content={`We're working on something great at ${SITE_NAME}. Stay tuned.`} />
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Helmet>

      <section style={{ fontFamily: "'Cairo', sans-serif" }} className="py-20 md:py-32 relative overflow-hidden min-h-screen bg-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-xl mx-auto text-center">
            <img src={mainLogo} alt={`${SITE_NAME} Logo`} className="mx-auto h-28 w-auto object-contain mb-6" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-light-900 dark:text-white mb-4">Coming Soon</h1>
            <p className="text-lg text-light-600 dark:text-light-300">We're working on something great. Stay tuned — we'll be live soon.</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default ComingSoon;
