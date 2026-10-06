// Shared building blocks for the offer / contract editors. The sheet below
// reproduces the markup of the PDF generators (jobOfferPdfGenerator /
// contractPdfGenerator) so the page you type on is the page that prints.

import {
  CSSProperties,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  GripVertical,
  Languages,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SectionTemplatePicker from '../form/SectionTemplatePicker';
import { useLocale } from '../../context/LocaleContext';
import type { FormSection } from '../modals/JobOffersModal/JobOffersModal';
import type { DocLang } from '../../utils/documentLabels';

export type { DocLang };
export type Bi = { en: string; ar: string };

export const otherLang = (l: DocLang): DocLang => (l === 'en' ? 'ar' : 'en');

const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

// ─── Inline fields ───────────────────────────────────────────────────────────

const fieldCls =
  'block w-[calc(100%+0.5rem)] -mx-1 rounded-[3px] border-0 bg-transparent px-1 py-0 outline-none transition placeholder:italic placeholder:font-normal placeholder:text-slate-300 hover:bg-brand-50 focus:bg-brand-50 focus:ring-1 focus:ring-brand-300 resize-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

type InlineProps = {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: 'text' | 'number' | 'date';
  min?: number | string;
  dir?: 'rtl' | 'ltr';
  className?: string;
  style?: CSSProperties;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  inputRef?: React.Ref<HTMLInputElement>;
};

function AutoTextarea({
  value,
  onChange,
  placeholder,
  dir,
  className,
  style,
}: Pick<
  InlineProps,
  'placeholder' | 'dir' | 'className' | 'style'
> & { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, placeholder]);
  return (
    <textarea
      ref={ref}
      rows={1}
      dir={dir}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldCls} overflow-hidden ${className ?? ''}`}
      style={style}
    />
  );
}

export function InlineField({
  value,
  onChange,
  placeholder,
  multiline,
  type = 'text',
  min,
  dir,
  className,
  style,
  onKeyDown,
  inputRef,
}: InlineProps) {
  if (multiline) {
    return (
      <AutoTextarea
        value={String(value)}
        onChange={onChange}
        placeholder={placeholder}
        dir={dir}
        className={className}
        style={style}
      />
    );
  }
  return (
    <input
      ref={inputRef}
      type={type}
      min={min}
      dir={dir}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldCls} ${className ?? ''}`}
      style={style}
    />
  );
}

