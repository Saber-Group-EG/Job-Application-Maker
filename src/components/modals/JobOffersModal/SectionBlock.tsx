import { ChevronDown, ChevronUp, Copy, Plus, Trash2, X } from 'lucide-react';
import Label from '../../form/Label';
import { useState } from 'react';
import { FormSection, FormSectionItem, uid } from './JobOffersModal';

export function SectionBlock({
  section,
  index,
  activeLang,
  onChange,
  onRemove,
  onDuplicate,
  inputCls,
}: {
  section: FormSection;
  index: number;
  activeLang: 'en' | 'ar';
  onChange: (patch: Partial<FormSection>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  inputCls: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const patchItem = (itemId: string, patch: Partial<FormSectionItem>) => {
    onChange({
      items: section.items.map((i) =>
        i._id === itemId ? { ...i, ...patch } : i
      ),
    });
  };

  const removeItem = (itemId: string) => {
    onChange({ items: section.items.filter((i) => i._id !== itemId) });
  };

  const addItem = () => {
    onChange({ items: [...section.items, { _id: uid(), en: '', ar: '' }] });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {/* Section header */}
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
          tabIndex={0}
        >
          {collapsed ? (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronUp className="size-4 shrink-0 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {section.title.en || section.title.ar || `Section ${index + 1}`}
          </span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {section.items.length} item{section.items.length !== 1 ? 's' : ''}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            tabIndex={0}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            tabIndex={0}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-4">
          {/* Title fields for both langs always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title (EN)</Label>
              <input
                className={inputCls}
                value={section.title.en}
                onChange={(e) =>
                  onChange({ title: { ...section.title, en: e.target.value } })
                }
                placeholder="e.g. Benefits & Perks"
                tabIndex={0}
              />
            </div>
            <div>
              <Label>Title (AR)</Label>
              <input
                className={inputCls}
                value={section.title.ar}
                onChange={(e) =>
                  onChange({ title: { ...section.title, ar: e.target.value } })
                }
                placeholder="المزايا والامتيازات"
                dir="rtl"
                tabIndex={0}
              />
            </div>
          </div>

          {/* Items */}
          {section.items.length > 0 && (
            <div className="space-y-2">
              <Label>
                Items ({activeLang === 'en' ? 'showing EN' : 'showing AR'})
              </Label>
              {section.items.map((item, itemIdx) => (
                <div key={item._id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-slate-400">
                    {itemIdx + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <input
                      className={inputCls}
                      value={item.en}
                      onChange={(e) =>
                        patchItem(item._id, { en: e.target.value })
                      }
                      placeholder="Item text (EN)"
                      tabIndex={0}
                    />
                    <input
                      className={inputCls}
                      value={item.ar}
                      onChange={(e) =>
                        patchItem(item._id, { ar: e.target.value })
                      }
                      placeholder="نص العنصر"
                      dir="rtl"
                      tabIndex={0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item._id)}
                    tabIndex={0}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addItem}
            tabIndex={0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
          >
            <Plus className="size-3.5" /> Add Item
          </button>
        </div>
      )}
    </div>
  );
}
