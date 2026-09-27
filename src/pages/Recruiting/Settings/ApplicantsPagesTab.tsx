import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronRight, GripVertical, Layout, PlusCircle, Save, Trash2 } from 'lucide-react';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import {
  useCompanies,
  useUpdateCompanyApplicantPages,
  companiesKeys,
} from '../../../hooks/queries/useCompanies';
import { useJobPositions } from '../../../hooks/queries/useJobPositions';
import { Badge, Button, Card, EmptyState, IconButton, ToggleChip, focusRing, inputClass } from '../../../components/ui/kit';
import SettingsSection from './components/SettingsSection';
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
  statusById,
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
  statusById: Record<string, string>;
  canEdit: boolean;
  jobsLoading?: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
  const { t } = useLocale();

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

  const skeletonPills = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="h-6 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700"
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
      className={`rounded-xl border bg-white transition-shadow duration-200 dark:bg-slate-900 ${
        isDragging ? 'border-brand-400 shadow-lg ring-2 ring-brand-500' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2.5">
        <IconButton
          label={isCollapsed ? t('expand', 'common') : t('collapse', 'common')}
          aria-expanded={!isCollapsed}
          onClick={onToggleCollapse}
        >
          {isCollapsed ? <ChevronRight className="size-4 rtl:rotate-180" /> : <ChevronDown className="size-4" />}
        </IconButton>
        <div
          {...attributes}
          {...listeners}
          className={`flex cursor-grab touch-none items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300 ${focusRing} ${
            !canEdit ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          <GripVertical className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={page.name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={handleNameKeyDown}
              aria-label={t('applicantPages.pageName', 'settings')}
              placeholder={t('applicantPages.pageNamePlaceholder', 'settings')}
              className={inputClass}
            />
          ) : (
            <div
              role={canEdit ? 'button' : undefined}
              tabIndex={canEdit ? 0 : undefined}
              onDoubleClick={() => canEdit && setEditingName(true)}
              onKeyDown={(e) => {
                if (canEdit && (e.key === 'Enter' || e.key === 'F2')) {
                  e.preventDefault();
                  setEditingName(true);
                }
              }}
              title={canEdit ? t('applicantPages.doubleClickHint', 'settings') : undefined}
              className={`truncate rounded-lg border border-transparent px-3 py-2 text-sm font-medium ${focusRing} ${
                canEdit ? 'cursor-text hover:border-slate-200 dark:hover:border-slate-700' : 'cursor-not-allowed opacity-70'
              } ${!page.name ? 'font-normal italic text-slate-400' : 'text-slate-900 dark:text-white'}`}
            >
              {page.name || t('applicantPages.doubleClickHint', 'settings')}
            </div>
          )}
        </div>
        <Badge tone="slate">{t('applicantPages.statusCount', 'settings', { count: page.statuses.length })}</Badge>
        <IconButton tone="danger" label={t('applicantPages.remove', 'settings')} onClick={onRemove} disabled={!canEdit}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <div
        style={{
          maxHeight: isCollapsed ? 0 : (contentRef.current?.scrollHeight ?? 5000),
          opacity: isCollapsed ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.25s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div ref={contentRef} className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
          {(availableJobPositions.length > 0 || jobsLoading) && (
            <>
              <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('applicantPages.jobPositionsIncluded', 'settings')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {jobsLoading ? (
                  skeletonPills(5)
                ) : (
                  availableJobPositions.map((jp) => {
                    const jpId = jp._id || '';
                    const jpTitle = jp.title?.en || jp.title?.ar || jp.title || '';
                    const selected = (page.jobPositions ?? []).includes(jpId);
                    return (
                      <ToggleChip
                        key={jpId}
                        selected={selected}
                        onClick={() => canEdit && onToggleJobPosition(jpId)}
                        disabled={!canEdit}
                      >
                        {jpTitle}
                      </ToggleChip>
                    );
                  })
                )}
              </div>
              {!jobsLoading && (page.jobPositions ?? []).length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('applicantPages.jobPositionsCount', 'settings', { count: (page.jobPositions ?? []).length })}
                </p>
              )}
              </div>
            </>
          )}

          <div>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('applicantPages.statusesIncluded', 'settings')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const selectedJobIds = page.jobPositions ?? [];
              const hasJobsSelected = selectedJobIds.length > 0;
              if (!hasJobsSelected) {
                return (
                  <p className="text-sm italic text-slate-400">
                    {t('applicantPages.selectJobFirst', 'settings')}
                  </p>
                );
              }
              const allowedStatusIds = new Set(
                availableJobPositions
                  .filter((jp: any) => selectedJobIds.includes(jp._id))
                  .flatMap((jp: any) => jp.allowedStatuses ?? [])
              );
              const allowedNames = allowedStatusIds.size > 0
                ? new Set(
                    [...allowedStatusIds]
                      .map((id) => statusById[id])
                      .filter(Boolean)
                  )
                : null;
              const useAll = !allowedNames || allowedNames.size === 0 || (allowedNames.size === 1 && allowedNames.has('pending'));
              const statusesToShow = useAll ? availableStatuses : availableStatuses.filter((s) => allowedNames!.has(s));
              return statusesToShow.map((statusName) => {
                const selected = page.statuses.includes(statusName);
                return (
                  <ToggleChip
                    key={statusName}
                    selected={selected}
                    onClick={() => canEdit && onToggleStatus(statusName)}
                    disabled={!canEdit}
                  >
                    {statusName}
                  </ToggleChip>
                );
              });
            })()}
          </div>
          {page.statuses.length > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('applicantPages.statusCountSelected', 'settings', { count: page.statuses.length, list: page.statuses.join(', ') })}
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicantPagesSettings({
  companyId,
  embedded,
}: Props = {}) {
  const { user, hasPermission } = useAuth();
  const { t } = useLocale();
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

  // Map status _id → status name for resolving allowedStatuses on job positions
  const statusById: Record<string, string> = useMemo(() => {
    const raw = selectedCompany?.settings?.statuses ?? [];
    const map: Record<string, string> = {};
    if (Array.isArray(raw)) {
      raw.forEach((s: any) => {
        if (s._id && s.name) map[s._id] = s.name;
      });
    }
    return map;
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
      Swal.fire(t('commonValidation', 'settings'), t('applicantPages.validationSelectCompany', 'settings'), 'warning');
      return;
    }

    if (!settingsId) {
      Swal.fire(t('commonValidation', 'settings'), t('applicantPages.validationSettingsNotFound', 'settings'), 'warning');
      return;
    }

    for (let i = 0; i < pages.length; i++) {
      if (!pages[i].name.trim()) {
        Swal.fire(t('commonValidation', 'settings'), t('applicantPages.validationPageMustHaveName', 'settings', { number: i + 1 }), 'warning');
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
        title: t('commonSaved', 'settings'),
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        t('commonFailure', 'settings'),
        err?.message || t('applicantPages.errorSaveFailed', 'settings'),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection
      embedded={embedded}
      metaTitle={t('applicantPages.pageMetaTitle', 'settings')}
      metaDescription={t('applicantPages.pageMetaDesc', 'settings')}
      icon={<Layout className="size-4" />}
      title={t('applicantPages.title', 'settings')}
      description={t('applicantPages.description', 'settings')}
      actions={
        <>
          <Button icon={<PlusCircle className="size-4" />} onClick={addPage} disabled={!canEdit}>
            {t('applicantPages.addPage', 'settings')}
          </Button>
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            loading={isSaving}
            disabled={!canEdit || !hasChanges}
            onClick={handleSave}
          >
            {t('applicantPages.saveChanges', 'settings')}
          </Button>
        </>
      }
    >
      <Card className="p-4">
        {availableStatuses.length === 0 && (
          <p className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {t('applicantPages.noStatusesWarning', 'settings')}
          </p>
        )}

        {pages.length === 0 ? (
          <EmptyState icon={<Layout className="size-6" />} title={t('applicantPages.emptyState', 'settings')} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pageIds} strategy={verticalListSortingStrategy}>
              <div ref={listRef} className="space-y-2">
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
                      statusById={statusById}
                      canEdit={canEdit}
                      jobsLoading={jobsFetching}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </SettingsSection>
  );
}
