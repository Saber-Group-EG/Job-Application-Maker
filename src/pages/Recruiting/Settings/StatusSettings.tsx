import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { BarChart3, Eye, GripVertical, ListChecks, Lock, PlusCircle, Save, Settings, Trash2, UserX } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import { useUndo } from '../../../context/UndoContext';
import { Button, Card, CardToolbar, IconButton, SectionTitle, focusRing } from '../../../components/ui/kit';
import SettingsSection from './components/SettingsSection';
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
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { effectiveReportRole, type ReportRole } from '../../../utils/reportRoles';
import { guessedNoShowStatus, type NoShowSetting } from '../../../utils/noShow';

type LeadStatus = {
  name: string;
  color: string;
  textColor?: string;
  isDefault?: boolean;
  description: string;
  statusKey?: string;
  reportRole?: ReportRole;
  // Reasons to pick when moving an applicant to this status (optional).
  reasons?: string[];
  _id?: string;
};

// Edits one status's reasons list (saved with the page's Save Changes).
function StatusReasonsEditor({
  status,
  canEdit,
  onClose,
  onSave,
}: {
  status: LeadStatus;
  canEdit: boolean;
  onClose: () => void;
  onSave: (reasons: string[]) => void;
}) {
  const { t } = useLocale();
  const [items, setItems] = useState<string[]>(() => (status.reasons?.length ? [...status.reasons] : ['']));
  const done = () => {
    onSave([...new Set(items.map((r) => r.trim()).filter(Boolean))]);
    onClose();
  };
  return (
    <Modal isOpen onClose={onClose} className="max-w-lg p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('statusSettings.reasonsTitle', 'settings', { status: status.name || t('statusSettings.previewFallback', 'settings') })}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('statusSettings.reasonsDesc', 'settings')}</p>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {items.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {i + 1}
              </span>
              <input
                value={r}
                autoFocus={i === items.length - 1 && !r}
                onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setItems((prev) => [...prev, '']);
                  }
                }}
                disabled={!canEdit}
                placeholder={t('statusSettings.reasonPlaceholder', 'settings')}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
              />
              <IconButton
                tone="danger"
                label={t('delete', 'common')}
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                disabled={!canEdit}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button icon={<PlusCircle className="size-4" />} onClick={() => setItems((prev) => [...prev, ''])} disabled={!canEdit}>
            {t('statusSettings.addReason', 'settings')}
          </Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>{t('cancel', 'common')}</Button>
            <Button variant="primary" onClick={done} disabled={!canEdit}>
              {t('statusSettings.reasonsDone', 'settings')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

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
  } catch {
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
  onReportRoleChange,
  onEditReasons,
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
  onReportRoleChange: (index: number, role: ReportRole) => void;
  onEditReasons: (index: number) => void;
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
      className={`group flex flex-col gap-3 rounded-xl border p-3 transition-shadow duration-200 md:flex-row md:items-center ${
        status.isDefault
          ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      } ${isDragging ? 'shadow-lg ring-2 ring-brand-500' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className={`flex size-8 shrink-0 touch-none items-center justify-center rounded-lg transition-colors ${focusRing} ${
            !isLocked && canEdit
              ? 'cursor-grab text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800'
              : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
          }`}
        >
          {isLocked ? <Lock className="size-4" /> : <GripVertical className="size-4" />}
        </div>

        <span
          className="size-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: status.color }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <input
            value={status.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder={t('statusSettings.statusLabelPlaceholder', 'settings')}
            aria-label={t('statusSettings.statusLabelPlaceholder', 'settings')}
            disabled={isLocked || !canEdit}
            className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:hover:border-transparent dark:text-white dark:hover:border-slate-700 ${
              isLocked || !canEdit ? 'opacity-70' : ''
            }`}
          />

          {isLocked ? (
            <p className="px-2 text-xs text-slate-500 dark:text-slate-400">
              {staticDescription ||
                t(STATUS_DESC_LOCALE_KEYS[status.statusKey?.toLowerCase() || ''] || '', 'settings')}
            </p>
          ) : (
            <input
              value={status.description}
              onChange={(e) => onDescriptionChange(index, e.target.value)}
              placeholder={t('statusSettings.descriptionPlaceholder', 'settings')}
              aria-label={t('statusSettings.descriptionPlaceholder', 'settings')}
              disabled={!canEdit}
              className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-500 outline-none transition hover:border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:text-slate-400 dark:hover:border-slate-700"
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 ps-11 md:ps-0">
        <label
          className={`relative inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 ${
            canEdit ? 'cursor-pointer hover:border-slate-300' : 'cursor-not-allowed'
          }`}
          title={isLocked ? t('statusSettings.colorCustomizableTitle', 'settings') : t('statusSettings.colorPickerTitle', 'settings')}
        >
          <span className="size-5 rounded-md ring-1 ring-inset ring-black/10" style={{ backgroundColor: status.color }} />
          <input
            type="color"
            value={status.color}
            onChange={(e) => onColorChange(index, e.target.value)}
            disabled={!canEdit}
            aria-label={t('statusSettings.colorPickerTitle', 'settings')}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>

        <select
          value={effectiveReportRole(status)}
          onChange={(e) => onReportRoleChange(index, e.target.value as ReportRole)}
          disabled={!canEdit}
          aria-label={t('statusSettings.reportRoleLabel', 'settings')}
          title={t('statusSettings.reportRoleLabel', 'settings')}
          className={`h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${focusRing}`}
        >
          <option value="step">{t('statusSettings.reportRoleStep', 'settings')}</option>
          <option value="exit">{t('statusSettings.reportRoleExit', 'settings')}</option>
          <option value="ignore">{t('statusSettings.reportRoleIgnore', 'settings')}</option>
        </select>

        {(() => {
          // The rejected status keeps its reasons in the Rejection Reasons tab.
          const isRejected = (status.statusKey || status.name).toLowerCase() === 'rejected';
          const n = status.reasons?.length ?? 0;
          const label = isRejected
            ? t('statusSettings.reasonsInRejectionTab', 'settings')
            : t('statusSettings.reasonsButtonTitle', 'settings');
          return (
            <button
              type="button"
              onClick={() => !isRejected && onEditReasons(index)}
              disabled={isRejected}
              title={label}
              aria-label={label}
              className={`inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
            >
              <ListChecks className="size-3.5" />
              {t('statusSettings.reasonsButton', 'settings')}
              {n > 0 && <span className="rounded bg-brand-50 px-1 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{n}</span>}
            </button>
          );
        })()}

        <label className={`inline-flex items-center gap-2 text-sm ${isLocked || !canEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input
            type="radio"
            name="default-status"
            checked={!!status.isDefault}
            onChange={() => !isLocked && canEdit && onSetDefault(index)}
            disabled={isLocked || !canEdit}
            className="size-4 accent-brand-500"
          />
          <span className="text-slate-600 dark:text-slate-400">{t('statusSettings.labelDefault', 'settings')}</span>
        </label>

        {!isLocked && (
          <IconButton tone="danger" label={t('delete', 'common')} onClick={() => onRemove(index)} disabled={!canEdit}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

// Drag Overlay Component
const DragOverlayItem = React.memo(({ status}: { status: LeadStatus; index: number }) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-400 bg-white p-3 shadow-xl md:flex-row md:items-center md:justify-between dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg">
          <GripVertical className="size-4 text-brand-500" />
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
        <span
          className="size-5 rounded-md ring-1 ring-inset ring-black/10"
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
  embedded?: boolean;
};

export default function StatusLabelsSettings({
  companyId: _companyId,
  embedded,
}: Props = {}) {
  const { hasPermission } = useAuth();
  const { t } = useLocale();
  const { offerUndo } = useUndo();
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateCompanyStatuses();
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const effectiveCompanyId = selectedCompanyId ?? (companies as any[])[0]?._id;
  const selectedCompany = useMemo(
    () => (companies as any[]).find((c) => c._id === effectiveCompanyId),
    [companies, effectiveCompanyId]
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
          ...(s?.reportRole ? { reportRole: s.reportRole } : {}),
          ...(Array.isArray(s?.reasons) && s.reasons.length ? { reasons: s.reasons.map(String) } : {}),
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
  // Which status means "didn't show up" (see utils/noShow.ts).
  const [noShow, setNoShow] = useState<NoShowSetting>({ mode: 'auto', status: null });
  const [originalNoShowJson, setOriginalNoShowJson] = useState('');
  const statusesRef = useRef<LeadStatus[]>(statuses);
  statusesRef.current = statuses;

  const { isStaticStatus: checkIsStatic, getDescription } = useStatusSettings(
    selectedCompany
  );

  useEffect(() => {
    const normalized = deriveStatuses(selectedCompany ?? {});
    setStatuses(normalized);
    setStatusIds(normalized.map(() => makeId()));
    setOriginalStatusesJson(JSON.stringify(normalized));
    const savedNoShow: NoShowSetting = {
      mode: selectedCompany?.settings?.noShow?.mode || 'auto',
      status: selectedCompany?.settings?.noShow?.status || null,
    };
    setNoShow(savedNoShow);
    setOriginalNoShowJson(JSON.stringify(savedNoShow));
  }, [selectedCompanyId, selectedCompany]);

  const canEdit =
    !!hasPermission &&
    (hasPermission('Company Management', 'write') ||
      hasPermission('Settings Management', 'write') ||
      hasPermission('Settings Management', 'create'));

  const hasChanges = useMemo(
    () =>
      JSON.stringify(statuses) !== originalStatusesJson ||
      JSON.stringify(noShow) !== originalNoShowJson,
    [statuses, originalStatusesJson, noShow, originalNoShowJson]
  );

  const guessedNoShow = useMemo(() => guessedNoShowStatus(statuses), [statuses]);
  const pickedNoShowMissing =
    noShow.mode === 'status' &&
    !statuses.some((s) => s.name.trim().toLowerCase() === String(noShow.status || '').trim().toLowerCase());

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
    let beforeStatuses: LeadStatus[] | null = null;
    let beforeIds: string[] | null = null;
    setStatuses((prev) => {
      beforeStatuses = prev;
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((s) => s.isDefault)) {
        // A copy, so the Undo snapshot keeps its own default flag.
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
    setStatusIds((prev) => {
      beforeIds = prev;
      return prev.filter((_, i) => i !== index);
    });
    offerUndo(t('undoItemRemoved', 'common'), () => {
      const statusesSnapshot = beforeStatuses;
      const idsSnapshot = beforeIds;
      if (statusesSnapshot && idsSnapshot) {
        setStatuses(statusesSnapshot);
        setStatusIds(idsSnapshot);
      }
    });
  }, [offerUndo, t]);

  const setDefault = useCallback((index: number) => {
    setStatuses((prev) =>
      prev.map((s, i) => ({ ...s, isDefault: i === index }))
    );
  }, []);

  const handleNameChange = useCallback((index: number, value: string) => {
    // The picked no-show status follows its rename.
    const oldName = statusesRef.current[index]?.name;
    setNoShow((ns) =>
      ns.mode === 'status' && oldName && ns.status === oldName ? { ...ns, status: value } : ns
    );
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

  const handleReportRoleChange = useCallback((index: number, role: ReportRole) => {
    setStatuses((prev) =>
      prev.map((s, i) => (i === index ? { ...s, reportRole: role } : s))
    );
  }, []);

  const [editingReasonsIndex, setEditingReasonsIndex] = useState<number | null>(null);
  const handleReasonsChange = useCallback((index: number, reasons: string[]) => {
    setStatuses((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const { reasons: _old, ...rest } = s;
        return reasons.length ? { ...rest, reasons } : rest;
      })
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
      ...(s.reportRole ? { reportRole: s.reportRole } : {}),
      reasons: (s.reasons || []).map((r) => r.trim()).filter(Boolean),
    }));

    const settingsId = selectedCompany?.settings?._id;

    setIsSaving(true);

    try {
      const noShowPayload: NoShowSetting =
        noShow.mode === 'status' && String(noShow.status || '').trim()
          ? { mode: 'status', status: String(noShow.status).trim() }
          : { mode: noShow.mode === 'off' ? 'off' : 'auto', status: null };
      await updateMutation.mutateAsync({
        settingsId: settingsId,
        statuses: payload,
        noShow: noShowPayload,
      });
      setOriginalNoShowJson(JSON.stringify(noShowPayload));
      setNoShow(noShowPayload);

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
  }, [selectedCompanyId, statuses, noShow, selectedCompany, updateMutation, queryClient]);

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
    <SettingsSection
      embedded={embedded}
      metaTitle={t('statusSettings.pageMetaTitle', 'settings')}
      metaDescription={t('statusSettings.pageMetaDesc', 'settings')}
      icon={<Settings className="size-4" />}
      title={t('statusSettings.title', 'settings')}
      description={t('statusSettings.description', 'settings')}
      actions={
        <>
          <Button icon={<PlusCircle className="size-4" />} onClick={addStatus} disabled={!canEdit}>
            {t('statusSettings.addStatus', 'settings')}
          </Button>
          <Button
            variant="primary"
            icon={<Save className="size-4" />}
            loading={isSaving}
            disabled={!canEdit || !hasChanges}
            onClick={handleSave}
          >
            {t('statusSettings.saveChanges', 'settings')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardToolbar>
              <SectionTitle icon={<Eye className="size-4" />}>{t('statusSettings.previewTitle', 'settings')}</SectionTitle>
            </CardToolbar>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {statuses.map((s, i) => (
                  <span
                    key={statusIds[i] ?? i}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
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
          </Card>

          <Card>
            <CardToolbar>
              <SectionTitle icon={<UserX className="size-4" />}>{t('statusSettings.noShowTitle', 'settings')}</SectionTitle>
            </CardToolbar>
            <div className="space-y-2 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('statusSettings.noShowDesc', 'settings')}</p>
              <select
                value={noShow.mode === 'status' ? `s:${noShow.status ?? ''}` : noShow.mode}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'auto' || v === 'off') setNoShow({ mode: v, status: null });
                  else setNoShow({ mode: 'status', status: v.slice(2) });
                }}
                disabled={!canEdit}
                aria-label={t('statusSettings.noShowTitle', 'settings')}
                className={`h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${focusRing}`}
              >
                <option value="auto">
                  {guessedNoShow
                    ? t('statusSettings.noShowAutoFound', 'settings', { status: guessedNoShow })
                    : t('statusSettings.noShowAutoNone', 'settings')}
                </option>
                {statuses
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <option key={`${s.name}-${i}`} value={`s:${s.name}`}>
                      {s.name}
                    </option>
                  ))}
                {pickedNoShowMissing && noShow.status && (
                  <option value={`s:${noShow.status}`}>{noShow.status}</option>
                )}
                <option value="off">{t('statusSettings.noShowOff', 'settings')}</option>
              </select>
              {pickedNoShowMissing && (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t('statusSettings.noShowMissing', 'settings')}</p>
              )}
            </div>
          </Card>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('statusSettings.noteTitle', 'settings')}</h3>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400/90">{t('statusSettings.noteText', 'settings')}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('statusSettings.reportsNoteTitle', 'settings')}</h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t('statusSettings.reportsNoteText', 'settings')}</p>
            </div>
          </div>
        </div>

        <Card className="p-4 xl:col-span-8">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={statusIds} strategy={verticalListSortingStrategy}>
              <div ref={listRef} className="space-y-2">
                {statuses.map((status, index) => {
                  const locked = isLocked(status);
                  const isStatic = checkIsStatic(status.statusKey || status.name);
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
                      onReportRoleChange={handleReportRoleChange}
                      onEditReasons={setEditingReasonsIndex}
                    />
                  );
                })}
              </div>
            </SortableContext>

            {createPortal(
              <DragOverlay dropAnimation={dropAnimation}>
                {activeId && activeItem && activeIndex !== -1 ? (
                  <DragOverlayItem status={activeItem} index={activeIndex} />
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
          {editingReasonsIndex !== null && statuses[editingReasonsIndex] && (
            <StatusReasonsEditor
              key={statusIds[editingReasonsIndex]}
              status={statuses[editingReasonsIndex]}
              canEdit={canEdit}
              onClose={() => setEditingReasonsIndex(null)}
              onSave={(reasons) => handleReasonsChange(editingReasonsIndex, reasons)}
            />
          )}
        </Card>
      </div>
    </SettingsSection>
  );
}
