import { useState } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import Swal from 'sweetalert2';
import { addLead } from '../api';
import servicesContent, {
  tiers as tiersByProduct,
} from '../content/ServicesContent.js';

const PRODUCT_IDS = {
  ats: '6a365a92ee51c7709f157158',
};

const TIER_IDS = {
  Starter: '6a3659caee51c7709f1563f6',
  Growth: '6a3659caee51c7709f156477',
  Enterprise: '6a3659caee51c7709f156453',
};

const QUOTE_CHANNEL_ID = '6a365b1fee51c7709f1585fc';

const ServicesPage = () => {
  const { isArabic } = useTranslation();
  const lang = isArabic ? 'ar' : 'en';
  const { hero, products, tiersSection, quoteForm } =
    servicesContent[lang];

  const product = products['ats'];

  const productTiers = tiersByProduct['ats'][lang];
  const tierPlans = productTiers.plans;
  const rowLabels = productTiers.rowLabels;
  const rowOrder = tiersByProduct['ats'].rowOrder;

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    product: 'ats',
    tier: '',
    teamSize: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const inputClass =
    'w-full px-5 py-3.5 rounded-xl bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 text-light-900 dark:text-white placeholder-light-400/50 dark:placeholder-light-500/50 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow';
  const labelClass =
    'block text-sm font-medium text-light-700 dark:text-light-300 mb-2';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const selectTierFromTable = (tierName) => {
    setFormData((prev) => ({ ...prev, tier: tierName }));
    document
      .getElementById('quote-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim())
      newErrors.name = isArabic ? 'الاسم مطلوب' : 'Name is required';
    if (!formData.phone.trim())
      newErrors.phone = isArabic ? 'رقم التليفون مطلوب' : 'Phone is required';
    if (!formData.company.trim())
      newErrors.company = isArabic
        ? 'اسم الشركة مطلوب'
        : 'Company name is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const productIds = Array.isArray(PRODUCT_IDS[formData.product])
        ? PRODUCT_IDS[formData.product]
        : PRODUCT_IDS[formData.product]
          ? [PRODUCT_IDS[formData.product]]
          : [];

      const subCategories = [
        ...productIds,
        formData.tier ? TIER_IDS[formData.tier] : null,
      ].filter(Boolean);
      
      const payload = {
        name: formData.name,
        phone: formData.phone,
        status: 'Pending',
        subCategories,
        channels: [QUOTE_CHANNEL_ID],
        message: {
          message: [
            `Company: ${formData.company}`,
            formData.teamSize ? `Team size: ${formData.teamSize}` : null,
            formData.notes ? `Notes: ${formData.notes}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        },
        company: import.meta.env.VITE_CRM_COMPANY_ID,
      };

      await addLead(payload);

      await Swal.fire({
        icon: 'success',
        title: quoteForm.successTitle,
        text: quoteForm.successMessage,
        confirmButtonText: isArabic ? 'تمام' : 'OK',
        confirmButtonColor: '#10b981',
      });

      setFormData({
        name: '',
        company: '',
        phone: '',
    product: 'ats',
        tier: '',
        teamSize: '',
        notes: '',
      });
      setErrors({});
    } catch (error) {
      console.debug('Quote request submission error:', error);
      await Swal.fire({
        icon: 'error',
        title: isArabic ? 'خطأ' : 'Error',
        text: quoteForm.errorMessage,
        confirmButtonText: isArabic ? 'تمام' : 'OK',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-screen bg-linear-to-br from-light-50 via-white to-light-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 py-20 px-4 md:px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-14 mt-12 max-w-3xl">
          <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
            {hero.eyebrow}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-light-900 dark:text-white mt-3 mb-5 leading-tight">
            {hero.title}
          </h1>
          <p className="text-light-600 dark:text-light-400 leading-relaxed">
            {hero.subtitle}
          </p>
        </div>

        <div className="flex gap-8 border-b border-light-200 dark:border-dark-700 mb-10">
          <span className="pb-4 text-sm font-semibold border-b-2 border-primary-500 text-light-900 dark:text-white">
            ATS — Hiring
          </span>
        </div>

        {/* Product detail */}
        <div className="grid md:grid-cols-2 gap-10 mb-20">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-2xl font-bold text-light-900 dark:text-white">
                {product.name}
              </h2>
              <span className="text-sm text-light-500 dark:text-light-400">
                {product.tagline}
              </span>
            </div>
            <p className="text-light-600 dark:text-light-400 leading-relaxed mb-8">
              {product.description}
            </p>

            <ul className="space-y-3">
              {product.capabilities.map((cap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-light-700 dark:text-light-300"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                  <span className="leading-relaxed">{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Activity trace — signature element */}
          <div className="bg-dark-900 dark:bg-black/40 rounded-2xl p-6 border border-light-200/10 dark:border-dark-700/50 h-fit">
            <p className="text-xs text-light-400 mb-4 uppercase tracking-wider">
              {product.trace.label}
            </p>
            <div
              dir="ltr"
              className="font-mono text-[13px] leading-relaxed space-y-1.5"
            >
              {product.trace.lines.map((line, i) => (
                <div key={i} className="flex gap-3 text-light-300">
                  <span className="text-light-600 select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tier comparison table */}
        <div className="mb-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-2">
              {tiersSection.title}
            </h2>
            <p className="text-light-600 dark:text-light-400 max-w-2xl">
              {tiersSection.subtitle}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-start p-4 text-sm font-medium text-light-500 dark:text-light-400 w-1/4" />
                  {tierPlans.map((tier) => (
                    <th
                      key={tier.name}
                      className={`text-start p-4 rounded-t-xl ${
                        tier.highlighted ? 'bg-primary-500/10' : ''
                      }`}
                    >
                      <div className="font-bold text-light-900 dark:text-white">
                        {tier.name}
                      </div>
                      <div className="text-xs text-light-500 dark:text-light-400 font-normal mt-1">
                        {tier.blurb}
                      </div>
                      {tier.price && (
                        <div className="text-lg font-bold text-light-900 dark:text-white mt-2">
                          {tier.price.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-light-500">
                            EGP / mo
                          </span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowOrder.map((rowKey) => (
                  <tr
                    key={rowKey}
                    className="border-t border-light-200/50 dark:border-dark-700/50"
                  >
                    <td className="p-4 text-sm font-medium text-light-600 dark:text-light-400">
                      {rowLabels[rowKey]}
                    </td>
                    {tierPlans.map((tier) => (
                      <td
                        key={tier.name}
                        className={`p-4 text-sm text-light-800 dark:text-light-200 ${
                          tier.highlighted ? 'bg-primary-500/10' : ''
                        }`}
                      >
                        {tier.rows[rowKey]}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-4" />
                  {tierPlans.map((tier) => (
                    <td
                      key={tier.name}
                      className={`p-4 rounded-b-xl ${tier.highlighted ? 'bg-primary-500/10' : ''}`}
                    >
                      <button
                        // onClick={() => selectTierFromTable(tier.name)}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                          tier.highlighted
                            ? 'bg-primary-500 text-white hover:bg-primary-600'
                            : 'bg-white dark:bg-dark-800 border border-light-200 dark:border-dark-700 text-light-800 dark:text-light-200 hover:border-primary-500'
                        }`}
                      >
                        {tiersSection.ctaLabel}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {product.notes && (
            <p className="text-xs text-light-500 dark:text-light-400 mt-4">
              {product.notes}
            </p>
          )}
        </div>

        {/* Quote request form */}
        <div
          id="quote-form"
          className="bg-white/80 dark:bg-dark-800/80 border border-light-200/50 dark:border-dark-700/50 rounded-2xl p-6 md:p-10"
        >
          <h2 className="text-2xl font-bold text-light-900 dark:text-white mb-2">
            {quoteForm.title}
          </h2>
          <p className="text-light-600 dark:text-light-400 mb-8 max-w-2xl">
            {quoteForm.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{quoteForm.fields.name} *</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`${inputClass} ${errors.name ? 'border-danger-500' : ''}`}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-danger-500">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  {quoteForm.fields.company} *
                </label>
                <input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className={`${inputClass} ${errors.company ? 'border-danger-500' : ''}`}
                />
                {errors.company && (
                  <p className="mt-1.5 text-sm text-danger-500">
                    {errors.company}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{quoteForm.fields.phone} *</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  dir="ltr"
                  className={`${inputClass} ${errors.phone ? 'border-danger-500' : ''}`}
                />
                {errors.phone && (
                  <p className="mt-1.5 text-sm text-danger-500">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>{quoteForm.fields.product}</label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {quoteForm.productOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>{quoteForm.fields.tier}</label>
                <select
                  name="tier"
                  value={formData.tier}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">
                    {isArabic ? '— اختر —' : '— Select —'}
                  </option>
                  {tierPlans.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {quoteForm.fields.teamSize}
                </label>
                <input
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleChange}
                  placeholder={isArabic ? 'مثال: 12 مستخدم' : 'e.g. 12 users'}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>{quoteForm.fields.notes}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3.5 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? quoteForm.sending : quoteForm.submit}
            </button>

            <p className="text-xs text-light-500 dark:text-light-400">
              {quoteForm.privacyNote}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ServicesPage;
