import React from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';

const AddressPage = () => {
  const { t, isArabic } = useTranslation();

  const rawPhone = t('contact:phoneNumber') || '01080099757';
  const rawEmail = t('contact:emailAddress') || 'info@sabergroup-eg.com';

  const offices = [
    {
      type: isArabic ? 'المقر الرئيسي' : 'Headquarters',
      name: t('contact:addressTitle') || 'Tanta Office',
      address: t('contact:address') || 'El-Stad St - Tanta - Egypt',
      phone: rawPhone,
      email: rawEmail,
      hours: isArabic ? 'السبت – الخميس، 9 ص – 6 م' : 'Saturday – Thursday, 9 AM – 6 PM',
      mapsUrl: 'https://maps.app.goo.gl/U8b1DJxKdUVosnwV8',
      embedSrc:
        'https://www.google.com/maps?q=30.810011,30.998228&z=17&output=embed',
    },
    {
      type: isArabic ? 'الاستوديو' : 'Studio',
      name: t('contact:secondaryAddressTitle') || 'Cairo Studio',
      address: t('contact:secondaryAddress') || 'Villa 191, Al-Banafseg 5, 1st Settlement',
      phone: rawPhone,
      email: rawEmail,
      hours: isArabic ? 'بموعد مسبق' : 'By appointment',
      mapsUrl: 'https://www.google.com/maps/place/articka/@30.7958747,30.9888239,16z/data=!3m1!4b1!4m6!3m5!1s0x14f7c94d9d544d5b:0xabf04ad58406b6c1!8m2!3d30.7958747!4d30.9888239!16s%2Fg%2F11h5w69h6d',
      embedSrc:
        'https://www.google.com/maps?q=30.7958747,30.9888239&z=16&output=embed',
    },
  ];

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 mt-12">
          <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white mb-4">
            {isArabic ? 'أين نتواجد' : 'Where to Find Us'}
          </h1>
          <p className="text-light-600 dark:text-light-400 max-w-xl mx-auto">
            {isArabic
              ? 'لدينا موقعان في مصر — مقر رئيسي في طنطا واستوديو في القاهرة.'
              : 'We have two locations in Egypt — a headquarters in Tanta and a studio in Cairo.'}
          </p>
        </div>

        {/* Office cards */}
        <div className="space-y-10">
          {offices.map((office, i) => (
            <div
              key={office.name}
              className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-3xl overflow-hidden"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-light-200 dark:border-dark-700">
                <div>
                  <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
                    {office.type}
                  </span>
                  <h2 className="text-xl font-bold text-light-900 dark:text-white">
                    {office.name}
                  </h2>
                </div>
                <a
                  href={office.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
                >
                  {isArabic ? 'فتح الخريطة' : 'Open Maps'}
                </a>
              </div>

              <div className="grid md:grid-cols-2">
                {/* Info */}
                <div className="p-8 space-y-5">
                  {[
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      ),
                      label: isArabic ? 'العنوان' : 'Address',
                      value: office.address,
                      href: office.mapsUrl,
                      dir: 'auto',
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      ),
                      label: isArabic ? 'الهاتف' : 'Phone',
                      value: office.phone,
                      href: `tel:+20${office.phone.replace(/^0/, '')}`,
                      dir: 'ltr',
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      ),
                      label: isArabic ? 'البريد' : 'Email',
                      value: office.email,
                      href: `mailto:${office.email}`,
                      dir: 'ltr',
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ),
                      label: isArabic ? 'ساعات العمل' : 'Working Hours',
                      value: office.hours,
                      href: null,
                      dir: 'auto',
                    },
                  ].map((item, j) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                        <svg
                          className="w-5 h-5 text-primary-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {item.icon}
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-light-500 dark:text-light-400 mb-0.5">
                          {item.label}
                        </p>
                        {item.href ? (
                          <a
                            href={item.href}
                            target={
                              item.href.startsWith('http') ? '_blank' : '_self'
                            }
                            rel="noopener noreferrer"
                            className="text-light-900 dark:text-white font-medium hover:text-primary-500 transition-colors"
                            dir={item.dir}
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p
                            className="text-light-900 dark:text-white font-medium"
                            dir={item.dir}
                          >
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map */}
                <div className="h-72 md:h-auto">
                  <iframe
                    title={office.name}
                    src={office.embedSrc}
                    className="w-full h-full border-0"
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AddressPage;
