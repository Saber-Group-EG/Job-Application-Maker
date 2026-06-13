// components/settings/ApplicantPagesSettings.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PlusCircle, Save, Trash2, ArrowRight, Layout, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import Swal from '../../../utils/swal';
import { useAuth } from '../../../context/AuthContext';
import {
  useCompanies,
  useUpdateCompanyApplicantPages,
} from '../../../hooks/queries/useCompanies';
import PageMeta from '../../../components/common/PageMeta';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ApplicantPage = {
  _id?: string;
  name: string;
  statuses: string[]; // status names
};

type Props = {
  companyId?: string;
  hideCompanySelector?: boolean;
  embedded?: boolean;
};

const makeId = () => `p_${Math.random().toString(36).slice(2, 9)}`;

// Sortable Page Item Component
function SortablePageItem({
  id,
  page,
  index,
  isCollapsed,
  onToggleCollapse,
  onNameChange,
  onToggleStatus,
  onRemove,
  availableStatuses,
  canEdit,
}: {
  id: string;
  page: ApplicantPage;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNameChange: (value: string) => void;
  onToggleStatus: (statusName: string) => void;
  onRemove: () => void;
  availableStatuses: string[];
  canEdit: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500 bg-white dark:bg-slate-800' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {isCollapsed ? (
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        )}
        <div
          {...attributes}
          {...listeners}
          className={`flex cursor-grab items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300 ${
            !canEdit ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <GripVertical className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Page Name
          </label>
          <input
            value={page.name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Active Pipeline, Shortlisted..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {page.statuses.length} status{page.statuses.length !== 1 ? 'es' : ''}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={!canEdit}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
          <Trash2 className="size-4" /> Remove
        </button>
      </button>

      {!isCollapsed && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Statuses included in this page
          </label>
          <div className="flex flex-wrap gap-2">
            {availableStatuses.map((statusName) => {
              const selected = page.statuses.includes(statusName);
              return (
                <button
                  key={statusName}
                  type="button"
                  onClick={() => canEdit && onToggleStatus(statusName)}
                  disabled={!canEdit}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    selected
                      ? 'bg-brand-500 text-white'
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {statusName}
                </button>
              );
            })}
          </div>
          {page.statuses.length > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {page.statuses.length} status{page.statuses.length > 1 ? 'es' : ''} selected: {' '}
              {page.statuses.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicantPagesSettings({
  companyId,
  embedded,
}: Props = {}) {
  const { user, hasPermission } = useAuth();
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<
    string | undefined
  >(companyId);
  const updateMutation = useUpdateCompanyApplicantPages();

  const isSuperAdmin = !!user?.roleId?.name
    ?.toString()
    .toLowerCase()
    .includes('admin');
  const userCompanyIds = (user?.companies ?? [])
    .map((c: any) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId?._id
    )
    .filter(Boolean) as string[];
  const computedShowSelector = isSuperAdmin || userCompanyIds.length > 1;

  const canEdit =
    hasPermission('Company Management', 'write') ||
    hasPermission('Settings Management', 'write') ||
    hasPermission('Settings Management', 'create');

  useEffect(() => {
    if (companyId && selectedCompanyId !== companyId) {
      setSelectedCompanyId(companyId);
      return;
    }
    if (!selectedCompanyId && companies.length > 0) {
      if (!computedShowSelector && userCompanyIds.length === 1) {
        setSelectedCompanyId(userCompanyIds[0]);
        return;
      }
      setSelectedCompanyId((companies[0] as any)?._id);
    }
  }, [
    companies,
    selectedCompanyId,
    computedShowSelector,
    userCompanyIds,
    companyId,
  ]);

  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  // Get settings ID from the selected company
  const settingsId = selectedCompany?.settings?._id;

  // Available statuses from company settings
  const availableStatuses: string[] = useMemo(() => {
    const raw = selectedCompany?.settings?.statuses ?? [];
    return Array.isArray(raw)
      ? raw.map((s: any) => s.name).filter(Boolean)
      : [];
  }, [selectedCompany]);

  const [pages, setPages] = useState<ApplicantPage[]>([]);
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [originalJson, setOriginalJson] = useState('[]');
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedPages, setCollapsedPages] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = selectedCompany?.settings?.applicantPages ?? [];
    const normalized: ApplicantPage[] = Array.isArray(raw)
      ? raw.map((p: any) => ({
          _id: p._id,
          name: String(p.name ?? '').trim(),
          statuses: Array.isArray(p.statuses) ? p.statuses : [],
        }))
      : [];
    setPages(normalized);
    setPageIds(normalized.map(() => makeId()));
    setOriginalJson(JSON.stringify(normalized));
  }, [selectedCompany]);

  const hasChanges = useMemo(
    () => JSON.stringify(pages) !== originalJson,
    [pages, originalJson]
  );

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = pageIds.findIndex((id) => id === active.id);
      const newIndex = pageIds.findIndex((id) => id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setPages((prev) => arrayMove(prev, oldIndex, newIndex));
        setPageIds((prev) => arrayMove(prev, oldIndex, newIndex));
        setCollapsedPages((prev) => {
          const next = new Set(prev);
          const moved = next.has(oldIndex);
          next.delete(oldIndex);
          next.delete(newIndex);
          const adjusted = new Set<number>();
          prev.forEach((val, idx) => {
            let newIdx = idx;
            if (idx === oldIndex) newIdx = newIndex;
            else if (oldIndex < newIndex && idx > oldIndex && idx <= newIndex) newIdx = idx - 1;
            else if (oldIndex > newIndex && idx >= newIndex && idx < oldIndex) newIdx = idx + 1;
            if (val) adjusted.add(newIdx);
          });
          return adjusted;
        });
      }
    }
  }, [pageIds]);

  const toggleCollapse = (index: number) => {
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addPage = useCallback(() => {
    const newId = makeId();
    setPages((prev) => [...prev, { name: '', statuses: [] }]);
    setPageIds((prev) => [...prev, newId]);
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      // Expand the new page
      return next;
    });
    
    // Scroll to the new item after render
    setTimeout(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, []);

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    setPageIds((prev) => prev.filter((_, i) => i !== index));
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      next.delete(index);
      const adjusted = new Set<number>();
      prev.forEach((val, idx) => {
        if (idx > index && val) adjusted.add(idx - 1);
        else if (idx < index && val) adjusted.add(idx);
      });
      return adjusted;
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name: value } : p))
    );
  };

  const toggleStatus = (pageIndex: number, statusName: string) => {
    setPages((prev) =>
      prev.map((p, i) => {
        if (i !== pageIndex) return p;
        const already = p.statuses.includes(statusName);
        return {
          ...p,
          statuses: already
            ? p.statuses.filter((s) => s !== statusName)
            : [...p.statuses, statusName],
        };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      Swal.fire('Validation', 'Please select a company first.', 'warning');
      return;
    }

    if (!settingsId) {
      Swal.fire('Validation', 'Company settings not found. Please contact support.', 'warning');
      return;
    }

    for (let i = 0; i < pages.length; i++) {
      if (!pages[i].name.trim()) {
        Swal.fire('Validation', `Page ${i + 1} must have a name.`, 'warning');
        return;
      }
      if (pages[i].statuses.length === 0) {
        Swal.fire(
          'Validation',
          `Page "${pages[i].name}" must have at least one status selected.`,
          'warning'
        );
        return;
      }
    }

    const payload = pages.map((p) => ({
      ...(p._id ? { _id: p._id } : {}),
      name: p.name.trim(),
      statuses: p.statuses,
    }));
    
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
         settingsId,
      applicantPages: payload,
      });
      setOriginalJson(JSON.stringify(pages));
      Swal.fire({
        title: 'Saved',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        'Failure',
        err?.message || 'Failed to save applicant pages.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? 'space-y-6'
          : 'min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8'
      }
    >
      {!embedded && (
        <>
          <PageMeta
            title="Applicant Pages | Job Application Maker"
            description="Configure custom applicant pages per company"
          />
          <PageBreadCrumb pageTitle="Applicant Pages" />
        </>
      )}

      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6'}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Layout className="size-6" />
              </div>
              <div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Applicant Pages
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create custom sidebar pages that filter applicants by one or
                  more statuses.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={addPage}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle className="size-4" /> Add Page
              </button>
              <button
                onClick={handleSave}
                disabled={!canEdit || !hasChanges || isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Changes
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {availableStatuses.length === 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-400">
                No statuses found for this company. Configure statuses first in
                the Statuses tab.
              </div>
            )}

            {pages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
                <Layout className="mx-auto mb-3 size-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No applicant pages yet. Add a page to get started.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pageIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div ref={listRef} className="space-y-4">
                    {pages.map((page, index) => {
                      const isCollapsed = collapsedPages.has(index);
                      return (
                        <SortablePageItem
                          key={pageIds[index]}
                          id={pageIds[index]}
                          page={page}
                          index={index}
                          isCollapsed={isCollapsed}
                          onToggleCollapse={() => toggleCollapse(index)}
                          onNameChange={(value) => handleNameChange(index, value)}
                          onToggleStatus={(statusName) => toggleStatus(index, statusName)}
                          onRemove={() => removePage(index)}
                          availableStatuses={availableStatuses}
                          canEdit={canEdit}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}