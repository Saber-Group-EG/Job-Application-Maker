import { useCallback, useMemo } from 'react';
import { Tooltip } from '@mui/material';
import type { MRT_Header } from 'material-react-table';

interface Option {
  label: string;
  value: string;
  subtitle?: string;
}

interface ExcludableMultiSelectFilterProps {
  header: MRT_Header<any>;
  options: Option[];
  isExclude: boolean;
  onToggleExclude: () => void;
  isArrayColumn?: boolean;
  countsMap?: Map<string, number>;
  title?: string;
  isDarkMode?: boolean;
}

export const ExcludableMultiSelectFilter = ({
  header,
  options,
  isExclude,
  onToggleExclude,
  isArrayColumn = false,
  countsMap,
  title,
  isDarkMode = false,
}: ExcludableMultiSelectFilterProps) => {
  const bc = (light: string, dark: string) => isDarkMode ? dark : light;
  const currentValue = (header.column.getFilterValue() as string[]) ?? [];
  const facetedMap = countsMap ?? header.column.getFacetedUniqueValues();

  const getCount = useCallback(
    (optionValue: string): number => {
      if (!countsMap) {
        if (!isArrayColumn) {
          return facetedMap.get(optionValue) ?? 0;
        }
        let total = 0;
        facetedMap.forEach((count, key) => {
          const keyStr = String(key);
          if (
            keyStr === optionValue ||
            keyStr
              .split(',')
              .map((s) => s.trim())
              .includes(optionValue)
          ) {
            total += count;
          }
        });
        return total;
      }
      return facetedMap.get(optionValue) ?? 0;
    },
    [facetedMap, isArrayColumn, countsMap]
  );

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  );



  const toggleOption = useCallback(
    (value: string) => {
      const next = currentValue.includes(value)
        ? currentValue.filter((v) => v !== value)
        : [...currentValue, value];
      header.column.setFilterValue(next.length ? next : undefined);
    },
    [currentValue, header.column]
  );

  const clearAll = () => header.column.setFilterValue(undefined);

  const handleToggleExclude = useCallback(() => {
    onToggleExclude();
    if (currentValue.length > 0) {
      header.column.setFilterValue([...currentValue]);
    }
  }, [onToggleExclude, currentValue, header.column]);

  const activeCount = currentValue.length;
  const accentColor = isExclude ? '#f43f5e' : '#10b981';
  const accentBg = isExclude ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)';

  return (
    <div style={{ minWidth: 220, maxWidth: 300 }}>
      {/* ── Title ── */}
      {title && (
        <div
          style={{
            padding: '10px 12px 4px',
            fontWeight: 600,
            fontSize: 13,
            color: 'inherit',
          }}
        >
          {title}
        </div>
      )}

      {/* ── Header: mode toggle ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: title ? '4px 12px 8px' : '8px 12px 8px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            opacity: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Filter mode
        </span>

        <Tooltip
          title={
            isExclude
              ? 'Exclude — matching rows are hidden. Click to switch to Include.'
              : 'Include — only matching rows are shown. Click to switch to Exclude.'
          }
          placement="top"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExclude();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px 3px 6px',
              borderRadius: 20,
              border: `1.5px solid ${accentColor}`,
              background: accentBg,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.04em',
              transition: 'all 0.18s ease',
              outline: 'none',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: accentColor,
                display: 'inline-block',
                transition: 'background 0.18s',
              }}
            />
            {isExclude ? 'EXCLUDE' : 'INCLUDE'}
          </button>
        </Tooltip>
      </div>

      {/* ── Options list ── */}
      <div
        style={{
          overflowY: 'auto',
          maxHeight: 260,
          padding: '5px 4px 6px 10px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.12) transparent',
        }}
      >
        {sortedOptions.length === 0 ? (
          <div
            style={{
              padding: '10px 12px',
              fontSize: 12,
              opacity: 0.4,
              fontStyle: 'italic',
            }}
          >
            No options available
          </div>
        ) : (
          sortedOptions.map((opt) => {
            const selected = currentValue.includes(opt.value);
            const count = getCount(opt.value);

            return (
              <button
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '6px 10px',
                  background: selected ? accentBg : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'inherit',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!selected)
                    (e.currentTarget as HTMLElement).style.background =
                      'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!selected)
                    (e.currentTarget as HTMLElement).style.background =
                      'transparent';
                }}
              >
                {/* Label + subtitle */}
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    color: selected ? accentColor : 'inherit',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: selected ? 500 : 400,
                      transition: 'color 0.1s',
                    }}
                  >
                    {opt.label}
                  </span>
                  {opt.subtitle && (
                    <span
                      style={{
                        fontSize: 10,
                        opacity: 0.45,
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.subtitle}
                    </span>
                  )}
                </span>

                {/* Checkbox */}
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 4,
                    border: `1.5px solid ${
                      selected ? accentColor : 'rgba(0,0,0,0.2)'
                    }`,
                    background: selected ? accentColor : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.12s',
                  }}
                >
                  {selected && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>

                {/* Row count badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: selected ? accentColor : 'rgba(0,0,0,0.35)',
                    background: selected ? accentBg : 'rgba(0,0,0,0.05)',
                    borderRadius: 10,
                    padding: '1px 6px',
                    minWidth: 20,
                    textAlign: 'center',
                    flexShrink: 0,
                    lineHeight: 1.7,
                    transition: 'color 0.1s, background 0.1s',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ── Footer: count + clear ── */}
      {activeCount > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(0,0,0,0.07)',
            padding: '8px 12px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11,
              opacity: 0.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {activeCount} of {options.length} selected
          </span>
          <button
            onClick={clearAll}
            style={{
              fontSize: 11,
              color: '#f43f5e',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 600,
              letterSpacing: '0.02em',
              opacity: 0.8,
              transition: 'opacity 0.1s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = '1')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = '0.8')
            }
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
