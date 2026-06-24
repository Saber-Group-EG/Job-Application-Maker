import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { PlusCircle, Save, Trash2, ArrowRight, Settings, GripVertical } from 'lucide-react';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import PageMeta from '../../../components/common/PageMeta';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import { useAuth } from '../../../context/AuthContext';
import {
  useCompanies,
  useUpdateCompanyStatuses,
} from '../../../hooks/queries/useCompanies';
import { useStatusSettings } from '../../../hooks/useStatusSettings';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyStatus } from '../../../types/companies';
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
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

type LeadStatus = {
  name: string;
  color: string;
  textColor?: string;
  isDefault?: boolean;
  description: string;
  statusKey?: string;
  _id?: string;
};

const STATUS_DESC_LOCALE_KEYS: Record<string, string> = {
  pending: 'statusSettings.defaultDescPending',
  approved: 'statusSettings.defaultDescApproved',
  interview: 'statusSettings.defaultDescInterview',
  interviewed: 'statusSettings.defaultDescInterviewed',
  rejected: 'statusSettings.defaultDescRejected',
  trashed: 'statusSettings.defaultDescTrashed',
};

const DEFAULT_STATUSES: LeadStatus[] = [
  {
    name: 'pending',
    color: '#FEF3C7',
    textColor: '#92400E',
    isDefault: true,
    description: '',
    statusKey: 'pending',
  },
  {
    name: 'approved',
    color: '#D1FAE5',
    textColor: '#065F46',
    isDefault: false,
    description: '',
    statusKey: 'approved',
  },
  {
    name: 'interview',
    color: '#DBEAFE',
    textColor: '#1E40AF',
    isDefault: false,
    description: '',
    statusKey: 'interview',
  },
  {
    name: 'interviewed',
    color: '#DBEAFE',
    textColor: '#065F46',
    isDefault: false,
    description: '',
    statusKey: 'interviewed',
  },
  {
    name: 'rejected',
    color: '#FEE2E2',
    textColor: '#991B1B',
    isDefault: false,
    description: '',
    statusKey: 'rejected',
  },
  {
    name: 'trashed',
    color: '#6B7280',
    textColor: '#FFFFFF',
    isDefault: false,
    description: '',
    statusKey: 'trashed',
  },
];

const makeId = () => `s_${Math.random().toString(36).slice(2, 9)}`;

const getContrastColor = (hex: string | undefined): string => {
  try {
    if (!hex) return '#111827';
    const h = String(hex).replace('#', '').trim();
    const r = parseInt(h.length === 3 ? h[0] + h[0] : h.substring(0, 2), 16);
    const g = parseInt(
      h.length === 3
        ? h[1] + h[1]
        : h.substring(h.length === 3 ? 1 : 2, h.length === 3 ? 2 : 4),
      16
    );
    const b = parseInt(
      h.length === 3
        ? h[2] + h[2]
        : h.substring(h.length === 3 ? 2 : 4, h.length === 3 ? 3 : 6),
      16
    );
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#FFFFFF';
  } catch (e) {
    return '#111827';
  }
};

// Check if status is locked (only color can be changed)
const isLockedStatus = (statusKey: string): boolean => {
  const lockedKeys = ['interview', 'rejected', 'trashed'];
  return lockedKeys.includes(statusKey?.toLowerCase());
};

// For backward compatibility
const isStaticStatus = (statusKey: string): boolean => {
  const staticKeys = ['interview', 'rejected', 'trashed'];
  return staticKeys.includes(statusKey?.toLowerCase());
};

