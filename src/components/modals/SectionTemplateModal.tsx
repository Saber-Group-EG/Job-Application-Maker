import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Plus, Trash2, ChevronDown, GripVertical, Languages } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  SectionTemplate,
  SectionTemplateItem,
} from '../../types/companies';
import { translateText } from '../../utils/translate';
import { useLocale } from '../../context/LocaleContext';

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
  const { t, dir } = useLocale();
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
          placeholder={t('categoryPlaceholder', 'modals')}
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
          className={`absolute ${dir === 'ltr' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-slate-400`}
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

// ─── Sortable Item ─────────────────────────────────────────────────────────────
function SortableItemRow({
  item,
  idx,
  onPatch,
  onRemove,
}: {
  item: SectionTemplateItem & { _id: string };
  idx: number;
  onPatch: (patch: Partial<SectionTemplateItem>) => void;
  onRemove: () => void;
}) {
  const { t: tRow } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 ${
        isDragging ? 'rounded-lg border border-brand-400 bg-white p-2 shadow-lg ring-2 ring-brand-500 dark:bg-slate-800' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-2.5 flex cursor-grab items-center justify-center rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300"
      >
        <GripVertical className="size-3.5" />
      </div>
      <span className="mt-2.5 w-5 shrink-0 text-center text-[11px] font-bold text-slate-400">
        {idx + 1}
      </span>
      <div className="grid flex-1 grid-cols-2 gap-2">
        <textarea
          className={textareaCls}
          rows={2}
          value={item.en}
          onChange={(e) => onPatch({ en: e.target.value })}
          placeholder={tRow('itemTextEn', 'modals')}
        />
        <div className="relative">
          <textarea
            className={textareaCls}
            rows={2}
            value={item.ar}
            onChange={(e) => onPatch({ ar: e.target.value })}
            placeholder={tRow('itemTextAr', 'modals')}
            dir="rtl"
          />
          <button
            type="button"
            onClick={async () => {
              if (item.en.trim()) {
                const tText = await translateText(item.en, 'en', 'ar');
                if (tText) onPatch({ ar: tText });
              } else if (item.ar.trim()) {
                const tText = await translateText(item.ar, 'ar', 'en');
                if (tText) onPatch({ en: tText });
              }
            }}
            disabled={!item.en.trim() && !item.ar.trim()}
            className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
            title={item.en.trim() ? tRow('translateEnToAr', 'modals') : tRow('translateArToEn', 'modals')}
          >
            <Languages className="size-3" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function SectionTemplateModal({
  isOpen,
  onClose,
  onSave,
  editing,
  existingCategories,
}: Props) {
  const { t } = useLocale();
  const [category, setCategory] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [items, setItems] = useState<(SectionTemplateItem & { _id: string })[]>(
    []
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // populate when editing
  useEffect(() => {
    if (editing) {
      setCategory(editing.category ?? '');
      setTitleEn(editing.title.en);
      setTitleAr(editing.title.ar);
      setItems(
        (editing.items ?? []).map((i) => ({ ...i, _id: i._id ?? uid() }))
      );
    } else {
      setCategory('');
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

  const handleItemDragStart = useCallback((event: DragStartEvent) => {
    setActiveItemId(event.active.id as string);
  }, []);

  const handleItemDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItemId(null);
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i._id === active.id);
        const newIndex = prev.findIndex((i) => i._id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  }, []);

  const handleItemDragCancel = useCallback(() => {
    setActiveItemId(null);
  }, []);

  const translateAll = async () => {
    setTranslatingAll(true);
    try {
      if (titleEn.trim()) {
        const t = await translateText(titleEn, 'en', 'ar');
        if (t) setTitleAr(t);
      } else if (titleAr.trim()) {
        const t = await translateText(titleAr, 'ar', 'en');
        if (t) setTitleEn(t);
      }
      const itemResults = await Promise.all(
        items.map(async (item) => {
          if (item.en.trim()) {
            const t = await translateText(item.en, 'en', 'ar');
            return t ? { _id: item._id, target: 'ar' as const, text: t } : null;
          } else if (item.ar.trim()) {
            const t = await translateText(item.ar, 'ar', 'en');
            return t ? { _id: item._id, target: 'en' as const, text: t } : null;
          }
          return null;
        })
      );
      setItems((prev) =>
        prev.map((item) => {
          const r = itemResults.find((x) => x?._id === item._id);
          if (!r) return item;
          return r.target === 'ar' ? { ...item, ar: r.text } : { ...item, en: r.text };
        })
      );
    } finally {
      setTranslatingAll(false);
    }
  };

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
            {editing ? t('editSectionTemplate', 'modals') : t('newSectionTemplate', 'modals')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={translateAll}
              disabled={translatingAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              title={t('translateEnToAr', 'modals')}
              >
                {translatingAll ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
                ) : (
                  <Languages className="size-3.5" />
                )}
                {t('translateAll', 'modals')}
              </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Category */}
          <div>
            <Label>{t('category', 'modals')}</Label>
            <CategoryCombobox
              value={category}
              onChange={setCategory}
              existingCategories={existingCategories}
            />
          </div>

          {/* Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('titleEn', 'modals')}</Label>
              <input
                className={inputCls}
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={t('titleEnPlaceholder', 'modals')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>{t('titleAr', 'modals')}</Label>
                <button
                  type="button"
                  onClick={async () => {
                    if (titleEn.trim()) {
                      const t = await translateText(titleEn, 'en', 'ar');
                      if (t) setTitleAr(t);
                    } else if (titleAr.trim()) {
                      const t = await translateText(titleAr, 'ar', 'en');
                      if (t) setTitleEn(t);
                    }
                  }}
                  disabled={!titleEn.trim() && !titleAr.trim()}
                  className="flex size-5 items-center justify-center rounded text-slate-400 transition hover:text-brand-600 disabled:opacity-30"
                  title={titleEn.trim() ? t('translateEnToAr', 'modals') : t('translateArToEn', 'modals')}
                >
                  <Languages className="size-3" />
                </button>
              </div>
              <input
                className={inputCls}
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={t('titleArPlaceholder', 'modals')}
                dir="rtl"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <Label>{t('items', 'modals')}</Label>
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleItemDragStart}
                onDragEnd={handleItemDragEnd}
                onDragCancel={handleItemDragCancel}
              >
                <SortableContext
                  items={items.map((i) => i._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item, idx) => (
                    <SortableItemRow
                      key={item._id}
                      item={item}
                      idx={idx}
                      onPatch={(patch) => patchItem(item._id, patch)}
                      onRemove={() => removeItem(item._id)}
                    />
                  ))}
                </SortableContext>
                {activeItemId && items.find((i) => i._id === activeItemId) ? (
                  <DragOverlay>
                    <div className="rounded-lg border border-brand-400 bg-white p-3 shadow-xl dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-3.5 text-brand-500" />
                        <span className="text-xs font-semibold text-slate-500">
                          Item {items.findIndex((i) => i._id === activeItemId) + 1}
                        </span>
                      </div>
                    </div>
                  </DragOverlay>
                ) : null}
              </DndContext>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <Plus className="size-3.5" /> {t('addItem', 'modals')}
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
            {t('cancel', 'modals')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!titleEn.trim() && !titleAr.trim()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editing ? t('saveChanges', 'modals') : t('addTemplate', 'modals')}
          </button>
        </div>
      </div>
    </div>
  );
}
