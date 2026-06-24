// hooks/useApplicantFilters.ts
import { useMemo, useCallback } from 'react';
import { sortApplicantsByDuplicatePriority } from '../../../../../utils/applicantDuplicateSort';
import { applyCustomFilters, getApplicantCompanyId } from '../utils/filterHelpers';

interface UseApplicantFiltersProps {
  applicants: any[];
  columnFilters: any[];
  customFilters: any[];
  isSuperAdmin: boolean;
  effectiveOnlyStatus?: string | string[];
  effectiveOnlyJobPositions?: string[];
  selectedCompanyFilterValue?: string[] | string | null;
  companyFilterExclude?: boolean;
  excludeColumns?: string[];
  jobPositionMap: Record<string, any>;
  fieldToJobIds: Map<string, Set<string>> | Record<string, Set<string>>;
  currentUserId: string;
  allCompaniesRaw: any[];
  canViewTrashed?: boolean;
}

export function useApplicantFilters({
  applicants,
  columnFilters,
  customFilters,
  isSuperAdmin,
  effectiveOnlyStatus,
  effectiveOnlyJobPositions,
  selectedCompanyFilterValue,
  excludeColumns = [],
  jobPositionMap,
  fieldToJobIds,
  currentUserId,
  canViewTrashed = false,
}: UseApplicantFiltersProps) {
  const normalizeStatus = useCallback((value: unknown) => {
    return String(value ?? '').trim().toLowerCase();
  }, []);

  const isTrashed = useCallback((status: string) => {
    return normalizeStatus(status) === 'trashed';
  }, [normalizeStatus]);

  // Get selected company from column filters
  const selectedCompanyIds = useMemo((): string[] | null => {
    if (selectedCompanyFilterValue) {
      if (Array.isArray(selectedCompanyFilterValue)) {
        return selectedCompanyFilterValue;
      }
      if (typeof selectedCompanyFilterValue === 'string') {
        return [selectedCompanyFilterValue];
      }
      return null;
    }
    const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
    if (!companyFilter?.value) return null;
    const companyIds = Array.isArray(companyFilter.value) 
      ? companyFilter.value 
      : [companyFilter.value];
    return companyIds;
  }, [selectedCompanyFilterValue, columnFilters]);

  // Determine dataset to pass to MRT
  const displayedApplicants = useMemo(() => {
    let filtered = applicants || [];
    
    // Apply company filter with exclude mode support
    const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
    const companyFilterValue = companyFilter?.value;
    const companyExcludeMode = companyFilterValue !== undefined && excludeColumns.includes('companyId');

    let companyIds: string[] | null = selectedCompanyIds;
    if (!companyIds && companyFilterValue) {
      companyIds = Array.isArray(companyFilterValue) ? companyFilterValue : [companyFilterValue];
    }

    if (companyIds && companyIds.length > 0) {
      filtered = filtered.filter((applicant: any) => {
        const applicantCompanyId = getApplicantCompanyId(applicant, jobPositionMap);
        const matches = applicantCompanyId && companyIds?.includes(applicantCompanyId);
        return companyExcludeMode ? !matches : matches;
      });
    }
    
    // Apply job position filter with exclude mode support
    const jobFilter = columnFilters.find((f: any) => f.id === 'jobPositionId');
    const jobFilterValue = jobFilter?.value;
    const jobExcludeMode = jobFilterValue !== undefined && excludeColumns.includes('jobPositionId');
    
    if (jobFilterValue && (Array.isArray(jobFilterValue) ? jobFilterValue.length > 0 : true)) {
      const selectedJobIds = Array.isArray(jobFilterValue) ? jobFilterValue : [jobFilterValue];
      filtered = filtered.filter((applicant: any) => {
        const jobPositionId = applicant?.jobPositionId;
        let applicantJobId = '';
        if (typeof jobPositionId === 'string') {
          applicantJobId = jobPositionId;
        } else if (jobPositionId && typeof jobPositionId === 'object') {
          applicantJobId = jobPositionId._id || jobPositionId.id || '';
        }
        const isSelected = selectedJobIds.includes(applicantJobId);
        return jobExcludeMode ? !isSelected : isSelected;
      });
    }
    
    // Apply gender filter with exclude mode support
    const genderFilter = columnFilters.find((f: any) => f.id === 'gender');
    const genderFilterValue = genderFilter?.value;
    const genderExcludeMode = genderFilterValue !== undefined && excludeColumns.includes('gender');
    
    if (genderFilterValue && (Array.isArray(genderFilterValue) ? genderFilterValue.length > 0 : true)) {
      const selectedGenders = Array.isArray(genderFilterValue) ? genderFilterValue : [genderFilterValue];
      filtered = filtered.filter((applicant: any) => {
        const normalizeGender = (v: any) => String(v ?? '').trim().toLowerCase();
        const rawGender = applicant?.gender || applicant?.customResponses?.gender || applicant?.customResponses?.['النوع'] || (applicant as any)['النوع'] || '';
        const normalizedGenderValue = normalizeGender(rawGender);
        const matches = selectedGenders.includes(normalizedGenderValue);
        return genderExcludeMode ? !matches : matches;
      });
    }
    
    // Apply status filter (from props or URL params)
    if (effectiveOnlyStatus !== undefined && effectiveOnlyStatus !== null && effectiveOnlyStatus !== '') {
      const allowed = (Array.isArray(effectiveOnlyStatus) ? effectiveOnlyStatus : [effectiveOnlyStatus])
        .map(normalizeStatus)
        .filter(Boolean);
      if (allowed.length > 0) {
        filtered = filtered.filter((a: any) => allowed.includes(normalizeStatus(a.status)));
      }
      return filtered;
    }

    // Apply job position filter (from props or URL params)
    if (effectiveOnlyJobPositions !== undefined && effectiveOnlyJobPositions !== null && effectiveOnlyJobPositions.length > 0) {
      filtered = filtered.filter((a: any) => {
        const jobPositionId = a?.jobPositionId;
        let applicantJobId = '';
        if (typeof jobPositionId === 'string') {
          applicantJobId = jobPositionId;
        } else if (jobPositionId && typeof jobPositionId === 'object') {
          applicantJobId = jobPositionId._id || jobPositionId.id || '';
        }
        return effectiveOnlyJobPositions.includes(applicantJobId);
      });
    }
    
    // Apply status column filter
    const statusFilter = columnFilters.find((f: any) => f.id === 'status');
    const statusVal = statusFilter?.value;
    const statusExcludeMode = statusVal !== undefined && excludeColumns.includes('status');

    if (isSuperAdmin || canViewTrashed) {
      if (normalizeStatus(statusVal) === 'trashed') {
        filtered = filtered.filter((a: any) => isTrashed(a.status));
        return filtered;
      }
      if (Array.isArray(statusVal) && statusVal.length > 0) {
        const allowed = statusVal.map(normalizeStatus).filter(Boolean);
filtered = filtered.filter((a: any) => allowed.includes(normalizeStatus(a.status)));
        return filtered;
      }
      if (Array.isArray(statusVal) && statusVal.length > 0) {
        const allowed = statusVal.map(normalizeStatus).filter(Boolean);
        filtered = filtered.filter((a: any) => {
          const matches = allowed.includes(normalizeStatus(a.status));
          if (statusExcludeMode && isTrashed(a.status)) return false;
          return statusExcludeMode ? !matches : matches;
        });
        return filtered;
      }
      filtered = filtered.filter((a: any) => !isTrashed(a.status));
      return filtered;
    }

    // For non-super admin users
    if (Array.isArray(statusVal) && statusVal.length > 0) {
      const allowed = statusVal.map(normalizeStatus).filter((s: string) => s !== 'trashed');
      if (allowed.length === 0) {
        filtered = filtered.filter((a: any) => !isTrashed(a.status));
        return filtered;
      }
      filtered = filtered.filter((a: any) => {
        const matches = allowed.includes(normalizeStatus(a.status));
        const notTrashed = !isTrashed(a.status);
        if (statusExcludeMode && isTrashed(a.status)) return false;
        return statusExcludeMode ? (!matches && notTrashed) : (matches && notTrashed);
      });
      return filtered;
    }

    filtered = filtered.filter((a: any) => !isTrashed(a.status));
    return filtered;
  }, [applicants, columnFilters, isSuperAdmin, effectiveOnlyStatus, effectiveOnlyJobPositions, selectedCompanyIds, jobPositionMap, normalizeStatus, isTrashed, excludeColumns, canViewTrashed]);

  // Check if duplicates only filter is enabled
  const duplicatesOnlyEnabled = useMemo(
    () =>
      Array.isArray(customFilters) &&
      customFilters.some(
        (f: any) => f?.fieldId === '__duplicates_only' && f?.value === true
      ),
    [customFilters]
  );

  // Apply custom filters and duplicates logic
  const filteredApplicants = useMemo(() => {
    
    // First apply custom filters
    let processed = applyCustomFilters(displayedApplicants, customFilters, {
      jobPositionMap,
      fieldToJobIds: fieldToJobIds instanceof Map ? fieldToJobIds : new Map(),
      currentUserId,
    });


    if (!duplicatesOnlyEnabled) {
      return processed;
    }

    const sortedByDuplicatePriority = sortApplicantsByDuplicatePriority(
      processed as any[],
      currentUserId,
      (a, b) => {
        const nameA = String(a?.fullName || a?.email || '').toLowerCase();
        const nameB = String(b?.fullName || b?.email || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        const idA = String(a?._id || a?.id || '');
        const idB = String(b?._id || b?.id || '');
        return idA.localeCompare(idB);
      },
      { getCompanyId: (applicant: any) => getApplicantCompanyId(applicant, jobPositionMap) }
    );

    return sortedByDuplicatePriority;
  }, [displayedApplicants, customFilters, duplicatesOnlyEnabled, currentUserId, jobPositionMap, fieldToJobIds]);

  // Get status filter options
 const statusFilterOptions = useMemo(() => {
  // Collect original casing from actual data
  const uniqueStatuses = Array.from(
    new Map(
      applicants
        .map((a: any) => a?.status)
        .filter(Boolean)
        .map((s: string) => [s.trim().toLowerCase(), s.trim()] as [string, string])
    ).values()
  );

  const defaultOrderKeys = ['pending', 'approved', 'interview', 'interviewed', 'rejected', 'trashed'];
  const inDefault = uniqueStatuses.filter(s => defaultOrderKeys.includes(s.toLowerCase()));
  const outDefault = uniqueStatuses.filter(s => !defaultOrderKeys.includes(s.toLowerCase()));

  // Sort default ones by their defined order, then append the rest alphabetically
  const sorted = [
    ...defaultOrderKeys
      .map(key => inDefault.find(s => s.toLowerCase() === key))
      .filter(Boolean) as string[],
    ...outDefault.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
  ];

  return sorted.map((status) => ({
    id: status,  // ← original casing, matches applicant.status exactly
    title: status.charAt(0).toUpperCase() + status.slice(1),
  }));
}, [applicants, isSuperAdmin, canViewTrashed]);

  // Get status color function
  const getStatusColor = useCallback((status: string) => {
    if (!status) return { bg: '#F3F4F6', color: '#1F2937' };
    
    const defaultColors: Record<string, { bg: string; color: string }> = {
      pending: { bg: '#FEF3C7', color: '#92400E' },
      approved: { bg: '#D1FAE5', color: '#065F46' },
      interview: { bg: '#DBEAFE', color: '#1E40AF' },
      interviewed: { bg: '#E0E7FF', color: '#3730A3' },
      rejected: { bg: '#FEE2E2', color: '#991B1B' },
      trashed: { bg: '#F3F4F6', color: '#6B7280' },
      hired: { bg: '#D1FAE5', color: '#065F46' },
      'on-hold': { bg: '#FEF3C7', color: '#92400E' },
      withdrawn: { bg: '#F3F4F6', color: '#4B5563' },
    };
    
    const normalized = status.toLowerCase();
    return defaultColors[normalized] || { bg: '#F3F4F6', color: '#1F2937' };
  }, []);

  // Get status description
  const getDescription = useCallback((status: string) => {
    const descriptions: Record<string, string> = {
      pending: 'Application is pending review',
      approved: 'Application has been approved',
      interview: 'Candidate invited for interview',
      interviewed: 'Interview has been conducted',
      rejected: 'Application has been rejected',
      trashed: 'Application has been archived',
      hired: 'Candidate has been hired',
      'on-hold': 'Application is on hold',
      withdrawn: 'Application has been withdrawn',
    };
    return descriptions[status?.toLowerCase()] || '';
  }, []);

  return {
    filteredApplicants,
    duplicatesOnlyEnabled,
    displayedApplicants,  // IMPORTANT: Return this!
    statusFilterOptions,
    getStatusColor,
    getDescription,
    selectedCompanyFilter: selectedCompanyIds,
  };
}