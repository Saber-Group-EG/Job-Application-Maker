import { useLocale } from '../../context/LocaleContext';

export type AuthMethod = 'email' | 'whatsapp';

// Email / WhatsApp switch shown above the sign-in and forgot-password forms.
export default function AuthMethodTabs({
  value,
  onChange,
}: {
  value: AuthMethod;
  onChange: (m: AuthMethod) => void;
}) {
  const { t } = useLocale();
  const tabs: { key: AuthMethod; label: string }[] = [
    { key: 'email', label: t('email', 'common') },
    { key: 'whatsapp', label: t('whatsApp', 'common') },
  ];
  return (
    <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            value === tab.key
              ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export const codeInputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm tracking-[0.3em] shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800';

export const primaryButtonClass =
  'w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-400 dark:hover:bg-brand-500';

export const errorBoxClass =
  'p-4 mb-5 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';

export const infoBoxClass =
  'p-4 mb-5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300';
