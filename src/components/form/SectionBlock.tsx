import { ChevronDown, ChevronUp, Copy, GripVertical, Languages, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FormSection,
  FormSectionItem,
  uid,
} from '../modals/JobOffersModal/JobOffersModal';
import { translateText } from '../../utils/translate';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 resize-none';

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
    {children}
  </label>
);

export function SectionBlock({
  section,
  index,
  onChange,
  onRemove,
  onDuplicate,
}: {
  section: FormSection;
  index: number;
  onChange: (patch: Partial<FormSection>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: section._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-xl border ${
        isDragging
          ? 'border-brand-400 shadow-lg ring-2 ring-brand-500'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        <div
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <GripVertical className="size-4" />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
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
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title (EN)</Label>
              <input
                className={inputCls}
                value={section.title.en}
                onChange={(e) =>
                  onChange({ title: { ...section.title, en: e.target.value } })
                }
                placeholder="e.g. Terms & Conditions"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Title (AR)</Label>
                <button
                  type="button"
                  onClick={async () => {
                    if (section.title.en.trim()) {
                      const t = await translateText(section.title.en, 'en', 'ar');
                      if (t) onChange({ title: { ...section.title, ar: t } });
                    } else if (section.title.ar.trim()) {
                      const t = await translateText(section.title.ar, 'ar', 'en');
                      if (t) onChange({ title: { ...section.title, en: t } });
                    }
                  }}
                  disabled={!section.title.en.trim() && !section.title.ar.trim()}
                  className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                  title={section.title.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
                >
                  <Languages className="size-3" />
                </button>
              </div>
              <input
                className={inputCls}
                value={section.title.ar}
                onChange={(e) =>
                  onChange({ title: { ...section.title, ar: e.target.value } })
                }
                placeholder="الشروط والأحكام"
                dir="rtl"
              />
            </div>
          </div>

          {section.items.length > 0 && (
            <div className="space-y-2">
              <Label>
                Items
              </Label>
                  {section.items.map((item, itemIdx) => (
                <div key={item._id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-slate-400">
                    {itemIdx + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={item.en}
                      onChange={(e) =>
                        patchItem(item._id, { en: e.target.value })
                      }
                      placeholder="Item text (EN)"
                    />
                    <div className="relative">
                      <textarea
                        className={textareaCls}
                        rows={2}
                        value={item.ar}
                        onChange={(e) =>
                          patchItem(item._id, { ar: e.target.value })
                        }
                        placeholder="نص العنصر"
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (item.en.trim()) {
                            const t = await translateText(item.en, 'en', 'ar');
                            if (t) patchItem(item._id, { ar: t });
                          } else if (item.ar.trim()) {
                            const t = await translateText(item.ar, 'ar', 'en');
                            if (t) patchItem(item._id, { en: t });
                          }
                        }}
                        disabled={!item.en.trim() && !item.ar.trim()}
                        className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                        title={item.en.trim() ? 'Translate EN → AR' : 'Translate AR → EN'}
                      >
                        <Languages className="size-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item._id)}
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
          >
            <Plus className="size-3.5" /> Add Item
          </button>
        </div>
      )}
    </div>
  );
}
