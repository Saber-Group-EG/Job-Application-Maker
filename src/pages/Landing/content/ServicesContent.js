// Content for the Services page (/services).
// Tier data below reflects real product gating decisions as of this draft.
// Pricing itself is still undecided -- only feature gating is final.

const servicesContent = {
  en: {
    hero: {
      eyebrow: 'Two tools we use to run our own business — now yours to run yours',
      title:
        'ATS handles hiring. We built it because the tools on the market cost too much.',
      subtitle:
        'See what it actually does, and ask for a quote.',
    },
    tabs: {
      ats: 'ATS — Hiring',
    },
    products: {
      ats: {
        name: 'ATS',
        tagline: 'Applicant Tracking System',
        description:
          'Every job posting, application, interview, and offer letter in one place. Built after watching a hiring manager track candidates across four WhatsApp groups and a shared spreadsheet — we figured there was a better way, so we built it for ourselves first, then for clients.',
        trace: {
          label: 'A candidate moving through the system',
          lines: [
            'candidate applied → Frontend Developer, custom fields filled',
            'HR moved candidate → Interview',
            'interview scheduled → Thu 11:00 AM, scored questions attached',
            'interview completed → score 82/100, above threshold',
            'offer generated from template → sent by email, opened in 4 min',
            'contract generated → downloaded as PDF, candidate marked Hired',
          ],
        },
        capabilities: [
          'Post a job with whatever custom fields the role needs, and get a link to share anywhere — LinkedIn, Facebook, any platform',
          'Filter applicants with deep search across every field, not just name and status',
          "Move a candidate's status yourself, with a reason attached, so the history explains itself later",
          'Choose per company whether applicants get an automatic confirmation email on submission',
          'Email candidates from inside the system and see exactly what happened — sent, delivered, opened, clicked, bounced',
          'See a full history per applicant: every status change, offer, contract, and email in one timeline',
          'Build offers and contracts from templates instead of writing them from scratch each time, and send offers by email or download contracts as PDF',
          "Schedule interviews with scored questions, and set a threshold so it's clear who passed",
          'Assign a user to specific companies and departments, so they only see applicants for the jobs that are theirs to see',
          'Relabel the sidebar per company so your team sees the statuses and jobs that matter to them, not a generic menu',
        ],
        notes:
          'Email sending is capped at 100 per day across the system; teams that need more can talk to us about a higher limit.',
      },

    },
    tiersSection: {
      title: 'Plans',
      subtitle:
        "How we tier each product, based on team size and how much automation you need. Exact pricing is set per client for now — tell us your team size and we'll tell you which one fits.",
      ctaLabel: 'Get a quote',
    },
    quoteForm: {
      title: 'Get a quote',
      subtitle:
        "Tell us a bit about your team and which product you need. We'll follow up with sizing and a price — no payment on this page.",
      fields: {
        name: 'Your name',
        company: 'Company name',
        phone: 'Phone / WhatsApp',
        product: 'Which product?',
        tier: 'Which plan looks closest?',
        teamSize: 'Team size',
        notes: 'Anything else we should know?',
      },
      productOptions: [
        { value: 'ats', label: 'ATS — Hiring' },
      ],
      submit: 'Send request',
      sending: 'Sending…',
      successTitle: 'Got it.',
      successMessage:
        "We'll reach out on the number you gave us, usually within a business day, to size the plan and send a quote.",
      errorMessage:
        'Something went wrong sending this. Try again, or just WhatsApp us at 01080099757.',
      privacyNote: 'No payment happens here — this just gets a quote started.',
    },
  },
  ar: {
    hero: {
      eyebrow: 'أداتين بنستخدمهم في تشغيل شركتنا — دلوقتي تقدر تستخدمهم لشركتك',
      title: 'ATS بيدير التوظيف. بنيناه لأن الأدوات الموجودة في السوق غالية جدًا.',
      subtitle: 'شوف بيشتغل إزاي، واطلب عرض سعر.',
    },
    tabs: {
      ats: 'ATS — توظيف',
    },
    products: {
      ats: {
        name: 'ATS',
        tagline: 'نظام تتبع المتقدمين للوظائف',
        description:
          'كل إعلان وظيفة، وطلب تقديم، ومقابلة، وخطاب عرض في مكان واحد. بنيناه بعد ما شفنا مسؤول توظيف بيتابع المتقدمين على أربع جروبات واتساب وشيت إكسل مشترك — حسينا إن لازم يكون فيه طريقة أحسن.',
        trace: {
          label: 'متقدم بيتحرك في النظام',
          lines: [
            'تقديم جديد ← مطور Frontend، الحقول المخصصة متعبية',
            'انتقل إلى ← مقابلة',
            'تحديد مقابلة ← الخميس 11:00 ص، أسئلة مُقيّمة مرفقة',
            'انتهت المقابلة ← النتيجة 82/100، فوق الحد المطلوب',
            'إنشاء عرض من قالب ← تم الإرسال بالإيميل، تم فتحه بعد 4 دقايق',
            'إنشاء عقد ← تم تحميله PDF، المتقدم اتعلّم Hired',
          ],
        },
        capabilities: [
          'نشر وظيفة بالحقول المخصصة اللي تحتاجها، والحصول على لينك تنشره في أي مكان — LinkedIn أو Facebook أو غيره',
          'فلترة المتقدمين بحث عميق على كل الحقول، مش بس الاسم والحالة',
          'تغيير حالة المتقدم بنفسك، مع سبب مرفق، عشان السجل يوضح نفسه بعدين',
          'تحديد لكل شركة هل تبعت إيميل تأكيد تلقائي عند التقديم أو لا',
          'إرسال إيميلات للمتقدمين من داخل النظام ومعرفة اللي حصل بالظبط — تم الإرسال، التسليم، الفتح، الضغط، أو الارتداد',
          'سجل كامل لكل متقدم: كل تغيير حالة، وعرض، وعقد، وإيميل في تايملاين واحد',
          'بناء عروض وعقود من قوالب جاهزة بدل كتابتها من الصفر كل مرة، وإرسال العروض بالإيميل أو تحميل العقود PDF',
          'تحديد مقابلات بأسئلة مُقيّمة، وتحديد حد أدنى يوضح مين عدى',
          'تخصيص مستخدم لشركات وأقسام معينة، عشان يشوف بس المتقدمين للوظايف اللي تخصه',
          'تغيير تسميات الشريط الجانبي لكل شركة عشان فريقك يشوف الحالات والوظايف اللي تهمه، مش قايمة عامة',
        ],
        notes:
          'إرسال الإيميلات محدد بـ 100 إيميل يوميًا على مستوى النظام؛ الفرق اللي محتاجة أكتر تتواصل معانا لرفع الحد.',
      },

    },
    tiersSection: {
      title: 'الباقات',
      subtitle:
        'طريقة تقسيم الباقات لكل منتج، حسب حجم الفريق ومستوى الأتمتة المطلوب. الأسعار الدقيقة بتتحدد حسب كل عميل دلوقتي — قولنا حجم فريقك وهنقولك أنسب باقة.',
      ctaLabel: 'اطلب عرض سعر',
    },
    quoteForm: {
      title: 'اطلب عرض سعر',
      subtitle:
        'قولنا عن فريقك وأنت محتاج أي منتج. هنتواصل معاك بعد كده بالتفاصيل والسعر — مفيش دفع في الصفحة دي.',
      fields: {
        name: 'اسمك',
        company: 'اسم الشركة',
        phone: 'تليفون / واتساب',
        product: 'أي منتج؟',
        tier: 'أقرب باقة ليك؟',
        teamSize: 'حجم الفريق',
        notes: 'حاجة تانية تحب تقولها؟',
      },
      productOptions: [
        { value: 'ats', label: 'ATS — التوظيف' },
      ],
      submit: 'إرسال الطلب',
      sending: 'جاري الإرسال…',
      successTitle: 'تم.',
      successMessage:
        'هنتواصل معاك على الرقم اللي كتبته، عادةً خلال يوم عمل، لتحديد التفاصيل والسعر.',
      errorMessage:
        'حصل خطأ في الإرسال. جرب تاني، أو راسلنا على واتساب 01080099757.',
      privacyNote: 'مفيش دفع هنا — ده مجرد بداية لطلب عرض السعر.',
    },
  },
};

