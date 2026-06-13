// hooks/useApplicantFilters.ts
import { useMemo, useCallback } from 'react';
import { sortApplicantsByDuplicatePriority, buildApplicantDuplicateLookup } from '../../../../../utils/applicantDuplicateSort';
import { applyCustomFilters, getApplicantCompanyId } from '../utils/filterHelpers';
import { normalizeGender } from '../utils/filterHelpers'; // ✅ Add this import

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

  // Helper function to apply column filters
  const applyColumnFilters = useCallback((data: any[]) => {
    let filtered = [...data];
    
    // Apply company filter
    let companyIds: string[] | null = null;
    if (selectedCompanyFilterValue) {
      if (Array.isArray(selectedCompanyFilterValue)) {
        companyIds = selectedCompanyFilterValue;
      } else if (typeof selectedCompanyFilterValue === 'string') {
        companyIds = [selectedCompanyFilterValue];
      }
    } else {
      const companyFilter = columnFilters.find((f: any) => f.id === 'companyId');
      if (companyFilter?.value) {
        companyIds = Array.isArray(companyFilter.value) ? companyFilter.value : [companyFilter.value];
      }
    }
    
    if (companyIds && companyIds.length > 0) {
      filtered = filtered.filter((applicant: any) => {
        const applicantCompanyId = getApplicantCompanyId(applicant, jobPositionMap);
        return applicantCompanyId && companyIds?.includes(applicantCompanyId);
      });
    }
    
    // Apply job position filter
    const jobFilter = columnFilters.find((f: any) => f.id === 'jobPositionId');
    const jobFilterValue = jobFilter?.value;

    console.log('🔍 Job Filter Debug:');
console.log('  - jobFilterValue:', jobFilterValue);
console.log('  - Before job filter, count:', filtered.length);
    
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
        return selectedJobIds.includes(applicantJobId);
      });
    }
    
    // Apply gender filter
    const genderFilter = columnFilters.find((f: any) => f.id === 'gender');
    const genderFilterValue = genderFilter?.value;
    
    if (genderFilterValue && (Array.isArray(genderFilterValue) ? genderFilterValue.length > 0 : true)) {
      const selectedGenders = Array.isArray(genderFilterValue) ? genderFilterValue : [genderFilterValue];
      filtered = filtered.filter((applicant: any) => {
        const rawGender = applicant?.gender || applicant?.customResponses?.gender || applicant?.customResponses?.['النوع'] || (applicant as any)['النوع'] || '';
        const normalizedGenderValue = normalizeGender(rawGender); // ✅ Fixed variable name
        return selectedGenders.includes(normalizedGenderValue);
      });
    }
    
    // Apply status filter (from props or URL params)
    if (effectiveOnlyStatus !== undefined && effectiveOnlyStatus !== null) {
      const allowed = (Array.isArray(effectiveOnlyStatus) ? effectiveOnlyStatus : [effectiveOnlyStatus])
        .map(normalizeStatus)
        .filter(Boolean);
      filtered = filtered.filter((a: any) => allowed.includes(normalizeStatus(a.status)));
      return filtered;
    }
    
    // Apply status column filter
    const statusFilter = columnFilters.find((f: any) => f.id === 'status');
    const statusVal = statusFilter?.value;

    if (isSuperAdmin) {
      if (normalizeStatus(statusVal) === 'trashed') return filtered;
      if (Array.isArray(statusVal) && statusVal.length > 0) {
        const allowed = statusVal.map(normalizeStatus).filter(Boolean);
        filtered = filtered.filter((a: any) => allowed.includes(normalizeStatus(a.status)));
        return filtered;
      }
      filtered = filtered.filter((a: any) => normalizeStatus(a.status) !== 'trashed');
      return filtered;
    }

    if (Array.isArray(statusVal) && statusVal.length > 0) {
      const allowed = statusVal.map(normalizeStatus).filter((s: string) => s !== 'trashed');
      if (allowed.length === 0) {
        filtered = filtered.filter((a: any) => normalizeStatus(a.status) !== 'trashed');
        return filtered;
      }
      filtered = filtered.filter(
        (a: any) => allowed.includes(normalizeStatus(a.status)) && normalizeStatus(a.status) !== 'trashed'
      );
      return filtered;
    }

    filtered = filtered.filter((a: any) => normalizeStatus(a.status) !== 'trashed');
    return filtered;
  }, [columnFilters, isSuperAdmin, effectiveOnlyStatus, selectedCompanyFilterValue, jobPositionMap, normalizeStatus]);

  // Get filtered data based on column filters (including submittedAt)
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

  // Fix: Get the current company IDs from the filter
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
    columnFilteredApplicants, // Return this if needed elsewhere
    statusFilterOptions,
    getStatusColor,
    getDescription,
    selectedCompanyFilter: currentCompanyIds, // ✅ Fixed: use currentCompanyIds
  };
}