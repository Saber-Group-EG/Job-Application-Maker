import { useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Layers, FileText, X } from 'lucide-react';
import { useCompanies } from '../../hooks/queries/useCompanies';
import type { SectionTemplate } from '../../types/companies';
import type { FormSection } from '../modals/JobOffersModal/JobOffersModal';

const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  docType: 'offer' | 'contract';
  onInsert: (section: FormSection) => void;
  inline?: boolean; // ← new
};

export default function SectionTemplatePicker({
  isOpen,
  onClose,
  docType,
  onInsert,
  inline = false,
}: Props) {
  const { data: companies = [] } = useCompanies();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allTemplates = useMemo(() => {
    const key =
      docType === 'offer'
        ? 'offerSectionTemplates'
        : 'contractSectionTemplates';
    const seen = new Set<string>();
    const result: SectionTemplate[] = [];
    for (const company of companies as any[]) {
      const templates: SectionTemplate[] = company?.settings?.[key] ?? [];
      for (const t of templates) {
        const dedupKey = `${t.category}__${t.title.en}__${t.title.ar}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          result.push(t);
        }
      }
    }
    return result;
  }, [companies, docType]);

  const grouped = useMemo(() => {
    return allTemplates.reduce<Record<string, SectionTemplate[]>>((acc, t) => {
      const cat = t.category || 'general';
      (acc[cat] ??= []).push(t);
      return acc;
    }, {});
  }, [allTemplates]);

  const categories = Object.keys(grouped);

  const handleInsert = (t: SectionTemplate) => {
    onInsert({
      _id: uid(),
      title: { en: t.title.en, ar: t.title.ar },
      items: t.items.map((i) => ({ _id: uid(), en: i.en, ar: i.ar })),
      displayOrder: 0,
    });
    onClose();
    setSelectedCategory(null);
  };

  const handleClose = () => {
    onClose();
    setSelectedCategory(null);
  };

  if (!isOpen) return null;

  // ── Shared inner content ──────────────────────────────────────────────────
  const header = (
    <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      {selectedCategory && (
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Layers className="size-4 shrink-0 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {selectedCategory ? (
            <span className="capitalize">{selectedCategory}</span>
          ) : (
            'Section Templates'
          )}
        </h3>
        {selectedCategory && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
            {grouped[selectedCategory]?.length ?? 0}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="size-4" />
      </button>
    </div>
  );

  const body = (
    <div
      className="overflow-y-auto"
      style={{ maxHeight: inline ? '14rem' : '60vh' }}
    >
      {allTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Layers className="mb-2 size-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">
            No section templates found
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Add templates in Settings →{' '}
            {docType === 'offer' ? 'Offer' : 'Contract'} Templates
          </p>
        </div>
      ) : !selectedCategory ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {categories.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Layers className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {cat}
                  </p>
                  <p className="text-xs text-slate-400">
                    {grouped[cat].length} section
                    {grouped[cat].length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {(grouped[selectedCategory] ?? []).map((t, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleInsert(t)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {t.title.en || t.title.ar}
                  </p>
                  {t.title.en && t.title.ar && (
                    <p className="text-xs text-slate-400" dir="rtl">
                      {t.title.ar}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.items.length} item{t.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-500/30 dark:bg-slate-900">
      {header}
      {body}
    </div>
  );
}