/** Edits one language of a { en, ar } pair; the other language shows as a hint. */
export function BiField({
  value,
  lang,
  onChange,
  placeholder,
  multiline,
  className,
  style,
  inputRef,
}: {
  value: Bi;
  lang: DocLang;
  onChange: (next: Bi) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const hint = value[otherLang(lang)];
  return (
    <InlineField
      value={value[lang]}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      onChange={(v) => onChange({ ...value, [lang]: v })}
      placeholder={hint || placeholder}
      multiline={multiline}
      className={className}
      style={style}
      inputRef={inputRef}
    />
  );
}

export function InlineSelect({
  value,
  onChange,
  options,
  className,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded-[3px] border-0 bg-transparent px-1 py-0 outline-none transition hover:bg-brand-50 focus:bg-brand-50 focus:ring-1 focus:ring-brand-300 ${className ?? ''}`}
      style={style}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Sheet ───────────────────────────────────────────────────────────────────

export function Paper({
  lang,
  children,
}: {
  lang: DocLang;
  children: ReactNode;
}) {
  const rtl = lang === 'ar';
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={lang}
      className="mx-auto bg-white shadow-xl ring-1 ring-slate-200"
      style={{
        width: '210mm',
        maxWidth: '100%',
        minHeight: '297mm',
        padding: '12mm 10mm',
        color: '#333',
        fontSize: '10pt',
        lineHeight: 1.4,
        fontFamily: rtl
          ? "'Segoe UI', 'Tahoma', Arial, sans-serif"
          : "'Segoe UI', Arial, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export function PaperHeader({
  lang,
  company,
  title,
  date,
}: {
  lang: DocLang;
  company: string;
  title: string;
  date: string;
}) {
  const rtl = lang === 'ar';
  return (
    <div
      style={{
        background: '#242B32',
        color: 'white',
        padding: '15px 20px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        borderRadius: 4,
        flexDirection: rtl ? 'row-reverse' : 'row',
      }}
    >
      <div style={{ fontSize: '12pt', fontWeight: 700 }}>{company || '—'}</div>
      <div style={{ textAlign: rtl ? 'left' : 'right' }}>
        <div style={{ fontSize: '14pt', fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: '9pt', opacity: 0.9, marginTop: 4 }}>{date}</div>
      </div>
    </div>
  );
}

export function PaperTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '16pt',
        fontWeight: 700,
        textAlign: 'center',
        margin: '20px 0',
        color: '#181D21',
      }}
    >
      {children}
    </div>
  );
}

export function PaperBox({
  label,
  lang,
  children,
}: {
  label: string;
  lang: DocLang;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: '#f5f5f5',
        border: '1px solid #e0e0e0',
        borderRadius: 4,
        padding: '12px 15px',
        margin: '15px 0',
      }}
    >
      <div
        style={{
          fontSize: '10pt',
          fontWeight: 700,
          marginBottom: 5,
          color: '#555',
          textAlign: lang === 'ar' ? 'right' : undefined,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function DetailsGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2"
      style={{
        gap: '10px 20px',
        margin: '15px 0',
        padding: 15,
        background: '#fafafa',
        borderRadius: 4,
        border: '1px solid #e0e0e0',
      }}
    >
      {children}
    </div>
  );
}

export function DetailRow({
  label,
  lang,
  children,
}: {
  label: string;
  lang: DocLang;
  children: ReactNode;
}) {
  const rtl = lang === 'ar';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        borderBottom: '1px solid #e0e0e0',
        flexDirection: rtl ? 'row-reverse' : 'row',
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: '#666',
          fontSize: '9pt',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        className="flex min-w-0 flex-1 items-center justify-end gap-1"
        style={{
          fontWeight: 500,
          color: '#333',
          fontSize: '10pt',
          flexDirection: rtl ? 'row-reverse' : 'row',
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function PaperHeading({
  children,
  size = '11pt',
}: {
  children: ReactNode;
  size?: string;
}) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 700,
        color: '#242B32',
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: '2px solid #242B32',
      }}
    >
      {children}
    </div>
  );
}

export function TableHead({ cols }: { cols: [string, string] }) {
  const cell: CSSProperties = {
    background: '#242B32',
    color: 'white',
    padding: '10px 8px',
    fontWeight: 700,
    fontSize: '10pt',
    border: '1px solid #1a1f24',
  };
  return (
    <div className="grid grid-cols-[1fr_auto]">
      <div style={{ ...cell, textAlign: 'start' }}>{cols[0]}</div>
      <div style={{ ...cell, textAlign: 'end', minWidth: 130 }}>{cols[1]}</div>
    </div>
  );
}

export function PaperNotes({
  lang,
  label,
  children,
}: {
  lang: DocLang;
  label: string;
  children: ReactNode;
}) {
  const rtl = lang === 'ar';
  return (
    <div
      style={{
        margin: '20px 0',
        padding: '12px 15px',
        background: '#fff8e1',
        borderRadius: 4,
        ...(rtl
          ? { borderRight: '4px solid #ff9800' }
          : { borderLeft: '4px solid #ff9800' }),
      }}
    >
      <div
        style={{
          fontSize: '10pt',
          fontWeight: 700,
          marginBottom: 6,
          color: '#ff9800',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '9pt', color: '#555', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

export function PaperFooter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 30,
        textAlign: 'center',
        fontSize: '8pt',
        color: '#999',
        borderTop: '1px solid #e0e0e0',
        paddingTop: 15,
      }}
    >
      {children}
    </div>
  );
}

/** Dashed "add" control that only exists on screen, never on the printed page. */
export function AddButton({
  onClick,
  children,
  tone = 'slate',
  icon,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: 'slate' | 'indigo';
  icon?: ReactNode;
}) {
  const toneCls =
    tone === 'indigo'
      ? 'border-indigo-300 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600'
      : 'border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-semibold transition ${toneCls}`}
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
    >
      {icon ?? <Plus className="size-3.5" />}
      {children}
    </button>
  );
}

