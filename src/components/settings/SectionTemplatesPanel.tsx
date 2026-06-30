import { useMemo, useState } from 'react';
import {
  Layers,
  PlusCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  FileText,
} from 'lucide-react';
import Swal from '../../utils/swal';
import type { SectionTemplate } from '../../types/companies';
import SectionTemplateModal from '../modals/SectionTemplateModal';
import ImportSectionsModal from '../modals/ImportSectionsModal';
import { useLocale } from '../../context/LocaleContext';

// ─── tiny uid ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  type: 'offer' | 'contract';
  settingsId: string;
  /** Current templates from company settings */
  templates: SectionTemplate[];
  /** Templates from the OTHER pool for cross-import */
  crossTemplates: SectionTemplate[];
  canEdit: boolean;
  onSave: (templates: SectionTemplate[]) => Promise<void>;
  isSaving?: boolean;
};

// ─── Category Group ───────────────────────────────────────────────────────────
function CategoryGroup({
  category,
  templates,
  canEdit,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  category: string;
  templates: SectionTemplate[];
  canEdit: boolean;
  onEdit: (t: SectionTemplate) => void;
  onDuplicate: (t: SectionTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      {/* group header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
      >
        {collapsed ? (
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        )}
        <span className="flex-1 text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
          {category}
        </span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          {t('sectionCount', 'modals', { count: templates.length })}
        </span>
      </button>

      {/* cards */}
      {!collapsed && (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tmpl) => (
            <div
              key={tmpl._id}
              className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {locale === 'ar' ? (tmpl.title.ar || tmpl.title.en) : (tmpl.title.en || tmpl.title.ar)}
                  </p>
                  {tmpl.title.en && tmpl.title.ar && (
                    <p
                      className="truncate text-xs text-slate-400 dark:text-slate-500"
                      dir="rtl"
                    >
                      {tmpl.title.ar}
                    </p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEdit(tmpl)}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicate(tmpl)}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(tmpl._id!)}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FileText className="size-3.5 shrink-0" />
                {t('itemCount', 'modals', { count: tmpl.items.length })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export default function SectionTemplatesPanel({
  type,
  settingsId: _settingsId,
  templates,
  crossTemplates,
  canEdit,
  onSave,
  isSaving,
}: Props) {
  const { t } = useLocale();
  const [local, setLocal] = useState<SectionTemplate[]>(() =>
    templates.map((t) => ({ ...t, _id: t._id ?? uid() }))
  );

  // sync if parent changes (e.g. after successful save / initial load)
  const prevTemplates = useMemo(() => templates, [templates]);
  if (prevTemplates !== templates) {
    setLocal(templates.map((t) => ({ ...t, _id: t._id ?? uid() })));
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<SectionTemplate | null>(null);

  const strip = (ts: SectionTemplate[]) =>
    ts.map(({ _id: _t, ...t }) => ({
      ...t,
      items: t.items.map(({ _id: _i, ...item }) => item),
    }));

  const saveImmediately = (updated: SectionTemplate[]) => {
    onSave(strip(updated) as SectionTemplate[]);
  };

  const saveAndUpdate = (updater: (prev: SectionTemplate[]) => SectionTemplate[]) => {
    setLocal((prev) => {
      const updated = updater(prev);
      saveImmediately(updated);
      return updated;
    });
  };

  // all unique categories present in local list
  const existingCategories = useMemo(
    () => [...new Set(local.map((t) => t.category || 'general'))],
    [local]
  );

  // grouped for rendering
  const grouped = useMemo(() => {
    return local.reduce<Record<string, SectionTemplate[]>>((acc, t) => {
      const cat = t.category || 'general';
      (acc[cat] ??= []).push(t);
      return acc;
    }, {});
  }, [local]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (t: SectionTemplate) => {
    setEditing(t);
    setModalOpen(true);
  };

  const handleModalSave = (t: SectionTemplate) => {
    saveAndUpdate((prev) => {
      const exists = prev.some((l) => l._id === t._id);
      if (exists) {
        return prev.map((l) => (l._id === t._id ? t : l));
      }
      return [...prev, { ...t, _id: uid() }];
    });
  };

  const handleDuplicate = (t: SectionTemplate) => {
    saveAndUpdate((prev) => [
      ...prev,
      {
        ...t,
        _id: uid(),
        title: { en: t.title.en ? `${t.title.en} (Copy)` : '', ar: t.title.ar },
      },
    ]);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t('deleteSectionTitle', 'modals'),
      text: t('deleteSectionText', 'modals'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('delete', 'modals'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      saveAndUpdate((prev) => prev.filter((t) => t._id !== id));
    }
  };

  const handleImport = (imported: SectionTemplate[]) => {
    saveAndUpdate((prev) => [
      ...prev,
      ...imported.map((t) => ({ ...t, _id: uid() })),
    ]);
  };

  const crossLabel = type === 'offer' ? t('contractSections', 'modals') : t('offerSections', 'modals');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('sectionTemplates', 'modals')}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t('sectionTemplatesDesc', 'modals', { type: (type === 'offer' ? t('jobOffer', 'modals') : t('contract', 'modals')).toLowerCase() })}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* import from other pool */}
          {crossTemplates.length > 0 && canEdit && (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Download className="size-3.5" />
              {t('importFromCross', 'modals', { label: crossLabel })}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <PlusCircle className="size-3.5" />
              {t('newSection', 'modals')}
            </button>
          )}

          {isSaving && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-600">
              <div className="size-3.5 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
              {t('saving', 'modals')}
            </div>
          )}
        </div>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-2">
        <div className="px-6 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {t('total', 'modals')}
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
            {local.length}
          </p>
        </div>
        <div className="px-6 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {t('categories', 'modals')}
          </p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">
            {existingCategories.length}
          </p>
        </div>
      </div>

      {/* body */}
      <div className="space-y-3 p-5">
        {local.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
            <Layers className="mb-3 size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('noSectionTemplates', 'modals')}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {t('noSectionsDesc', 'modals')}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                disabled={isSaving}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <PlusCircle className="size-4" />
                )}
                {t('addFirstSection', 'modals')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, items]) => (
              <CategoryGroup
                key={cat}
                category={cat}
                templates={items}
                canEdit={canEdit}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* modals */}
      <SectionTemplateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
        editing={editing}
        existingCategories={existingCategories}
      />

      <ImportSectionsModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        sourceTemplates={crossTemplates}
        sourceLabel={crossLabel}
      />
    </div>
  );
}
