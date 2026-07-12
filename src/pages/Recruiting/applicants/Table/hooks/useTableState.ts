// hooks/useTableState.ts
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { MRT_ColumnFiltersState, MRT_RowSelectionState } from 'material-react-table';

export function useTableState({
  onlyStatus,
  onlyJobPositions,
  showCompanyColumn,
  persistedState,
}: {
  onlyStatus?: string | string[];
  onlyJobPositions?: string[];
  showCompanyColumn: boolean;
  jobPositionMap?: Record<string, any>;
  persistedState?: any;
}): any {
  const location = useLocation();
  
  // ALL HOOKS MUST BE DECLARED AT THE TOP - NO CONDITIONS
  const navState = (location.state as any);
  const isReturningFromDetails = navState?.returnToApplicants === true;
  const hasInitializedFromNav = useRef(false);
  
  const hasPageStatusFilter = onlyStatus !== undefined && !(Array.isArray(onlyStatus) && onlyStatus.length === 0);
  const hasPageJobFilter = onlyJobPositions !== undefined && onlyJobPositions.length > 0;
  const pageFilterIds = [
    ...(hasPageStatusFilter ? ['status'] : []),
    ...(hasPageJobFilter ? ['jobPositionId'] : []),
  ];
  
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(() => {
    if (isReturningFromDetails && navState?.columnFilters && !hasInitializedFromNav.current) {
      hasInitializedFromNav.current = true;
      if (pageFilterIds.length > 0) {
        const filterSet = new Set(pageFilterIds);
        return navState.columnFilters.filter((f: any) => !filterSet.has(f.id));
      }
      return navState.columnFilters;
    }
    if (persistedState?.columnFilters && Array.isArray(persistedState.columnFilters)) {
      if (pageFilterIds.length > 0) {
        const filterSet = new Set(pageFilterIds);
        return persistedState.columnFilters.filter((f: any) => !filterSet.has(f.id));
      }
      return persistedState.columnFilters;
    }
    return [];
  });
  
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(() => {
    if (isReturningFromDetails && navState?.sorting) return navState.sorting;
    if (persistedState?.sorting) return persistedState.sorting;
    return [{ id: 'submittedAt', desc: true }];
  });
  
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>(() => {
    if (isReturningFromDetails && navState?.pagination) return navState.pagination;
    if (persistedState?.pagination) return persistedState.pagination;
    return { pageIndex: 0, pageSize: 10 };
  });
  
  const [customFilters, setCustomFilters] = useState<Array<any>>(() => {
    if (isReturningFromDetails && navState?.customFilters) return navState.customFilters;
    if (persistedState?.customFilters) return persistedState.customFilters;
    return [];
  });
  
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const selectedApplicantIds = useMemo(() => Object.keys(rowSelection), [rowSelection]);
  
  const effectiveColumnFilters = useMemo(() => {
    if (!showCompanyColumn && Array.isArray(columnFilters)) {
      return columnFilters.filter((f: any) => f?.id !== 'companyId');
    }
    return columnFilters;
  }, [columnFilters, showCompanyColumn]);
  
  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem('applicants_table_state');
      sessionStorage.removeItem('applicants_table_state');
    } catch (e) {}
  }, []);
  
  const resetToDefault = useCallback(() => {
    setRowSelection({});
    setColumnFilters([]);
    setSorting([{ id: 'submittedAt', desc: true }]);
    setPagination({ pageIndex: 0, pageSize: 10 });
    setCustomFilters([]);
    clearPersistedState();
  }, [clearPersistedState]);
  
  // Persist state effect
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  useEffect(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = setTimeout(() => {
      try {
        const toSave = {
          pagination,
          sorting,
          columnFilters: effectiveColumnFilters,
          customFilters,
        };
        sessionStorage.setItem('applicants_table_state', JSON.stringify(toSave));
        localStorage.setItem('applicants_table_state', JSON.stringify(toSave));
      } catch (e) {}
    }, 500);
    
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [pagination, sorting, columnFilters, customFilters, effectiveColumnFilters]);
  
  // Reset pagination when filters change
  const prevFiltersKeyRef = useRef<string | null>(null);
  
  useEffect(() => {
    const serialize = (filters: unknown): unknown => {
      if (!Array.isArray(filters)) return [];
      return filters.map((f) => {
        const item = f as { id?: unknown; value?: unknown } | null;
        return { id: item?.id, value: item?.value };
      });
    };
    const key = JSON.stringify({
      columnFilters: serialize(columnFilters),
      customFilters: serialize(customFilters),
    });
    if (prevFiltersKeyRef.current === null) {
      prevFiltersKeyRef.current = key;
      return;
    }
    if (prevFiltersKeyRef.current === key) return;
    prevFiltersKeyRef.current = key;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columnFilters, customFilters]);
  
  return {
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
    initialColumnFilters: effectiveColumnFilters,
    selectedApplicantIds,
    clearPersistedState,
    resetToDefault,
  };
}

export default useTableState;