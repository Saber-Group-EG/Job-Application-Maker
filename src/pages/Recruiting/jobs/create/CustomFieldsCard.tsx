// Custom questions on the application form: add blank ones or pick from the
// saved/recommended libraries, then reorder by dragging.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Bookmark, Check, ChevronDown, Loader2, Plus, SlidersHorizontal, Star } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { Button, Card, CardToolbar, EmptyState, SectionTitle } from '../../../../components/ui/kit';
import CustomFieldEditor from './CustomFieldEditor';
import { convertToString, isLibraryFieldAdded, patchField } from './jobFormUtils';
import type { CustomFieldDraft, JobForm, LibraryField, SetJobForm } from './types';

function FieldLibraryMenu({
  label,
  icon,
  title,
  fields,
  loading,
  source,
  added,
  onAdd,
  addLabel,
}: {
  label: string;
  icon: ReactNode;
  title: string;
  fields: LibraryField[];
  loading: boolean;
  source: 'saved' | 'recommended';
  added: CustomFieldDraft[];
  onAdd: (ids: string[]) => void;
  addLabel: (count: number) => string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    setSelected([]);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));

  return (
    <div ref={ref} className="relative">
      <Button onClick={() => (open ? close() : setOpen(true))} icon={icon} aria-expanded={open}>
        {label}
        <ChevronDown className="size-3.5 text-slate-400" />
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute end-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">{title}</p>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {loading ? (
              <p className="flex items-center justify-center gap-2 p-4 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
              </p>
            ) : fields.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">{t('cjLibraryEmpty', 'jobs')}</p>
            ) : (
              fields.map((f, idx) => {
                const isAdded = isLibraryFieldAdded(added, f.fieldId, source);
                return (
                  <label
                    key={`${f.fieldId}_${idx}`}
                    className={`flex items-start gap-3 rounded-lg p-2.5 ${isAdded ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isAdded || selected.includes(f.fieldId)}
                      disabled={isAdded}
                      onChange={() => toggle(f.fieldId)}
                      className="mt-0.5 size-4 accent-brand-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {convertToString(f.label) || f.fieldId}
                      </span>
                      {!!f.description && (
                        <span className="line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{convertToString(f.description)}</span>
                      )}
                    </span>
                    {isAdded && <Check className="size-4 shrink-0 text-emerald-500" aria-label={t('cjAlreadyAdded', 'jobs')} />}
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 p-2.5 dark:border-slate-800">
            <Button size="sm" variant="ghost" onClick={close}>
              {t('createCancel', 'jobs')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={selected.length === 0}
              onClick={() => {
                onAdd(selected);
                close();
              }}
            >
              {addLabel(selected.length)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomFieldsCard({
  form,
  setForm,
  collapsed,
  onToggleCollapse,
  onAddBlank,
  onRemove,
  savedFields,
  savedLoading,
  recommendedFields,
  recommendedLoading,
  onAddLibrary,
}: {
  form: JobForm;
  setForm: SetJobForm;
  collapsed: Set<string>;
  onToggleCollapse: (fieldId: string) => void;
  onAddBlank: () => void;
  onRemove: (index: number) => void;
  savedFields: LibraryField[];
  savedLoading: boolean;
  recommendedFields: LibraryField[];
  recommendedLoading: boolean;
  onAddLibrary: (ids: string[], source: 'saved' | 'recommended') => void;
}) {
  const { t } = useLocale();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setForm((prev) => {
      const oldIndex = prev.customFields.findIndex((f) => f.fieldId === active.id);
      const newIndex = prev.customFields.findIndex((f) => f.fieldId === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, customFields: arrayMove(prev.customFields, oldIndex, newIndex) };
    });
  };

  return (
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<SlidersHorizontal className="size-4" />}>
            {t('createCustomFields', 'jobs')}
            {form.customFields.length > 0 && <span className="ms-1 font-normal text-slate-400">({form.customFields.length})</span>}
          </SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('createCustomFieldsDesc', 'jobs')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FieldLibraryMenu
            label={t('createSavedFields', 'jobs')}
            icon={<Bookmark className="size-4" />}
            title={t('createSavedFieldsLibrary', 'jobs')}
            fields={savedFields}
            loading={savedLoading}
            source="saved"
            added={form.customFields}
            onAdd={(ids) => onAddLibrary(ids, 'saved')}
            addLabel={(count) => t('createAddSelected', 'jobs', { count })}
          />
          <FieldLibraryMenu
            label={t('createRecommended', 'jobs')}
            icon={<Star className="size-4" />}
            title={t('createRecommendedPanel', 'jobs')}
            fields={recommendedFields}
            loading={recommendedLoading}
            source="recommended"
            added={form.customFields}
            onAdd={(ids) => onAddLibrary(ids, 'recommended')}
            addLabel={(count) => t('createAddStrategic', 'jobs', { count })}
          />
          <Button variant="primary" onClick={onAddBlank} icon={<Plus className="size-4" />}>
            {t('createNewField', 'jobs')}
          </Button>
        </div>
      </CardToolbar>

      {form.customFields.length === 0 ? (
        <EmptyState icon={<SlidersHorizontal className="size-6" />} title={t('cjNoFields', 'jobs')} text={t('cjNoFieldsHint', 'jobs')} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={form.customFields.map((f) => f.fieldId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2 p-4">
              {form.customFields.map((field, index) => (
                <CustomFieldEditor
                  key={field.fieldId}
                  field={field}
                  index={index}
                  bilingual={form.bilingual}
                  collapsed={collapsed.has(field.fieldId)}
                  onToggle={() => onToggleCollapse(field.fieldId)}
                  onChange={(patch) => setForm((prev) => patchField(prev, index, patch))}
                  onRemove={() => onRemove(index)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}
