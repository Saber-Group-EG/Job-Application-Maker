// Scoring criteria: weighted specs applicants are scored against. Weights
// should total 100%.
import { useState } from 'react';
import { AlertTriangle, Check, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { AdornedInput, Button, Card, CardToolbar, EmptyState, Field, IconButton, SectionTitle } from '../../../../components/ui/kit';
import BilingualField from './BilingualField';
import { patchSpec } from './jobFormUtils';
import type { JobForm, JobSpecDraft, SetJobForm } from './types';

export default function JobSpecsCard({ form, setForm }: { form: JobForm; setForm: SetJobForm }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState<number | null>(null);
  const totalWeight = form.jobSpecs.reduce((sum, spec) => sum + spec.weight, 0);

  const change = (index: number, patch: Partial<JobSpecDraft>) => setForm((prev) => patchSpec(prev, index, patch));

  const add = () => {
    setForm((prev) => ({ ...prev, jobSpecs: [...prev.jobSpecs, { spec: '', specAr: '', weight: 0 }] }));
    setEditing(form.jobSpecs.length);
  };

  const remove = (index: number) => {
    setForm((prev) => ({ ...prev, jobSpecs: prev.jobSpecs.filter((_, i) => i !== index) }));
    if (editing === index) setEditing(null);
  };

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Scale className="size-4" />}>{t('createSpecs', 'jobs')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('createSpecsDesc', 'jobs')}</p>
        </div>
        {form.jobSpecs.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('createCumulativeWeight', 'jobs')}</span>
            <span
              className={`rounded-md px-2 py-0.5 font-semibold tabular-nums ${
                totalWeight === 100
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
              }`}
            >
              {totalWeight}%
            </span>
          </div>
        )}
      </CardToolbar>

      {form.jobSpecs.length > 0 && totalWeight !== 100 && (
        <p role="status" className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="size-3.5 shrink-0" />
          {t('createSpecsTotalWarning', 'jobs')}
        </p>
      )}

      {form.jobSpecs.length === 0 ? (
        <EmptyState icon={<Scale className="size-6" />} title={t('cjNoSpecs', 'jobs')} text={t('cjNoSpecsHint', 'jobs')} />
      ) : (
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {form.jobSpecs.map((spec, index) => (
            <li key={index} className="px-4 py-3">
              {editing === index ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                    <BilingualField
                      label={t('createSpecName', 'jobs')}
                      en={spec.spec}
                      ar={spec.specAr || ''}
                      onEn={(v) => change(index, { spec: v })}
                      onAr={(v) => change(index, { specAr: v })}
                      bilingual={form.bilingual}
                      onEnter={() => setEditing(null)}
                      autoFocus
                    />
                    <Field label={t('createWeightPercent', 'jobs')} htmlFor={`cj-spec-weight-${index}`}>
                      <AdornedInput
                        id={`cj-spec-weight-${index}`}
                        unit="%"
                        type="number"
                        min="0"
                        max="100"
                        dir="ltr"
                        value={spec.weight}
                        onChange={(e) => change(index, { weight: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <Button size="sm" variant="success" icon={<Check className="size-4" />} onClick={() => setEditing(null)}>
                    {t('createUpdateSpec', 'jobs')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className={spec.spec ? 'truncate text-slate-800 dark:text-slate-100' : 'italic text-slate-400'}>
                      {spec.spec || t('createUndefinedSpec', 'jobs')}
                    </p>
                    {form.bilingual && (
                      <p dir="rtl" className={`truncate text-start ${spec.specAr ? 'text-slate-600 dark:text-slate-300' : 'italic text-slate-400'}`}>
                        {spec.specAr || 'غير محدد'}
                      </p>
                    )}
                  </div>
                  <div className="hidden w-28 items-center gap-2 sm:flex">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.min(Math.max(spec.weight, 0), 100)}%` }} />
                    </span>
                  </div>
                  <span className="w-12 text-end text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{spec.weight}%</span>
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton label={t('cjEditSpec', 'jobs')} onClick={() => setEditing(index)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton tone="danger" label={t('createDelete', 'jobs')} onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <Button onClick={add} icon={<Plus className="size-4" />}>
          {t('createAddSpec', 'jobs')}
        </Button>
      </div>
    </Card>
  );
}
