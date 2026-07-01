import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from '../i18n/hooks/useTranslation';

const Footer = () => {
  const { t, isArabic } = useTranslation();
  const currentYear = new Date().getFullYear();

  const displayedYear = String(currentYear);
  const rawPhone = t('contact:phoneNumber') || '01080099757';
  const displayedPhone = isArabic
    ? String(rawPhone).replace(/ /g, '\u00A0')
    : rawPhone;
  const rawEmail = t('contact:emailAddress') || 'info@sabergroup-eg.com';

  const renderWithLtrNumbers = (rawText) => {
    if (!rawText) return rawText;
    if (!isArabic) return rawText;
    const parts = String(rawText).split(/(\d+)/g);
    return parts.map((part, idx) => {
      if (/^\d+$/.test(part)) {
        return (
          <span
            key={idx}
            dir="ltr"
            className="inline-block font-sans text-lg font-semibold"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const policyLinks = [
    { label: t('footer:policyPrivacy'), href: '/policies?tab=privacy' },
    { label: t('footer:policyRefund'), href: '/policies?tab=refund' },
    { label: t('footer:policyService'), href: '/policies?tab=service' },
    { label: t('footer:policyTerms'), href: '/terms' },
    { label: t('footer:policyAddress'), href: '/address' },
    { label: t('footer:policyContact'), href: '/contact' },
  ];

  return (
    <footer className="bg-dark-900 text-white">
      <div className="container mx-auto px-4 md:px-6">
        {/* Main Contact & Location Section */}
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Brand & Description */}
            <div className={`space-y-6 ${isArabic ? 'rtl' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">{t('common:appName')}</span>
              </div>

              <p className="text-light-300 text-sm leading-relaxed">
                {t('footer:description')}
              </p>

              {/* Business Hours */}
              <div className="pt-4 border-t border-dark-800">
                <h5 className="text-lg font-semibold text-white mb-3">
                  {t('contact:officeHoursTitle') || 'Business Hours'}
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-light-400">
                      {t('footer:sunThu') || 'Saturday – Thursday'}
                    </span>
                    <span className="text-light-300">9:00 AM – 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-400">
                      {t('footer:friSat') || 'Friday'}
                    </span>
                    <span className="text-light-300">
                      {t('footer:closed')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="pt-4 border-t border-dark-800">
                <h5 className="text-lg font-semibold text-white mb-3">
                  {t('footer:followUs') || 'Follow Us'}
                </h5>
                <div className="flex gap-3">
                  {/* Facebook */}
                  <a
                    href="https://www.facebook.com/sabergroupeg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-500 flex items-center justify-center transition-colors duration-200 group"
                  >
                    <svg
                      className="w-5 h-5 text-light-400 group-hover:text-white transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>

                  {/* Behance */}
                  <a
                    href="https://www.behance.net/ahmed_saber_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-[#1769FF] flex items-center justify-center transition-colors duration-200 group"
                  >
                    <svg
                      className="w-5 h-5 text-light-400 group-hover:text-white transition-colors"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3 7v10h6.5c2.25 0 3.5-1.25 3.5-3.25 0-1.75-1.25-2.75-3-2.95V10c1.4-.15 2.5-1.1 2.5-2.5C12.5 6 11 5 8.5 5H3zm9 7.5c.83 0 1.5.67 1.5 1.5S12.83 17.5 12 17.5H9V14h3v.5zM16 8h5v2h-5V8zm0 4h5v6h-5v-6z" />
                    </svg>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/sabergroupstudios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-linear-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 flex items-center justify-center transition-all duration-200 group"
                  >
                    <svg
                      className="w-5 h-5 text-light-400 group-hover:text-white transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="https://www.linkedin.com/in/ahmed-saber-004aa8196/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-blue-600 flex items-center justify-center transition-colors duration-200 group"
                  >
                    <svg
                      className="w-5 h-5 text-light-400 group-hover:text-white transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className={`space-y-6 ${isArabic ? 'rtl' : ''}`}>
              <h4 className="text-xl font-bold text-white">
                {t('contact:contactInfoTitle') || 'Get in Touch'}
              </h4>

              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-primary-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-light-300 font-medium mb-1">
                      {t('contact:phoneTitle') || 'Phone'}
                    </p>
                    <a
                      href={`tel:${String(rawPhone).replace(/\s+/g, '')}`}
                      className="text-lg font-medium text-white hover:text-primary-300 transition-colors duration-200"
                    >
                      <span
                        dir={isArabic ? 'ltr' : undefined}
                        className="inline-block font-sans text-lg font-semibold"
                      >
                        {displayedPhone}
                      </span>
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-primary-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-light-300 font-medium mb-1">
                      {t('contact:emailTitle') || 'Email'}
                    </p>
                    <a
                      href={`mailto:${rawEmail}`}
                      className="text-lg font-medium text-white hover:text-primary-300 transition-colors duration-200"
                    >
                      <span dir="ltr" className="inline-block">
                        {rawEmail}
                      </span>
                    </a>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-primary-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-light-300 font-medium mb-1">{t('contact:whatsapp')}</p>
                    <a
                      href="https://wa.me/201080099757"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-white hover:text-primary-300 transition-colors duration-200"
                    >
                      <span
                        dir="ltr"
                        className="inline-block font-sans text-lg font-semibold"
                      >
                        01080099757
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Map */}
            <div className={`space-y-6 ${isArabic ? 'rtl' : ''}`}>
              <h4 className="text-xl font-bold text-white">
                {t('contact:findUs') || 'Visit Our Office'}
              </h4>

              <div className="space-y-4">
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-primary-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-light-300 font-medium mb-1">
                      {t('contact:addressTitle') || 'Headquarters'}
                    </p>
                    <a
                      href="https://maps.app.goo.gl/U8b1DJxKdUVosnwV8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light-300 leading-relaxed hover:text-primary-300 transition-colors duration-200 inline-block text-sm"
                    >
                      {t('contact:address') ||
                        'El-gharbia Tanta, El-nady St in front of Tanta Club Gate, Above Waffle Art'}
                    </a>
                    <p className="text-light-300 font-medium mb-1 mt-3">
                      {t('contact:secondaryAddressTitle') || 'Studio'}
                    </p>
                    <a
                      href="https://www.google.com/maps/place/articka/@30.7958747,30.9888239,16z/data=!3m1!4b1!4m6!3m5!1s0x14f7c94d9d544d5b:0xabf04ad58406b6c1!8m2!3d30.7958747!4d30.9888239!16s%2Fg%2F11h5w69h6d"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light-300 leading-relaxed hover:text-primary-300 transition-colors duration-200 inline-block text-sm"
                    >
                      {t('contact:secondaryAddress')}
                    </a>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border-2 border-dark-700 shadow-lg">
                  <div className="w-full h-64 md:h-56 lg:h-64 bg-dark-800 relative">
                    <iframe
                      title="Saber Group Office - Tanta"
                      src="https://www.google.com/maps?q=30.810011,30.998228&z=17&output=embed"
                      className="w-full h-full border-0"
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="absolute top-3 right-3">
                      <a
                        href="https://maps.app.goo.gl/U8b1DJxKdUVosnwV8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm inline-flex items-center gap-2 px-3 py-1 bg-dark-900/60 text-white rounded-md border border-white/10 hover:bg-dark-900/80 transition-colors"
                      >
                        {t('footer:openMaps') || 'Open Maps'}
                      </a>
                    </div>
                  </div>
                  <div className="bg-dark-800 px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-light-300 font-medium text-sm">
                        {t('contact:addressTitle')}
                      </p>
                      <p className="text-light-400 text-xs">
                        {t('footer:officeLocation')}
                      </p>
                    </div>
                    <a
                      href="https://maps.app.goo.gl/U8b1DJxKdUVosnwV8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white text-sm px-4 py-2 transition-colors duration-200"
                    >
                      {t('footer:openMaps') || 'Open Maps'}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-dark-800 py-6">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-4 ${isArabic ? 'rtl' : ''}`}
          >
            {/* Copyright */}
            <p className="text-light-400 text-sm">
              © <span dir={isArabic ? 'ltr' : undefined}>{displayedYear}</span>{' '}
              {t('common:brandName') || 'Saber Group'}
            </p>

            {/* Policy Links */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {policyLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-light-500 hover:text-primary-400 text-xs transition-colors duration-200 whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Created By */}
        <div className="border-t border-dark-800 py-4">
          <div className="text-center">
            <p className="text-light-500 text-xs">
              <>
                {t('footer:createdBy')}&nbsp;
                <a
                  href="https://www.sabergroup-eg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:underline"
                >
                  {t('common:studioBrand')}
                </a>
              </>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
