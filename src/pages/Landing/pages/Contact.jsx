import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/hooks/useTranslation";
import Swal from "sweetalert2";
import { SITE_NAME } from "../utils/ogMeta";
import { addLead, fetchCountries as apiFetchCountries, fetchCities as apiFetchCities, fetchGovernorates as apiFetchGovernorates } from "../api";

const ContactUs = () => {
  const { t, isArabic } = useTranslation();
  const [countries, setCountries] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [cities, setCities] = useState([]);
  

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    country: "",
    government: "",
    city: "",
    
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const inputClass = "w-full px-6 py-4 rounded-2xl bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 text-light-900 dark:text-white placeholder-light-400/50 dark:placeholder-light-500/50 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow shadow-sm";
  
  const labelClass = "block text-sm font-medium text-light-700 dark:text-light-300 mb-2";

  // Helper to get a localized display name from location objects
  const formatLocationName = (item) => {
    if (!item) return '';
    const name = item.name || '';
    if (!name) return '';
    if (typeof name === 'string') return name;
    // name may be an object like { en, ar }
    return isArabic ? (name.ar || name.en || '') : (name.en || name.ar || '');
  };

  const services = [
    { value: "all", label: t("contact:serviceAll") || "All Services" },
    { value: "digital", label: t("contact:serviceDigital") || "Digital Marketing" },
    { value: "branding", label: t("contact:serviceBranding") || "Branding" },
    { value: "social", label: t("contact:serviceSocial") || "Social Media" },
    { value: "content", label: t("contact:serviceContent") || "Content Creation" },
    { value: "seo", label: t("contact:serviceSEO") || "SEO" },
  ];

  const budgetRanges = [
    { value: "", label: t("contact:selectBudget") || "Select Budget Range" },
    { value: "small", label: "$1K - $5K" },
    { value: "medium", label: "$5K - $10K" },
    { value: "large", label: "$10K - $25K" },
    { value: "enterprise", label: "$25K+" },
  ];

  const contactMethods = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      title: t("contact:callUs") || "Call Us",
      value: "01080099757",
      link: "tel:+201080099757",
      bg: "from-blue-500 to-cyan-500",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: t("contact:emailUs") || "Email Us",
      value: "info@sabergroup-eg.com",
      link: "mailto:info@sabergroup-eg.com",
      bg: "from-purple-500 to-pink-500",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: t("contact:whatsapp") || "WhatsApp",
      value: "01080099757",
      link: "https://wa.me/201080099757",
      bg: "from-green-500 to-emerald-500",
    },
  ];

  const socialLinks = [
    {
      name: "Instagram",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
        </svg>
      ),
      link: "https://www.instagram.com/sabergroupstudios",
      color: "hover:bg-pink-600",
    },
    {
      name: "LinkedIn",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      link: "https://www.linkedin.com/in/ahmed-saber-004aa8196/",
      color: "hover:bg-blue-700",
    },
    {
      name: "Behance",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 7v10h6.5c2.25 0 3.5-1.25 3.5-3.25 0-1.75-1.25-2.75-3-2.95V10c1.4-.15 2.5-1.1 2.5-2.5C12.5 6 11 5 8.5 5H3zm9 7.5c.83 0 1.5.67 1.5 1.5S12.83 17.5 12 17.5H9V14h3v.5zM16 8h5v2h-5V8zm0 4h5v6h-5v-6z" />
        </svg>
      ),
      link: "https://www.behance.net/ahmed_saber_",
      color: "hover:bg-[#1769FF]",
    },
    {
      name: "Facebook",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      link: "https://www.facebook.com/sabergroupeg",
      color: "hover:bg-blue-600",
    },

  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await apiFetchCountries({ deleted: false, PageCount: 1000, page: 1 });
        const countriesData = res.data?.data || [];
        setCountries(countriesData);
        const egypt = countriesData.find((c) => {
          const nm = formatLocationName(c).toString().trim().toLowerCase();
          return nm === "egypt" || nm === "مصر";
        });
        if (egypt) {
          setFormData((prev) => ({ ...prev, country: egypt._id }));
          fetchGovernorates(egypt._id);
        }
      } catch (err) {
        console.error("Failed to fetch countries:", err);
      }
    };

    const fetchAllCities = async () => {
      try {
        const res = await apiFetchCities({ deleted: false, PageCount: 1000, page: 1 });
        setAllCities(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      }
    };

    fetchCountries();
    fetchAllCities();
  }, []);

  const fetchGovernorates = async (countryId) => {
    if (!countryId) {
      setGovernorates([]);
      setCities([]);
      setFormData((prev) => ({ ...prev, government: "", city: "" }));
      return;
    }

    try {
      const res = await apiFetchGovernorates({ deleted: false, PageCount: 1000, page: 1, country: countryId });
      setGovernorates(res.data?.data || []);
      setFormData((prev) => ({ ...prev, government: "", city: "" }));
    } catch (err) {
      console.error("Failed to fetch governorates:", err);
      setGovernorates([]);
    }
  };


  const filteredCountries = countries.filter((c) => {
    const name = (formatLocationName(c) || "").toString().trim().toLowerCase();
    return name !== "اونلاين" && name !== "غير محدد";
  });

  const isEgyptSelected = (() => {
    if (!formData.country) return false;
    const sel = countries.find((c) => c._id === formData.country);
    if (!sel) return false;
    const name = (formatLocationName(sel) || "").toString().trim().toLowerCase();
    return name === "egypt" || name === "مصر";
  })();

  // extend handleChange to react to country/government/projectInterest
  const originalHandleChange = handleChange;
  const enhancedHandleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "country") {
      const selected = countries.find((c) => c._id === value);
      const selName = formatLocationName(selected).toString().trim().toLowerCase();
      if (selName === "egypt" || selName === "مصر") {
        fetchGovernorates(value);
      } else {
        setGovernorates([]);
        setCities([]);
        setFormData((prev) => ({ ...prev, government: "", city: "" }));
      }
    } else if (name === "government") {
      const filteredCities = allCities.filter((city) => {
        return city.government === value || city.governmentId === value || city.governorate === value || city.government?._id === value;
      });
      setCities(filteredCities);
      setFormData((prev) => ({ ...prev, city: "" }));
    }

    // projectInterest removed

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // replace validate and submit with CRM payload logic
  const validateFormExtended = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t("contact:nameRequired") || "Name is required";
    if (!formData.email.trim()) newErrors.email = t("contact:emailRequired") || "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t("contact:emailInvalid") || "Invalid email address";
    if (!formData.country || !formData.country.trim()) newErrors.country = t("contact:countryRequired") || "Country is required";
    if (!formData.phone.trim()) newErrors.phone = t("contact:phoneRequired") || "Phone is required";
    return newErrors;
  };

  const handleSubmitExtended = async (e) => {
    e.preventDefault();
    const validationErrors = validateFormExtended();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorKey = Object.keys(validationErrors)[0];
      const firstErrorMessage = validationErrors[firstErrorKey];
      const errorElement = document.querySelector(`[name="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { errorElement.focus(); }, 300);
      }
      setTimeout(async () => {
        await Swal.fire({ icon: 'warning', title: t('contact:validationError') || 'Validation Error', text: firstErrorMessage, confirmButtonText: t('common:ok') || 'OK', confirmButtonColor: '#f59e0b' });
      }, 300);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email || "",
        phone: formData.phone,
        otherPhones: [],
        status: "Pending",
        addresses: [{ area: "", landmark: "", street: "", deleted: false }],
        country: formData.country || "",
        ...(formData.government ? { government: formData.government } : {}),
        ...(formData.city ? { city: formData.city } : {}),
        subCategories: [],
        campaigns: [],
        channels: [],
        // no projects field — projectInterest removed
        files: [],
        prevOrders: [],
        sales: [],
        ...(formData.message && formData.message.trim() ? { message: { message: formData.message.trim() } } : {}),
        company: import.meta.env.VITE_CRM_COMPANY_ID,
        branch: import.meta.env.VITE_CRM_BRANCH_ID,
        deleted: false,
        isWhatsapp: false,
      };

      await addLead(payload);

      await Swal.fire({ icon: 'success', title: t('contact:successTitle') || 'Message Sent Successfully!', text: t('contact:successMessage') || `Thank you for contacting ${SITE_NAME}. We'll get back to you within 24 hours.`, confirmButtonText: t('common:ok') || 'OK', confirmButtonColor: '#10b981' });

      setSubmitSuccess(true);
      const egypt = countries.find((c) => {
        const nm = formatLocationName(c).toString().trim().toLowerCase();
        return nm === "egypt" || nm === "مصر";
      });
      setFormData({ name: "", email: "", phone: "", message: "", country: egypt?._id || "", government: "", city: "" });
      if (egypt) fetchGovernorates(egypt._id);
      setErrors({});
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.debug("Form submission error:", error);
      const errorMessage = error?.response?.data?.message || t("contact:submitError") || "An error occurred. Please try again.";
      setErrors({ submit: errorMessage });
      await Swal.fire({ icon: 'error', title: t('contact:error') || 'Error', text: errorMessage, confirmButtonText: t('common:ok') || 'OK', confirmButtonColor: '#ef4444' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t("contact:nameRequired") || "Name is required";
    if (!formData.email.trim()) newErrors.email = t("contact:emailRequired") || "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = t("contact:emailInvalid") || "Invalid email address";
    if (!formData.phone || !formData.phone.trim()) newErrors.phone = t("contact:phoneRequired") || "Phone is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      const firstMsg = validationErrors[firstKey];
      const el = document.querySelector(`[name="${firstKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.focus(), 300);
      }
      Swal.fire({
        icon: "warning",
        title: t("contact:validationError") || "Validation Error",
        text: firstMsg,
        confirmButtonText: t("common:ok") || "OK",
        confirmButtonColor: "#f59e0b",
        background: "#1a1a1a",
        color: "#fff",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      Swal.fire({
        icon: "success",
        title: t("contact:successTitle") || "Message Sent Successfully!",
        text: t("contact:successMessage") || "Thank you for reaching out. Our team will contact you within 24 hours.",
        confirmButtonText: t("common:ok") || "OK",
        confirmButtonColor: "#10b981",
        background: "#1a1a1a",
        color: "#fff",
        showClass: { popup: "animate-fade-in-down" },
      });
      setSubmitSuccess(true);
      setFormData({ name: "", email: "", phone: "", message: "", country: "", government: "", city: "" });
      setErrors({});
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.debug("submission error", err);
      const errorMessage = t("contact:submitError") || "An error occurred. Please try again.";
      setErrors({ submit: errorMessage });
      Swal.fire({
        icon: "error",
        title: t("contact:error") || "Error",
        text: errorMessage,
        confirmButtonText: t("common:ok") || "OK",
        confirmButtonColor: "#ef4444",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact-section"
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 relative overflow-hidden"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />

        {/* Decorative grid (replacing inline SVG data-URL) */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(156,146,172,0.05) 0 1px, transparent 1px 12px)',
          }}
        />
      </div>

      <div className="container relative mx-auto px-4 md:px-6 py-20">
        {/* Header Section */}
        <div
          className={`max-w-4xl mx-auto text-center mb-16 ${isArabic ? 'rtl' : ''} animate-fade-in`}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-8">
            <span className="bg-linear-to-r from-primary-500 via-secondary-500 to-primary-500 bg-clip-text text-transparent bg-size-[200%_auto] animate-gradient">
              {t('contact:title') || 'Ready to Grow?'}
            </span>
          </h1>

          <p className="text-xl text-light-600 dark:text-light-300 leading-relaxed max-w-3xl mx-auto">
            {t('contact:subtitle') ||
              "Tell us about your project and let's discuss how we can help your brand reach new heights."}
          </p>
        </div>

        {/* Contact Form - First Priority */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="relative">
            {/* Decorative Elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-secondary-500/10 rounded-full blur-2xl" />

            <div className="relative bg-gray-100 dark:bg-dark-800/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-light-200/50 dark:border-dark-700/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-linear-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-light-900 dark:text-white">
                    {t('contact:formTitle') || 'Tell Us About Your Project'}
                  </h2>
                  <p className="text-light-600 dark:text-light-400">
                    {t('contact:formSubtitle') ||
                      "Fill out the form and we'll get back to you within 24 hours"}
                  </p>
                </div>
              </div>

              {submitSuccess ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success-500/20 flex items-center justify-center animate-bounce">
                    <svg
                      className="w-12 h-12 text-success-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-success-500 mb-4">
                    {t('contact:successTitle') || 'Message Sent Successfully!'}
                  </h3>
                  <p className="text-light-600 dark:text-light-400 mb-6">
                    {t('contact:successMessage') ||
                      'Thank you for reaching out. Our team will contact you within 24 hours.'}
                  </p>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="px-6 py-3 bg-linear-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-xl transition-all"
                  >
                    {t('contact:sendAnother') || 'Send another message'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitExtended} className="space-y-6">
                  {/* Name & Email */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        {t('contact:name') || 'Full Name'} *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={enhancedHandleChange}
                        placeholder={t('contact:namePlaceholder') || 'John Doe'}
                        className={`${inputClass} ${errors.name ? 'border-danger-500' : ''}`}
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-danger-500">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        {t('contact:email') || 'Email'} *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={enhancedHandleChange}
                        placeholder={
                          t('contact:emailPlaceholder') || 'john@company.com'
                        }
                        className={`${inputClass} ${errors.email ? 'border-danger-500' : ''}`}
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-danger-500">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      {t('contact:phone') || 'Phone Number'} *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={enhancedHandleChange}
                      placeholder={
                        t('contact:phonePlaceholder') ||
                        'Enter your phone number'
                      }
                      className={`${inputClass} ${errors.phone ? 'border-danger-500' : ''}`}
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-danger-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Country & Governorate */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="country" className={labelClass}>
                        {t('contact:country') || 'Country'} *
                      </label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={enhancedHandleChange}
                        className={`${inputClass} ${errors.country ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                      >
                        <option value="">
                          {t('contact:selectCountry') || 'Select a country'}
                        </option>
                        {filteredCountries.map((c) => (
                          <option key={c._id} value={c._id}>
                            {formatLocationName(c)}
                          </option>
                        ))}
                      </select>
                      {errors.country && (
                        <p className="mt-2 text-sm text-danger-500">
                          {errors.country}
                        </p>
                      )}
                    </div>
                    {isEgyptSelected ? (
                      <div>
                        <label htmlFor="government" className={labelClass}>
                          {t('contact:government') || 'Governorate'}
                        </label>
                        <select
                          id="government"
                          name="government"
                          value={formData.government}
                          onChange={enhancedHandleChange}
                          disabled={!formData.country}
                          className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="">
                            {t('contact:selectGovernment') ||
                              'Select a governorate'}
                          </option>
                          {governorates.map((g) => (
                            <option key={g._id} value={g._id}>
                              {formatLocationName(g)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  {isEgyptSelected && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="city" className={labelClass}>
                          {t('contact:city') || 'City'}
                        </label>
                        <select
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={enhancedHandleChange}
                          disabled={!formData.government}
                          className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="">
                            {t('contact:selectCity') || 'Select a city'}
                          </option>
                          {cities.map((c) => (
                            <option key={c._id} value={c._id}>
                              {formatLocationName(c)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className={labelClass}>
                      {t('contact:message') || 'Message'}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={enhancedHandleChange}
                      rows="4"
                      placeholder={
                        t('contact:messagePlaceholder') ||
                        'Tell us more about your inquiry...'
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
                      <p className="text-danger-500 text-sm">{errors.submit}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full relative overflow-hidden group bg-linear-to-r from-primary-500 to-secondary-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300 disabled:opacity-70"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          {t('contact:sending') || 'Sending...'}
                        </>
                      ) : (
                        <>
                          {t('contact:sendMessage') || 'Send Message'}
                          <svg
                            className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>

                  <p className="text-xs text-light-500 dark:text-light-400 text-center">
                    {t('contact:privacyNote') ||
                      'By submitting, you agree to our Privacy Policy and Terms of Service.'}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Contact Methods - Second Priority */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {contactMethods.map((method, index) => (
            <a
              key={index}
              href={method.link}
              target={method.link.startsWith('http') ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="group relative block"
            >
              <div
                className={`absolute inset-0 bg-linear-to-r ${method.bg} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              />

              <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-2xl p-6 border border-light-200/50 dark:border-dark-700/50 hover:border-primary-500/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-linear-to-r ${method.bg} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
                  >
                    {method.icon}
                  </div>
                  <div>
                    <p className="text-sm text-light-500 dark:text-light-400 mb-1">
                      {method.title}
                    </p>
                    <p className="text-lg font-semibold text-light-900 dark:text-white">
                      <span
                        dir="ltr"
                        className="inline-block"
                        style={{ unicodeBidi: 'isolate-override' }}
                      >
                        {method.value}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Social Media Links - Third Priority */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-light-900 dark:text-white mb-2">
              {t('contact:followUs') || 'Follow Our Journey'}
            </h3>
            <p className="text-light-600 dark:text-light-400">
              {t('contact:socialSubtitle') ||
                'Stay updated with our latest work and insights'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative w-14 h-14 rounded-xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-light-200/50 dark:border-dark-700/50 flex items-center justify-center ${social.color} hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-xl`}
              >
                <div className="absolute inset-0 rounded-xl bg-linear-to-r from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-light-700 dark:text-light-300 group-hover:text-white transition-colors">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Map Section - Fourth Priority */}
        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-r from-primary-500/10 to-secondary-500/10 rounded-3xl blur-3xl" />

          <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-3xl overflow-hidden border border-light-200/50 dark:border-dark-700/50">
            <div className="grid md:grid-cols-3">
              {/* Map Info */}
              <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-light-200 dark:border-dark-700">
                <h3 className="text-2xl font-bold text-light-900 dark:text-white mb-4">
                  {t('contact:visitOurStudio') || 'Visit Our Studio'}
                </h3>
                <p className="text-light-600 dark:text-light-400 mb-6">
                  {t('contact:officeAddress') ||
                    "Stop by for a coffee and let's discuss your project creatively."}
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                      <svg
                        className="w-5 h-5"
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
                      <p className="text-sm text-light-500 dark:text-light-400">
                        Address
                      </p>
                      <p className="font-semibold text-light-900 dark:text-white">
                        {' '}
                        {t('contact:address') || 'El-Stad St - Tanta - Egypt'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-light-500 dark:text-light-400">
                        Hours
                      </p>
                      <p className="font-semibold text-light-900 dark:text-white">
                        {t('contact:officeHours') ||
                          'Sat - Thu, 9:00 AM - 5:00 PM'}
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://maps.app.goo.gl/U8b1DJxKdUVosnwV8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-xl transition-all w-full justify-center group"
                  >
                    <svg
                      className="w-5 h-5"
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
                    {t('contact:getDirections') || 'Get Directions'}
                    <svg
                      className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Map Embed */}
              <div className="md:col-span-2 h-96 relative">
                <iframe
                  title="Saber Group Office - Tanta"
                  src="https://www.google.com/maps?q=30.810011,30.998228&z=17&output=embed"
                  className="w-full h-full border-0"
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                <div className="absolute top-4 right-4">
                  <a
                    href="https://maps.app.goo.gl/U8b1DJxKdUVosnwV8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg border border-white/10 hover:bg-white/20 transition-colors text-sm"
                  >
                    {t('contact:openInMaps') || 'Open Maps'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out;
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </section>
  );
};

export default ContactUs;