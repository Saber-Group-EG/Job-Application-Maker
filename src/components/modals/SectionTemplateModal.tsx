import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type {
  SectionTemplate,
  SectionTemplateItem,
} from '../../types/companies';

// ─── tiny uid ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── shared input/textarea classes (matching codebase) ───────────────────────
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400';

const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 resize-none';

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
    {children}
  </label>
);

// ─── Category Combobox ────────────────────────────────────────────────────────
function CategoryCombobox({
  value,
  onChange,
  existingCategories,
}: {
  value: string;
  onChange: (v: string) => void;
  existingCategories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // sync external value → local query
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = existingCategories.filter(
    (c) => c.toLowerCase().includes(query.toLowerCase()) && c !== query
  );
  const showCreate = query.trim() && !existingCategories.includes(query.trim());

  const select = (val: string) => {
    onChange(val);
    setQuery(val);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className={inputCls}
          value={query}
          placeholder="e.g. Legal, Benefits, Terms…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => select(cat)}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
            >
              {cat}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={() => select(query.trim())}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              <Plus className="size-3.5" />
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: SectionTemplate) => void;
  editing: SectionTemplate | null;
  existingCategories: string[];
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function SectionTemplateModal({
  isOpen,
  onClose,
  onSave,
  editing,
  existingCategories,
}: Props) {
  const [category, setCategory] = useState('general');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [items, setItems] = useState<(SectionTemplateItem & { _id: string })[]>(
    []
  );

  // populate when editing
  useEffect(() => {
    if (editing) {
      setCategory(editing.category ?? 'general');
      setTitleEn(editing.title.en);
      setTitleAr(editing.title.ar);
      setItems(
        (editing.items ?? []).map((i) => ({ ...i, _id: i._id ?? uid() }))
      );
    } else {
      setCategory('general');
      setTitleEn('');
      setTitleAr('');
      setItems([]);
    }
  }, [editing, isOpen]);

  const addItem = () =>
    setItems((prev) => [...prev, { _id: uid(), en: '', ar: '' }]);

  const patchItem = (id: string, patch: Partial<SectionTemplateItem>) =>
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...patch } : i))
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i._id !== id));

  const handleSave = () => {
    if (!titleEn.trim() && !titleAr.trim()) return;
    onSave({
      ...(editing?._id ? { _id: editing._id } : {}),
      category: category.trim() || 'general',
      title: { en: titleEn.trim(), ar: titleAr.trim() },
      items: items.map(({ _id, ...rest }) => ({ _id, ...rest })),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative z-10 flex w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editing ? 'Edit Section Template' : 'New Section Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Category */}
          <div>
            <Label>Category</Label>
            <CategoryCombobox
              value={category}
              onChange={setCategory}
              existingCategories={existingCategories}
            />
          </div>

          {/* Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title (EN)</Label>
              <input
                className={inputCls}
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Terms & Conditions"
              />
            </div>
            <div>
              <Label>Title (AR)</Label>
              <input
                className={inputCls}
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="الشروط والأحكام"
                dir="rtl"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <Label>Items</Label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item._id} className="flex items-start gap-2">
                  <span className="mt-2.5 w-5 shrink-0 text-center text-[11px] font-bold text-slate-400">
                    {idx + 1}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item._id)}
                    className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-3.5" /> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!titleEn.trim() && !titleAr.trim()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editing ? 'Save Changes' : 'Add Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
