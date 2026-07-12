import { useState } from 'react';
import { X, Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { SectionTemplate } from '../../types/companies';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (templates: SectionTemplate[]) => void;
  sourceTemplates: SectionTemplate[];
  sourceLabel: string; // e.g. "Contract Sections"
};

export default function ImportSectionsModal({
  isOpen,
  onClose,
  onImport,
  sourceTemplates,
  sourceLabel,
}: Props) {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // group by category
  const filtered = sourceTemplates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.title.en.toLowerCase().includes(q) ||
      t.title.ar.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, SectionTemplate[]>>(
    (acc, t) => {
      const cat = t.category || 'general';
      (acc[cat] ??= []).push(t);
      return acc;
    },
    {}
  );

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (_: string, ids: string[]) => {
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = sourceTemplates
      .filter((t) => t._id && selected.has(t._id))
      // strip _id so they become new entries in the target
      .map(({ _id, ...rest }) => ({ ...rest }));
    onImport(toImport);
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t('importFrom', 'modals', { label: sourceLabel })}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t('selectTemplatesCopy', 'modals')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* search */}
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800"
              placeholder={t('searchSections', 'modals')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* list */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ maxHeight: '55vh' }}
        >
          {Object.keys(grouped).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {t('noTemplatesFound', 'modals')}
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, templates]) => {
                const ids = templates.map((tmpl) => tmpl._id!).filter(Boolean);
                const allSelected =
                  ids.length > 0 && ids.every((id) => selected.has(id));
                const someSelected = ids.some((id) => selected.has(id));
                const isCollapsed = collapsed.has(cat);

                return (
                  <div
                    key={cat}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    {/* group header */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el)
                            el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => toggleGroup(cat, ids)}
                        className="size-4 cursor-pointer rounded border-slate-300 accent-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleCollapse(cat)}
                        className="flex flex-1 items-center gap-1.5 text-left"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="size-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="size-3.5 text-slate-400" />
                        )}
                        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {cat}
                        </span>
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                          {templates.length}
                        </span>
                      </button>
                    </div>

                    {/* group items */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {templates.map((tmpl) => (
                          <label
                            key={tmpl._id}
                            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(tmpl._id!)}
                              onChange={() => toggleItem(tmpl._id!)}
                              className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 accent-brand-500"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {locale === 'ar' ? (tmpl.title.ar || tmpl.title.en) : (tmpl.title.en || tmpl.title.ar)}
                              </p>
                              {tmpl.title.en && tmpl.title.ar && (
                                <p
                                  className="text-xs text-slate-400 dark:text-slate-500"
                                  dir="rtl"
                                >
                                  {tmpl.title.ar}
                                </p>
                              )}
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {tmpl.items.length} item
                                {tmpl.items.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">{t('selected', 'modals', { count: selected.size })}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {t('cancel', 'modals')}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3.5" />
              {t('import', 'modals', { count: selected.size })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
