// hooks/useApplicantFilters.ts
import { useMemo, useCallback } from 'react';
import { sortApplicantsByDuplicatePriority, buildApplicantDuplicateLookup } from '../../../../../utils/applicantDuplicateSort';
import { applyCustomFilters, getApplicantCompanyId } from '../utils/filterHelpers';
import { normalizeGender } from '../utils/filterHelpers';

interface UseApplicantFiltersProps {
  applicants: any[];
  columnFilters: any[];
  customFilters: any[];
  isSuperAdmin: boolean;
  effectiveOnlyStatus?: string | string[];
  selectedCompanyFilterValue?: string[] | string | null;
  jobPositionMap: Record<string, any>;
  fieldToJobIds: Map<string, Set<string>> | Record<string, Set<string>>;
  currentUserId: string;
  allCompaniesRaw: any[];
}

export function useApplicantFilters({
  applicants,
  columnFilters,
  customFilters,
  isSuperAdmin,
  effectiveOnlyStatus,
  selectedCompanyFilterValue,
  jobPositionMap,
  fieldToJobIds,
  currentUserId,
}: UseApplicantFiltersProps) {
  const normalizeStatus = useCallback((value: unknown) => {
    return String(value ?? '').trim().toLowerCase();
  }, []);

  const isTrashed = useCallback((status: string) => {
    return normalizeStatus(status) === 'trashed';
  }, [normalizeStatus]);

  // Helper function to apply column filters
  const applyColumnFilters = useCallback((data: any[]) => {
    let filtered = [...data];
    
   const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
const companyFilterValue = companyFilter?.value;
const companyExcludeMode = companyFilter?.excludeMode || false;


let companyIds: string[] | null = null;
if (companyFilterValue) {
  companyIds = Array.isArray(companyFilterValue) ? companyFilterValue : [companyFilterValue];
} else if (selectedCompanyFilterValue) {
  if (Array.isArray(selectedCompanyFilterValue)) {
    companyIds = selectedCompanyFilterValue;
  } else if (typeof selectedCompanyFilterValue === 'string') {
    companyIds = [selectedCompanyFilterValue];
  }
}

if (companyIds && companyIds.length > 0) {
  filtered = filtered.filter((applicant: any) => {
    const applicantCompanyId = getApplicantCompanyId(applicant, jobPositionMap);
    const matches = applicantCompanyId && companyIds?.includes(applicantCompanyId);
    const shouldInclude = companyExcludeMode ? !matches : matches;
    
    if (!shouldInclude) {
    }
    return shouldInclude;
  });
}
    
    // Apply job position filter with exclude mode support
    const jobFilter = columnFilters.find((f: any) => f.id === 'jobPositionId');
    const jobFilterValue = jobFilter?.value;
    const jobExcludeMode = jobFilter?.excludeMode || false;

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
    const genderExcludeMode = genderFilter?.excludeMode || false;
    
    if (genderFilterValue && (Array.isArray(genderFilterValue) ? genderFilterValue.length > 0 : true)) {
      const selectedGenders = Array.isArray(genderFilterValue) ? genderFilterValue : [genderFilterValue];
      filtered = filtered.filter((applicant: any) => {
        const rawGender = applicant?.gender || applicant?.customResponses?.gender || applicant?.customResponses?.['النوع'] || (applicant as any)['النوع'] || '';
        const normalizedGenderValue = normalizeGender(rawGender);
        const matches = selectedGenders.includes(normalizedGenderValue);
        return genderExcludeMode ? !matches : matches;
      });
    }
    
    // Apply status filter (from props or URL params)
    if (effectiveOnlyStatus !== undefined && effectiveOnlyStatus !== null) {
      const allowed = (Array.isArray(effectiveOnlyStatus) ? effectiveOnlyStatus : [effectiveOnlyStatus])
        .map(normalizeStatus)
        .filter(Boolean);
      filtered = filtered.filter((a: any) => allowed.includes(normalizeStatus(a.status)));
      // Also exclude trashed in revert mode
      if (Array.isArray(effectiveOnlyStatus) ? effectiveOnlyStatus.includes('trashed') : effectiveOnlyStatus === 'trashed') {
        // If showing trashed, don't filter them out
      } else {
        filtered = filtered.filter((a: any) => !isTrashed(a.status));
      }
      return filtered;
    }
    
    // Apply status column filter with exclude mode support
    const statusFilter = columnFilters.find((f: any) => f.id === 'status');
    const statusVal = statusFilter?.value;
    const statusExcludeMode = statusFilter?.excludeMode || false;

    if (isSuperAdmin) {
      if (normalizeStatus(statusVal) === 'trashed') return filtered;
      if (Array.isArray(statusVal) && statusVal.length > 0) {
        const allowed = statusVal.map(normalizeStatus).filter(Boolean);
        filtered = filtered.filter((a: any) => {
          const matches = allowed.includes(normalizeStatus(a.status));
          // In revert mode, exclude trashed status
          if (statusExcludeMode && isTrashed(a.status)) {
            return false;
          }
          return statusExcludeMode ? !matches : matches;
        });
        return filtered;
      }
      // When no status selected, exclude trashed in both modes
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
        // In revert mode, exclude trashed status
        if (statusExcludeMode && isTrashed(a.status)) {
          return false;
        }
        return statusExcludeMode ? (!matches && notTrashed) : (matches && notTrashed);
      });
      return filtered;
    }

    // Default: always exclude trashed
    filtered = filtered.filter((a: any) => !isTrashed(a.status));
    return filtered;
  }, [columnFilters, isSuperAdmin, effectiveOnlyStatus, selectedCompanyFilterValue, jobPositionMap, normalizeStatus, isTrashed]);

  // Get filtered data based on column filters
  const columnFilteredApplicants = useMemo(() => {
    return applyColumnFilters(applicants);
  }, [applicants, applyColumnFilters]);

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
    // First apply custom filters to column-filtered data
    let processed = applyCustomFilters(columnFilteredApplicants, customFilters, {
      jobPositionMap,
      fieldToJobIds: fieldToJobIds instanceof Map ? fieldToJobIds : new Map(),
      currentUserId,
    });

    if (!duplicatesOnlyEnabled) {
      return processed;
    }

    // If duplicates only is enabled, further filter to show only duplicates
    const lookup = buildApplicantDuplicateLookup(
      processed as any[],
      currentUserId,
      { getCompanyId: (applicant: any) => getApplicantCompanyId(applicant, jobPositionMap) }
    );

    const duplicatesOnly = processed.filter((applicant: any) => {
      const id = String(applicant?._id || applicant?.id || '');
      const meta = lookup.get(id);
      return meta?.isDuplicate === true;
    });

    return sortApplicantsByDuplicatePriority(
      duplicatesOnly as any[],
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
  }, [columnFilteredApplicants, customFilters, duplicatesOnlyEnabled, currentUserId, jobPositionMap, fieldToJobIds]);

  // Get status filter options
  const statusFilterOptions = useMemo(() => {
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

    const sorted = [
      ...defaultOrderKeys
        .map(key => inDefault.find(s => s.toLowerCase() === key))
        .filter(Boolean) as string[],
      ...outDefault.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    ];

    return sorted.map((status) => ({
      id: status,
      title: status.charAt(0).toUpperCase() + status.slice(1),
    }));
  }, [applicants]);

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

  // Get the current company IDs from the filter
  const currentCompanyIds = useMemo(() => {
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
    return Array.isArray(companyFilter.value) ? companyFilter.value : [companyFilter.value];
  }, [selectedCompanyFilterValue, columnFilters]);

  return {
    filteredApplicants,
    duplicatesOnlyEnabled,
    columnFilteredApplicants,
    statusFilterOptions,
    getStatusColor,
    getDescription,
    selectedCompanyFilter: currentCompanyIds,
  };
}