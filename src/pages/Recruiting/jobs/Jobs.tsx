import { getErrorMessage } from '../../../utils/errorHandler';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import PageMeta from '../../../components/common/PageMeta';
import {
  PlusIcon,
  SearchIcon,
  BriefcaseIcon,
  Building2Icon,
  MapPinIcon,
  CalendarIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  MenuIcon as ListIcon,
  GripVerticalIcon,
  Trash2Icon,
  PencilIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import {
  useJobPositions,
  useDeleteJobPosition,
  jobPositionsKeys,
} from '../../../hooks/queries';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { toPlainString, toSlug } from '../../../utils/strings';
import { normalizeFieldConfig } from '../../../utils/jobUtils';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  IconButton,
  PageShell,
  Segmented,
  Switch,
  Table,
  Th,
  filterSelectClass,
  focusRing,
  inputClass,
  rowClass,
  ErrorState,
} from '../../../components/ui/kit';
import type { BadgeTone } from '../../../components/ui/kit';
import { jobPositionsService } from '../../../services/jobPositionsService';
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
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { queryClient } from '../../../lib/queryClient';

const getTranslation = (value: any, defaultValue = '', locale?: string): string => {
  const plain = toPlainString(value, locale);
  return plain || defaultValue;
};

const toLocalized = (value: any, fallback = ''): { en: string; ar: string } => {
  if (typeof value === 'string') {
    const normalized = value || fallback;
    return { en: normalized, ar: normalized };
  }
  if (value && typeof value === 'object') {
    const enValue = value.en || toPlainString(value) || fallback;
    const arValue = value.ar || enValue;
    return { en: enValue, ar: arValue };
  }
  return { en: fallback, ar: fallback };
};

const isJobExpired = (job: any): boolean => {
  if (!job?.registrationEnd) return false;
  const end = new Date(job.registrationEnd);
  if (Number.isNaN(end.getTime())) return false;
  const endOfDay = end.getTime() + 24 * 60 * 60 * 1000 - 1;
  return endOfDay < Date.now();
};

const getJobOrderValue = (job: any): number => {
  const rawOrder = job?.order;
  const parsedOrder =
    typeof rawOrder === 'number' ? rawOrder : Number(rawOrder);
  return Number.isFinite(parsedOrder) ? parsedOrder : Number.MAX_SAFE_INTEGER;
};

const getJobCompanyId = (job: any): string => {
  const companyId = job?.companyId;
  if (typeof companyId === 'string') return companyId;
  if (companyId && typeof companyId === 'object') {
    return companyId._id || companyId.id || '';
  }
  return '';
};

