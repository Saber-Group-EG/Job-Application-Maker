// components/ApplicantsTable.tsx
import { useMemo, useEffect, useState } from 'react';
import {
  MaterialReactTable,
  MRT_SelectCheckbox,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_ColumnFiltersState,
} from 'material-react-table';
import { ThemeProvider, createTheme } from '@mui/material';

interface ApplicantsTableProps {
  // Data
  data: any[];
  isLoading: boolean;
  
  // Column configurations
  columns: MRT_ColumnDef<any>[];
  
  // State
  sorting: Array<{ id: string; desc: boolean }>;
  setSorting: React.Dispatch<React.SetStateAction<Array<{ id: string; desc: boolean }>>>;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>;
  columnFilters: MRT_ColumnFiltersState;
  setColumnFilters: React.Dispatch<React.SetStateAction<MRT_ColumnFiltersState>>;
  rowSelection: MRT_RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<MRT_RowSelectionState>>;
  
  // Layout
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  onColumnVisibilityChange: (updater: any) => void;
  onColumnSizingChange: (updater: any) => void;
  onColumnOrderChange: (updater: any) => void;
  
  // Options
  selectColumnWidth: number;
  tableMinWidth: number;
  isLaptopViewport: boolean;
  duplicatesOnlyEnabled?: boolean;
  
  // Custom renderers
  renderTopToolbarCustomActions?: () => React.ReactNode;
}

export function ApplicantsTable({
  data,
  isLoading,
  columns,
  sorting,
  setSorting,
  pagination,
  setPagination,
  columnFilters,
  setColumnFilters,
  rowSelection,
  setRowSelection,
  columnVisibility,
  columnOrder,
  onColumnVisibilityChange,
  onColumnSizingChange,
  onColumnOrderChange,
  selectColumnWidth,
  duplicatesOnlyEnabled = false,
  renderTopToolbarCustomActions,
}: ApplicantsTableProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
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

  // Create skeleton data for loading state
  const skeletonData = useMemo(
    () =>
      Array.from({ length: pagination.pageSize || 10 }).map(
        (_: any, i: number) => ({ _id: `skeleton-${i}`, _skeleton: true })
      ),
    [pagination.pageSize]
  );

  const tableData = isLoading ? skeletonData : data;

  // MUI Theme for the table
  const muiTheme = useMemo(
    () =>
      createTheme({
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
    [isDarkMode]
  );

  // Create the table instance
  const table = useMaterialReactTable({
    columns,
    enableSorting: !duplicatesOnlyEnabled,
    data: tableData,
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
          },
        },
        muiTableBodyCellProps: {
          align: 'center',
          sx: {
            padding: 0,
            width: `${selectColumnWidth}px`,
            minWidth: `${selectColumnWidth}px`,
            maxWidth: `${selectColumnWidth}px`,
          },
        },
        Cell: ({ row, table }: any) => {
          if (isLoading) return null;
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
    enableRowSelection: !isLoading,
    enablePagination: true,
    enableBatchRowSelection: false,
    enableBottomToolbar: true,
    enableTopToolbar: true,
    enableColumnFilters: true,
    enableFilters: true,
    enableHiding: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableColumnActions: false,
    enableColumnResizing: true,
    layoutMode: 'grid',
    manualPagination: false,
    manualFiltering: false,
    manualSorting: false,
    rowCount: isLoading ? skeletonData.length : data.length,
    initialState: {
      pagination,
      columnFilters,
      columnVisibility,
      density: 'compact',
      columnOrder: columnOrder.length
        ? columnOrder
        : Array.from(
            new Set(
              ['mrt-row-select', ...columns.map((c) => (c as any).id ?? (c as any).accessorKey).filter(Boolean)]
            )
          ),
    },
    state: {
      sorting,
      pagination,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange,
    onColumnSizingChange,
    onColumnOrderChange,
    muiTablePaperProps: {
      elevation: 0,
    },

    muiTableBodyCellProps: () => ({
      sx: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: '#282828',
      },
    }),
    muiTableHeadCellProps: ({ column }) => ({
      sx: {
        height: '50px',
        fontWeight: 'bold',
        '& .MuiTableSortLabel-icon': { display: 'none' },
        '& .MuiBadge-root': { display: 'none' },
        '& .Mui-TableHeadCell-Content': {
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        '& .Mui-TableHeadCell-Content-Labels': {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        },
        '& .Mui-TableHeadCell-Content-Actions': {
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        },
      },
      onMouseDown: (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const currentCell = e.currentTarget as HTMLElement;
        const onMouseUp = (upEvent: MouseEvent) => {
          const dx = Math.abs(upEvent.clientX - startX);
          const dy = Math.abs(upEvent.clientY - startY);
          if (
            dx < 5 &&
            dy < 5 &&
            currentCell.contains(upEvent.target as Node)
          ) {
            column.toggleSorting();
          }
          document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mouseup', onMouseUp);
      },
    }),
    muiTableBodyRowProps: ({ row, table }) => ({
      sx: {
        backgroundColor:
          table.getRowModel().rows.indexOf(row) % 2 === 0
            ? 'rgba(240, 240, 240, 1)'
            : 'white',
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
    renderTopToolbarCustomActions: renderTopToolbarCustomActions,
    getRowId: (row) => row._id,
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <MaterialReactTable table={table} />
      </div>
    </ThemeProvider>
  );
}

export default ApplicantsTable;