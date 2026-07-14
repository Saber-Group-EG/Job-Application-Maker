import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TableLayout } from '../../types/auth';
import axiosInstance from '../../config/axios';

const EMPTY_LAYOUT: TableLayout = {
  columnVisibility: {},
  columnSizing: {},
  columnOrder: [],
};

function mergeColumnOrder(
  savedOrder: string[] | undefined,
  defaultOrder: string[]
): string[] {
  if (!savedOrder || savedOrder.length === 0) return defaultOrder;
  const savedSet = new Set(savedOrder);
  const result = [...savedOrder];
  for (let i = 0; i < defaultOrder.length; i++) {
    const col = defaultOrder[i];
    if (savedSet.has(col)) continue;
    if (i === 0) {
      result.unshift(col);
    } else {
      const prevCol = defaultOrder[i - 1];
      const prevIndex = result.indexOf(prevCol);
      result.splice(prevIndex + 1, 0, col);
    }
  }
  return result;
}

export const useTableLayout = (
  tableKey: string,
  defaultLayout: TableLayout = EMPTY_LAYOUT
) => {
  const { user } = useAuth();
  const [layout, setLayout] = useState<TableLayout>(defaultLayout);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLayout = useRef<TableLayout | null>(null);

  // Load from user (already fetched from backend on login)
  useEffect(() => {
    if (!user?._id) return;
    try {
      const saved = user.tablePreferences?.[tableKey];
      if (saved) {
        const mergedOrder = mergeColumnOrder(
          saved.columnOrder,
          defaultLayout.columnOrder || []
        );
        setLayout({ ...defaultLayout, ...saved, columnOrder: mergedOrder });
      } else {
        setLayout(defaultLayout);
      }
    } catch (e) {
      console.error('Failed to load table layout', e);
    } finally {
      setIsLoaded(true);
    }
  }, [user?._id, tableKey]);

  // Cleanup timeout on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const saveLayout = useCallback(
    (updates: Partial<TableLayout>) => {
      if (!user?._id) return;

      // Update state immediately for responsive UI
      setLayout((prev) => {
        const next = { ...prev, ...updates };
        pendingLayout.current = next;
        return next;
      });

      // Debounce the API call using the ref, not the state value
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (!pendingLayout.current) return;
        axiosInstance
          .patch(`/users/preferences/${tableKey}`, pendingLayout.current)
          .catch((e) => console.error('Failed to save layout', e));
      }, 2000);
    },
    [user?._id, tableKey]
  );

  return { layout, saveLayout, isLoaded };
};