// ─── Sortable rows ───────────────────────────────────────────────────────────

export function SortableList<T extends { _id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i._id === active.id);
    const to = items.findIndex((i) => i._id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((i) => i._id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** A row that can be dragged, duplicated and removed from the sheet margin. */
export function SortableRow({
  id,
  onDuplicate,
  onRemove,
  children,
  className,
  style,
}: {
  id: string;
  onDuplicate?: () => void;
  onRemove: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  const btn =
    'flex size-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100';
  return (
    <div
      ref={setNodeRef}
      className={`group relative ${isDragging ? 'z-10 rounded bg-brand-50/70 ring-2 ring-brand-300' : ''} ${className ?? ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging
          ? 'none'
          : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
        ...style,
      }}
    >
      <div className="absolute -start-8 top-0 flex flex-col items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`${btn} cursor-grab hover:text-slate-600 active:cursor-grabbing`}
        >
          <GripVertical className="size-3.5" />
        </button>
        {onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            className={`${btn} hover:text-brand-600`}
          >
            <Copy className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className={`${btn} hover:bg-red-50 hover:text-red-600`}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Sections (terms, additional details) ────────────────────────────────────

export function SectionsEditor({
  sections,
  onChange,
  lang,
  docType,
  variant,
}: {
  sections: FormSection[];
  onChange: (next: FormSection[]) => void;
  lang: DocLang;
  docType: 'offer' | 'contract';
  variant: 'offer' | 'contract';
}) {
  const { t } = useLocale();
  const [pickerOpen, setPickerOpen] = useState(false);
  const rtl = lang === 'ar';
  const contract = variant === 'contract';

  const patch = (id: string, p: Partial<FormSection>) =>
    onChange(sections.map((s) => (s._id === id ? { ...s, ...p } : s)));
  const remove = (id: string) => onChange(sections.filter((s) => s._id !== id));
  const duplicate = (id: string) => {
    const idx = sections.findIndex((s) => s._id === id);
    if (idx < 0) return;
    const src = sections[idx];
    const clone = {
      ...src,
      _id: uid(),
      items: src.items.map((i) => ({ ...i, _id: uid() })),
    };
    const next = [...sections];
    next.splice(idx + 1, 0, clone);
    onChange(next);
  };
  const add = () =>
    onChange([
      ...sections,
      {
        _id: uid(),
        title: { en: '', ar: '' },
        items: [],
        displayOrder: sections.length,
      },
    ]);

  const itemLine: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: contract ? '8px 0' : '6px 0',
    flexDirection: rtl ? 'row-reverse' : 'row',
    ...(contract ? { borderBottom: '1px solid #f1f5f9' } : {}),
  };

  return (
    <div>
      <SortableList items={sections} onReorder={onChange}>
        {sections.map((s) => (
          <SortableRow
            key={s._id}
            id={s._id}
            onDuplicate={() => duplicate(s._id)}
            onRemove={() => remove(s._id)}
            style={{ marginBottom: contract ? 24 : 20 }}
          >
            <div
              style={{
                fontSize: contract ? '11pt' : '10pt',
                fontWeight: 700,
                color: '#242B32',
                marginBottom: contract ? 12 : 10,
                paddingBottom: contract ? 8 : 5,
                borderBottom: '2px solid #242B32',
              }}
            >
              <BiField
                value={s.title}
                lang={lang}
                onChange={(title) => patch(s._id, { title })}
                placeholder={t('sectionTitlePlaceholder', 'modals')}
              />
            </div>
            <div
              style={
                rtl
                  ? { paddingRight: contract ? 8 : 15 }
                  : { paddingLeft: contract ? 8 : 15 }
              }
            >
              {s.items.map((item) => (
                <div key={item._id} className="group/item" style={itemLine}>
                  <span
                    style={{
                      color: '#4caf50',
                      fontWeight: 'bold',
                      fontSize: contract ? '11pt' : undefined,
                    }}
                  >
                    ✓
                  </span>
                  <div
                    style={{
                      flex: 1,
                      fontSize: contract ? '10pt' : undefined,
                      color: contract ? '#334155' : undefined,
                      lineHeight: contract ? 1.5 : undefined,
                    }}
                  >
                    <BiField
                      multiline
                      value={item}
                      lang={lang}
                      onChange={(next) =>
                        patch(s._id, {
                          items: s.items.map((i) =>
                            i._id === item._id ? { ...i, ...next } : i
                          ),
                        })
                      }
                      placeholder={t('itemPlaceholder', 'modals')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patch(s._id, {
                        items: s.items.filter((i) => i._id !== item._id),
                      })
                    }
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover/item:opacity-100 focus:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <div className="pt-1">
                <AddButton
                  onClick={() =>
                    patch(s._id, {
                      items: [...s.items, { _id: uid(), en: '', ar: '' }],
                    })
                  }
                >
                  {t('addItem', 'modals')}
                </AddButton>
              </div>
            </div>
          </SortableRow>
        ))}
      </SortableList>

      <div className="flex flex-wrap items-center gap-2">
        <AddButton onClick={add}>{t('addSection', 'modals')}</AddButton>
        <AddButton
          tone="indigo"
          icon={<Layers className="size-3.5" />}
          onClick={() => setPickerOpen(true)}
        >
          {t('fromTemplates', 'modals')}
        </AddButton>
      </div>
      <SectionTemplatePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        docType={docType}
        onInsert={(section) => onChange([...sections, section])}
      />
    </div>
  );
}

// ─── Page chrome (toolbar + side panel) ──────────────────────────────────────

export function LangToggle({
  value,
  onChange,
}: {
  value: DocLang;
  onChange: (l: DocLang) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold dark:border-slate-700">
      {(['en', 'ar'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1.5 transition ${
            value === l
              ? 'bg-brand-500 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {l === 'en' ? 'EN' : 'عربي'}
        </button>
      ))}
    </div>
  );
}

export function EditorShell({
  icon,
  title,
  subtitle,
  onBack,
  lang,
  onLangChange,
  onTranslateAll,
  translating,
  onSave,
  saving,
  saveLabel,
  saveIcon,
  side,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onBack: () => void;
  lang: DocLang;
  onLangChange: (l: DocLang) => void;
  onTranslateAll: () => void;
  translating: boolean;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  saveIcon: ReactNode;
  side: ReactNode;
  children: ReactNode;
}) {
  const { t, dir } = useLocale();
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;
  return (
    <div className="-m-3 min-h-screen bg-slate-100 sm:-m-4 md:-m-5 dark:bg-slate-950">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:top-[var(--app-header-h,72px)] dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            title={t('back', 'common')}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Back className="size-4" />
          </button>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LangToggle value={lang} onChange={onLangChange} />
          <button
            type="button"
            onClick={onTranslateAll}
            disabled={translating}
            title={t('translateAll', 'modals')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            {translating ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
            ) : (
              <Languages className="size-3.5" />
            )}
            {t('translateAll', 'modals')}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('cancel', 'modals')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              saveIcon
            )}
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 p-4 xl:flex-row xl:justify-center">
        <div className="order-2 w-full min-w-0 xl:order-1 xl:flex-1">
          <div className="overflow-x-auto pb-10">{children}</div>
        </div>
        <aside className="order-1 w-full shrink-0 space-y-4 xl:order-2 xl:w-80">
          {side}
        </aside>
      </div>
    </div>
  );
}

export function SideCard({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
