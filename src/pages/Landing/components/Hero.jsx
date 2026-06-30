// components/Hero.jsx
import React from "react";
import { useTranslation } from "../i18n/hooks/useTranslation";

const Hero = () => {
  const { t, isArabic } = useTranslation();

  const stats = [
    { value: "50+", label: t("hero:projects") || "Projects Delivered" },
    { value: "98%", label: t("hero:satisfaction") || "Client Satisfaction" },
    { value: "5+", label: t("hero:years") || "Years of Excellence" },
    { value: "15+", label: t("hero:experts") || "Marketing Experts" },
  ];

  const services = [
    {
      name: t("hero:serviceDigital") || "Digital Marketing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: t("hero:serviceBranding") || "Brand Strategy",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      name: t("hero:serviceSocial") || "Social Media",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
        </svg>
      ),
    },
    {
      name: t("hero:serviceSEO") || "SEO Optimization",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
  ];

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-gradient-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="hidden md:block absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="hidden md:block absolute -bottom-40 -left-40 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-500/5 to-secondary-500/5 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 border border-primary-500/20 rounded-lg rotate-12 animate-float" />
        <div className="absolute bottom-20 right-10 w-32 h-32 border border-secondary-500/20 rounded-full animate-float-delayed" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-primary-500/10 rounded-full animate-ping" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className={`${isArabic ? "order-2 rtl" : "order-1"} space-y-8 animate-fade-in`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
              </span>
              <span className="text-sm font-semibold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                {t("hero:badge") || "Creative Marketing Agency"}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-light-900 dark:text-white">
                {t("hero:title1") || "We Craft"}
              </span>
              <span className="bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {t("hero:title2") || "strategic marketing"}
              </span>
              <span className="block text-light-900 dark:text-white">
                {t("hero:title3") || "that grow"}
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-light-600 dark:text-light-300 leading-relaxed max-w-2xl">
              {t("hero:description") || "We combine creative storytelling, data-driven campaigns, and performance marketing to reach the right audiences, increase engagement, and grow revenue for ambitious brands."}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={scrollToContact}
                className="group relative overflow-hidden px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-semibold text-base md:text-lg hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("hero:ctaStart") || "Start Your Project"}
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              <button className="px-6 md:px-8 py-3 md:py-4 bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-light-200/50 dark:border-dark-700/50 text-light-900 dark:text-white rounded-lg font-semibold text-base md:text-lg hover:border-primary-500/50 hover:shadow-lg transition-all duration-300">
                {t("hero:ctaWork") || "Our Case Studies"}
              </button>
            </div>

            {/* Services Tags */}
            <div className="flex flex-wrap gap-3 pt-4">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm rounded-full border border-light-200/50 dark:border-dark-700/50 text-light-700 dark:text-light-300 text-sm hover:border-primary-500/50 hover:bg-primary-500/5 transition-all duration-300"
                >
                  <span className="text-primary-500">{service.icon}</span>
                          {service.name}
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Visual Elements */}
          <div className={`${isArabic ? "order-1" : "order-2"} relative animate-fade-in-delayed`}>
            {/* Main Visual Card */}
            <div className="relative">
              {/* Decorative Background */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl opacity-20 blur-2xl animate-pulse" />
              
              {/* Main Card */}
              <div className="relative bg-white/90 dark:bg-dark-800/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-light-200/50 dark:border-dark-700/50">
                {/* Success Metrics */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-sm text-light-600 dark:text-light-400 mt-1">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Graph Visualization */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm text-light-500 dark:text-light-400">Traffic</div>
                    <div className="flex-1 h-3 bg-light-200 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full animate-pulse" />
                    </div>
                    <div className="text-sm font-semibold text-light-900 dark:text-white">+85%</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm text-light-500 dark:text-light-400">Sales</div>
                    <div className="flex-1 h-3 bg-light-200 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full w-3/5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full animate-pulse delay-150" />
                    </div>
                    <div className="text-sm font-semibold text-light-900 dark:text-white">+62%</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm text-light-500 dark:text-light-400">ROI</div>
                    <div className="flex-1 h-3 bg-light-200 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 md:w-96 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full animate-pulse delay-300" />
                    </div>
                    <div className="text-sm font-semibold text-light-900 dark:text-white">+210%</div>
                  </div>
                </div>

                {/* Recent Clients */}
                <div className="mt-8 pt-8 border-t border-light-200 dark:border-dark-700">
                  <p className="text-sm text-light-500 dark:text-light-400 mb-4">
                    {t("hero:trustedBy") || "Trusted by leading brands worldwide"}
                  </p>
                  <div className="flex flex-wrap gap-6 items-center justify-between opacity-50">
                    {/* Client Logos Placeholder */}
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-16 bg-gradient-to-r from-light-300 to-light-400 dark:from-dark-600 dark:to-dark-500 rounded" />
                    ))}
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl rotate-12 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                  24/7
                </div>
                
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white dark:bg-dark-700 rounded-2xl shadow-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -z-10 inset-0">
              <div className="absolute top-1/4 -right-20 w-40 h-40 bg-secondary-500/10 rounded-full blur-2xl" />
              <div className="absolute bottom-1/4 -left-20 w-40 h-40 bg-primary-500/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-light-400 dark:border-dark-500 flex justify-center">
            <div className="w-1 h-3 bg-gradient-to-b from-primary-500 to-secondary-500 rounded-full mt-2 animate-scroll" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delayed {
          0% { opacity: 0; transform: translateY(20px); }
          50% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-20px) rotate(12deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes scroll {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(15px); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-delayed {
          animation: fade-in-delayed 1.5s ease-out;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        
        .animate-scroll {
          animation: scroll 1.5s ease infinite;
        }
      `}</style>
    </section>
  );
};

export default Hero;