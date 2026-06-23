import { useState } from 'react';
import { JobOffer } from '../../../services/jobOffersService';
import { useJobOfferTemplates } from '../../../hooks/queries/useJobOffers';
import { ChevronDown, FileText } from 'lucide-react';
import { useCompanies } from '../../../hooks/queries';
import { useLocale } from '../../../context/LocaleContext';

export function TemplateSelector({
  onSelect,
}: {
  onSelect: (template: JobOffer) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const { data } = useCompanies();
  const companyId = data?.map((c) => c._id);
  const { data: templatesData, isLoading } = useJobOfferTemplates(companyId);
  const templates = templatesData?.data ?? [];

  if (templates.length === 0 && !isLoading) return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            {t('loadFromTemplate', 'modals')}
          </span>
          <span className="text-xs text-brand-500 dark:text-brand-400">
            {t('prefillFormTemplate', 'modals')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-slate-800 dark:text-brand-300"
        >
          {open ? t('hide', 'modals') : t('chooseTemplate', 'modals')}
          <ChevronDown
            className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-brand-100 dark:bg-brand-500/10"
                />
              ))}
            </div>
          ) : (
            templates.map((tmpl) => (
              <button
                key={tmpl._id}
                type="button"
                onClick={() => {
                  onSelect(tmpl);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/40"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {tmpl.position.en || tmpl.position.ar || t('untitledOffer', 'modals')}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{tmpl.workType}</span>
                    {tmpl.salary.basic != null && (
                      <>
                        <span>·</span>
                        <span>
                          {tmpl.salary.basic.toLocaleString()} {tmpl.salary.currency}
                        </span>
                      </>
                    )}
                    {tmpl.commissions.length > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {t('commissionCount', 'modals', { count: tmpl.commissions.length })}
                        </span>
                      </>
                    )}
                    {tmpl.sections.length > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {t('sectionCount', 'modals', { count: tmpl.sections.length })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
