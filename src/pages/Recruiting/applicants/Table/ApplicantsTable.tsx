// Applicants.tsx - Optimized version with improved photo loading
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { applicantsKeys } from '../../../../hooks/queries/useApplicants';
import axiosInstance from '../../../../config/axios';
import Swal from '../../../../utils/swal';
import { useAuth } from '../../../../context/AuthContext';
import { useLocale } from '../../../../context/LocaleContext';
import { useCompanyFilter } from '../../../../context/CompanyFilterContext';
import {
  useApplicants,
  useJobPositions,
  useCompanies,
  useUpdateApplicantStatus,
} from '../../../../hooks/queries';
import { useTableLayout } from '../../../../hooks/queries/useTableLayout';
import { buildApplicantDuplicateLookup } from '../../../../utils/applicantDuplicateSort';
import { toPlainString } from '../../../../utils/strings';
import { thumbnailCache } from '../../../../utils/persistentThumbnailCache';
import { paths } from '../../../../router/Paths';
import { buildFieldToJobIds } from '../../../../components/modals/CustomFilterModal';
import { useQuery } from '@tanstack/react-query';

// Components
import PageBreadcrumb from '../../../../components/common/PageBreadCrumb';
import PageMeta from '../../../../components/common/PageMeta';
import ComponentCard from '../../../../components/common/ComponentCard';
import { Modal } from '../../../../components/ui/modal';
import BulkMessageModal from '../../../../components/modals/BulkMessageModal';
import InterviewScheduleModal from '../../../../components/modals/InterviewScheduleModal';
import StatusChangeModal from '../../../../components/modals/StatusChangeModal';
import CustomFilterModal from '../../../../components/modals/CustomFilterModal';
import { FilterHeaderCell } from './components/FilterHeaderCell';
import { StatusCell } from './components/StatusCell';
import { TrashBinIcon, ChatIcon, AlertIcon } from '../../../../icons';

// Hooks
import { useTableState } from './hooks/useTableState';
import { useApplicantSelection } from './hooks/useApplicantSelection';
import { useBulkActions } from './hooks/useBulkActions';
import { useApplicantFilters } from './hooks/useApplicantFilters';
import { useAnimatedColumnDrag } from '../../../../hooks/useAnimatedColumnDrag';

// Utils
import { exportToExcel } from './utils/exportHelpers';
import { normalizeGender, getApplicantCompanyId } from './utils/filterHelpers';
import { getPreviousStatus, isTrashed } from '../../../../pages/Recruiting/ApplicantPage/utils/statusUtils';

// Type
import {
  MaterialReactTable,
  MRT_SelectCheckbox,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import { ThemeProvider, createTheme } from '@mui/material';
import { Skeleton } from '@mui/material';
import type { Applicant } from '../../../../types/applicants';
import { FileSignature, FileText } from 'lucide-react';
import JobOfferModal from '../../../../components/modals/JobOffersModal/JobOffersModal';
import JobContractModal from '../../../../components/modals/ContractModal/ContractModal';

type ApiMailResponse = {
  message: string;
  page: string;
  PageCount: number | null;
  TotalCount: number;
  data: Array<{ _id: string; applicant: string | null; [key: string]: any }>;
};

const APPLICANTS_DEFAULT_COLUMN_ORDER = [
  'mrt-row-select',
  'applicantNo',
  'profilePhoto',
  'fullName',
  'email',
  'messages',
  'phone',
  'gender',
  'companyId',
  'jobPositionId',
  'expectedSalary',
  'sscore',
  'status',
  'rejectionReasons',
  'submittedAt',
  'actions',
];

const APPLICANTS_DEFAULT_LAYOUT = {
  columnVisibility: {},
  columnSizing: {},
  columnOrder: APPLICANTS_DEFAULT_COLUMN_ORDER,
};

// Helper to extract ID from various formats
const extractId = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = extractId(item);
      if (resolved) return resolved;
    }
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === 'object') {
    const maybeId = value as { _id?: unknown; id?: unknown };
    if (typeof maybeId._id === 'string' && maybeId._id.trim())
      return maybeId._id.trim();
    if (typeof maybeId.id === 'string' && maybeId.id.trim())
      return maybeId.id.trim();
  }
  return null;
};

// Image loader pool to limit concurrent image loading
class ImageLoaderPool {
  private queue: Array<() => Promise<void>> = [];
  private active = 0;
  private maxConcurrent = 3; // Load only 3 images at once

  async add(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await task();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.active >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    this.active++;
    const task = this.queue.shift()!;
    task().finally(() => {
      this.active--;
      this.processQueue();
    });
  }
}

const imageLoader = new ImageLoaderPool();

// Optimized image compression with smaller dimensions
async function createCompressedDataUrl(
  src: string,
  maxBytes = 3072 // Reduced from 5120
): Promise<string> {
  if (!src) return src;
  
  // Check cache first (IndexedDB + in-memory)
  const cached = await thumbnailCache.get(src);
  if (cached) return cached;

  // Use OffscreenCanvas if available (better performance)
  if ('OffscreenCanvas' in window) {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      
      const MAX_DIM = 48;
      let { width, height } = bitmap;
      const ratio = Math.max(width / MAX_DIM, height / MAX_DIM, 1);
      const canvas = new OffscreenCanvas(
        Math.max(24, Math.round(width / ratio)),
        Math.max(24, Math.round(height / ratio))
      );
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      
      const blobResult = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: 0.5
      });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blobResult);
      });
      
      thumbnailCache.set(src, dataUrl).catch(() => {});
      return dataUrl;
    } catch (e) {
      console.debug('OffscreenCanvas failed, falling back to regular canvas', e);
    }
  }

  // Regular canvas fallback with optimized settings
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    let resolved = false;

    const finish = (result: string) => {
      if (resolved) return;
      resolved = true;
      thumbnailCache.set(src, result).catch(() => {});
      resolve(result);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(src);
        
        const MAX_DIM = 48;
        let { width, height } = img;
        const ratio = Math.max(width / MAX_DIM, height / MAX_DIM, 1);
        canvas.width = Math.max(24, Math.round(width / ratio));
        canvas.height = Math.max(24, Math.round(height / ratio));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const qualities = [0.5, 0.4, 0.3, 0.2, 0.15];
        for (const q of qualities) {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', q);
            const b64 = dataUrl.split(',')[1] || '';
            const bytes = Math.ceil((b64.length * 3) / 4);
            if (bytes <= maxBytes) return finish(dataUrl);
          } catch (e) {
            continue;
          }
        }

        finish(src);
      } catch (e) {
        finish(src);
      }
    };

    img.onerror = () => finish(src);
    try {
      img.src = src;
    } catch (e) {
      finish(src);
    }
    setTimeout(() => finish(src), 1000);
  });
}

// Progressive image component with lazy loading and placeholder
function ProgressiveImage({
  src,
  alt,
  onClick,
}: {
  src?: string | null;
  alt?: string;
  onClick?: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src || thumb) return;

    // Use Intersection Observer to lazy load only visible images
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !thumb && mountedRef.current) {
            loadImageAsync();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // Start loading when within 100px of viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const loadImageAsync = async () => {
    if (!src) return;
    
    if (typeof src === 'string' && src.startsWith('data:')) {
      setThumb(src);
      setIsLoading(false);
      return;
    }

    try {
      // Use requestIdleCallback to load images when browser is idle
      await new Promise((resolve) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(resolve, { timeout: 2000 });
        } else {
          setTimeout(resolve, 50);
        }
      });

      // Use image loader pool to limit concurrency
      await imageLoader.add(async () => {
        if (!mountedRef.current) return;
        const compressed = await createCompressedDataUrl(src as string, 3072);
        if (mountedRef.current) {
          setThumb(compressed || (src as string));
          setIsLoading(false);
        }
      });
    } catch (e) {
      if (mountedRef.current) {
        setThumb(src as string);
        setIsLoading(false);
      }
    }
  };

  const getInitials = () => {
    if (alt && alt.length > 0) {
      return alt.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-pointer overflow-hidden rounded-full"
      onClick={onClick}
    >
      {isLoading && !thumb && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse rounded-full">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {getInitials()}
          </span>
        </div>
      )}
      {thumb && (
        <img
          loading="lazy"
          src={thumb}
          alt={alt || ''}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          decoding="async"
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}

function ImageThumbnailComponent({
  src,
  alt,
  onClick,
}: {
  src?: string | null;
  alt?: string;
  onClick?: () => void;
}) {
  if (!src) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400 cursor-pointer bg-gray-100 dark:bg-gray-800 rounded-full"
        onClick={onClick}
      >
        {alt && alt.charAt(0) ? alt.charAt(0).toUpperCase() : '-'}
      </div>
    );
  }

  return <ProgressiveImage src={src} alt={alt} onClick={onClick} />;
}

function getOptimizedPreviewUrl(src: string): string {
  if (!src) return src;
  if (src.startsWith('data:')) return src;
  try {
    const url = new URL(src);
    if (url.hostname.includes('cloudinary.com')) {
      const uploadIndex = src.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const beforeUpload = src.substring(0, uploadIndex + 8);
        const afterUpload = src.substring(uploadIndex + 8);
        // Even smaller preview for modal
        return `${beforeUpload}w_400,h_400,c_limit,q_auto,f_auto/${afterUpload}`;
      }
    }
  } catch (e) {}
  return src;
}

function PhotoPreviewImage({
  src,
  onLoad,
}: {
  src: string;
  onLoad?: (loadedSrc: string) => void;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const previewUrl = getOptimizedPreviewUrl(src);

  useEffect(() => {
    if (!previewUrl) return;
    setIsLoading(true);
    setError(false);
    setLoadedSrc(null);

    const img = new Image();
    img.src = previewUrl;
    img.loading = 'eager';
    img.onload = () => {
      setLoadedSrc(previewUrl);
      setIsLoading(false);
      onLoad?.(previewUrl);
    };
    img.onerror = () => {
      setError(true);
      setIsLoading(false);
      setLoadedSrc(previewUrl);
      onLoad?.(previewUrl);
    };
  }, [previewUrl, onLoad]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
        Failed to load image
      </div>
    );
  }

  return (
    <img
      src={loadedSrc ?? undefined}
      alt="Applicant photo preview"
      className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
      onClick={(e) => e.stopPropagation()}
      loading="eager"
    />
  );
}

type ApplicantsProps = {
  layoutKey?: string;
  defaultLayout?: typeof APPLICANTS_DEFAULT_LAYOUT;
  onlyStatus?: string | string[];
  onlyJobPositions?: string[];
  companyIdOverride?: string | string[] | undefined;
};

