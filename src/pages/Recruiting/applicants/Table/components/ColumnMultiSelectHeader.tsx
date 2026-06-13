// components/ColumnMultiSelectHeader.tsx
import { useState, useRef } from 'react';
import { Menu, MenuItem, Checkbox, ListItemText, Box, Typography, Divider } from '@mui/material';

export interface ColumnFilterOption {
  id: string;
  title: string;
  companyName?: string;
  applicantCount?: number;
}

export interface ColumnMultiSelectHeaderProps {
  column: any;
  label: string;
  options: ColumnFilterOption[];
  isLaptopViewport: boolean;
  menuWidth?: number;
  menuMaxHeight?: number;
  showSortIndicator?: boolean;
  onSortChange?: (column: any, direction: 'asc' | 'desc') => void;
  onFilterChange?: (columnId: string, value: string[] | undefined, excludeMode?: boolean) => void;
  currentFilterValue?: string[] | string | undefined;
  excludeMode?: boolean;
}

export function ColumnMultiSelectHeader({
  column,
  label,
  options,
  isLaptopViewport,
  menuWidth = 260,
  menuMaxHeight = 400,
  showSortIndicator = true,
  onSortChange,
  onFilterChange,
  currentFilterValue,
  excludeMode = false,
}: ColumnMultiSelectHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isInternalUpdate = useRef(false);
  
  const getSelectedValues = (): string[] => {
    const current = currentFilterValue ?? column.getFilterValue();
    return Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  };
  
  const selectedValues = getSelectedValues();
  const activeFilterCount = selectedValues.length;

  const handleDropdownClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (column.getCanSort()) {
      const currentSort = column.getIsSorted();
      let newDirection: 'asc' | 'desc' | false;
      
      if (currentSort === false) {
        newDirection = 'desc';
      } else if (currentSort === 'desc') {
        newDirection = 'asc';
      } else {
        newDirection = false;
      }
      
      if (newDirection) {
        column.toggleSorting(newDirection === 'desc');
        onSortChange?.(column, newDirection);
      } else {
        column.clearSorting();
      }
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggle = (value: string) => {
    if (isInternalUpdate.current) return;
    
    isInternalUpdate.current = true;
    
    const current = getSelectedValues();
    let newSelected: string[];
    
    if (current.includes(value)) {
      newSelected = current.filter(v => v !== value);
    } else {
      newSelected = [...current, value];
    }
    
    const newValue = newSelected.length > 0 ? newSelected : undefined;
    onFilterChange?.(column.id, newValue, excludeMode);
    
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const clearAll = () => {
    if (isInternalUpdate.current) return;
    
    isInternalUpdate.current = true;
    onFilterChange?.(column.id, undefined, false);
    setAnchorEl(null);
    
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const toggleExcludeMode = () => {
    if (isInternalUpdate.current) return;
    
    isInternalUpdate.current = true;
    const current = getSelectedValues();
    const newExcludeMode = !excludeMode;
    onFilterChange?.(column.id, current.length > 0 ? current : undefined, newExcludeMode);
    setAnchorEl(null);
    
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  };

  const getSortIndicator = () => {
    if (!showSortIndicator) return null;
    if (column.getIsSorted() === 'asc') return ' ▲';
    if (column.getIsSorted() === 'desc') return ' ▼';
    return null;
  };

  const buttonPadding = isLaptopViewport ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  // Determine button text based on mode
  const getRevertButtonText = () => {
    if (excludeMode && activeFilterCount > 0) {
      return "Normal";
    }
    return "Reverted";
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex items-center gap-2"
    >
      <span
        className={`text-sm font-medium cursor-pointer select-none hover:text-brand-500 ${
          column.getIsSorted() ? 'text-brand-600 dark:text-brand-400' : ''
        }`}
        onClick={handleLabelClick}
        title={column.getCanSort() ? `Sort by ${label}` : undefined}
      >
        {label}
        {getSortIndicator()}
        {excludeMode && activeFilterCount > 0 && (
          <span className="ml-1 text-xs text-amber-500">(Reverted)</span>
        )}
      </span>

      <button
        type="button"
        onClick={handleDropdownClick}
        className={`inline-flex items-center gap-1 rounded bg-gray-100 text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 ${buttonPadding} ${
          activeFilterCount > 0 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : ''
        }`}
      >
        {activeFilterCount > 0 && (
          <span className="font-semibold">{activeFilterCount}</span>
        )}
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none">
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={handleMenuClick}
        PaperProps={{
          style: { maxHeight: menuMaxHeight, width: menuWidth },
          onMouseDown: (e: any) => e.stopPropagation(),
          onClick: (e: any) => e.stopPropagation(),
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {/* Clear and Revert buttons side by side */}
        <Box sx={{ display: 'flex', p: 1, gap: 1 }}>
          <MenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              clearAll(); 
            }} 
            dense
            sx={{ 
              color: 'error.main',
              flex: 1,
              justifyContent: 'center',
              borderRadius: 1,
            }}
          >
            <ListItemText primary="Clear" primaryTypographyProps={{ sx: { color: 'error.main', textAlign: 'center' } }} />
          </MenuItem>
          
          <MenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              toggleExcludeMode(); 
            }} 
            dense
            disabled={activeFilterCount === 0}
            sx={{ 
              flex: 1,
              justifyContent: 'center',
              borderRadius: 1,
              backgroundColor: excludeMode && activeFilterCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            }}
          >
            <ListItemText 
              primary={getRevertButtonText()}
              primaryTypographyProps={{ 
                textAlign: 'center',
                fontWeight: excludeMode && activeFilterCount > 0 ? 600 : 400,
                color: excludeMode && activeFilterCount > 0 ? '#f59e0b' : 'inherit',
              }}
            />
          </MenuItem>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Filter options */}
        {options.map((option) => (
          <MenuItem
            key={option.id}
            dense
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(option.id);
            }}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Checkbox checked={selectedValues.includes(option.id)} size="small" />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" component="span">
                  {typeof option.title === 'string' ? option.title : String(option.title || '')}
                </Typography>
                {option.companyName && (
                  <Typography 
                    variant="caption" 
                    component="span" 
                    sx={{ 
                      fontSize: '0.65rem', 
                      color: 'text.secondary',
                      display: 'block',
                    }}
                  >
                    {typeof option.companyName === 'string' ? option.companyName : String(option.companyName || '')}
                  </Typography>
                )}
              </Box>
            </Box>
            {option.applicantCount !== undefined && (
              <Typography 
                variant="caption" 
                component="span" 
                title="Number of active applicants (excluding trashed)"
                sx={{ 
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  backgroundColor: 'action.hover',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  minWidth: '40px',
                  textAlign: 'center',
                  cursor: 'help',
                }}
              >
                {option.applicantCount}
              </Typography>
            )}
          </MenuItem>
        ))}
        
        {options.length === 0 && (
          <MenuItem disabled dense>
            <ListItemText primary="No options available" />
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

export default ColumnMultiSelectHeader;