// Real, reasoned tier gating per product. Pricing is not shown — only
// feature gating, which has been confirmed. Each product has its own
// row set since CRM and ATS scale on different axes.

export const tiers = {
  ats: {
    rowOrder: [
      'companies',
      'departments',
      'users',
      'history',
      'emailTracking',
      'templates',
      'interviews',
      'sidebar',
      'support',
    ],
    en: {
      rowLabels: {
        companies: 'Companies per user',
        departments: 'Department-level access scoping',
        users: 'Users',
        history: 'Applicant history / audit trail',
        emailTracking: 'Email tracking',
        templates: 'Job, offer & contract templates',
        interviews: 'Interview scoring & thresholds',
        sidebar: 'Custom sidebar labels',
        support: 'Support',
      },
      plans: [
        {
          name: 'Starter',
          price: 3000,
          blurb: 'Post a job, collect applicants, hire',
          rows: {
            companies: '1',
            departments: '—',
            users: 'Up to 5',
            history: 'Included',
            emailTracking: 'Sent confirmation',
            templates: '—',
            interviews: '—',
            sidebar: '—',
            support: 'Email',
          },
        },
        {
          name: 'Growth',
          price: 5000,
          blurb: 'Run hiring like an HR team',
          highlighted: true,
          rows: {
            companies: 'Up to 3',
            departments: 'Included',
            users: 'Up to 20',
            history: 'Included',
            emailTracking: '+ delivery & open tracking',
            templates: 'Included',
            interviews: 'Included',
            sidebar: 'Included',
            support: 'Priority',
          },
        },
        {
          name: 'Enterprise',
          blurb: 'Hiring across a whole organization',
          rows: {
            companies: 'Unlimited',
            departments: 'Included, granular',
            users: 'Unlimited',
            history: 'Included',
            emailTracking: '+ click & bounce analytics',
            templates: 'Included, per-department',
            interviews: 'Included',
            sidebar: 'Included',
            support: 'Dedicated contact',
          },
        },
      ],
    },
    ar: {
      rowLabels: {
        companies: 'الشركات لكل مستخدم',
        departments: 'تحديد الوصول على مستوى الأقسام',
        users: 'المستخدمين',
        history: 'سجل المتقدمين الكامل',
        emailTracking: 'تتبع الإيميلات',
        templates: 'قوالب الوظائف والعروض والعقود',
        interviews: 'تقييم المقابلات وتحديد الحدود',
        sidebar: 'تسميات مخصصة للشريط الجانبي',
        support: 'الدعم',
      },
      plans: [
        {
          name: 'المبدئية',
          price: 3000,
          blurb: 'نشر وظيفة، استقبال متقدمين، توظيف',
          rows: {
            companies: '1',
            departments: '—',
            users: 'حتى 5',
            history: 'متوفر',
            emailTracking: 'تأكيد الإرسال',
            templates: '—',
            interviews: '—',
            sidebar: '—',
            support: 'بالإيميل',
          },
        },
        {
          name: 'النمو',
          price: 5000,
          blurb: 'إدارة التوظيف بطريقة فريق HR حقيقي',
          highlighted: true,
          rows: {
            companies: 'حتى 3',
            departments: 'متوفر',
            users: 'حتى 20',
            history: 'متوفر',
            emailTracking: '+ تتبع التسليم والفتح',
            templates: 'متوفر',
            interviews: 'متوفر',
            sidebar: 'متوفر',
            support: 'دعم ذو أولوية',
          },
        },
        {
          name: 'المؤسسات',
          blurb: 'توظيف على مستوى مؤسسة كاملة',
          rows: {
            companies: 'غير محدود',
            departments: 'متوفر، تفصيلي',
            users: 'غير محدود',
            history: 'متوفر',
            emailTracking: '+ تحليلات الضغط والارتداد',
            templates: 'متوفر، لكل قسم',
            interviews: 'متوفر',
            sidebar: 'متوفر',
            support: 'مسؤول تواصل مخصص',
          },
        },
      ],
    },
  },
};

export default servicesContent;
