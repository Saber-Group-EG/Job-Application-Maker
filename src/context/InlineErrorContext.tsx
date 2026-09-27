import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Lets an on-page error state tell the layout's "couldn't load" banner that
// the failure is already explained, so the user doesn't get it twice.
type Ctx = { count: number; register: () => () => void };
const InlineErrorContext = createContext<Ctx>({ count: 0, register: () => () => {} });

export function InlineErrorProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);
  const value = useMemo(() => ({ count, register }), [count, register]);
  return <InlineErrorContext.Provider value={value}>{children}</InlineErrorContext.Provider>;
}

export const useInlineErrorCount = () => useContext(InlineErrorContext).count;

/** Call from a component that shows a load error on the page itself. */
export function useMarkInlineError() {
  const { register } = useContext(InlineErrorContext);
  useEffect(() => register(), [register]);
}
