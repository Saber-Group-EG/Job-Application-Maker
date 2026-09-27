// Terms and conditions applicants must accept, as an ordered list with an
// "add" row and inline editing.
import { useState } from 'react';
import { Check, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { Button, Card, CardToolbar, EmptyState, IconButton, SectionTitle } from '../../../../components/ui/kit';
import BilingualField from './BilingualField';
import type { JobForm, SetJobForm } from './types';

export default function TermsCard({ form, setForm }: { form: JobForm; setForm: SetJobForm }) {
  const { t } = useLocale();
  const [draft, setDraft] = useState('');
  const [draftAr, setDraftAr] = useState('');
  const [editing, setEditing] = useState<number | null>(null);

  const add = () => {
    if (!draft.trim() && !draftAr.trim()) return;
    setForm((prev) => ({
      ...prev,
      termsAndConditions: [...prev.termsAndConditions, draft],
      termsAndConditionsAr: [...prev.termsAndConditionsAr, draftAr],
    }));
    setDraft('');
    setDraftAr('');
  };

  const remove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter((_, i) => i !== index),
      termsAndConditionsAr: prev.termsAndConditionsAr.filter((_, i) => i !== index),
    }));
    if (editing === index) setEditing(null);
  };

  const setTerm = (index: number, lang: 'en' | 'ar', value: string) =>
    setForm((prev) => {
      const key = lang === 'en' ? 'termsAndConditions' : 'termsAndConditionsAr';
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<ScrollText className="size-4" />}>
            {t('createTerms', 'jobs')}
            {form.termsAndConditions.length > 0 && (
              <span className="ms-1 font-normal text-slate-400">({form.termsAndConditions.length})</span>
            )}
          </SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('createTermsDesc', 'jobs')}</p>
        </div>
      </CardToolbar>

      {form.termsAndConditions.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-6" />} title={t('cjNoTerms', 'jobs')} text={t('cjNoTermsHint', 'jobs')} />
      ) : (
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {form.termsAndConditions.map((term, index) => {
            const termAr = form.termsAndConditionsAr[index] || '';
            return (
              <li key={index} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {index + 1}
                </span>
                {editing === index ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <BilingualField
                      en={term}
                      ar={termAr}
                      onEn={(v) => setTerm(index, 'en', v)}
                      onAr={(v) => setTerm(index, 'ar', v)}
                      bilingual={form.bilingual}
                      onEnter={() => setEditing(null)}
                      autoFocus
                      size="sm"
                    />
                    <Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={() => setEditing(null)}>
                      {t('createConfirmChanges', 'jobs')}
                    </Button>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                    <p className={term ? 'text-slate-800 dark:text-slate-100' : 'italic text-slate-400'}>
                      {term || t('createEmptyTerm', 'jobs')}
                    </p>
                    {form.bilingual && (
                      <p dir="rtl" className={`text-start ${termAr ? 'text-slate-600 dark:text-slate-300' : 'italic text-slate-400'}`}>
                        {termAr || 'فارغ'}
                      </p>
                    )}
                  </div>
                )}
                {editing !== index && (
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton label={t('createQuickEdit', 'jobs')} onClick={() => setEditing(index)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton tone="danger" label={t('createDelete', 'jobs')} onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20">
        <BilingualField
          label={t('createNewTerm', 'jobs')}
          en={draft}
          ar={draftAr}
          onEn={setDraft}
          onAr={setDraftAr}
          bilingual={form.bilingual}
          placeholder={form.bilingual ? t('createTermEnPlaceholder', 'jobs') : t('createTermPlaceholder', 'jobs')}
          placeholderAr="أضف شرط أو حكم..."
          onEnter={add}
        />
        <Button onClick={add} disabled={!draft.trim() && !draftAr.trim()} icon={<Plus className="size-4" />}>
          {t('createAddTerm', 'jobs')}
        </Button>
      </div>
    </Card>
  );
}
