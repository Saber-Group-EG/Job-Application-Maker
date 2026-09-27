// Small building blocks shared by the job form sections.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { Button, Switch, focusRing } from '../../../../components/ui/kit';
import BilingualField from './BilingualField';

// A labelled on/off setting with an optional explanation.
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      <span className={disabled ? 'pointer-events-none' : ''}>
        <Switch checked={checked} onChange={onChange} label={typeof label === 'string' ? label : ''} />
      </span>
    </div>
  );
}

// Options for choice questions. Adding needs English text; Arabic is kept
// alongside when the job is bilingual.
export function ChoiceListEditor({
  choices,
  choicesAr,
  bilingual,
  onAdd,
  onRemove,
  size = 'md',
}: {
  choices: string[];
  choicesAr?: string[];
  bilingual: boolean;
  onAdd: (en: string, ar: string) => void;
  onRemove: (index: number) => void;
  size?: 'md' | 'sm';
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState('');
  const [draftAr, setDraftAr] = useState('');

  const add = () => {
    if (!draft.trim()) return;
    onAdd(draft, draftAr);
    setDraft('');
    setDraftAr('');
  };

  return (
    <div className="space-y-3">
      {choices.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {choices.map((choice, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white py-1 pe-1 ps-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="text-slate-800 dark:text-slate-100">{choice}</span>
              {bilingual && choicesAr?.[i] && (
                <span className="text-xs text-slate-500 dark:text-slate-400" dir="rtl">
                  · {choicesAr[i]}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={t('cjRemoveChoice', 'jobs', { name: choice })}
                className={`rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 ${focusRing}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <BilingualField
            en={draft}
            ar={draftAr}
            onEn={setDraft}
            onAr={setDraftAr}
            bilingual={bilingual}
            placeholder={t('createChoicePlaceholder', 'jobs')}
            placeholderAr="الخيار بالعربية..."
            onEnter={add}
            size={size}
          />
        </div>
        <Button size={size === 'sm' ? 'sm' : 'md'} onClick={add} disabled={!draft.trim()} icon={<Plus className="size-4" />}>
          {t('cjAddChoice', 'jobs')}
        </Button>
      </div>
    </div>
  );
}
