// components/settings/ApplicantPagesSettings.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Save, Trash2, ArrowRight, Layout, ChevronDown, ChevronRight, GripVertical, Briefcase } from 'lucide-react';
import Swal from '../../../utils/swal';
import { useAuth } from '../../../context/AuthContext';
import {
  useCompanies,
  useUpdateCompanyApplicantPages,
  companiesKeys,
} from '../../../hooks/queries/useCompanies';
import { useJobPositions } from '../../../hooks/queries/useJobPositions';
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
  jobPositions?: string[]; // job position IDs
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
  isCollapsed,
  onToggleCollapse,
  onNameChange,
  onToggleStatus,
  onToggleJobPosition,
  onRemove,
  availableStatuses,
  availableJobPositions,
  canEdit,
  jobsLoading,
}: {
  id: string;
  page: ApplicantPage;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNameChange: (value: string) => void;
  onToggleStatus: (statusName: string) => void;
  onToggleJobPosition: (jobId: string) => void;
  onRemove: () => void;
  availableStatuses: string[];
  availableJobPositions: any[];
  canEdit: boolean;
  jobsLoading?: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  const skeletonPills = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="h-7 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
      />
    ));

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const finishEditing = useCallback(() => {
    setEditingName(false);
  }, []);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishEditing();
    }
  }, [finishEditing]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500 bg-white dark:bg-slate-800' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
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
          {editingName ? (
            <input
              ref={nameInputRef}
              value={page.name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={handleNameKeyDown}
              placeholder="e.g. Active Pipeline, Shortlisted..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900"
            />
          ) : (
            <div
              onDoubleClick={() => canEdit && setEditingName(true)}
              className={`w-full rounded-lg border border-transparent px-3 py-2 text-sm ${
                canEdit ? 'cursor-default hover:border-slate-300 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-900' : 'cursor-not-allowed opacity-70'
              } ${!page.name ? 'text-slate-400' : ''}`}
            >
              {page.name || 'Double-click to set page name...'}
            </div>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {page.statuses.length} status{page.statuses.length !== 1 ? 'es' : ''}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canEdit}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 lg:gap-2 lg:px-3 lg:py-2 lg:text-sm"
        >
          <Trash2 className="size-3.5 lg:size-4" /> Remove
        </button>
      </div>

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

          {(availableJobPositions.length > 0 || jobsLoading) && (
            <>
              <div className="my-3 border-t border-dashed border-slate-200 dark:border-slate-700" />
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job Positions included in this page
              </label>
              <div className="flex flex-wrap gap-2">
                {jobsLoading ? (
                  skeletonPills(5)
                ) : (
                  availableJobPositions.map((jp) => {
                    const jpId = jp._id || '';
                    const jpTitle = jp.title?.en || jp.title?.ar || jp.title || '';
                    const selected = (page.jobPositions ?? []).includes(jpId);
                    return (
                      <button
                        key={jpId}
                        type="button"
                        onClick={() => canEdit && onToggleJobPosition(jpId)}
                        disabled={!canEdit}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                          selected
                            ? 'bg-brand-500 text-white'
                            : 'border border-slate-300 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <Briefcase className="mr-1 inline-block size-3.5" />
                        {jpTitle}
                      </button>
                    );
                  })
                )}
              </div>
              {!jobsLoading && (page.jobPositions ?? []).length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {(page.jobPositions ?? []).length} job position{(page.jobPositions ?? []).length > 1 ? 's' : ''} selected
                </p>
              )}
            </>
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

  // Derive initial company ID synchronously from props or user context
  // instead of waiting for the companies API call
  const [selectedCompanyId, setSelectedCompanyId] = useState<
    string | undefined
  >(() => {
    if (companyId) return companyId;
    if (!computedShowSelector && userCompanyIds.length === 1) {
      return userCompanyIds[0];
    }
    return undefined;
  });
  const updateMutation = useUpdateCompanyApplicantPages();
  const queryClient = useQueryClient();

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

  // Available job positions from API
  const { data: jobPositions = [], isFetching: jobsFetching } = useJobPositions(
    selectedCompanyId ? [selectedCompanyId] : undefined,
    false,
    undefined,
    { enabled: !!selectedCompanyId }
  ) as unknown as { data: any[]; isFetching: boolean };

  const [pages, setPages] = useState<ApplicantPage[]>([]);
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [originalJson, setOriginalJson] = useState('[]');
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = selectedCompany?.settings?.applicantPages ?? [];
    const normalized: ApplicantPage[] = Array.isArray(raw)
      ? raw.map((p: any) => ({
          _id: p._id,
          name: String(p.name ?? '').trim(),
          statuses: Array.isArray(p.statuses) ? p.statuses : [],
          jobPositions: Array.isArray(p.jobPositions) ? p.jobPositions : [],
        }))
      : [];
    const initialIds = normalized.map(() => makeId());
    setPages(normalized);
    setPageIds(initialIds);
    setOriginalJson(JSON.stringify(normalized));
    setCollapsedPages(new Set(initialIds));
  }, [selectedCompanyId]);

  const syncPagesToCache = useCallback((updatedPages: ApplicantPage[]) => {
    if (!selectedCompanyId) return;
    queryClient.setQueryData<any[]>(companiesKeys.list(), (old: any[] | undefined) => {
      if (!old) return old;
      return old.map((company: any) => {
        if (company._id !== selectedCompanyId) return company;
        return {
          ...company,
          settings: {
            ...company.settings,
            applicantPages: updatedPages.map(p => ({
              ...(p._id ? { _id: p._id } : {}),
              name: p.name,
              statuses: p.statuses,
              ...(p.jobPositions?.length ? { jobPositions: p.jobPositions } : {}),
            })),
          },
        };
      });
    });
  }, [selectedCompanyId, queryClient]);

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
      }
    }
  }, [pageIds]);

  const toggleCollapse = (pageId: string) => {
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const addPage = useCallback(() => {
    const newId = makeId();
    setPages((prev) => {
      const updated = [...prev, { name: '', statuses: [] }];
      syncPagesToCache(updated);
      return updated;
    });
    setPageIds((prev) => [...prev, newId]);
    // Scroll to the new item after render
    setTimeout(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, [syncPagesToCache]);

  const removePage = (index: number) => {
    const removedId = pageIds[index];
    setPages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      syncPagesToCache(updated);
      return updated;
    });
    setPageIds((prev) => prev.filter((_, i) => i !== index));
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      next.delete(removedId);
      return next;
    });
  };

  const handleNameChange = (index: number, value: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name: value } : p))
    );
  };

  const toggleStatus = (pageIndex: number, statusName: string) => {
    setPages((prev) => {
      const updated = prev.map((p, i) => {
        if (i !== pageIndex) return p;
        const already = p.statuses.includes(statusName);
        return {
          ...p,
          statuses: already
            ? p.statuses.filter((s) => s !== statusName)
            : [...p.statuses, statusName],
        };
      });
      syncPagesToCache(updated);
      return updated;
    });
  };

  const toggleJobPosition = (pageIndex: number, jobId: string) => {
    setPages((prev) => {
      const updated = prev.map((p, i) => {
        if (i !== pageIndex) return p;
        const current = p.jobPositions ?? [];
        const already = current.includes(jobId);
        return {
          ...p,
          jobPositions: already
            ? current.filter((j) => j !== jobId)
            : [...current, jobId],
        };
      });
      syncPagesToCache(updated);
      return updated;
    });
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
    }

    const payload = pages.map((p) => ({
      ...(p._id ? { _id: p._id } : {}),
      name: p.name.trim(),
      statuses: p.statuses,
      ...(p.jobPositions?.length ? { jobPositions: p.jobPositions } : {}),
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
            <div className="flex flex-row gap-3">
              <button
                onClick={addPage}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
              >
                <PlusCircle className="size-4" /> Add Page
              </button>
              <button
                onClick={handleSave}
                disabled={!canEdit || !hasChanges || isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save Changes
                <ArrowRight className="size-3.5" />
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
                      const pageId = pageIds[index];
                      const isCollapsed = collapsedPages.has(pageId);
                      return (
                        <SortablePageItem
                          key={pageId}
                          id={pageId}
                          page={page}
                          index={index}
                          isCollapsed={isCollapsed}
                          onToggleCollapse={() => toggleCollapse(pageId)}
                          onNameChange={(value) => handleNameChange(index, value)}
                          onToggleStatus={(statusName) => toggleStatus(index, statusName)}
                          onToggleJobPosition={(jobId) => toggleJobPosition(index, jobId)}
                          onRemove={() => removePage(index)}
                          availableStatuses={availableStatuses}
                          availableJobPositions={jobPositions}
                          canEdit={canEdit}
                          jobsLoading={jobsFetching}
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