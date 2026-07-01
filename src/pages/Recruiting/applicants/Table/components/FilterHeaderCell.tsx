import { useRef, useState } from 'react';
import React from 'react';
import { Popover } from '@mui/material';
import { ExcludableMultiSelectFilter } from './ExcludableMultiSelectFilter';
import { toggleExcludeColumn } from '../utils/filterHelpers';

interface FilterHeaderCellProps {
  header: any;
  table: any;
  label: string;
  colId: string;
  options: { label: string; value: string; companyId?: string; subtitle?: string }[];
  isArrayColumn?: boolean;
  countsMap?: Map<string, number>;
  dependentColumnId?: string;
  selectedCompanyFilterValue?: string[] | string | null;
  filterValue?: any;
  excludeColumns: string[];
  saveLayout: (layout: { excludeColumns: string[] }) => void;
  isDarkMode: boolean;
}

const FilterHeaderCellComponent = ({
  header,
  table,
  label,
  colId,
  options,
  isArrayColumn = false,
  countsMap,
  dependentColumnId,
  selectedCompanyFilterValue: _selectedCompanyFilterValue,
  filterValue: _filterValue,
  excludeColumns,
  saveLayout,
  isDarkMode,
}: FilterHeaderCellProps) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const currentFilter = (header.column.getFilterValue() as string[]) ?? [];
  const activeCount = currentFilter.length;
  const isExclude = (excludeColumns ?? []).includes(colId);
  const liveDepFilter = dependentColumnId
    ? table?.getColumn(dependentColumnId)?.getFilterValue()
    : undefined;
  const depFilter = liveDepFilter ?? _selectedCompanyFilterValue;
  const depIsExclude = dependentColumnId && (excludeColumns ?? []).includes(dependentColumnId);
  const selectedDepFilter =
    depFilter && (Array.isArray(depFilter) ? depFilter.length > 0 : true)
      ? Array.isArray(depFilter)
        ? depFilter
        : [depFilter]
      : null;
  const doHideSubtitle =
    dependentColumnId && selectedDepFilter && selectedDepFilter.length === 1 && !depIsExclude;
  const displayOptions = (dependentColumnId && selectedDepFilter && selectedDepFilter.length > 0 && !depIsExclude
    ? options.filter((opt) => {
        const matches = selectedDepFilter.includes(opt.companyId ?? '');
        return matches;
      })
    : options
  ).map((opt) => (doHideSubtitle ? { ...opt, subtitle: undefined } : opt));

  const handleFilterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorEl(headerRef.current);
  };

  return (
    <div
      ref={headerRef}
      onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          paddingInlineEnd: 12,
        }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: 'inherit',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: '1 1 auto',
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={handleFilterClick}
        title="Filter"
        style={{
          position: 'absolute',
          insetInlineEnd: -3,
          top: '50%',
          transform: 'translateY(-50%)',
          background: activeCount > 0 ? (isExclude ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)') : 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '1px 1px',
          borderRadius: 1,
          fontSize: 'inherit',
          fontFamily: 'inherit',
          outline: 'none',
          color: activeCount > 0 ? (isExclude ? '#f43f5e' : '#10b981') : '#667085',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeCount > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            background: isExclude ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
            borderRadius: 8,
            padding: '0px 5px',
            lineHeight: '16px',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            backgroundColor: isDarkMode ? '#1f2937' : undefined,
            color: isDarkMode ? '#e5e7eb' : undefined,
          },
        }}
      >
        <ExcludableMultiSelectFilter
          header={header}
          options={displayOptions}
          isExclude={isExclude}
          onToggleExclude={() =>
            saveLayout({
              excludeColumns: toggleExcludeColumn(
                excludeColumns ?? [],
                colId
              ),
            })
          }
          isArrayColumn={isArrayColumn}
          countsMap={countsMap}
          title={label}
          isDarkMode={isDarkMode}
        />
      </Popover>
    </div>
  );
};

export const FilterHeaderCell = React.memo(FilterHeaderCellComponent);