export default function Applicants({
  layoutKey,
  defaultLayout,
  onlyStatus,
  onlyJobPositions,
  companyIdOverride,
}: ApplicantsProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const { t, dir, locale } = useLocale();
  const location = useLocation();
  const params = useParams();

  const { layout, saveLayout } = useTableLayout(
    layoutKey || 'applicants_table',
    defaultLayout || APPLICANTS_DEFAULT_LAYOUT
  );

  const { containerRef: tableContainerRef, handleColumnOrderChange, onHeaderMouseDown } =
    useAnimatedColumnDrag({
      columnOrder:
        Array.isArray(layout.columnOrder) && layout.columnOrder.length
          ? layout.columnOrder
          : APPLICANTS_DEFAULT_COLUMN_ORDER,
      onReorder: (nextOrder) => saveLayout({ columnOrder: nextOrder }),
    });

  const updateStatus = useUpdateApplicantStatus();

  const effectiveOnlyStatus = useMemo((): string | string[] | undefined => {
    if (onlyStatus && !(Array.isArray(onlyStatus) && onlyStatus.length === 0)) return onlyStatus;
    if (params.status) return params.status;
    const searchParams = new URLSearchParams(location.search);
    const qStatus = searchParams.get('status');
    if (qStatus) return qStatus;
    return undefined;
  }, [onlyStatus, params.status, location.search]);

  const effectiveOnlyJobPositions = useMemo((): string[] | undefined => {
    if (onlyJobPositions && onlyJobPositions.length > 0) return onlyJobPositions;
    const searchParams = new URLSearchParams(location.search);
    const qJobPositions = searchParams.get('jobPositions');
    if (qJobPositions) return qJobPositions.split(',').map(decodeURIComponent).filter(Boolean);
    return undefined;
  }, [onlyJobPositions, location.search]);

  const isSuperAdmin = useMemo(() => {
    const roleName = user?.roleId?.name;
    return (
      typeof roleName === 'string' && roleName.toLowerCase() === 'super admin'
    );
  }, [user?.roleId?.name]);

  const canRestore = useMemo(() => {
    if (isSuperAdmin) return true;
    return hasPermission('Restore Applicant', 'write') || hasPermission('Restore Applicant', 'create');
  }, [isSuperAdmin, hasPermission]);

  const canViewTrashed = useMemo(() => {
    if (isSuperAdmin) return true;
    return hasPermission('Restore Applicant');
  }, [isSuperAdmin, hasPermission]);

  const persistedTableState = useMemo(() => {
    try {
      const rawLocal = localStorage.getItem('applicants_table_state');
      if (rawLocal) return JSON.parse(rawLocal);
      const raw = sessionStorage.getItem('applicants_table_state');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const urlParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      status: searchParams.get('status'),
      company: searchParams.get('company'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };
  }, [location.search]);

  const currentUserId = useMemo(
    () => String((user as any)?._id || (user as any)?.id || ''),
    [user]
  );

  const { selectedCompanyId: globalSelectedCompanyId } = useCompanyFilter();
  const apiCompanyId = useMemo(() => {
    if (companyIdOverride !== undefined) return companyIdOverride as any;
    if (!user) return undefined;
    const roleName = user?.roleId?.name?.toLowerCase();
    const isSuperAdminRole = roleName === 'super admin';
    const userCompanyId = user?.companies?.map((c) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId._id
    );
    if (isSuperAdminRole) return undefined;
    return userCompanyId?.length ? userCompanyId : undefined;
  }, [companyIdOverride, user]);
const [excludeModes] = useState<Record<string, boolean>>({});

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  
  // Extract department IDs from user companies
  const departmentIds = useMemo(() => {
    if (!user?.companies || !Array.isArray(user.companies)) return undefined;
    const allDepts = user.companies
      .flatMap((c: any) => c.departments || [])
      .map((d: any) => (typeof d === 'string' ? d : d._id))
      .filter(Boolean);
    return allDepts.length > 0 ? allDepts : undefined;
  }, [user]);

  const showCompanyColumn = useMemo(() => {
    if (!apiCompanyId) return true;
    if (Array.isArray(apiCompanyId) && apiCompanyId.length === 1) return false;
    return true;
  }, [apiCompanyId]);

  const assignedCompanyIds = useMemo(() => {
    if (isSuperAdmin) return [];
    const fromCompanies = Array.isArray(user?.companies)
      ? user.companies.map((c: any) => extractId(c?.companyId))
      : [];
    const fromAssigned = Array.isArray(user?.assignedcompanyId)
      ? user.assignedcompanyId
      : [];
    return Array.from(new Set([...fromCompanies, ...fromAssigned])).filter(
      Boolean
    ) as string[];
  }, [user, isSuperAdmin]);

  const [globalFilter, setGlobalFilter] = useState('');

  const {
    data: jobPositions = [],
    isFetching: isJobPositionsFetching,
    isFetched: isJobPositionsFetched,
    refetch: refetchJobPositions,
  } = useJobPositions(
    apiCompanyId as any,
    false,
    departmentIds as any,
    { enabled: true }
  );
  
  const {
    data: applicants = [],
    error,
    refetch: refetchApplicants,
    isFetching: isApplicantsFetching,
    isFetched: isApplicantsFetched,
  } = useApplicants({
    companyId: apiCompanyId as any,
    jobPositionId: effectiveOnlyJobPositions,
    departmentId: departmentIds as any,
    status: effectiveOnlyStatus,
    enabled: true,
  });
  
  // Check the query state directly to detect ongoing fetches for this key
const applicantsQueryKey = applicantsKeys.list({
  companyId: apiCompanyId as any,
    jobPositionId: effectiveOnlyJobPositions,
    departmentId: departmentIds as any,
    status: effectiveOnlyStatus,
  });
  const applicantsQueryState = queryClient.getQueryState(
    applicantsQueryKey as any
  );
  const isApplicantsQueryFetching =
    applicantsQueryState?.fetchStatus === 'fetching';
  
  const {
    data: allCompaniesRaw = [],
    refetch: refetchCompanies,
    isFetching: isCompaniesFetching,
    isFetched: isCompaniesFetched,
  } = useCompanies(apiCompanyId as any);

  const queryCompanyIds = useMemo(() => {
    if (!isSuperAdmin && assignedCompanyIds.length > 0)
      return assignedCompanyIds;
    return [] as string[];
  }, [isSuperAdmin, assignedCompanyIds]);

  const { data: mailApiResponse } = useQuery<ApiMailResponse>({
    queryKey: ['mail-logs', queryCompanyIds.join(',')],
    queryFn: async () => {
      const baseParams: Record<string, string> = { PageCount: 'all' };
      if (queryCompanyIds.length <= 1) {
        if (queryCompanyIds.length === 1)
          baseParams.company = queryCompanyIds[0];
        const res = await axiosInstance.get<ApiMailResponse>('/mail', {
          params: baseParams,
        });
        return res.data;
      }
      const responses = await Promise.all(
        queryCompanyIds.map((companyId: string) =>
          axiosInstance.get<ApiMailResponse>('/mail', {
            params: { ...baseParams, company: companyId },
          })
        )
      );
      const mergedMap = new Map<string, any>();
      responses.forEach((r) =>
        (r.data?.data || []).forEach((m: any) => mergedMap.set(m._id, m))
      );
      const data = Array.from(mergedMap.values());
      return {
        message: 'success',
        page: 'all',
        PageCount: null,
        TotalCount: data.length,
        data,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const mailCountByApplicantId = useMemo(() => {
    const map = new Map<string, number>();
    (mailApiResponse?.data || []).forEach((mail: any) => {
      const applicantId =
        typeof mail.applicant === 'string'
          ? mail.applicant.trim()
          : (mail.applicant as any)?._id?.trim() || '';
      if (!applicantId) return;
      map.set(applicantId, (map.get(applicantId) || 0) + 1);
    });
    return map;
  }, [mailApiResponse]);

  const {
    rowSelection,
    setRowSelection,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    pagination,
    setPagination,
    customFilters,
    setCustomFilters,
  } = useTableState({
    onlyStatus: effectiveOnlyStatus,
    onlyJobPositions: effectiveOnlyJobPositions,
    showCompanyColumn,
    jobPositionMap: {},
    persistedState: persistedTableState,
  });

  useEffect(() => {
  if (urlParams.status) {
    setColumnFilters((prev: any) => {
      const withoutStatus = prev.filter((f: any) => f.id !== 'status');
      const existing = prev.find((f: any) => f.id === 'status');
      const newValue = [urlParams.status];
      if (existing) {
        const existingValue = Array.isArray(existing.value) ? existing.value : [existing.value];
        if (JSON.stringify(existingValue) === JSON.stringify(newValue)) return prev;
      }
      return [...withoutStatus, { id: 'status', value: newValue }];
    });
  }
  if (urlParams.company) {
    setColumnFilters((prev: any) => {
      const withoutCompany = prev.filter((f: any) => f.id !== 'companyId');
      const existing = prev.find((f: any) => f.id === 'companyId');
      const newValue = [urlParams.company];
      if (existing) {
        const existingValue = Array.isArray(existing.value) ? existing.value : [existing.value];
        if (JSON.stringify(existingValue) === JSON.stringify(newValue)) return prev;
      }
      return [...withoutCompany, { id: 'companyId', value: newValue }];
    });
  }
}, [urlParams.status, urlParams.company, setColumnFilters]);
  

  const jobPositionMap = useMemo(() => {
    const map: Record<string, any> = {};
    const getIdValue = (v: any) =>
      typeof v === 'string' ? v : (v?._id ?? v?.id);
    jobPositions.forEach((job: any) => {
      const ids = new Set<string>();
      const primary = getIdValue(job._id) || getIdValue(job.id);
      if (primary) ids.add(primary);
      if (job._id && typeof job._id === 'object' && job._id._id)
        ids.add(job._id._id);
      if (job.id && typeof job.id === 'object' && job.id._id)
        ids.add(job.id._id);
      ids.forEach((id) => {
        if (id) map[id] = job;
      });
    });
    return map;
  }, [jobPositions]);

  const companyMap = useMemo(() => {
    const map: Record<string, any> = {};
    allCompaniesRaw.forEach((company: any) => {
      const stringId =
        typeof company._id === 'string' ? company._id : company._id?._id;
      if (stringId) map[stringId] = company;
      if (company._id) map[company._id] = company;
    });
    return map;
  }, [allCompaniesRaw]);

  const genderOptions = useMemo(() => {
    const s = new Set<string>();
    const rows = Array.isArray(applicants) ? applicants : [];
      rows.forEach((a: any) => {
        if (!isSuperAdmin && !canViewTrashed && a?.status === 'trashed') return;
      const raw =
        a?.gender ||
        a?.customResponses?.gender ||
        a?.customResponses?.genderAr ||
        a?.customResponses?.['النوع'] ||
        (a as any)['النوع'] ||
        (a as any)?.genderAr;
      const g = normalizeGender(raw);
      if (g) s.add(g);
    });
    const items = Array.from(s);
    const ordered: string[] = [];
    if (items.includes('Male')) ordered.push('Male');
    if (items.includes('Female')) ordered.push('Female');
    items.forEach((it) => {
      if (it !== 'Male' && it !== 'Female') ordered.push(it);
    });
    return ordered.map((g) => ({ id: g, title: g }));
  }, [applicants, isSuperAdmin, canViewTrashed]);

const jobOptions = useMemo(() => {
  const getIdValue = (v: any) =>
    typeof v === 'string' ? v : (v?._id ?? v?.id);
  
  // Helper function to extract string title from object or string (locale-aware)
  const getTitleString = (title: any): string => {
    if (!title) return '';
    if (typeof title === 'string') return title;
    if (typeof title === 'object') {
      if (locale === 'ar') {
        return title.ar || title.en || title.name || Object.values(title)[0] || '';
      }
      return title.en || title.ar || title.name || Object.values(title)[0] || '';
    }
    return String(title);
  };
  
  return jobPositions
    .map((j: any) => {
      const id = getIdValue(j._id) || getIdValue(j.id) || '';
      const title = getTitleString(j.title);
      
      const companyId = j.companyId?._id || j.companyId;
      const company = allCompaniesRaw.find((c: any) => {
        const cId = typeof c._id === 'string' ? c._id : c._id?._id;
        return cId === companyId;
      });
      const companyName = getTitleString(company?.name || '');
      
      // ✅ Calculate applicant count for this job - EXCLUDE trashed status
      const applicantCount = applicants.filter((applicant: any) => {
        // Skip trashed applicants
        if (applicant?.status?.toLowerCase() === 'trashed') return false;
        
        const applicantJobId = typeof applicant.jobPositionId === 'string' 
          ? applicant.jobPositionId 
          : applicant.jobPositionId?._id || applicant.jobPositionId?.id;
        return applicantJobId === id;
      }).length;
      
      return { id, title, companyName, companyId, applicantCount };
    })
    .filter((x) => x.id && x.title);
}, [jobPositions, allCompaniesRaw, applicants, locale]);

  const companyOptions = useMemo(() => {
    return allCompaniesRaw
      .map((c: any) => {
        const id = typeof c._id === 'string' ? c._id : c._id?._id || '';
        const title = toPlainString(c?.name, locale) || '';
        return { id, title };
      })
      .filter((x) => x.id && x.title);
  }, [allCompaniesRaw, locale]);

  // Cascading filter: Get selected company IDs from column filters
  const selectedCompanyIdsForJobs = useMemo(() => {
    const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
    if (!companyFilter?.value) return [] as string[];
    const value = companyFilter.value;
    return Array.isArray(value) ? value : [value];
  }, [columnFilters]);

  // Map jobId -> companyId for quick lookup
  const jobToCompanyMap = useMemo(() => {
    const map = new Map<string, string>();
    jobPositions.forEach((job: any) => {
      const jobId = typeof job._id === 'string' ? job._id : job._id?._id;
      const companyId = job.companyId?._id || job.companyId;
      if (jobId && companyId) {
        map.set(jobId, companyId);
      }
    });
    return map;
  }, [jobPositions]);

  // Filter job options based on selected companies
  const filteredJobOptions = useMemo(() => {
    if (selectedCompanyIdsForJobs.length === 0) {
      return jobOptions;
    }
    return jobOptions.filter((job) => {
      const jobCompanyId = jobToCompanyMap.get(job.id);
      return jobCompanyId && selectedCompanyIdsForJobs.includes(jobCompanyId);
    });
  }, [selectedCompanyIdsForJobs, jobOptions, jobToCompanyMap]);

  // Clear invalid job filters when company selection changes
  useEffect(() => {
    const selectedJobIds = columnFilters.find((f: any) => f.id === 'jobPositionId')?.value;
    if (selectedJobIds && Array.isArray(selectedJobIds) && selectedJobIds.length > 0) {
      const validJobIds = filteredJobOptions.map((j) => j.id);
      const invalidJobs = selectedJobIds.filter((jobId: string) => !validJobIds.includes(jobId));
      if (invalidJobs.length > 0) {
        const remainingJobs = selectedJobIds.filter((jobId: string) => validJobIds.includes(jobId));
        setColumnFilters((prev: any[]) => {
          const without = prev.filter((f) => f.id !== 'jobPositionId');
          if (remainingJobs.length === 0) {
            return without;
          }
          return [...without, { id: 'jobPositionId', value: remainingJobs }];
        });
      }
    }
  }, [selectedCompanyIdsForJobs, filteredJobOptions, columnFilters, setColumnFilters]);

  const jobPositionFilterOptions = useMemo(() => {
    return jobOptions.map((j) => {
      const coId = typeof j.companyId === 'string'
        ? j.companyId
        : (j.companyId?._id ?? j.companyId?.id ?? '');
      const company = companyMap[coId];
      const companyName = company
        ? toPlainString(company?.name, locale) || company?.title || ''
        : '';
      return {
        label: j.title,
        subtitle: companyName || undefined,
        value: j.id,
        companyId: coId,
      };
    });
  }, [jobOptions, companyMap, locale]);

  const fieldToJobIds = useMemo(
    () => buildFieldToJobIds(jobPositions),
    [jobPositions]
  );

  const selectedCompanyFilterValue = useMemo(():
    | string[]
    | string
    | null
    | undefined => {
    const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
    if (companyFilter?.value) {
      const value = companyFilter.value;
      if (Array.isArray(value)) {
        return value as string[];
      }
      if (typeof value === 'string') {
        return value;
      }
      if (value === null) {
        return null;
      }
      return undefined;
    }
    if (globalSelectedCompanyId) {
      return globalSelectedCompanyId;
    }
    return undefined;
  }, [columnFilters, globalSelectedCompanyId]);

  const {
    filteredApplicants,
    duplicatesOnlyEnabled,
    statusFilterOptions,
    selectedCompanyFilter,
  } = useApplicantFilters({
    applicants,
    columnFilters,
    customFilters,
    isSuperAdmin,
    effectiveOnlyStatus,
    effectiveOnlyJobPositions,
    selectedCompanyFilterValue,
    companyFilterExclude: (layout.excludeColumns ?? []).includes('companyId'),
    excludeColumns: layout.excludeColumns ?? [],
    jobPositionMap,
    fieldToJobIds,
    currentUserId,
    allCompaniesRaw,
    canViewTrashed,
    globalFilter,
  });

  const {
    selectedApplicantIds,
    selectedApplicantRecipients,
    selectedApplicantsForInterview,
    selectedApplicantCompanyId,
    selectedApplicantCompany,
    selectedApplicantCount,
    selectedApplicants,
  } = useApplicantSelection({
    rowSelection,
    applicants,
    allCompaniesRaw,
  });

  const selectedTrashedApplicants = useMemo(() => {
    if (!selectedApplicantIds.length) return [];
    const ids = new Set(selectedApplicantIds);
    return applicants.filter((a: any) => ids.has(a._id) && isTrashed(a));
  }, [selectedApplicantIds, applicants]);

  const handleBulkRestore = useCallback(async () => {
    if (selectedTrashedApplicants.length === 0) return;

    const result = await Swal.fire({
      title: t('bulkRestoreTitle', 'applicants'),
      text: t('bulkRestoreText', 'applicants'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('restore', 'applicants'),
      cancelButtonText: t('cancel', 'common'),
    });

    if (!result.isConfirmed) return;

    try {
      for (const applicant of selectedTrashedApplicants) {
        const orig = applicant as any;
        const previousStatus = getPreviousStatus(orig);
        await updateStatus.mutateAsync({ id: orig._id, data: { status: previousStatus } });
        setRowSelection((prev: any) => {
          const next = { ...prev };
          delete next[orig._id];
          return next;
        });
      }
    } catch {
      // toast handled by mutation
    }
  }, [selectedTrashedApplicants, t, updateStatus, setRowSelection]);

  const selectedApplicantJobIds = useMemo(() => {
    const jobIds = new Set<string>();
    const ids = new Set(selectedApplicantIds);

    applicants.forEach((applicant: any) => {
      const applicantId =
        typeof applicant._id === 'string'
          ? applicant._id
          : applicant._id?._id || applicant.id;
      if (!ids.has(applicantId)) return;

      const jobId =
        (typeof applicant.jobPositionId === 'string'
          ? applicant.jobPositionId
          : applicant.jobPositionId?._id) ||
        applicant.job?._id ||
        applicant.jobId;

      if (jobId) {
        jobIds.add(typeof jobId === 'string' ? jobId : jobId._id || jobId.id);
      }
    });

    return Array.from(jobIds);
  }, [selectedApplicantIds, applicants]);

  const {
    isDeleting,
    isProcessing,
    isSubmittingBulkInterview,
    isSubmittingBulkStatus,
    showBulkModal,
    showBulkInterviewModal,
    showBulkInterviewPreviewModal,
    showBulkStatusModal,
    showBulkPreviewFallbackModal,
    bulkFormResetKey,
    bulkInterviewError,
    bulkStatusError,
    bulkInterviewIntervalMinutes,
    bulkInterviewForm,
    bulkNotificationChannels,
    bulkEmailOption,
    bulkCustomEmail,
    bulkPhoneOption,
    bulkCustomPhone,
    bulkMessageTemplate,
    bulkInterviewEmailSubject,
    bulkPreviewHtml,
    bulkInterviewPreviewItems,
    bulkStatusForm,
    setShowBulkModal,
    setShowBulkInterviewModal,
    setShowBulkInterviewPreviewModal,
    setShowBulkStatusModal,
    setShowBulkPreviewFallbackModal,
    setBulkInterviewError,
    setBulkStatusError,
    setBulkInterviewIntervalMinutes,
    setBulkInterviewForm,
    setBulkNotificationChannels,
    setBulkEmailOption,
    setBulkCustomEmail,
    setBulkPhoneOption,
    setBulkCustomPhone,
    setBulkMessageTemplate,
    setBulkInterviewEmailSubject,
    setBulkPreviewHtml,
    setBulkStatusForm,
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkInterviewSubmit,
    handlePreviewBulkInterviews,
    openBulkInterviewModal,
    resetBulkInterviewModal,
    fillBulkCompanyAddress,
  } = useBulkActions({
    selectedApplicantIds,
    selectedApplicantsForInterview,
    selectedApplicantCompanyId,
    selectedApplicantCompany,
    onClearSelection: () => setRowSelection({}),
  });

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isLaptopViewport = viewportWidth <= 1440;
  const selectColumnWidth = isLaptopViewport ? 36 : 48;

  const columnSizeConfig = useMemo(
    () => ({
      applicantNo: isLaptopViewport ? 56 : 80,
      profilePhoto: isLaptopViewport ? 52 : 72,
      fullName: isLaptopViewport ? 160 : 220,
      email: isLaptopViewport ? 200 : 280,
      phone: isLaptopViewport ? 86 : 110,
      gender: isLaptopViewport ? 70 : 90,
      companyId: isLaptopViewport ? 150 : 200,
      jobPositionId: isLaptopViewport ? 180 : 240,
      expectedSalary: isLaptopViewport ? 104 : 140,
      sscore: isLaptopViewport ? 72 : 96,
      status: isLaptopViewport ? 190 : 240,
      submittedAt: isLaptopViewport ? 88 : 110,
      actions: 70,
    }),
    [isLaptopViewport]
  );

  const mergedColumnSizing = useMemo(() => {
    const defaults: Record<string, number> = {
      'mrt-row-select': selectColumnWidth,
      applicantNo: columnSizeConfig.applicantNo,
      profilePhoto: columnSizeConfig.profilePhoto,
      fullName: columnSizeConfig.fullName,
      email: columnSizeConfig.email,
      phone: columnSizeConfig.phone,
      gender: columnSizeConfig.gender,
      companyId: columnSizeConfig.companyId,
      jobPositionId: columnSizeConfig.jobPositionId,
      expectedSalary: columnSizeConfig.expectedSalary,
      sscore: columnSizeConfig.sscore,
      status: columnSizeConfig.status,
      submittedAt: columnSizeConfig.submittedAt,
      actions: columnSizeConfig.actions,
    };
    return { ...defaults, ...layout.columnSizing };
  }, [columnSizeConfig, layout.columnSizing, selectColumnWidth]);

  const getApplicantHref = useCallback((row: any) => {
    const orig: any = row?.original ?? row;
    const navId = String(orig?._id || orig?.id || row?.id || '');
    return paths.applicants.details(navId);
  }, []);

  const currentFiltersRef = useRef<{
    columnFilters: any[];
    customFilters: any[];
    filteredApplicants: any[];
  }>({
    columnFilters: [],
    customFilters: [],
    filteredApplicants: [],
  });

  currentFiltersRef.current = {
    columnFilters,
    customFilters,
    filteredApplicants,
  };

  const handleApplicantLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, row: any) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const currentFilters = currentFiltersRef.current;

      navigate(getApplicantHref(row), {
        state: {
          applicant: row.original,
          columnFilters: currentFilters.columnFilters,
          sorting: sorting,
          pagination: pagination,
          customFilters: currentFilters.customFilters,
          statusFilter: currentFilters.columnFilters.find(
            (f: any) => f.id === 'status'
          )?.value,
          companyFilter: currentFilters.columnFilters.find(
            (f: any) => f.id === 'companyId'
          )?.value,
          totalFilteredCount: currentFilters.filteredApplicants.length,
          applicantsList: currentFilters.filteredApplicants,
          returnToApplicants: true,
          timestamp: Date.now(),
        },
      });
    },
    [getApplicantHref, navigate, sorting, pagination]
  );

  const handleApplicantLinkAuxClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
    },
    []
  );

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [customFilterOpen, setCustomFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const mountedRef = useRef(true);

  const hasInitialStatusFilter = useMemo(() => {
    try {
      const qStatus = new URLSearchParams(location.search).get('status');
      return Boolean(params.status || qStatus || onlyStatus);
    } catch (e) {
      return false;
    }
  }, []);

  const [isFilterTransitioning, setIsFilterTransitioning] = useState(
    () => hasInitialStatusFilter
  );

  const prevEffectiveStatusRef = useRef<string | string[] | undefined>(
    effectiveOnlyStatus
  );

  useEffect(() => {
    const statusChanged =
      prevEffectiveStatusRef.current !== effectiveOnlyStatus;

    if (statusChanged) {
      prevEffectiveStatusRef.current = effectiveOnlyStatus;
      setIsFilterTransitioning(true);
      refetchApplicants().catch(() => {});
    }
  }, [effectiveOnlyStatus, refetchApplicants]);

  useEffect(() => {
    if (!isFilterTransitioning) return;
    if (isApplicantsFetching) return;
    if (!isApplicantsFetched) return;

    const id = setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 80);

    return () => clearTimeout(id);
  }, [isFilterTransitioning, isApplicantsFetching, isApplicantsFetched]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [lastRefetch, setLastRefetch] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (
      !lastRefetch &&
      (isJobPositionsFetched || isApplicantsFetched || isCompaniesFetched)
    ) {
      if (mountedRef.current) setLastRefetch(new Date());
    }
  }, [
    isJobPositionsFetched,
    isApplicantsFetched,
    isCompaniesFetched,
    lastRefetch,
  ]);

  useEffect(() => {
    if (!lastRefetch) {
      setElapsed(null);
      return;
    }
    const formatRelative = (d: Date) => {
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return t('now', 'applicants');
      const mins = Math.floor(diffSec / 60);
      if (mins < 60) return t('minAgo', 'applicants', { mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours === 1 ? t('hourAgo', 'applicants', { hours }) : t('hoursAgo', 'applicants', { hours });
      const days = Math.floor(hours / 24);
      if (days === 1) return t('yesterday', 'applicants');
      if (days < 7) return t('daysAgo', 'applicants', { days });
      return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
    };
    const update = () => {
      if (mountedRef.current) setElapsed(formatRelative(lastRefetch));
    };
    update();
    const id = setInterval(update, 30 * 1000);
    return () => clearInterval(id);
  }, [lastRefetch, t]);

  const getExpectedSalaryDisplay = useCallback((applicant: any): string => {
    const toText = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' || typeof value === 'number')
        return String(value).trim();
      if (Array.isArray(value))
        return value.map(toText).filter(Boolean).join(', ');
      if (typeof value === 'object') {
        const answerValue = (value as any)?.Answer ?? (value as any)?.answer;
        if (answerValue !== undefined) {
          const nested = toText(answerValue);
          if (nested) return nested;
        }
        const candidateKeys = [
          'expectedSalary',
          'salary',
          'amount',
          'value',
          'val',
          'answer',
          'Answer',
          'label',
          'name',
          'title',
          'en',
          'ar',
          'text',
        ];
        for (const key of candidateKeys) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            const nested = toText((value as any)[key]);
            if (nested) return nested;
          }
        }
      }
      return '';
    };
    const directCandidates = [
      applicant?.expectedSalary,
      applicant?.expected_salary,
      applicant?.salaryExpectation,
      applicant?.desiredSalary,
    ];
    for (const candidate of directCandidates) {
      const text = toText(candidate);
      if (text) return text;
    }
    const responses =
      applicant?.customResponses || applicant?.customFieldResponses || {};
    const normalizeKey = (key: any) =>
      String(key || '')
        .replace(/[\s_-]+/g, '')
        .toLowerCase();
    const expectedKeyMatchers = [
      'expectedsalary',
      'salary',
      'salaryexpectation',
      'desiredsalary',
      'الراتب',
      'راتب',
      'الراتبالمتوقع',
    ];
    for (const [key, value] of Object.entries(responses || {})) {
      const normalized = normalizeKey(key);
      const isSalaryKey = expectedKeyMatchers.some((matcher) =>
        normalized.includes(normalizeKey(matcher))
      );
      if (!isSalaryKey) continue;
      const text = toText(value);
      if (text) return text;
    }
    return '-';
  }, []);

  const resolveAnyId = useCallback((value: any): string => {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number')
      return String(value);
    if (typeof value === 'object') {
      const nested = value._id ?? value.id ?? value.jobSpecId ?? value.specId;
      if (nested === undefined || nested === null) return '';
      if (typeof nested === 'string' || typeof nested === 'number')
        return String(nested);
      return String((nested as any)?._id ?? (nested as any)?.id ?? '');
    }
    return '';
  }, []);

  const parseComparableNumber = useCallback((value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const normalizeDigits = (input: string) => {
      const map: Record<string, string> = {
        '\u0660': '0',
        '\u0661': '1',
        '\u0662': '2',
        '\u0663': '3',
        '\u0664': '4',
        '\u0665': '5',
        '\u0666': '6',
        '\u0667': '7',
        '\u0668': '8',
        '\u0669': '9',
        '\u06F0': '0',
        '\u06F1': '1',
        '\u06F2': '2',
        '\u06F3': '3',
        '\u06F4': '4',
        '\u06F5': '5',
        '\u06F6': '6',
        '\u06F7': '7',
        '\u06F8': '8',
        '\u06F9': '9',
      };
      return input.replace(
        /[\u0660-\u0669\u06F0-\u06F9]/g,
        (ch) => map[ch] || ch
      );
    };
    if (Array.isArray(value)) {
      const nums = value
        .map((item) => parseComparableNumber(item))
        .filter(
          (n): n is number => typeof n === 'number' && Number.isFinite(n)
        );
      if (!nums.length) return null;
      return Math.max(...nums);
    }
    if (typeof value === 'object') {
      const candidates = [
        (value as any).expectedSalary,
        (value as any).salary,
        (value as any).amount,
        (value as any).value,
        (value as any).val,
        (value as any).max,
        (value as any).min,
      ];
      const nums = candidates
        .map((item) => parseComparableNumber(item))
        .filter(
          (n): n is number => typeof n === 'number' && Number.isFinite(n)
        );
      if (nums.length) return Math.max(...nums);
      const nestedNums = Object.values(value)
        .map((item) => parseComparableNumber(item))
        .filter(
          (n): n is number => typeof n === 'number' && Number.isFinite(n)
        );
      if (nestedNums.length) return Math.max(...nestedNums);
      return null;
    }
    const text = normalizeDigits(String(value));
    const matches = text.match(/-?\d+(?:[.,]\d+)?/g);
    if (!matches?.length) return null;
    const nums = matches
      .map((m) => Number(m.replace(/,/g, '')))
      .filter((n) => Number.isFinite(n));
    if (!nums.length) return null;
    return Math.max(...nums);
  }, []);

  const getApplicantSScore = useCallback(
    (applicant: any): number | null => {
      const parseAnswer = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value > 0;
        if (typeof value === 'string') {
          const normalized = value.trim().toLowerCase();
          if (
            [
              'true',
              '1',
              'yes',
              'y',
              'accepted',
              'met',
              'pass',
              'passed',
            ].includes(normalized)
          )
            return true;
          if (
            ['false', '0', 'no', 'n', 'rejected', 'failed', 'not met'].includes(
              normalized
            )
          )
            return false;
        }
        return Boolean(value);
      };
      const getApplicantSpecResponses = (): any[] => {
        if (
          Array.isArray(applicant?.jobSpecsWithDetails) &&
          applicant.jobSpecsWithDetails.length
        )
          return applicant.jobSpecsWithDetails;
        if (
          Array.isArray(applicant?.jobSpecsResponses) &&
          applicant.jobSpecsResponses.length
        )
          return applicant.jobSpecsResponses;
        if (Array.isArray(applicant?.jobSpecs) && applicant.jobSpecs.length)
          return applicant.jobSpecs;
        if (
          typeof applicant?.jobPositionId === 'object' &&
          applicant.jobPositionId
        ) {
          if (
            Array.isArray(applicant.jobPositionId.jobSpecsWithDetails) &&
            applicant.jobPositionId.jobSpecsWithDetails.length
          )
            return applicant.jobPositionId.jobSpecsWithDetails;
          if (
            Array.isArray(applicant.jobPositionId.jobSpecsResponses) &&
            applicant.jobPositionId.jobSpecsResponses.length
          )
            return applicant.jobPositionId.jobSpecsResponses;
          if (
            Array.isArray(applicant.jobPositionId.jobSpecs) &&
            applicant.jobPositionId.jobSpecs.length
          )
            return applicant.jobPositionId.jobSpecs;
        }
        return [];
      };
      const getJobSpecs = (): any[] => {
        const rawJob = applicant?.jobPositionId;
        const jobId = resolveAnyId(rawJob);
        const mapped = jobId ? jobPositionMap[jobId] : undefined;
        const source =
          mapped ||
          (typeof rawJob === 'object' ? rawJob : undefined) ||
          applicant?.jobPosition;
        if (
          source &&
          Array.isArray(source.jobSpecsWithDetails) &&
          source.jobSpecsWithDetails.length
        )
          return source.jobSpecsWithDetails;
        if (source && Array.isArray(source.jobSpecs) && source.jobSpecs.length)
          return source.jobSpecs;
        const fallbackSpecs = getApplicantSpecResponses();
        return Array.isArray(fallbackSpecs) ? fallbackSpecs : [];
      };
      const specs = getJobSpecs();
      if (!specs.length) return null;
      const applicantResponses = getApplicantSpecResponses();
      const answerById: Record<string, boolean> = {};
      applicantResponses.forEach((entry: any) => {
        if (!entry || typeof entry !== 'object') return;
        const answerRaw =
          entry.answer ??
          entry.accepted ??
          entry.isAccepted ??
          entry.met ??
          entry.match ??
          entry.selected;
        const answer = parseAnswer(answerRaw);
        [entry.jobSpecId, entry.specId, entry._id, entry.id]
          .map((id) => resolveAnyId(id))
          .filter(Boolean)
          .forEach((id) => {
            answerById[id] = answer;
          });
      });
      let totalWeight = 0,
        acceptedWeight = 0,
        totalCount = 0,
        acceptedCount = 0;
      specs.forEach((spec: any) => {
        totalCount += 1;
        const rawWeight = Number(spec?.weight ?? 0);
        const weight =
          Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 0;
        totalWeight += weight;
        const specIds = [spec?.jobSpecId, spec?.specId, spec?._id, spec?.id]
          .map((id) => resolveAnyId(id))
          .filter(Boolean);
        let accepted: boolean | undefined;
        for (const specId of specIds) {
          if (answerById[specId] !== undefined) {
            accepted = answerById[specId];
            break;
          }
        }
        if (accepted === undefined) {
          const fallback = applicantResponses.find(
            (_: any, idx: number) => idx === specs.indexOf(spec)
          );
          if (fallback !== undefined) {
            const fallbackRaw =
              fallback?.answer ??
              fallback?.accepted ??
              fallback?.isAccepted ??
              fallback?.met ??
              fallback?.match ??
              fallback?.selected;
            accepted = parseAnswer(fallbackRaw);
          } else {
            accepted = false;
          }
        }
        if (accepted) {
          acceptedCount += 1;
          acceptedWeight += weight;
        }
      });
      if (totalWeight > 0)
        return Math.round((acceptedWeight / totalWeight) * 100);
      if (totalCount > 0) return Math.round((acceptedCount / totalCount) * 100);
      return null;
    },
    [jobPositionMap, resolveAnyId]
  );

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [locale]);


  const downloadCvForApplicant = useCallback(async (a: any) => {
    if (!a)
      return Swal.fire(
        t('noCv', 'applicants'),
        t('noCvDesc', 'applicants'),
        'info'
      );
    const resolveCvPath = (applicant: any): string | null => {
      const keys = [
        'cvFilePath',
        'resumePath',
        'cvUrl',
        'resumeUrl',
        'curriculumVitaePath',
      ] as const;
      for (const key of keys) {
        const value = applicant?.[key];
        if (typeof value === 'string' && value.trim().length > 0) return value;
      }
      return null;
    };
    const path = resolveCvPath(a);
    if (!path)
      return Swal.fire(
        t('noCv', 'applicants'),
        t('noCvDesc', 'applicants'),
        'info'
      );
    const url = (() => {
      if (!path) return null;
      if (
        typeof path === 'string' &&
        (path.startsWith('http') || path.startsWith('data:'))
      )
        return path;
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      return base ? `${base}/${String(path).replace(/^\//, '')}` : String(path);
    })();
    const buildCloudinaryDownloadUrl = (u: string, idHint?: string) => {
      try {
        if (!u) return null;
        const urlParts = u.split('/upload/');
        if (urlParts.length !== 2) return null;
        const fileName = `CV_${idHint || 'cv'}`;
        const transformations = `f_auto/fl_attachment:${fileName}`;
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
      } catch (e) {
        return null;
      }
    };
    const cloudUrl = buildCloudinaryDownloadUrl(
      url || '',
      (a?.applicantNo || a?._id || '').toString()
    );
    if (cloudUrl) {
      window.open(cloudUrl, '_blank');
      return;
    }
    window.open(url || String(path), '_blank');
  }, []);

  const handleExportToExcel = useCallback(async () => {
    if (selectedApplicantIds.length === 0) {
      await Swal.fire({
        title: t('noSelection', 'applicants'),
        text: t('noSelectionDesc', 'applicants'),
        icon: 'warning',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }
    setIsExporting(true);
    try {
      const result = await exportToExcel(applicants, selectedApplicantIds, {
        jobPositionMap,
        companyMap,
        getExpectedSalaryDisplay,
        getApplicantSScore,
        normalizeGender,
        options: { includeCustomFields: true, includeJobSpecs: true },
      });
      if (result.success) {
        await Swal.fire({
          title: t('exportSuccessful', 'applicants'),
          text: t('successfullyExported', 'applicants', { count: selectedApplicantIds.length }),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          title: t('exportFailed', 'applicants'),
          text: t('failedToExport', 'applicants'),
          icon: 'error',
        });
      }
    } finally {
      if (mountedRef.current) setIsExporting(false);
    }
  }, [
    selectedApplicantIds,
    applicants,
    jobPositionMap,
    companyMap,
    getExpectedSalaryDisplay,
    getApplicantSScore,
  ]);

  const isTableLoading = Boolean(
    isJobPositionsFetching ||
    isApplicantsFetching ||
    isCompaniesFetching ||
    isFilterTransitioning ||
    isApplicantsQueryFetching ||
    !isApplicantsFetched ||
    !isJobPositionsFetched ||
    !isCompaniesFetched
  );

  const renderCellSkeleton = (
    variant: 'text' | 'circular' | 'rectangular' = 'text',
    width?: number | string,
    height?: number
  ) => {
    if (variant === 'circular') {
      return (
        <div className="flex h-10 w-10 items-center justify-center">
          <Skeleton
            variant="circular"
            width={width || 40}
            height={height || 40}
          />
        </div>
      );
    }
    return (
      <Skeleton
        variant={variant as any}
        width={width || '60%'}
        height={height}
      />
    );
  };

  const extractRejectionReasons = useCallback(
    (applicant: Applicant): string[] => {
      try {
        const history = applicant?.statusHistory;
        if (Array.isArray(history)) {
          const rejected = history.filter(
            (h: any) =>
              String(h?.status || '').toLowerCase() === applicant.status
          );
          if (rejected.length) {
            rejected.sort((x: any, y: any) => {
              const tx = x?.changedAt ? new Date(x.changedAt).getTime() : 0;
              const ty = y?.changedAt ? new Date(y.changedAt).getTime() : 0;
              return ty - tx;
            });
            const latest = rejected[0] || {};
            const reasons = latest.reasons ?? [];
            if (Array.isArray(reasons)) {
              return reasons
                .map((r: any) => String(r ?? '').trim())
                .filter(Boolean);
            }
            if (typeof reasons === 'string' && reasons) {
              return [reasons];
            }
          }
        }
        return [];
      } catch (e) {
        return [];
      }
    },
    []
  );

  const rejectionReasonsOptions = useMemo(() => {
    const reasonsSet = new Set<string>();
    (filteredApplicants || []).forEach((applicant: any) => {
      const reasons = extractRejectionReasons(applicant);
      reasons.forEach((reason: string) => {
        if (reason) reasonsSet.add(reason);
      });
    });
    return Array.from(reasonsSet)
      .sort()
      .map((reason) => ({ id: reason, title: reason }));
  }, [filteredApplicants, extractRejectionReasons]);

  const unfilteredCounts = useMemo(() => {
    const rows = Array.isArray(applicants) ? applicants : [];
    const maps: Record<string, Map<string, number>> = {};

    const addToMap = (colId: string, key: string) => {
      if (!key) return;
      if (!maps[colId]) maps[colId] = new Map();
      maps[colId].set(key, (maps[colId].get(key) ?? 0) + 1);
    };

    const addArrayToMap = (colId: string, keys: string[]) => {
      keys.forEach((k) => addToMap(colId, k));
    };

    rows.forEach((a: any) => {
      // Skip trashed applicants from counts
      if (a?.status?.toLowerCase() === 'trashed') return;

      // gender
      const rawGender =
        a?.gender ||
        a?.customResponses?.gender ||
        a?.customResponses?.genderAr ||
        a?.customResponses?.['النوع'] ||
        (a as any)['النوع'] ||
        (a as any)?.genderAr;
      addToMap('gender', normalizeGender(rawGender));

      // companyId
      addToMap('companyId', getApplicantCompanyId(a, jobPositionMap) || '');

      // jobPositionId
      const rawJob = a?.jobPositionId;
      const getId = (v: any) =>
        typeof v === 'string' ? v : (v?._id ?? v?.id ?? '');
      addToMap('jobPositionId', getId(rawJob));

      // status
      addToMap('status', a?.status?.trim?.() ?? a?.status);

      // rejectionReasons
      const reasons = extractRejectionReasons(a);
      if (Array.isArray(reasons) && reasons.length) {
        addArrayToMap('rejectionReasons', reasons);
      }
    });

    return maps;
  }, [applicants, isSuperAdmin, jobPositionMap]);

  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const checkDarkMode = () => {
      const darkMode = document.documentElement.classList.contains('dark');
      setIsDarkMode(darkMode);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const makeExcludableColumnProps = (
    colId: string,
    options: { label: string; value: string; companyId?: string; subtitle?: string }[],
    isArrayColumn = false,
    label?: string,
    dependentColumnId?: string
  ): Partial<MRT_ColumnDef<any>> => ({
    enableColumnFilter: false,
    filterSelectOptions: options,
    filterFn: ((row: any, columnId: string, filterValue: string[]) => {
      if (!filterValue?.length) return true;
      const isExclude = (layout.excludeColumns ?? []).includes(colId);

      if (isArrayColumn) {
        const items: Array<{ name: string }> = row.getValue(columnId) || [];
        const hasMatch = filterValue.some((fv) =>
          items.some((item) => item.name === fv)
        );
        return isExclude ? !hasMatch : hasMatch;
      }

      const val: string = row.getValue(columnId);
      return isExclude
        ? !filterValue.includes(val)
        : filterValue.includes(val);
    }) as MRT_ColumnDef<any>['filterFn'],
    Header: ({ header, table }: { header: any; column: any; table: any }) => (
      <FilterHeaderCell
        header={header}
        table={table}
        label={label ?? colId}
        colId={colId}
        options={options}
        isArrayColumn={isArrayColumn}
        countsMap={unfilteredCounts[colId]}
        dependentColumnId={dependentColumnId}
        selectedCompanyFilterValue={selectedCompanyFilterValue}
        filterValue={header.column.getFilterValue()}
        excludeColumns={layout.excludeColumns ?? []}
        saveLayout={saveLayout}
        isDarkMode={isDarkMode}
      />
    ),
  });

  // Build columns
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'applicantNo',
        header: isLaptopViewport ? t('id', 'applicants') : t('applicantNo', 'applicants'),
        size: columnSizeConfig.applicantNo,
        enableColumnFilter: false,
        enableSorting: !duplicatesOnlyEnabled,
        sortingFn: (rowA, rowB, columnId) => {
          if (duplicatesOnlyEnabled) return 0;
          const a = rowA.getValue(columnId);
          const b = rowB.getValue(columnId);
          const numA = Number(a);
          const numB = Number(b);
          if (isNaN(numA) || isNaN(numB)) {
            return String(a).localeCompare(String(b));
          }
          return numA - numB;
        },
        Cell: ({ row, table }) => {
          if (isTableLoading) return renderCellSkeleton('text', '40%');
          const orig: any = row.original as any;
          const possible =
            orig?.applicantNo ||
            orig?.applicantNumber ||
            orig?.applicationNo ||
            orig?.applicationId;
          if (possible) {
            return (
              <a
                href={getApplicantHref(row)}
                className="text-inherit no-underline hover:no-underline"
                onClick={(e) => handleApplicantLinkClick(e, row)}
                onAuxClick={handleApplicantLinkAuxClick}
              >
                {String(possible)}
              </a>
            );
          }
          const idx =
            row.index ??
            table.getRowModel().rows.findIndex((r) => r.id === row.id);
          if (typeof idx === 'number' && idx >= 0) {
            return (
              <a
                href={getApplicantHref(row)}
                className="text-inherit no-underline hover:no-underline"
                onClick={(e) => handleApplicantLinkClick(e, row)}
                onAuxClick={handleApplicantLinkAuxClick}
              >
                {String(idx + 1)}
              </a>
            );
          }
          const id = orig?._id || orig?.id || '';
          if (!id) return '-';
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {String(id).slice(0, 8)}
            </a>
          );
        },
      },
      {
        accessorKey: 'profilePhoto',
        header: t('photo', 'applicants'),
        size: columnSizeConfig.profilePhoto,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('circular', 40, 40);
          return (
            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (row.original.profilePhoto) {
                  setPreviewPhotoUrl(row.original.profilePhoto);
                } else {
                  handleApplicantLinkClick(e as any, row);
                }
              }}
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 transition hover:ring-2 hover:ring-brand-500">
                <ImageThumbnailComponent
                  src={row.original.profilePhoto}
                  alt={row.original.fullName}
                  onClick={() => {
                    if (row.original.profilePhoto) {
                      setPreviewPhotoUrl(row.original.profilePhoto);
                    }
                  }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'fullName',
        header: t('name', 'applicants'),
        size: columnSizeConfig.fullName,
        enableColumnFilter: false,
        enableSorting: true,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const orig: any = row.original;
          const seenBy = orig?.seenBy ?? [];
          const isSeen =
            Array.isArray(seenBy) &&
            seenBy.some((s: any) => {
              if (!s) return false;
              if (typeof s === 'string') return s === currentUserId;
              return s._id === currentUserId || s.id === currentUserId;
            });
          const isDuplicated = orig?.isDuplicated ?? false;
          return (
            <div className="flex items-center gap-2">
              <a
                href={getApplicantHref(row)}
                className="text-inherit no-underline hover:no-underline"
                style={{ color: isSeen ? '#9CA3AF' : 'inherit' }}
                onClick={(e) => handleApplicantLinkClick(e, row)}
                onAuxClick={handleApplicantLinkAuxClick}
              >
                {orig?.fullName || '-'}
              </a>
              {isDuplicated && (
                <div title={t('hasDuplicateEntries', 'applicants')}>
                  <AlertIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: t('email', 'applicants'),
        size: columnSizeConfig.email,
        enableColumnFilter: false,
        enableSorting: true,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {row.original.email || '-'}
            </a>
          );
        },
      },
      {
        id: 'messages',
        header: t('messages', 'applicants'),
        size: 90,
        enableSorting: true,
        accessorFn: (row: any) =>
          mailCountByApplicantId.get(String(row?._id || row?.id || '')) ?? 0,
        sortingFn: (rowA: any, rowB: any, columnId: string) => {
          const a = Number(rowA.getValue(columnId) ?? 0);
          const b = Number(rowB.getValue(columnId) ?? 0);
          return a === b ? 0 : a > b ? 1 : -1;
        },
        enableColumnFilter: false,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const id = String(
            (row.original as any)?._id || (row.original as any)?.id || ''
          );
          const count = mailCountByApplicantId.get(id) ?? 0;
          if (count === 0) return <div />;
          return (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ChatIcon className="w-4 h-4 text-gray-500" />
              <span className="whitespace-nowrap">{count}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: t('phone', 'applicants'),
        size: columnSizeConfig.phone,
        enableColumnFilter: false,
        enableSorting: true,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {row.original.phone || '-'}
            </a>
          );
        },
      },
      {
        id: 'gender',
        accessorFn: (row: any) =>
          normalizeGender(
            row.gender ||
              row.customResponses?.gender ||
              row.customResponses?.genderAr ||
              row.customResponses?.['النوع'] ||
              (row as any)['النوع'] ||
              (row as any)?.genderAr ||
              ''
          ),
        header: t('gender', 'applicants'),
        size: columnSizeConfig.gender,
        enableSorting: true,
        ...makeExcludableColumnProps(
          'gender',
          genderOptions.map((o) => ({ label: ['Male', 'Female'].includes(o.title) ? t(o.title.toLowerCase(), 'personalInfo') : o.title, value: o.id })),
          false,
          t('gender', 'applicants')
        ),
        filterFn: (row: any, columnId: string, filterValue: any) => {
          if (!filterValue) return true;
          const vals = Array.isArray(filterValue) ? filterValue : [filterValue];
          if (!vals.length) return true;
          const cell = String(row.getValue(columnId) ?? '').toLowerCase().trim();
          const matches = vals.some((v) => String(v ?? '').toLowerCase().trim() === cell);
          const isExclude = (layout.excludeColumns ?? []).includes('gender');
          return isExclude ? !matches : matches;
        },
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const raw =
            row.original.gender ||
            row.original.customResponses?.gender ||
            row.original.customResponses?.genderAr ||
            row.original.customResponses?.['النوع'] ||
            (row.original as any)['النوع'] ||
            (row.original as any)?.genderAr ||
            '';
          const g = normalizeGender(raw);
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {g ? t(g.toLowerCase(), 'personalInfo') : '-'}
            </a>
          );
        },
      },
      ...(showCompanyColumn
        ? [
            {
              id: 'companyId',
              header: t('company', 'applicants'),
              size: columnSizeConfig.companyId,
              enableSorting: true,
              accessorFn: (row: any) =>
                getApplicantCompanyId(row, jobPositionMap),
              ...makeExcludableColumnProps(
                'companyId',
                companyOptions.map((o) => ({ label: o.title, value: o.id })),
                false,
                t('company', 'applicants')
              ),
              filterFn: (row: any, columnId: string, filterValue: any) => {
                if (!filterValue) return true;
                const vals = Array.isArray(filterValue)
                  ? filterValue
                  : [filterValue];
                if (!vals.length) return true;
                const cell = String(row.getValue(columnId) ?? '');
                const matches = vals.includes(cell);
                const isExclude = (layout.excludeColumns ?? []).includes('companyId');
                return isExclude ? !matches : matches;
              },
              Cell: ({ row }: { row: { original: any } }) => {
                if (isTableLoading) return renderCellSkeleton('text');
                const cId = getApplicantCompanyId(row.original, jobPositionMap);
                const company = companyMap[cId || ''];
                return (
                  <a
                    href={getApplicantHref(row)}
                    className="text-inherit no-underline hover:no-underline"
                    onClick={(e) => handleApplicantLinkClick(e, row)}
                    onAuxClick={handleApplicantLinkAuxClick}
                  >
                    {toPlainString(company?.name, locale) || company?.title || t('nA', 'applicants')}
                  </a>
                );
              },
            },
          ]
        : []),
      {
        id: 'jobPositionId',
        header: isLaptopViewport ? t('job', 'applicants') : t('jobPosition', 'applicants'),
        enableSorting: true,
        accessorFn: (row: any) => {
          const raw = row?.jobPositionId;
          const getId = (v: any) =>
            typeof v === 'string' ? v : (v?._id ?? v?.id ?? '');
          return getId(raw);
        },
        ...makeExcludableColumnProps(
          'jobPositionId',
          jobPositionFilterOptions,
          false,
          isLaptopViewport ? t('job', 'applicants') : t('jobPosition', 'applicants'),
          'companyId'
        ),
        filterFn: (row: any, columnId: string, filterValue: any) => {
          if (!filterValue) return true;
          const vals = Array.isArray(filterValue) ? filterValue : [filterValue];
          if (!vals.length) return true;
          const cell = String(row.getValue(columnId) ?? '');
          const matches = vals.includes(cell);
          const isExclude = (layout.excludeColumns ?? []).includes('jobPositionId');
          return isExclude ? !matches : matches;
        },
        size: columnSizeConfig.jobPositionId,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const raw = row.original.jobPositionId;
          const getId = (v: any) => {
            if (!v) return '';
            if (typeof v === 'string') return v;
            return v._id ?? v.id ?? '';
          };
          const jobId = getId(raw);
          const job = jobPositionMap[jobId];
          const title =
            typeof job?.title === 'string'
              ? job.title
              : locale === 'ar'
                ? (job?.title?.ar || job?.title?.en || jobOptions.find((o) => o.id === jobId)?.title || t('nA', 'applicants'))
                : (job?.title?.en || job?.title?.ar || jobOptions.find((o) => o.id === jobId)?.title || t('nA', 'applicants'));
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline text-sm font-medium"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {title}
            </a>
          );
        },
      },
      {
        id: 'expectedSalary',
        header: t('expectedSalary', 'applicants'),
        size: columnSizeConfig.expectedSalary,
        enableColumnFilter: false,
        enableSorting: true,
        accessorFn: (row: any) => getExpectedSalaryDisplay(row),
        sortingFn: (rowA: any, rowB: any) => {
          const a = parseComparableNumber(
            getExpectedSalaryDisplay(rowA.original)
          );
          const b = parseComparableNumber(
            getExpectedSalaryDisplay(rowB.original)
          );
          const va = a ?? -1;
          const vb = b ?? -1;
          if (va === vb) return 0;
          return va > vb ? 1 : -1;
        },
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const expectedSalary = getExpectedSalaryDisplay(row.original);
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {expectedSalary || '-'}
            </a>
          );
        },
      },
      {
        id: 'sscore',
        header: t('score', 'applicants'),
        size: columnSizeConfig.sscore,
        enableColumnFilter: false,
        enableSorting: true,
        accessorFn: (row: any) => getApplicantSScore(row),
        sortingFn: (rowA: any, rowB: any, columnId: string) => {
          const a = Number(rowA.getValue(columnId));
          const b = Number(rowB.getValue(columnId));
          const scoreA = Number.isFinite(a) ? a : -1;
          const scoreB = Number.isFinite(b) ? b : -1;
          if (scoreA === scoreB) return 0;
          return scoreA > scoreB ? 1 : -1;
        },
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const score = getApplicantSScore(row.original);
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {score === null ? '-' : `${score}%`}
            </a>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('status', 'applicants'),
        enableSorting: true,
        ...makeExcludableColumnProps(
          'status',
          statusFilterOptions.map((o) => ({ label: o.title, value: o.id })),
          false,
          'Status'
        ),
        Header: ({ header, table }: { header: any; column: any; table: any }) => {
          if (
            effectiveOnlyStatus !== undefined &&
            effectiveOnlyStatus !== null
          ) {
            return <span className="text-sm font-medium">{t('status', 'applicants')}</span>;
          }
          return (
            <FilterHeaderCell
              header={header}
              table={table}
              label={t('status', 'applicants')}
              colId="status"
              options={statusFilterOptions.map((o) => ({ label: o.title, value: o.id }))}
              countsMap={unfilteredCounts['status']}
              filterValue={header.column.getFilterValue()}
              excludeColumns={layout.excludeColumns ?? []}
              saveLayout={saveLayout}
              isDarkMode={isDarkMode}
            />
          );
        },
        minSize: 180,
        size: columnSizeConfig.status,
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text', '80px');

          const applicantCompanyId = getApplicantCompanyId(
            row.original,
            jobPositionMap
          );

          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              title={row.original.status ?? ''}
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              <StatusCell
                status={row.original.status}
                showTooltip
                selectedCompanyFilter={selectedCompanyFilter}
                companyId={applicantCompanyId}
                allCompanies={allCompaniesRaw}
                applicant={row.original}
              />
            </a>
          );
        },
      },
      {
        id: 'rejectionReasons',
        header: t('reasons', 'applicants'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 260,
        accessorFn: (row: any) => extractRejectionReasons(row),
        sortingFn: (rowA: any, rowB: any, columnId: string) => {
          const reasonsA = rowA.getValue(columnId) as string[];
          const reasonsB = rowB.getValue(columnId) as string[];
          const a = reasonsA.length;
          const b = reasonsB.length;
          if (a === b) return 0;
          return a > b ? 1 : -1;
        },
        ...makeExcludableColumnProps(
          'rejectionReasons',
          rejectionReasonsOptions.map((o) => ({ label: o.title, value: o.id })),
          true,
          'Reasons'
        ),
        filterFn: (row: any, columnId: string, filterValue: any) => {
          if (!filterValue) return true;
          const selectedReasons = Array.isArray(filterValue)
            ? filterValue
            : [filterValue];
          if (selectedReasons.length === 0) return true;

          const applicantReasons = row.getValue(columnId) as string[];
          const matches = selectedReasons.some((selectedReason) =>
            applicantReasons.some(
              (applicantReason) =>
                applicantReason
                  .toLowerCase()
                  .includes(selectedReason.toLowerCase()) ||
                selectedReason
                  .toLowerCase()
                  .includes(applicantReason.toLowerCase())
            )
          );
          const isExclude = (layout.excludeColumns ?? []).includes('rejectionReasons');
          return isExclude ? !matches : matches;
        },
        Cell: ({ row }: { row: { original: any } }) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const a = row.original || {};
          const reasons = extractRejectionReasons(a);

          if (!reasons || reasons.length === 0) {
            return <span className="text-sm text-gray-500">-</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {reasons.map((r: string, i: number) => (
                <span
                  key={i}
                  className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                >
                  {r}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'submittedAt',
        header: t('submitted', 'applicants'),
        Header: ({ column, table }: { column: any; table: any }) => {
          const sortingState = table.getState().sorting;
          const submittedSort = sortingState.find(
            (s: any) => s.id === column.id
          );
          const desc = submittedSort ? submittedSort.desc : true;
          const toggle = (e: any) => {
            e.preventDefault();
            e.stopPropagation();
            table.setSorting([{ id: column.id, desc: !desc }]);
          };
          return (
            <button
              onClick={toggle}
              className="flex flex-1 items-center justify-between gap-1 text-sm font-medium min-w-0"
              type="button"
              title={desc ? t('newest', 'applicants') : t('oldest', 'applicants')}
            >
              <span>{t('submitted', 'applicants')}</span>
              <span className="text-xs">{desc ? '▼' : '▲'}</span>
            </button>
          );
        },
        size: columnSizeConfig.submittedAt,
        enableColumnFilter: false,
        enableSorting: true,
        sortingFn: (rowA: any, rowB: any, columnId: string) => {
          const getVal = (r: any) => {
            const v = r.getValue(columnId) ?? r.original?.submittedAt;
            const t = v ? new Date(v).getTime() : 0;
            return Number.isNaN(t) ? 0 : t;
          };
          const a = getVal(rowA);
          const b = getVal(rowB);
          if (a === b) return 0;
          return a > b ? 1 : -1;
        },
        Cell: ({ row }: any) => {
          if (isTableLoading) return renderCellSkeleton('text');
          return (
            <a
              href={getApplicantHref(row)}
              className="text-inherit no-underline hover:no-underline"
              onClick={(e) => handleApplicantLinkClick(e, row)}
              onAuxClick={handleApplicantLinkAuxClick}
            >
              {formatDate(row.original.submittedAt)}
            </a>
          );
        },
      },
      {
        id: 'actions',
        header: t('actions', 'applicants'),
        size: columnSizeConfig.actions,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }: any) => {
          if (isTableLoading) return renderCellSkeleton('text');
          const orig = row.original as any;
          const resolveCvPath = (applicant: any): string | null => {
            const keys = [
              'cvFilePath',
              'resumePath',
              'cvUrl',
              'resumeUrl',
              'curriculumVitaePath',
            ] as const;
            for (const key of keys) {
              const value = applicant?.[key];
              if (typeof value === 'string' && value.trim().length > 0)
                return value;
            }
            return null;
          };
          const hasCv = Boolean(resolveCvPath(orig));
          const isTrashedApplicant = isTrashed(orig);
          const previousStatus = getPreviousStatus(orig);
          const handleRestore = async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const result = await Swal.fire({
              title: t('restoreTitle', 'applicants'),
              text: t('restoreText', 'applicants', { status: previousStatus || '' }),
              icon: 'question',
              showCancelButton: true,
              confirmButtonColor: '#22c55e',
              cancelButtonColor: '#6b7280',
              confirmButtonText: t('restore', 'applicants'),
              cancelButtonText: t('cancel', 'applicants'),
            });
            if (!result.isConfirmed) return;
            try {
              await updateStatus.mutateAsync({ id: orig._id, data: { status: previousStatus } });
              setRowSelection((prev: any) => {
                const next = { ...prev };
                delete next[orig._id];
                return next;
              });
            } catch {
              // toast handled by mutation
            }
          };
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 w-full justify-center"
            >
              {hasCv && (
                <button
                  type="button"
                  aria-label={t('downloadCv', 'applicants')}
                  title={t('downloadCv', 'applicants')}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await downloadCvForApplicant(orig);
                  }}
                  className="inline-flex items-center justify-center rounded bg-brand-500 p-1 text-white hover:bg-brand-600"
                >
                  <span className="sr-only">{t('downloadCv', 'applicants')}</span>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 3v12m0 0l-4-4m4 4l4-4M21 21H3"
                    />
                  </svg>
                </button>
              )}
              {isTrashedApplicant && canRestore && (
                <button
                  type="button"
                  aria-label={t('restoreApplicant', 'applicants')}
                  title={t('restoreTo', 'applicants', { status: previousStatus || '' })}
                  onClick={handleRestore}
                  disabled={updateStatus.isPending}
                  className="inline-flex items-center justify-center rounded bg-green-500 p-1 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  <span className="sr-only">{t('restore', 'applicants')}</span>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [
      columnSizeConfig,
      isLaptopViewport,
      duplicatesOnlyEnabled,
      isTableLoading,
      genderOptions,
      showCompanyColumn,
      companyOptions,
      jobOptions,
      jobPositionFilterOptions,
      statusFilterOptions,
      filteredJobOptions,
      rejectionReasonsOptions,
      effectiveOnlyStatus,
      excludeModes,
      columnFilters,
      formatDate,
      getExpectedSalaryDisplay,
      getApplicantSScore,
      parseComparableNumber,
      mailCountByApplicantId,
      jobPositionMap,
      companyMap,
      currentUserId,
      selectedCompanyFilterValue,
      layout.excludeColumns,
      saveLayout,
      canRestore,
      dir,
      unfilteredCounts,
      isDarkMode,
    ]
  );

  const muiTheme = useMemo(
    () =>
      createTheme({
        direction: dir,
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
        },
        typography: {
          fontFamily: "'Montserrat', sans-serif",
        },
        components: {
          MuiCheckbox: {
            defaultProps: { size: 'large' },
            styleOverrides: {
              root: {
                color: isDarkMode ? '#667085' : '#98A2B3',
                padding: '2px',
                '& .MuiSvgIcon-root': { fontSize: '2rem' },
                '&.Mui-checked': { color: '#e42e2b' },
              },
            },
          },
        },
      }),
    [isDarkMode, dir]
  );

  const skeletonData = useMemo(
    () =>
      Array.from({ length: pagination.pageSize || 10 }).map((_, i) => ({
        _id: `skeleton-${i}`,
        _skeleton: true,
      })),
    [pagination.pageSize]
  );

  const mrtLocalization = {
    noRecordsToDisplay: t('noRecordsToDisplay', 'applicants'),
    rowsPerPage: t('rowsPerPage', 'applicants'),
    of: t('of', 'applicants'),
    search: t('search', 'applicants'),
    clearSearch: t('clearSearch', 'applicants'),
    showHideColumns: t('showHideColumns', 'applicants'),
    showHideSearch: t('showHideSearch', 'applicants'),
    showHideFilters: t('showHideFilters', 'applicants'),
    hideColumn: t('hideColumn', 'applicants'),
    showAllColumns: t('showAllColumns', 'applicants'),
    jumpToPage: t('jumpToPage', 'applicants'),
    toggleSelectAll: t('toggleSelectAll', 'applicants'),
    toggleSelectRow: t('toggleSelectRow', 'applicants'),
    selectedCountOfRowCountRowsSelected: t('selectedCountOfRowCountRowsSelected', 'applicants'),
    filterByColumn: t('filterByColumn', 'applicants'),
    globalSearch: t('globalSearch', 'applicants'),
    columnSearch: t('columnSearch', 'applicants'),
    hideAll: t('hideAll', 'applicants'),
    showAll: t('showAll', 'applicants'),
    columns: t('columns', 'applicants'),
    pin: t('pin', 'applicants'),
    pinToLeft: t('pinToLeft', 'applicants'),
    pinToRight: t('pinToRight', 'applicants'),
    unpin: t('unpin', 'applicants'),
    columnActions: t('columnActions', 'applicants'),
    and: t('and', 'applicants'),
    noResultsFound: t('noResultsFound', 'applicants'),
    goToFirstPage: t('goToFirstPage', 'applicants'),
    goToLastPage: t('goToLastPage', 'applicants'),
    goToNextPage: t('goToNextPage', 'applicants'),
    goToPreviousPage: t('goToPreviousPage', 'applicants'),
  };

  const table = useMaterialReactTable({
    localization: mrtLocalization,
    columns,
    enableSorting: true,
    data: isTableLoading ? skeletonData : filteredApplicants,
    enableRowVirtualization: true, // Enable virtual scrolling for better performance
    displayColumnDefOptions: {
      'mrt-row-select': {
        size: selectColumnWidth,
        muiTableHeadCellProps: {
          align: 'center',
          sx: {
            padding: 0,
            width: `${selectColumnWidth}px`,
            minWidth: `${selectColumnWidth}px`,
            maxWidth: `${selectColumnWidth}px`,
            backgroundColor: isDarkMode ? '#374151' : undefined,
            color: isDarkMode ? '#e5e7eb' : undefined,
          },
        },
        muiTableBodyCellProps: ({ row }: any) => ({
          align: 'center',
          sx: {
            padding: 0,
            width: `${selectColumnWidth}px`,
            minWidth: `${selectColumnWidth}px`,
            maxWidth: `${selectColumnWidth}px`,
            backgroundColor: isDarkMode
              ? (row.index % 2 === 0 ? '#374151' : '#1f2937')
              : undefined,
          },
        }),
        Cell: ({ row, table }: any) => {
          if (isTableLoading) return null;
          return (
            <div
              className="flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
              onAuxClick={(e) => e.stopPropagation()}
            >
              <MRT_SelectCheckbox row={row} table={table} />
            </div>
          );
        },
      },
    },
    enableRowSelection: !isTableLoading,
    enablePagination: true,
    enableBatchRowSelection: false,
    selectAllMode: 'all',
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnFilters: true,
    columnFilterDisplayMode: 'popover',
    enableFilters: true,
    enableGlobalFilter: false,
    enableHiding: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableColumnActions: false,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    layoutMode: 'grid',
    manualPagination: false,
    manualFiltering: true,
    manualSorting: false,
    rowCount: isTableLoading ? skeletonData.length : filteredApplicants.length,
    initialState: {
      pagination,
      columnFilters: isTableLoading ? [] : columnFilters,
      columnVisibility: layout.columnVisibility || {},
      columnSizing: mergedColumnSizing,
      density: 'compact',
    },
    state: {
      sorting,
      pagination: isTableLoading
        ? { ...pagination, pageIndex: 0 }
        : pagination,
      columnFilters: isTableLoading ? [] : columnFilters,
      rowSelection,
      columnVisibility: layout.columnVisibility || {},
      columnSizing: mergedColumnSizing,
      columnOrder:
        Array.isArray(layout.columnOrder) && layout.columnOrder.length
          ? layout.columnOrder
          : APPLICANTS_DEFAULT_COLUMN_ORDER,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(next);
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater(layout.columnVisibility)
          : updater;
      saveLayout({ columnVisibility: next });
    },
    onColumnSizingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(mergedColumnSizing) : updater;
      saveLayout({ columnSizing: next });
    },
    onColumnOrderChange: (updater) =>
      handleColumnOrderChange(updater, saveLayout),
    renderTopToolbarCustomActions: () => (
      <div className="flex items-center p-2 w-full justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <svg
              className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t('search', 'applicants')}
              className="w-40 lg:w-56 rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const currentFilter = customFilters.find(
                (f: any) => f?.fieldId === '__duplicates_only'
              );
              if (currentFilter) {
                setCustomFilters((prev: any) =>
                  prev.filter((f: any) => f?.fieldId !== '__duplicates_only')
                );
              } else {
                setCustomFilters((prev: any) => [
                  ...prev,
                  {
                    fieldId: '__duplicates_only',
                    value: true,
                    type: 'boolean',
                    label: t('showDuplicatesOnly', 'applicants'),
                  },
                ]);
              }
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold transition-all duration-200 ${duplicatesOnlyEnabled ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              />
            </svg>
            {duplicatesOnlyEnabled ? t('duplicatesOnly', 'applicants') : t('showDuplicates', 'applicants')}
          </button>
          {duplicatesOnlyEnabled && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {(() => {
                const duplicateLookup = buildApplicantDuplicateLookup(
                  filteredApplicants as any[],
                  currentUserId,
                  {
                    getCompanyId: (applicant: any) =>
                      getApplicantCompanyId(applicant, jobPositionMap),
                  }
                );
                const duplicateCount = Array.from(
                  duplicateLookup.values()
                ).filter((d) => d.isDuplicate === true).length;
                return t('duplicateCount', 'applicants', { count: duplicateCount });
              })()}
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 self-start">
          <button
            type="button"
            onClick={() => setCustomFilterOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold shadow-sm transition-all duration-200 ${
              customFilters.length > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            <span className="relative">
              {t('filterSettings', 'applicants')}
              {customFilters.length > 0 && (
                <span className="absolute -top-2 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {customFilters.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>
    ),
    muiTopToolbarProps: {
      sx: {
        backgroundColor: isDarkMode ? '#1f2937' : undefined,
        color: isDarkMode ? '#e5e7eb' : undefined,
        '& .MuiInputBase-root': {
          color: isDarkMode ? '#e5e7eb' : undefined,
        },
        '& .MuiInputBase-input': {
          color: isDarkMode ? '#e5e7eb' : undefined,
        },
        '& .MuiSvgIcon-root': {
          color: isDarkMode ? '#9ca3af' : undefined,
        },
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: isDarkMode ? '#1f2937' : undefined,
        color: isDarkMode ? '#e5e7eb' : undefined,
        '& .MuiSvgIcon-root': {
          color: isDarkMode ? '#9ca3af' : undefined,
        },
        '& .MuiTablePagination-toolbar': {
          color: isDarkMode ? '#e5e7eb' : undefined,
        },
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        backgroundColor: isDarkMode ? '#1f2937' : undefined,
      },
    },
    muiTableProps: {
      sx: {
        backgroundColor: isDarkMode ? '#1f2937' : undefined,
      },
    },
    muiTableContainerProps: {
      sx: {
        '&::-webkit-scrollbar': {
          width: '6px',
          height: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: isDarkMode ? '#1f2937' : undefined,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: isDarkMode ? '#4b5563' : undefined,
          borderRadius: '3px',
        },
      },
    },
    muiTableBodyCellProps: ({ row, cell }) => ({
      'data-column-id': cell.column.id,
      'data-flip-key': `${row.id}:${cell.column.id}`,
      sx: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isDarkMode ? '#e5e7eb' : '#282828',
        borderBottom: isDarkMode ? '1px solid #374151' : undefined,
      },
    }),
    muiTableHeadCellProps: ({ column }) => ({
      'data-column-id': column.id,
      'data-flip-key': `head:${column.id}`,
      sx: {
        height: '50px',
        fontWeight: 'bold',
        position: 'relative',
        color: isDarkMode ? '#e5e7eb' : undefined,
        backgroundColor: isDarkMode ? '#374151' : undefined,
        borderBottom: isDarkMode ? '1px solid #4b5563' : undefined,
        userSelect: 'none',
        transition: 'background-color 0.2s ease',
        '& .MuiTableSortLabel-icon': { display: 'none' },
        '& .MuiBadge-root': { display: 'none' },
        '& .Mui-TableHeadCell-Content': {
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        },
        '& .Mui-TableHeadCell-Content-Actions': {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 0,
        },
        '& .Mui-TableHeadCell-Content-Actions button[aria-label="Move"]': {
          pointerEvents: 'all',
          width: '100%',
          height: '100%',
          cursor: 'grab',
          zIndex: 1,
        },
        '& .Mui-TableHeadCell-Content-Labels': {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
          pointerEvents: column.id === 'mrt-row-select' ? 'all' : 'none',
        },
        '& .Mui-TableHeadCell-Content-Labels button': {
          pointerEvents: 'all',
        },
        '& .Mui-TableHeadCell-Content-Labels .MuiTableSortLabel-root': {
          pointerEvents: 'all',
        },
      },
      onMouseDown:
        column.id === 'mrt-row-select'
          ? undefined
          : (e) => onHeaderMouseDown(e, () => column.toggleSorting()),
    }),
    muiTableBodyRowProps: ({ row, table }) => ({
      sx: {
        backgroundColor: isDarkMode
          ? (table.getRowModel().rows.indexOf(row) % 2 === 0
              ? '#374151'
              : '#1f2937')
          : (table.getRowModel().rows.indexOf(row) % 2 === 0
              ? 'rgba(240, 240, 240, 1)'
              : 'white'),
        '& .MuiTableRow-root': {
          overflow: 'hidden',
          width: '100%',
        },
        '& .MuiCollapse-root': {
          width: '80%',
          marginX: 'auto',
        },
      },
    }),
    getRowId: (row) => row._id,
  });

  return (
    <ThemeProvider theme={muiTheme} key={isDarkMode ? 'dark' : 'light'}>
        <div className="w-full min-w-0">
        <PageMeta title={t('pageTitle', 'applicants')} description={t('pageDescription', 'applicants')} />
        <PageBreadcrumb
          pageTitle={t('pageTitle', 'applicants')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const promises: Promise<any>[] = [];
                  if (isJobPositionsFetched) promises.push(refetchJobPositions());
                  if (isApplicantsFetched) promises.push(refetchApplicants());
                  if (isCompaniesFetched) promises.push(refetchCompanies());
                  if (promises.length === 0) return;
                  await Promise.all(promises);
                  if (mountedRef.current) setLastRefetch(new Date());
                }}
                disabled={
                  isJobPositionsFetching ||
                  isApplicantsFetching ||
                  isCompaniesFetching
                }
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {isJobPositionsFetching ||
                isApplicantsFetching ||
                isCompaniesFetching
                  ? t('updatingData', 'applicants')
                  : t('updateData', 'applicants')}
              </button>
              <div className="text-sm text-gray-500">
                {elapsed ? t('lastUpdate', 'applicants', { time: elapsed }) : t('notUpdatedYet', 'applicants')}
              </div>
            </div>
          }
        />
<div className="w-full min-w-0">
  <div className="grid gap-6 min-w-0">
            <ComponentCard title={t('componentTitle', 'applicants')} desc={t('componentDesc', 'applicants')}  className="overflow-hidden">
              <>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                    {String(error)}
                  </div>
                )}

                {selectedApplicantCount > 0 && (
                  <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-900/20">
                    <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                      {t('selectedCount', 'applicants', { count: selectedApplicantCount })}
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                    onClick={() => {
                      setOfferModalOpen(true);
                    }}
                    disabled={selectedApplicantCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    {`${t('sendOffer', 'applicants')} (${selectedApplicantCount})`}
                  </button>
                  <button
                    onClick={() => {
                      setContractModalOpen(true);
                    }}
                    disabled={selectedApplicantCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <FileSignature className="h-4 w-4" />
                    {`${t('sendContract', 'applicants')} (${selectedApplicantCount})`}
                  </button>
                  <button
                        type="button"
                        onClick={() => {
                          setBulkStatusForm({ status: '', reasons: [], notes: '' });
                          setBulkStatusError('');
                          setShowBulkStatusModal(true);
                        }}
                        disabled={isProcessing || selectedApplicantCount === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                      >
                        {isProcessing ? t('changing', 'applicants') : t('changeStatus', 'applicants')}
                      </button>
                      <button
                        onClick={handleExportToExcel}
                        disabled={isExporting || selectedApplicantCount === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                          />
                        </svg>
                        {isExporting
                          ? t('exporting', 'applicants')
                          : `${t('export', 'applicants')} (${selectedApplicantCount})`}
                      </button>
                      <button
                        onClick={() => setShowBulkModal(true)}
                        disabled={
                          isProcessing || selectedApplicantRecipients.length === 0
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {`${t('sendMail', 'applicants')} (${selectedApplicantRecipients.length})`}
                      </button>
                      <button
                        onClick={openBulkInterviewModal}
                        disabled={
                          isSubmittingBulkInterview ||
                          selectedApplicantsForInterview.length === 0
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isSubmittingBulkInterview
                          ? t('scheduling', 'applicants')
                          : `${t('scheduleInterviews', 'applicants')} (${selectedApplicantsForInterview.length})`}
                      </button>
                      {selectedTrashedApplicants.length > 0 && (
                        <button
                          onClick={handleBulkRestore}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t('restore', 'applicants')} ({selectedTrashedApplicants.length})
                        </button>
                      )}
                      <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        <TrashBinIcon className="h-4 w-4" />
                        {isDeleting ? t('deleting', 'applicants') : t('delete', 'applicants')}
                      </button>
                    </div>
                  </div>
                )}

            <div
              ref={tableContainerRef}
              className="w-full overflow-x-auto custom-scrollbar"
            >
              <MaterialReactTable table={table} />
            </div>

            <JobContractModal
              isOpen={contractModalOpen}
              onClose={() => setContractModalOpen(false)}
              mode="contract"
              applicantObjects={selectedApplicants}
              companyId={selectedApplicantCompanyId!}
            />

            <JobOfferModal
              isOpen={offerModalOpen}
              onClose={() => setOfferModalOpen(false)}
              mode="offer"
              applicantObjects={selectedApplicants}
              companyId={selectedApplicantCompanyId!}
            />
                <BulkMessageModal
                  isOpen={showBulkModal}
                  onClose={() => setShowBulkModal(false)}
                  recipients={selectedApplicantRecipients}
                  companyId={selectedApplicantCompanyId}
                  company={selectedApplicantCompany}
                  onSuccess={() => {
                    setRowSelection({});
                    setShowBulkModal(false);
                  }}
                />

                <StatusChangeModal
                  isOpen={showBulkStatusModal}
                  onClose={() => {
                    setShowBulkStatusModal(false);
                    setBulkStatusError('');
                  }}
                  statusForm={bulkStatusForm}
                  setStatusForm={setBulkStatusForm}
                  statusError={bulkStatusError}
                  setStatusError={setBulkStatusError}
                  handleStatusChange={handleBulkStatusChange}
                  isSubmittingStatus={isSubmittingBulkStatus}
                  companyId={selectedApplicantCompanyId ?? undefined}
                  companySettings={selectedApplicantCompany}
                  jobIds={selectedApplicantJobIds}
                  jobs={jobPositions}
                />

                <InterviewScheduleModal
                  isOpen={showBulkInterviewModal}
                  onClose={() => {
                    setShowBulkInterviewModal(false);
                    setBulkInterviewError('');
                    resetBulkInterviewModal();
                  }}
                  formResetKey={bulkFormResetKey}
                  interviewForm={bulkInterviewForm}
                  setInterviewForm={setBulkInterviewForm}
                  interviewError={bulkInterviewError}
                  setInterviewError={setBulkInterviewError}
                  handleInterviewSubmit={handleBulkInterviewSubmit}
                  fillCompanyAddress={fillBulkCompanyAddress}
                  notificationChannels={bulkNotificationChannels}
                  setNotificationChannels={setBulkNotificationChannels}
                  emailOption={bulkEmailOption}
                  setEmailOption={setBulkEmailOption}
                  customEmail={bulkCustomEmail}
                  setCustomEmail={setBulkCustomEmail}
                  phoneOption={bulkPhoneOption}
                  setPhoneOption={setBulkPhoneOption}
                  customPhone={bulkCustomPhone}
                  setCustomPhone={setBulkCustomPhone}
                  messageTemplate={bulkMessageTemplate}
                  setMessageTemplate={setBulkMessageTemplate}
                  interviewEmailSubject={bulkInterviewEmailSubject}
                  setInterviewEmailSubject={setBulkInterviewEmailSubject}
                  isSubmittingInterview={isSubmittingBulkInterview}
                  setShowPreviewModal={setShowBulkPreviewFallbackModal}
                  setPreviewHtml={setBulkPreviewHtml}
                  buildInterviewEmailHtml={({ rawMessage }: any) =>
                    `<html><body>${rawMessage}</body></html>`
                  }
                  getJobTitle={() => ({ en: '' })}
                  companyData={selectedApplicantCompany || null}
                  applicant={{
                    fullName: '{{candidateName}}',
                    company:
                      selectedApplicantCompany ||
                      (selectedApplicantCompanyId
                        ? { _id: selectedApplicantCompanyId }
                        : null),
                    companyObj:
                      selectedApplicantCompany ||
                      (selectedApplicantCompanyId
                        ? { _id: selectedApplicantCompanyId }
                        : null),
                  }}
                  bulkMode
                  bulkCount={selectedApplicantsForInterview.length}
                  intervalMinutes={bulkInterviewIntervalMinutes}
                  setIntervalMinutes={setBulkInterviewIntervalMinutes}
                  onPreview={handlePreviewBulkInterviews}
                  recipients={selectedApplicantsForInterview}
                  jobTitleById={jobPositionMap}
                />

                <Modal
                  isOpen={showBulkInterviewPreviewModal}
                  onClose={() => setShowBulkInterviewPreviewModal(false)}
                  className="max-w-5xl p-6"
                >
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t('interviewEmailPreview', 'applicants', { count: bulkInterviewPreviewItems.length })}
                    </h2>
                    <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
                      {bulkInterviewPreviewItems.map((item, index) => (
                        <div
                          key={`${item.applicantId}-${index}`}
                          className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                        >
                          <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                            {t('applicantItem', 'applicants', { no: item.applicantNo, name: item.applicantName })}
                          </div>
                          <div className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                            <span className="mr-4">
                              {t('to', 'applicants')} {item.to || t('noEmail', 'applicants')}
                            </span>
                            <span>{t('scheduled', 'applicants')} {item.scheduledLabel}</span>
                          </div>
                          <iframe
                            srcDoc={item.html}
                            title={`Interview Preview ${item.applicantId}`}
                            className="min-h-[360px] w-full rounded border-none bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowBulkInterviewPreviewModal(false)}
                        className="rounded-lg border border-stroke px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('close', 'applicants')}
                      </button>
                    </div>
                  </div>
                </Modal>

                <Modal
                  isOpen={showBulkPreviewFallbackModal}
                  onClose={() => setShowBulkPreviewFallbackModal(false)}
                  className="max-w-3xl p-6"
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t('preview', 'applicants')}
                    </h2>
                    <div
                      className="border rounded p-2 bg-white dark:bg-gray-800"
                      style={{ maxHeight: '70vh', overflow: 'auto' }}
                    >
                      <iframe
                        srcDoc={bulkPreviewHtml}
                        title="Bulk Interview Preview"
                        className="w-full min-h-[480px] rounded border-none"
                      />
                    </div>
                  </div>
                </Modal>
              </>
            </ComponentCard>
          </div>
        </div>

        {previewPhotoUrl && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewPhotoUrl(null)}
          >
            <div className="relative max-h-[90vh] max-w-[90vw] p-4">
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                ✕
              </button>
              <PhotoPreviewImage src={previewPhotoUrl} />
            </div>
          </div>
        )}

        <CustomFilterModal
          open={customFilterOpen}
          onClose={() => setCustomFilterOpen(false)}
          jobPositions={jobPositions}
          applicants={applicants}
          jobPositionMap={jobPositionMap}
          companies={allCompaniesRaw}
          customFilters={customFilters}
          setCustomFilters={setCustomFilters}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          genderOptions={genderOptions}
        />
      </div>
    </ThemeProvider>
  );
}