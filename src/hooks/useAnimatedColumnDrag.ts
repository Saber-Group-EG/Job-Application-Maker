import { useCallback, useEffect, useRef } from 'react';

let styleInjected = false;
function ensureStylesInjected() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-animated-column-drag', 'true');
  style.textContent = `
    [data-flip-key] {
      transform: translateX(var(--flip-dx, 0px));
      transition: var(--flip-transition, none);
      will-change: transform;
    }
    [data-column-id].col-dragging {
      opacity: 0 !important;
      pointer-events: none;
    }
    .col-drop-indicator {
      position: absolute;
      top: 0;
      width: 3px;
      background: var(--drop-indicator-color, #e42e2b);
      border-radius: 2px;
      pointer-events: none;
      z-index: 20;
      opacity: 0;
      transition: opacity 120ms ease, left 80ms ease;
    }
  `;
  document.head.appendChild(style);
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

type UseAnimatedColumnDragOptions = {
  columnOrder: string[];
  onReorder: (nextOrder: string[]) => void;
};

export function useAnimatedColumnDrag({
  columnOrder,
  onReorder,
}: UseAnimatedColumnDragOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const columnOrderRef = useRef(columnOrder);
  columnOrderRef.current = columnOrder;

  const sessionRef = useRef(0);
  const flipSnapshotRef = useRef<Map<string, DOMRect> | null>(null);
  const flipSessionRef = useRef(0);

  const isDraggingRef = useRef(false);
  const draggedColumnIdRef = useRef<string | null>(null);
  const draggedWidthRef = useRef(0);
  const currentOverIdRef = useRef<string | null>(null);
  const lastClientXRef = useRef(0);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  const captureRects = useCallback(() => {
    const map = new Map<string, DOMRect>();
    const container = containerRef.current;
    if (!container) return map;
    container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((el) => {
      const key = el.getAttribute('data-flip-key');
      if (key) map.set(key, el.getBoundingClientRect());
    });
    return map;
  }, []);

  const beginReorderCapture = useCallback(() => {
    flipSessionRef.current += 1;
    flipSnapshotRef.current = captureRects();
  }, [captureRects]);

  useEffect(() => {
    const mySession = flipSessionRef.current;
    const prevRects = flipSnapshotRef.current;
    if (!prevRects || prevRects.size === 0) return;

    let cancelled = false;
    let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled || flipSessionRef.current !== mySession) return;
        const container = containerRef.current;
        if (!container) return;

        flipSnapshotRef.current = null;

        const targets: { el: HTMLElement; dx: number }[] = [];
        container
          .querySelectorAll<HTMLElement>('[data-flip-key]')
          .forEach((el) => {
            const key = el.getAttribute('data-flip-key');
            const prevRect = key ? prevRects.get(key) : undefined;
            if (!prevRect) return;
            const newRect = el.getBoundingClientRect();
            const dx = prevRect.left - newRect.left;
            if (Math.abs(dx) > 0.5) targets.push({ el, dx });
          });

        if (targets.length === 0) return;

        targets.forEach(({ el, dx }) => {
          el.style.setProperty('--flip-transition', 'none');
          el.style.setProperty('--flip-dx', `${dx}px`);
        });

        void container.getBoundingClientRect();

        requestAnimationFrame(() => {
          if (cancelled || flipSessionRef.current !== mySession) return;
          targets.forEach(({ el }) => {
            el.style.setProperty('--flip-transition', `transform 320ms ${EASE}`);
            el.style.setProperty('--flip-dx', '0px');
          });
        });

        cleanupTimeout = setTimeout(() => {
          if (flipSessionRef.current !== mySession) return;
          targets.forEach(({ el }) => {
            el.style.removeProperty('--flip-transition');
            el.style.removeProperty('--flip-dx');
          });
        }, 380);
      });
      (raf1 as any)._raf2 = raf2;
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if ((raf1 as any)._raf2) cancelAnimationFrame((raf1 as any)._raf2);
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnOrder]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) container.style.position = container.style.position || 'relative';
  }, []);

  const clearShift = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>('[data-column-id]').forEach((el) => {
      el.style.removeProperty('--flip-transition');
      el.style.removeProperty('--flip-dx');
    });
  }, []);

  const applyShift = useCallback((targetColumnId: string) => {
    const draggedColumnId = draggedColumnIdRef.current;
    const draggedWidth = draggedWidthRef.current;
    const container = containerRef.current;
    if (!container || !draggedColumnId) return;

    if (targetColumnId === draggedColumnId) {
      if (currentOverIdRef.current !== null) clearShift();
      currentOverIdRef.current = null;
      return;
    }
    if (currentOverIdRef.current === targetColumnId) return;
    currentOverIdRef.current = targetColumnId;

    const order = columnOrderRef.current;
    const fromIdx = order.indexOf(draggedColumnId);
    const toIdx = order.indexOf(targetColumnId);
    if (fromIdx === -1 || toIdx === -1) return;

    clearShift();

    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const direction = toIdx > fromIdx ? -1 : 1;

    for (let i = lo; i <= hi; i++) {
      const colId = order[i];
      if (colId === draggedColumnId) continue;
      container
        .querySelectorAll<HTMLElement>(`[data-column-id="${colId}"]`)
        .forEach((el) => {
          el.style.setProperty('--flip-transition', `transform 220ms ${EASE}`);
          el.style.setProperty('--flip-dx', `${direction * draggedWidth}px`);
        });
    }
  }, [clearShift]);

  const ensureIndicator = useCallback(() => {
    if (indicatorRef.current) return indicatorRef.current;
    const container = containerRef.current;
    if (!container) return null;
    const line = document.createElement('div');
    line.className = 'col-drop-indicator';
    container.appendChild(line);
    indicatorRef.current = line;
    return line;
  }, []);

  const processPointerMove = useCallback(() => {
    rafHandleRef.current = null;
    const clientX = pendingClientXRef.current;
    const headCell = pendingTargetRef.current;
    pendingClientXRef.current = null;
    pendingTargetRef.current = null;
    if (clientX === null || !headCell) return;

    lastClientXRef.current = clientX;

    const container = containerRef.current;
    if (!container) return;

    const targetColumnId = headCell.getAttribute('data-column-id');

    const rect = headCell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isAfter = clientX > rect.left + rect.width / 2;
    const line = ensureIndicator();
    if (line) {
      const headerEl = container.querySelector('thead') as HTMLElement | null;
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 50;
      const x =
        (isAfter ? rect.right : rect.left) -
        containerRect.left;
      line.style.left = `${x}px`;
      line.style.top = `${headerHeight}px`;
      line.style.height = `${container.scrollHeight - headerHeight}px`;
      line.style.opacity = '1';
    }

    if (targetColumnId) applyShift(targetColumnId);
  }, [ensureIndicator, applyShift]);

  const endDragSession = useCallback(() => {
    if (!isDraggingRef.current) return;
    if (rafHandleRef.current != null) {
      cancelAnimationFrame(rafHandleRef.current);
      rafHandleRef.current = null;
    }
    pendingClientXRef.current = null;
    pendingTargetRef.current = null;

    const container = containerRef.current;
    if (!container) return;

    container
      .querySelectorAll('.col-dragging')
      .forEach((el) => el.classList.remove('col-dragging'));
    clearShift();

    const draggedColumnId = draggedColumnIdRef.current;
    const currentOverId = currentOverIdRef.current;

    if (draggedColumnId && currentOverId && draggedColumnId !== currentOverId) {
      const order = columnOrderRef.current;
      const ths = container.querySelectorAll<HTMLElement>('th[data-column-id]');
      let toIdx = -1;
      for (let i = 0; i < ths.length; i++) {
        const r = ths[i].getBoundingClientRect();
        if (lastClientXRef.current < r.left + r.width / 2) {
          toIdx = i;
          break;
        }
      }
      if (toIdx === -1) toIdx = ths.length;
      const fromIdx = order.indexOf(draggedColumnId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        const newOrder = [...order];
        const [moved] = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, moved);
        beginReorderCapture();
        onReorder(newOrder);
      }
    }

    draggedColumnIdRef.current = null;
    draggedWidthRef.current = 0;
    currentOverIdRef.current = null;
    isDraggingRef.current = false;
    if (indicatorRef.current) indicatorRef.current.style.opacity = '0';
    sessionRef.current += 1;
  }, [clearShift, beginReorderCapture, onReorder]);

  useEffect(() => {
    const onGlobalUp = () => {
      if (isDraggingRef.current || draggedColumnIdRef.current) {
        endDragSession();
      }
    };
    document.addEventListener('mouseup', onGlobalUp);
    document.addEventListener('pointerup', onGlobalUp);
    return () => {
      document.removeEventListener('mouseup', onGlobalUp);
      document.removeEventListener('pointerup', onGlobalUp);
    };
  }, [endDragSession]);

  const schedulePointerMove = useCallback((clientX: number, target: HTMLElement) => {
    pendingClientXRef.current = clientX;
    pendingTargetRef.current = target;
    if (rafHandleRef.current == null) {
      rafHandleRef.current = requestAnimationFrame(processPointerMove);
    }
  }, [processPointerMove]);

  const onHeaderMouseDown = useCallback((
    e: React.MouseEvent<HTMLElement>,
    toggleSorting: () => void,
  ) => {
    if ((e.target as HTMLElement).closest('button:not([aria-label="Move"])')) return;

    if (isDraggingRef.current || draggedColumnIdRef.current) {
      document.querySelectorAll('.col-dragging').forEach((el) => el.classList.remove('col-dragging'));
      clearShift();
      if (indicatorRef.current) indicatorRef.current.style.opacity = '0';
      draggedColumnIdRef.current = null;
      draggedWidthRef.current = 0;
      currentOverIdRef.current = null;
      isDraggingRef.current = false;
    }

    const th = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragActive = false;

    const endDrag = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', endDrag);

      if (!dragActive) {
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx < 5 && dy < 5) {
          toggleSorting();
        }
        return;
      }

      if (!isDraggingRef.current) return;
      endDragSession();
    };

    const onPointerMove = (pe: PointerEvent | MouseEvent) => {
      if (!pe.buttons) {
        endDrag();
        return;
      }
      if (!dragActive) {
        const dx = Math.abs(pe.clientX - startX);
        const dy = Math.abs(pe.clientY - startY);
        if (dx < 5 && dy < 5) return;
        dragActive = true;

        sessionRef.current += 1;
        isDraggingRef.current = true;
        draggedColumnIdRef.current = th.getAttribute('data-column-id');
        draggedWidthRef.current = th.getBoundingClientRect().width;
        currentOverIdRef.current = null;

        const container = containerRef.current;
        if (container) {
          container
            .querySelectorAll(`[data-column-id="${draggedColumnIdRef.current}"]`)
            .forEach((el) => el.classList.add('col-dragging'));
        }
      }

      const headCell = (pe.target as HTMLElement).closest('th[data-column-id]') as HTMLElement | null;
      if (headCell) {
        schedulePointerMove(pe.clientX, headCell);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', endDrag);
  }, [schedulePointerMove, endDragSession, clearShift]);

  const handleColumnOrderChange = useCallback(
    (updater: any, saveLayout: (patch: { columnOrder: string[] }) => void) => {
      beginReorderCapture();
      const next =
        typeof updater === 'function' ? updater(columnOrderRef.current) : updater;
      saveLayout({ columnOrder: next });
      void onReorder;
    },
    [beginReorderCapture, onReorder]
  );

  return { containerRef, handleColumnOrderChange, onHeaderMouseDown };
}
