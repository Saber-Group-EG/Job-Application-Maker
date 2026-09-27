import { useMemo, useState, useRef } from 'react';
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
  Loader2,
} from 'lucide-react';
import Swal from '../../utils/swal';
import type { SectionTemplate } from '../../types/companies';
import SectionTemplateModal from '../modals/SectionTemplateModal';
import ImportSectionsModal from '../modals/ImportSectionsModal';
import { useLocale } from '../../context/LocaleContext';
import { Badge, Button, Card, CardToolbar, EmptyState, IconButton, SectionTitle, focusRing } from '../ui/kit';

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
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      {/* group header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-3 bg-slate-50 px-4 py-2.5 text-start transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 ${focusRing}`}
      >
        {collapsed ? (
          <ChevronRight className="size-4 shrink-0 text-slate-400 rtl:rotate-180" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        )}
        <span className="flex-1 text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
          {category}
        </span>
        <Badge tone="slate">{t('sectionCount', 'modals', { count: templates.length })}</Badge>
      </button>

      {/* cards */}
      <div
        style={{
          maxHeight: collapsed ? 0 : (contentRef.current?.scrollHeight ?? 5000),
          opacity: collapsed ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div ref={contentRef} className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tmpl) => (
            <div
              key={tmpl._id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
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
                  <div className="-me-1.5 -mt-1 flex shrink-0">
                    <IconButton label={t('edit', 'common')} onClick={() => onEdit(tmpl)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={t('duplicate', 'common')} onClick={() => onDuplicate(tmpl)}>
                      <Copy className="size-4" />
                    </IconButton>
                    <IconButton tone="danger" label={t('delete', 'modals')} onClick={() => onDelete(tmpl._id!)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="size-3.5 shrink-0" />
                {t('itemCount', 'modals', { count: tmpl.items.length })}
              </div>
            </div>
          ))}
        </div>
      </div>
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
      cancelButtonText: t('cancel', 'common'),
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
    <Card>
      <CardToolbar>
        <div>
          <SectionTitle icon={<Layers className="size-4" />}>{t('sectionTemplates', 'modals')}</SectionTitle>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('sectionTemplatesDesc', 'modals', { type: (type === 'offer' ? t('jobOffer', 'modals') : t('contract', 'modals')).toLowerCase() })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('total', 'modals')}: <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{local.length}</span>
            {' · '}
            {t('categories', 'modals')}: <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{existingCategories.length}</span>
          </span>
          {isSaving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" role="status">
              <Loader2 className="size-3.5 animate-spin" />
              {t('saving', 'modals')}
            </span>
          )}
          {crossTemplates.length > 0 && canEdit && (
            <Button size="sm" icon={<Download className="size-4" />} onClick={() => setImportOpen(true)}>
              {t('importFromCross', 'modals', { label: crossLabel })}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" icon={<PlusCircle className="size-4" />} onClick={openCreate} disabled={isSaving}>
              {t('newSection', 'modals')}
            </Button>
          )}
        </div>
      </CardToolbar>

      {local.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-6" />}
          title={t('noSectionTemplates', 'modals')}
          text={t('noSectionsDesc', 'modals')}
          action={
            canEdit && (
              <Button variant="primary" icon={<PlusCircle className="size-4" />} loading={isSaving} onClick={openCreate}>
                {t('addFirstSection', 'modals')}
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3 p-4">
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
    </Card>
  );
}