const sortJobsByOrder = (jobs: any[]): any[] => {
  return [...jobs].sort((a, b) => {
    const orderDiff = getJobOrderValue(a) - getJobOrderValue(b);
    if (orderDiff !== 0) return orderDiff;
    const createdA = a?.createdAt
      ? new Date(a.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const createdB = b?.createdAt
      ? new Date(b.createdAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return createdA - createdB;
  });
};


const formatDate = (dateString?: string, locale?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(locale || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getJobStatus = (job: any): { tone: BadgeTone; key: string } => {
  if (isJobExpired(job)) return { tone: 'red', key: 'jobsExpiredBadge' };
  if (job.isActive !== false) return { tone: 'green', key: 'jobsActiveBadge' };
  return { tone: 'slate', key: 'jobsDeprioritizedBadge' };
};

function SortableJobCard({
  job,
  canManageJobs,
  onToggleActive,
  onDelete,
  onEdit,
  suppressNavigateRef,
}: {
  job: any;
  canManageJobs: boolean;
  onToggleActive: (job: any) => void;
  onDelete: (e: React.MouseEvent, jobId: string) => void;
  onEdit: (job: any) => void;
  suppressNavigateRef: React.MutableRefObject<boolean>;
}) {
  const { t, locale } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressNavigateRef.current) {
      e.preventDefault();
    }
  };

  const status = getJobStatus(job);
  const arrangement =
    ({ 'on-site': t('createOnSite', 'jobs'), remote: t('createRemote', 'jobs'), hybrid: t('createHybrid', 'jobs') } as Record<string, string>)[job.workArrangement] ||
    job.workArrangement ||
    t('jobsRemoteOffice', 'jobs');
  const title = getTranslation(job.title, '', locale);

  return (
    <Link
      ref={setNodeRef}
      style={style}
      to={`/create-job?id=${job._id}`}
      state={{ job }}
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-[box-shadow,border-color,opacity] hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${focusRing} ${
        isDragging ? 'z-50 opacity-60 ring-2 ring-brand-400' : ''
      }`}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              {...attributes}
              {...listeners}
              className="inline-flex cursor-grab items-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-300"
              title={t('jobsDragReorder', 'jobs')}
              aria-label={t('jobsDragReorder', 'jobs')}
            >
              <GripVerticalIcon className="size-4" />
            </span>
            <Badge tone={status.tone}>{t(status.key, 'jobs')}</Badge>
          </div>
          {canManageJobs && (
            <div onClick={(e) => e.preventDefault()}>
              <Switch
                checked={job.isActive !== false}
                onChange={() => onToggleActive(job)}
                label={t('jobsToggleActive', 'jobs', { title })}
              />
            </div>
          )}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {title}
        </h3>

        <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-2">
            <Building2Icon className="size-4 shrink-0 text-slate-400" />
            <span className="truncate">{getTranslation(job.companyId?.name, '', locale) || t('jobsGlobalCorp', 'jobs')}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0 text-slate-400" />
            <span>{arrangement}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-slate-400" />
            <span>{t('jobsCreatedAt', 'jobs', { date: formatDate(job.createdAt, locale) })}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{job.applicantsCount || 0}</span>{' '}
          {t('jobsCandidates', 'jobs')}
        </span>
        <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
          {/* A button, not a link: this sits inside the card's <a>. */}
          <IconButton
            label={t('jobsOpenForm', 'jobs')}
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://form.sabergroup-eg.com/${toSlug(job.companyId?.name, 'en')}/${toSlug(job.title, 'en')}`,
                '_blank',
                'noopener,noreferrer'
              );
            }}
          >
            <ExternalLinkIcon className="size-4" />
          </IconButton>
          {canManageJobs && (
            <IconButton
              label={t('jobsEditJob', 'jobs')}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(job);
              }}
            >
              <PencilIcon className="size-4" />
            </IconButton>
          )}
          {canManageJobs && (
            <IconButton
              tone="danger"
              label={t('jobsDeleteJob', 'jobs')}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e, job._id);
              }}
            >
              <Trash2Icon className="size-4" />
            </IconButton>
          )}
        </div>
      </div>
    </Link>
  );
}