// Sortable Status Item Component
function SortableStatusItem({
  id,
  status,
  index,
  canEdit,
  isLocked,
  staticDescription,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  onSetDefault,
  onRemove,
}: {
  id: string;
  status: LeadStatus;
  index: number;
  canEdit: boolean;
  isLocked: boolean;
  isStatic: boolean;
  staticDescription: string | null;
  statusIds: string[];
  onNameChange: (index: number, value: string) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onColorChange: (index: number, value: string) => void;
  onSetDefault: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id,
    disabled: isLocked || !canEdit,
    animateLayoutChanges: () => false,
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
      className={`group flex flex-col gap-3 rounded-xl border p-4 transition-shadow duration-200 md:flex-row md:items-center md:justify-between ${
        status.isDefault
          ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-900'
      } ${isLocked ? 'border-l-4 border-l-amber-500' : ''} ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            !isLocked && canEdit
              ? 'cursor-grab hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800'
              : 'cursor-not-allowed opacity-50'
          }`}
        >
          <GripVertical className="size-5 text-slate-400" />
        </div>

        <div className="min-w-0 flex-1">
          <input
            value={status.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder={t('statusSettings.statusLabelPlaceholder', 'settings')}
            disabled={isLocked || !canEdit}
            className={`w-full rounded-xl border border-transparent bg-transparent py-2 text-sm font-semibold outline-none focus:border-brand-300 focus:ring-0 ${
              isLocked || !canEdit ? 'cursor-not-allowed opacity-70' : ''
            }`}
          />

          {isLocked ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {staticDescription ||
                t(STATUS_DESC_LOCALE_KEYS[status.statusKey?.toLowerCase() || ''] || '', 'settings')}
            </p>
          ) : (
            <input
              value={status.description}
              onChange={(e) => onDescriptionChange(index, e.target.value)}
              placeholder={t('statusSettings.descriptionPlaceholder', 'settings')}
              disabled={!canEdit}
              className="mt-1 w-full rounded-xl border border-transparent bg-transparent py-1 text-xs text-slate-500 outline-none focus:border-brand-300 focus:ring-0 dark:text-slate-400"
            />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 md:mt-0">
        <div className="relative h-8 w-8">
          <div
            className="absolute inset-0 rounded-full border border-slate-200 shadow-sm pointer-events-none"
            style={{ backgroundColor: status.color }}
          />
          <input
            type="color"
            value={status.color}
            onChange={(e) => onColorChange(index, e.target.value)}
            disabled={!canEdit}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed disabled:opacity-0"
            title={isLocked ? t('statusSettings.colorCustomizableTitle', 'settings') : t('statusSettings.colorPickerTitle', 'settings')}
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="default-status"
            checked={!!status.isDefault}
            onChange={() => !isLocked && canEdit && onSetDefault(index)}
            disabled={isLocked || !canEdit}
            className={`h-4 w-4 ${isLocked || !canEdit ? 'cursor-not-allowed' : ''}`}
          />
          <span className={`text-slate-600 dark:text-slate-400 ${isLocked || !canEdit ? 'opacity-50' : ''}`}>
            {t('statusSettings.labelDefault', 'settings')}
          </span>
        </label>

        {!isLocked && (
          <button
            onClick={() => onRemove(index)}
            disabled={!canEdit}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Drag Overlay Component
const DragOverlayItem = React.memo(({ status}: { status: LeadStatus; index: number }) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-brand-400 bg-white p-4 shadow-xl md:flex-row md:items-center md:justify-between dark:bg-slate-800">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg">
          <GripVertical className="size-5 text-brand-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="w-full rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {status.name || t('statusSettings.dragOverlayUntitled', 'settings')}
          </div>
          {status.description && (
            <div className="mt-1 px-2 text-xs text-slate-500">
              {status.description}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 md:mt-0">
        <div
          className="h-8 w-8 rounded-full border border-slate-200 shadow-sm"
          style={{ backgroundColor: status.color }}
        />
        {status.isDefault && (
          <span className="text-sm text-slate-500">{t('statusSettings.dragOverlayDefault', 'settings')}</span>
        )}
      </div>
    </div>
  );
});

DragOverlayItem.displayName = 'DragOverlayItem';

type Props = {
  companyId?: string;
  hideCompanySelector?: boolean;
  embedded?: boolean;
};

export default function StatusLabelsSettings({
  companyId,
  hideCompanySelector,
  embedded,
}: Props = {}) {
  const { t } = useLocale();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<
    string | undefined
  >(companyId ?? undefined);
  const updateMutation = useUpdateCompanyStatuses();
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = !!user?.roleId?.name
    ?.toString()
    .toLowerCase()
    .includes('admin');
  const userCompaniesIds = (user?.companies ?? [])
    .map((c: any) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId?._id
    )
    .filter(Boolean) as string[];
  const computedShowSelector = isSuperAdmin || userCompaniesIds.length > 1;
  const showSelector = hideCompanySelector ? false : computedShowSelector;

  useEffect(() => {
    if (companyId && selectedCompanyId !== companyId) {
      setSelectedCompanyId(companyId);
      return;
    }

    if (!selectedCompanyId && companies.length > 0) {
      if (!computedShowSelector && userCompaniesIds.length === 1) {
        setSelectedCompanyId(userCompaniesIds[0]);
        return;
      }
      setSelectedCompanyId((companies[0] as any)?._id);
    }
  }, [
    companies,
    selectedCompanyId,
    computedShowSelector,
    userCompaniesIds,
    companyId,
  ]);

  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  // Get statuses directly from the selected company (from /auth/me data)
  const deriveStatuses = (payload: any): LeadStatus[] => {
    const fromSettings = payload?.settings?.statuses;
    
    if (Array.isArray(fromSettings) && fromSettings.length > 0) {
      return fromSettings.map((s: any) => {
        const statusKey = s.statusKey || s.name?.toLowerCase();
        const isLocked = isLockedStatus(statusKey);

        return {
          name: String(s?.name ?? '').trim() || '',
          color: String(s?.color ?? '#94a3b8'),
          textColor: String(
            s?.textColor ??
              s?.text_color ??
              getContrastColor(s?.color ?? '#94a3b8')
          ),
          description: isLocked
            ? t(STATUS_DESC_LOCALE_KEYS[statusKey] || '', 'settings')
            : String(s?.description ?? ''),
          isDefault: !!s?.isDefault,
          statusKey: statusKey,
          _id: s?._id,
        };
      });
    }

    return DEFAULT_STATUSES;
  };

  const [statuses, setStatuses] = useState<LeadStatus[]>(() => DEFAULT_STATUSES);
  const [statusIds, setStatusIds] = useState<string[]>(() =>
    DEFAULT_STATUSES.map(() => makeId())
  );
  const [originalStatusesJson, setOriginalStatusesJson] = useState<string>(
    JSON.stringify(DEFAULT_STATUSES)
  );
  const [isSaving, setIsSaving] = useState(false);

  const { isStaticStatus: checkIsStatic, getDescription } = useStatusSettings(
    selectedCompany
  );

  useEffect(() => {
    const normalized = deriveStatuses(selectedCompany ?? {});
    setStatuses(normalized);
    setStatusIds(normalized.map(() => makeId()));
    setOriginalStatusesJson(JSON.stringify(normalized));
  }, [selectedCompanyId, selectedCompany]);

  const canEdit =
    !!hasPermission &&
    (hasPermission('Company Management', 'write') ||
      hasPermission('Settings Management', 'write') ||
      hasPermission('Settings Management', 'create'));

  const hasChanges = useMemo(
    () => JSON.stringify(statuses) !== originalStatusesJson,
    [statuses, originalStatusesJson]
  );

  const addStatus = useCallback(() => {
    const newId = makeId();
    setStatuses((prev) => [
      ...prev,
      {
        name: '',
        color: '#F3F4F6',
        textColor: getContrastColor('#F3F4F6'),
        isDefault: false,
        description: '',
      },
    ]);
    setStatusIds((prev) => [...prev, newId]);
    
    // Scroll to the new item after render
    setTimeout(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, []);

  const removeStatus = useCallback((index: number) => {
    setStatuses((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((s) => s.isDefault)) {
        next[0].isDefault = true;
      }
      return next;
    });
    setStatusIds((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setDefault = useCallback((index: number) => {
    setStatuses((prev) =>
      prev.map((s, i) => ({ ...s, isDefault: i === index }))
    );
  }, []);

  const handleNameChange = useCallback((index: number, value: string) => {
    setStatuses((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: value } : s))
    );
  }, []);

  const handleColorChange = useCallback((index: number, value: string) => {
    setStatuses((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, color: value, textColor: getContrastColor(value) }
          : s
      )
    );
  }, []);

  const handleDescriptionChange = useCallback((index: number, value: string) => {
    setStatuses((prev) =>
      prev.map((s, i) => (i === index ? { ...s, description: value } : s))
    );
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = statusIds.findIndex((id) => id === active.id);
      const newIndex = statusIds.findIndex((id) => id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setStatuses((prev) => arrayMove(prev, oldIndex, newIndex));
        setStatusIds((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  }, [statusIds]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedCompanyId) {
      Swal.fire(t('commonValidation', 'settings'), t('statusSettings.validationSelectCompany', 'settings'), 'warning');
      return;
    }

    const payload: CompanyStatus[] = statuses.map((s) => ({
      ...(s._id ? { _id: s._id } : {}),
      name: String(s.name ?? '').trim(),
      color: s.color,
      textColor: s.textColor,
      description: isStaticStatus(s.statusKey || s.name)
        ? ''
        : String(s.description ?? '').trim(),
      isDefault: !!s.isDefault,
    }));

    const settingsId = selectedCompany?.settings?._id;

    setIsSaving(true);

    try {
      await updateMutation.mutateAsync({
        settingsId: settingsId,
        statuses: payload,
      });

      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['applicants'] });

      Swal.fire({
        title: t('statusSettings.swalSaved', 'settings'),
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });

      const payloadWithKeys = statuses.map((s, idx) => ({
        ...payload[idx],
        statusKey: s.statusKey,
      }));
      setOriginalStatusesJson(JSON.stringify(payloadWithKeys));
    } catch (err: any) {
      Swal.fire(
        t('statusSettings.swalFailure', 'settings'),
        err?.message || t('statusSettings.swalFailureMsg', 'settings'),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }, [selectedCompanyId, statuses, selectedCompany, updateMutation, queryClient]);

  const isLocked = useCallback((status: LeadStatus) => {
    return isLockedStatus(status.statusKey || status.name);
  }, []);

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

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
    duration: 200,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
  };

  const activeItem = activeId ? statuses[statusIds.findIndex(id => id === activeId)] : null;
  const activeIndex = activeItem ? statuses.findIndex(s => s === activeItem) : -1;

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
            title={t('statusSettings.pageMetaTitle', 'settings')}
            description={t('statusSettings.pageMetaDesc', 'settings')}
          />
          <PageBreadCrumb pageTitle={t('statusSettings.pageBreadcrumb', 'settings')} />
        </>
      )}

      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6'}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Settings className="size-6" />
              </div>
              <div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {t('statusSettings.title', 'settings')}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('statusSettings.description', 'settings')}
                </p>
              </div>
            </div>
            <div className="flex flex-row gap-3">
              <button
                onClick={addStatus}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle className="size-3.5" /> {t('statusSettings.addStatus', 'settings')}
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
                {t('statusSettings.saveChanges', 'settings')}
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-4">
              {showSelector && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700/50 dark:bg-slate-800/40">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                      <Settings className="size-4" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {t('statusSettings.companySelectorTitle', 'settings')}
                    </h3>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {companies.map((c: any) => (
                        <option
                          key={c._id}
                          value={c._id}
                          className="font-medium"
                        >
                          {(typeof c.name === 'object' ? c.name.en : c.name) ||
                            t('statusSettings.unnamedCompany', 'settings')}
                        </option>
                      ))}
                    </select>
                    <ArrowRight className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-90 text-slate-400" />
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {t('statusSettings.companySelectorHelp', 'settings')}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <PlusCircle className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {t('statusSettings.previewTitle', 'settings')}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {statuses.map((s, i) => (
                    <span
                      key={statusIds[i] ?? i}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
                      style={{
                        background: s.color,
                        color: s.textColor ?? getContrastColor(s.color),
                      }}
                    >
                      {s.name || t('statusSettings.previewFallback', 'settings')}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {t('statusSettings.previewDesc', 'settings')}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
                <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-400">
                  {t('statusSettings.noteTitle', 'settings')}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  {t('statusSettings.noteText', 'settings')}
                </p>
              </div>
            </div>

            <div className="xl:col-span-8">
              <div className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={statusIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div ref={listRef} className="space-y-4">
                    {statuses.map((status, index) => {
                      const locked = isLocked(status);
                      const isStatic = checkIsStatic(
                        status.statusKey || status.name
                      );
                      const staticDescription = isStatic
                        ? getDescription(status.statusKey || status.name)
                        : null;

                      return (
                        <SortableStatusItem
                          key={statusIds[index]}
                          id={statusIds[index]}
                          status={status}
                          index={index}
                          canEdit={canEdit}
                          isLocked={locked}
                          isStatic={isStatic}
                          staticDescription={staticDescription}
                          statusIds={statusIds}
                          onNameChange={handleNameChange}
                          onDescriptionChange={handleDescriptionChange}
                          onColorChange={handleColorChange}
                          onSetDefault={setDefault}
                          onRemove={removeStatus}
                        />
                      );
                    })}
                    </div>
                  </SortableContext>

                  {createPortal(
                    <DragOverlay dropAnimation={dropAnimation}>
                      {activeId && activeItem && activeIndex !== -1 ? (
                        <DragOverlayItem
                          status={activeItem}
                          index={activeIndex}
                        />
                      ) : null}
                    </DragOverlay>,
                    document.body
                  )}
                </DndContext>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}