function SortableJobRow({
  job,
  onNavigate,
  suppressNavigateRef,
}: {
  job: any;
  onNavigate: (job: any) => void;
  suppressNavigateRef: React.MutableRefObject<boolean>;
}) {
  const { t, locale } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRowClick = () => {
    if (suppressNavigateRef.current) return;
    onNavigate(job);
  };

  const status = getJobStatus(job);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={handleRowClick}
      className={`${rowClass} cursor-pointer ${isDragging ? 'relative z-50 opacity-60 ring-2 ring-brand-400' : ''}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            {...attributes}
            {...listeners}
            className="inline-flex cursor-grab items-center text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            title={t('jobsDragReorder', 'jobs')}
            aria-label={t('jobsDragReorder', 'jobs')}
          >
            <GripVerticalIcon className="size-4" />
          </span>
          <Link
            to={`/create-job?id=${job._id}`}
            state={{ job }}
            className={`rounded font-medium text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400 ${focusRing}`}
            onClick={(e) => {
              e.stopPropagation();
              if (suppressNavigateRef.current) {
                e.preventDefault();
              }
            }}
          >
            {getTranslation(job.title, '', locale)}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-slate-700 dark:text-slate-300">
          {getTranslation(job.companyId?.name, '', locale) || t('jobsGlobalCorp', 'jobs')}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {({ 'on-site': t('createOnSite', 'jobs'), remote: t('createRemote', 'jobs'), hybrid: t('createHybrid', 'jobs') } as Record<string, string>)[job.workArrangement] || job.workArrangement || t('jobsOffice', 'jobs')}
        </p>
      </td>
      <td className="px-4 py-3 tabular-nums">{job.applicantsCount || 0}</td>
      <td className="px-4 py-3">
        <Badge tone={status.tone}>{t(status.key, 'jobs')}</Badge>
      </td>
      <td className="px-4 py-3 text-end">
        <ChevronRightIcon className="ms-auto size-4 text-slate-300 rtl:rotate-180" aria-hidden="true" />
      </td>
    </tr>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { t, locale } = useLocale();

  const isAdmin = user?.roleId?.name?.toLowerCase().includes('super admin');
  const canCreate = hasPermission('Job Position Management', 'create');
  const canWrite = hasPermission('Job Position Management', 'write');
  const canManageJobs = canCreate && canWrite;

  const { selectedCompanyId } = useCompanyFilter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderedJobIds, setOrderedJobIds] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [activeDragJob, setActiveDragJob] = useState<any | null>(null);
  const suppressNavigateRef = useRef(false);
  const orderSyncVersionRef = useRef(0);
  const orderSyncDebounceRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const jobQueryCompanyParam = useMemo(() => {
    if (!user) return ['__NO_COMPANY__'];
    if (isAdmin) return undefined;
    const usercompanyIds = user?.companies?.map((c: any) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId._id
    );
    return usercompanyIds?.length ? usercompanyIds : ['__NO_COMPANY__'];
  }, [user, isAdmin]);

  const {
    data: jobPositions = [],
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
    isFetching: isJobFetching,
    isError: jobsFailed,
    error: jobsError,
  } = useJobPositions(
    jobQueryCompanyParam as any,
    false,
    undefined
  );

  const deleteJobMutation = useDeleteJobPosition();

  useEffect(() => {
    setOrderedJobIds((prevIds) => {
      const incomingIds = sortJobsByOrder(jobPositions)
        .map((job: any) => job?._id)
        .filter(Boolean) as string[];
      if (incomingIds.length === 0) return prevIds.length === 0 ? prevIds : [];
      const unchanged =
        incomingIds.length === prevIds.length &&
        incomingIds.every((id, index) => id === prevIds[index]);
      return unchanged ? prevIds : incomingIds;
    });
  }, [jobPositions]);

  useEffect(() => {
    return () => {
      if (orderSyncDebounceRef.current !== null) {
        window.clearTimeout(orderSyncDebounceRef.current);
      }
    };
  }, []);

  const orderedJobs = useMemo(() => {
    if (!Array.isArray(jobPositions) || jobPositions.length === 0) return [];
    if (orderedJobIds.length === 0) return sortJobsByOrder(jobPositions);
    const jobsById = new Map(jobPositions.map((job: any) => [job._id, job]));
    const prioritized = orderedJobIds
      .map((id) => jobsById.get(id))
      .filter(Boolean) as any[];
    const prioritizedIds = new Set(prioritized.map((job: any) => job._id));
    const remaining = sortJobsByOrder(
      jobPositions.filter((job: any) => !prioritizedIds.has(job._id))
    );
    return [...prioritized, ...remaining];
  }, [jobPositions, orderedJobIds]);

  const buildOrderPayload = (job: any, order: number) => {
    const payload: any = {
      title: toLocalized(job.title, t('jobsUntitledRole', 'jobs')),
      description: toLocalized(job.description, ''),
      employmentType: job.employmentType || 'full-time',
      workArrangement: job.workArrangement || 'on-site',
      order,
    };
    if (typeof job.isActive === 'boolean') payload.isActive = job.isActive;
    if (typeof job.salary === 'number') payload.salary = job.salary;
    if (typeof job.salaryVisible === 'boolean')
      payload.salaryVisible = job.salaryVisible;
    payload.fieldConfig = normalizeFieldConfig(job?.fieldConfig, job?.salaryFieldVisible);
    if (typeof job.bilingual === 'boolean') payload.bilingual = job.bilingual;
    return payload;
  };

  const syncJobOrderToBackend = async ({
    previousOrderIds,
    nextOrderIds,
    companyId,
    sourceJobId,
  }: {
    previousOrderIds: string[];
    nextOrderIds: string[];
    companyId: string;
    sourceJobId?: string;
  }) => {
    if (!companyId) return;
    const jobsById = new Map(jobPositions.map((job: any) => [job?._id, job]));
    const normalizedCompanyOrderIds = nextOrderIds.filter((id) => {
      const job = jobsById.get(id);
      return Boolean(job) && getJobCompanyId(job) === companyId;
    });
    if (normalizedCompanyOrderIds.length === 0) return;

    const previousCompanyOrderIds = previousOrderIds.filter((id) => {
      const job = jobsById.get(id);
      return Boolean(job) && getJobCompanyId(job) === companyId;
    });
    const prevIndexById = new Map(
      previousCompanyOrderIds.map((id, idx) => [id, idx])
    );

    const changedCompanyIds = (() => {
      if (sourceJobId && normalizedCompanyOrderIds.includes(sourceJobId)) {
        const newIndex = normalizedCompanyOrderIds.indexOf(sourceJobId);
        const oldIndex = prevIndexById.get(sourceJobId);
        if (oldIndex === undefined || oldIndex !== newIndex)
          return [sourceJobId];
        return [] as string[];
      }
      return normalizedCompanyOrderIds.filter(
        (id, idx) => prevIndexById.get(id) !== idx
      );
    })();

    if (changedCompanyIds.length === 0) return;

    const reorderItems = changedCompanyIds.map((id) => ({
      id,
      order: normalizedCompanyOrderIds.indexOf(id) + 1,
    }));

    const basePayloadById = changedCompanyIds.reduce(
      (acc, id) => {
        const job = jobsById.get(id);
        if (job) {
          acc[id] = buildOrderPayload(
            job,
            normalizedCompanyOrderIds.indexOf(id) + 1
          );
        }
        return acc;
      },
      {} as Record<string, any>
    );

    const requestVersion = ++orderSyncVersionRef.current;
    setIsSavingOrder(true);

    try {
      await jobPositionsService.reorderJobPositions(
        reorderItems,
        basePayloadById
      );
    } catch (err: any) {
      if (requestVersion === orderSyncVersionRef.current) {
        setOrderedJobIds(previousOrderIds);
        Swal.fire(
          t('jobsReorderFailed', 'jobs'),
          getErrorMessage(err) || t('jobsReorderFailedMsg', 'jobs'),
          'error'
        );
      }
    } finally {
      if (requestVersion === orderSyncVersionRef.current) {
        setIsSavingOrder(false);
      }
    }
  };

  const scheduleJobOrderSync = ({
    previousOrderIds,
    nextOrderIds,
    companyId,
    sourceJobId,
  }: {
    previousOrderIds: string[];
    nextOrderIds: string[];
    companyId: string;
    sourceJobId?: string;
  }) => {
    if (orderSyncDebounceRef.current !== null) {
      window.clearTimeout(orderSyncDebounceRef.current);
    }
    orderSyncDebounceRef.current = window.setTimeout(() => {
      orderSyncDebounceRef.current = null;
      void syncJobOrderToBackend({
        previousOrderIds,
        nextOrderIds,
        companyId,
        sourceJobId,
      });
    }, 250);
  };

  const handleJobClick = (job: any) => {
    if (suppressNavigateRef.current) return;
    navigate(`/create-job?id=${job._id}`, { state: { job } });
  };

  const handleGridDragStart = (event: DragStartEvent) => {
    const job = orderedJobs.find((j: any) => j._id === event.active.id);
    setActiveDragJob(job || null);
    suppressNavigateRef.current = true;

    const handler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('click', handler, true);
    setTimeout(
      () => document.removeEventListener('click', handler, true),
      1000
    );
  };

  const handleGridDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragJob(null);

    window.setTimeout(() => {
      suppressNavigateRef.current = false;
    }, 0);

    if (!over || active.id === over.id) return;

    const jobsById = new Map(orderedJobs.map((job: any) => [job?._id, job]));
    const sourceJob = jobsById.get(active.id as string);
    if (!sourceJob) return;

    const companyId = getJobCompanyId(sourceJob);
    if (!companyId) return;

    const companyJobIds = (
      orderedJobIds.length > 0
        ? orderedJobIds
        : orderedJobs.map((j: any) => j._id)
    ).filter((id) => {
      const job = jobsById.get(id);
      return getJobCompanyId(job) === companyId;
    });

    const oldIndex = companyJobIds.indexOf(active.id as string);
    const newIndex = companyJobIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newCompanyOrder = arrayMove(companyJobIds, oldIndex, newIndex);
    const baselineOrderIds =
      orderedJobIds.length > 0
        ? [...orderedJobIds]
        : orderedJobs.map((job: any) => job._id);

    let companyIndex = 0;
    const nextOrderIds = baselineOrderIds.map((id) => {
      const job = jobsById.get(id);
      if (getJobCompanyId(job) === companyId) {
        return newCompanyOrder[companyIndex++];
      }
      return id;
    });

    setOrderedJobIds(nextOrderIds);
    scheduleJobOrderSync({
      previousOrderIds: baselineOrderIds,
      nextOrderIds,
      companyId,
      sourceJobId: active.id as string,
    });
  };

  const handleGridDragCancel = () => {
    setActiveDragJob(null);
    window.setTimeout(() => {
      suppressNavigateRef.current = false;
    }, 0);
  };

  const handleEditJob = (job: any) => {
    navigate(`/create-job?id=${job._id}`, { state: { job } });
  };

  const filteredJobs = useMemo(() => {
    return orderedJobs.filter((job: any) => {
      const title = getTranslation(job.title, '', locale).toLowerCase();
      const company = job.companyId?.name
        ? getTranslation(job.companyId.name, '', locale).toLowerCase()
        : '';
      const matchesSearch =
        title.includes(searchTerm.toLowerCase()) ||
        company.includes(searchTerm.toLowerCase());

      const isActive = job.isActive !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      const companyIdForJob = getJobCompanyId(job) || 'unassigned';
      const matchesCompany =
        !selectedCompanyId || companyIdForJob === selectedCompanyId;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [orderedJobs, searchTerm, statusFilter, selectedCompanyId, locale]);

  const jobsGroupedByCompany = useMemo(() => {
    if (!Array.isArray(orderedJobs) || orderedJobs.length === 0) return [];
    const filteredIds = new Set((filteredJobs || []).map((j: any) => j._id));
    const indexById = new Map(
      orderedJobs.map((job: any, idx: number) => [job._id, idx])
    );

    const companyCounts = new Map<string, number>();
    const companyFirstIndex = new Map<string, number>();

    (filteredJobs || []).forEach((j: any) => {
      const cid = getJobCompanyId(j) || 'unassigned';
      companyCounts.set(cid, (companyCounts.get(cid) || 0) + 1);
      const idx = indexById.get(j._id);
      if (idx !== undefined) {
        const prev = companyFirstIndex.get(cid);
        if (prev === undefined || idx < prev) companyFirstIndex.set(cid, idx);
      }
    });

    const allCompanyIds =
      companyCounts.size > 0
        ? Array.from(companyCounts.keys())
        : Array.from(
            new Set(
              orderedJobs.map((j: any) => getJobCompanyId(j) || 'unassigned')
            )
          );

    allCompanyIds.sort((a, b) => {
      const ca = companyCounts.get(a) || 0;
      const cb = companyCounts.get(b) || 0;
      if (cb !== ca) return cb - ca;
      const ia = companyFirstIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
      const ib = companyFirstIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });

    return allCompanyIds
      .map((cid) => {
        const jobsForCompany = orderedJobs
          .filter(
            (j: any) =>
              filteredIds.has(j._id) &&
              (getJobCompanyId(j) || 'unassigned') === cid
          )
          .sort((a: any, b: any) => {
            const ia = indexById.get(a._id);
            const ib = indexById.get(b._id);
            if (ia !== undefined && ib !== undefined) return ia - ib;
            const oa = getJobOrderValue(a);
            const ob = getJobOrderValue(b);
            if (oa !== ob) return oa - ob;
            const ca = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const cb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ca - cb;
          });

        const companyName =
          jobsForCompany[0]?.companyId?.name ||
          (cid ? t('jobsCompany', 'jobs') : t('jobsUnassigned', 'jobs'));
        return {
          companyId: cid || 'unassigned',
          companyName,
          jobs: jobsForCompany,
        };
      })
      .filter((g) => g.jobs.length > 0);
  }, [orderedJobs, filteredJobs, t]);

  const handleToggleActive = (job: any) => {
  const jobId = job._id;
  const newStatus = !job.isActive;

  const listKey = jobPositionsKeys.list(
    jobQueryCompanyParam as any,
    undefined
  );
  const detailKey = jobPositionsKeys.detail(jobId);

  // snapshot for rollback
  const previousList = queryClient.getQueryData<any[]>(listKey);
  const previousDetail = queryClient.getQueryData<any>(detailKey);

  // flip instantly, no waiting on the network
  queryClient.setQueryData<any[]>(listKey, (old) =>
    old ? old.map((j) => (j._id === jobId ? { ...j, isActive: newStatus } : j)) : old
  );
  queryClient.setQueryData(detailKey, (old: any) =>
    old ? { ...old, isActive: newStatus } : old
  );

  const payload: any = {
    isActive: newStatus,
    title: toLocalized(job.title, t('jobsUntitledRole', 'jobs')),
    description: toLocalized(job.description, ''),
    employmentType: job.employmentType || 'full-time',
    workArrangement: job.workArrangement || 'on-site',
  };
  if (typeof job.salary === 'number') payload.salary = job.salary;
  if (typeof job.salaryVisible === 'boolean') payload.salaryVisible = job.salaryVisible;
  payload.fieldConfig = normalizeFieldConfig(job?.fieldConfig, job?.salaryFieldVisible);
  if (typeof job.bilingual === 'boolean') payload.bilingual = job.bilingual;

  // fire and forget — UI already reflects the new state
  jobPositionsService.updateJobPosition(jobId, payload).catch((err: any) => {
    // roll back on failure
    queryClient.setQueryData(listKey, previousList);
    queryClient.setQueryData(detailKey, previousDetail);

    Swal.fire(t('jobsError', 'jobs'), getErrorMessage(err) || t('jobsUpdateFailed', 'jobs'), 'error');
  });
};

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: t('jobsDeleteTitle', 'jobs'),
      text: t('jobsDeleteText', 'jobs'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: '#EF4444',
      confirmButtonText: t('jobsDeleteConfirm', 'jobs'),
    });
    if (result.isConfirmed) {
      try {
        await deleteJobMutation.mutateAsync(jobId);
        await refetchJobs();
        Swal.fire(t('jobsDeleted', 'jobs'), t('jobsDeletedMsg', 'jobs'), 'success');
      } catch {
        Swal.fire(t('jobsError', 'jobs'), t('jobsDeleteError', 'jobs'), 'error');
      }
    }
  };

  if (isLoadingJobs) {
    return <LoadingSpinner fullPage message={t('jobsAccessingRegistry', 'jobs')} />;
  }

  return (
    <>
      <PageMeta
        title={t('jobsPageTitle', 'jobs')}
        description={t('jobsPageDesc', 'jobs')}
      />
      <PageShell
        title={t('jobsBreadcrumb', 'jobs')}
        subtitle={t('jobsSubtitle', 'jobs', { count: jobPositions.length })}
        actions={
          <>
            <IconButton label={t('jobsRefresh', 'jobs')} onClick={() => refetchJobs()} disabled={isJobFetching}>
              <RefreshCwIcon className={`size-4 ${isJobFetching ? 'animate-spin' : ''}`} />
            </IconButton>
            {canManageJobs && (
              <Button variant="primary" icon={<PlusIcon className="size-4" />} onClick={() => navigate('/create-job')}>
                {t('jobsLaunchNewRole', 'jobs')}
              </Button>
            )}
          </>
        }
      >
        {/* With results the toolbar stands alone, so drop its divider. */}
        <Card className={filteredJobs.length > 0 ? '[&>div]:border-b-0' : ''}>
          <CardToolbar>
            <div className="relative w-full lg:max-w-sm">
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={t('jobsSearchPlaceholder', 'jobs')}
                aria-label={t('jobsSearchPlaceholder', 'jobs')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputClass} ps-9`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSavingOrder && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400" role="status">
                  {t('jobsSavingOrder', 'jobs')}
                </span>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t('jobsColumnStatus', 'jobs')}
                className={filterSelectClass}
              >
                <option value="all">{t('jobsAllStatus', 'jobs')}</option>
                <option value="active">{t('jobsActive', 'jobs')}</option>
                <option value="inactive">{t('jobsInactive', 'jobs')}</option>
              </select>
              <Segmented
                ariaLabel={t('jobsViewLabel', 'jobs')}
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'grid', label: <span className="sr-only">{t('jobsViewGrid', 'jobs')}</span>, icon: <LayoutGridIcon className="size-4" /> },
                  { value: 'list', label: <span className="sr-only">{t('jobsViewList', 'jobs')}</span>, icon: <ListIcon className="size-4" /> },
                ]}
              />
            </div>
          </CardToolbar>
          {jobsFailed && jobPositions.length === 0 ? (
            <ErrorState error={jobsError} onRetry={() => refetchJobs()} />
          ) : filteredJobs.length === 0 && (
            <EmptyState
              icon={<BriefcaseIcon className="size-6" />}
              title={t('jobsNoPositions', 'jobs')}
              text={t('jobsNoPositionsDesc', 'jobs')}
              action={
                canManageJobs && (
                  <Button variant="primary" icon={<PlusIcon className="size-4" />} onClick={() => navigate('/create-job')}>
                    {t('jobsLaunchNewRole', 'jobs')}
                  </Button>
                )
              }
            />
          )}
        </Card>

        {filteredJobs.length === 0 ? null : viewMode === 'grid' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleGridDragStart}
            onDragEnd={handleGridDragEnd}
            onDragCancel={handleGridDragCancel}
          >
            <div className="space-y-8">
              {jobsGroupedByCompany.map((group: any) => {
                const groupJobIds = group.jobs.map((j: any) => j._id);
                return (
                  <section key={group.companyId} className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {getTranslation(group.companyName, '', locale)}
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('jobsPositions', 'jobs', { count: group.jobs.length })}
                      </span>
                    </div>

                    <SortableContext
                      items={groupJobIds}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {group.jobs.map((job: any) => (
                          <SortableJobCard
                            key={job._id}
                            job={job}
                            canManageJobs={canManageJobs}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                            onEdit={handleEditJob}
                            suppressNavigateRef={suppressNavigateRef}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </section>
                );
              })}
            </div>

            <DragOverlay>
              {activeDragJob ? (
                <div className="cursor-grabbing rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {getTranslation(activeDragJob.title, '', locale)}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <Card className="overflow-hidden">
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>{t('jobsColumnPosition', 'jobs')}</Th>
                  <Th>{t('jobsColumnInfrastructure', 'jobs')}</Th>
                  <Th>{t('jobsColumnApplicants', 'jobs')}</Th>
                  <Th>{t('jobsColumnStatus', 'jobs')}</Th>
                  <Th align="end"><span className="sr-only">{t('jobsColumnActions', 'jobs')}</span></Th>
                </tr>
              </thead>

              {jobsGroupedByCompany.map((group: any) => {
                const groupJobIds = group.jobs.map((j: any) => j._id);
                const companyId = group.companyId;

                const handleListDragEnd = (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;

                  const oldIndex = groupJobIds.indexOf(active.id as string);
                  const newIndex = groupJobIds.indexOf(over.id as string);
                  if (oldIndex === -1 || newIndex === -1) return;

                  suppressNavigateRef.current = true;
                  window.setTimeout(() => {
                    suppressNavigateRef.current = false;
                  }, 0);

                  const newCompanyOrder = arrayMove(
                    groupJobIds,
                    oldIndex,
                    newIndex
                  );
                  const baselineOrderIds =
                    orderedJobIds.length > 0
                      ? [...orderedJobIds]
                      : orderedJobs.map((job: any) => job._id);

                  const jobsById = new Map(
                    orderedJobs.map((job: any) => [job?._id, job])
                  );

                  let companyIdx = 0;
                  const nextOrderIds = baselineOrderIds.map((id) => {
                    const job = jobsById.get(id);
                    if (getJobCompanyId(job) === companyId) {
                      return newCompanyOrder[companyIdx++];
                    }
                    return id;
                  });

                  setOrderedJobIds(nextOrderIds);
                  scheduleJobOrderSync({
                    previousOrderIds: baselineOrderIds,
                    nextOrderIds,
                    companyId,
                    sourceJobId: active.id as string,
                  });
                };

                return (
                  <tbody key={group.companyId}>
                    <tr className="border-t border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {getTranslation(group.companyName, '', locale)}
                        <span className="ms-2 font-normal text-slate-500 dark:text-slate-400">
                          ({group.jobs.length})
                        </span>
                      </td>
                    </tr>

                    {/* Announcements go to <body>: a <div> can't sit inside <tbody>. */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleListDragEnd}
                      accessibility={{ container: document.body }}
                    >
                      <SortableContext
                        items={groupJobIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {group.jobs.map((job: any) => (
                          <SortableJobRow
                            key={job._id}
                            job={job}
                            onNavigate={handleJobClick}
                            suppressNavigateRef={suppressNavigateRef}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </tbody>
                );
              })}
            </Table>
          </Card>
        )}
      </PageShell>
    </>
  );
}
