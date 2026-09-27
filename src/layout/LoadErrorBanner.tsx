import { useEffect, useState } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useInlineErrorCount } from '../context/InlineErrorContext';
import { describeError } from '../lib/userErrors';

// A query the current page is showing that failed and has nothing to show
// instead. Session (401) and quota (402) failures have their own screens;
// queries marked `meta: { silentError: true }` are optional extras.
function isVisibleFailure(query: Query): boolean {
  if (query.state.status !== 'error' || query.state.data !== undefined) return false;
  if (query.getObserversCount() === 0 || query.meta?.silentError) return false;
  const error = query.state.error as any;
  const status = error?.response?.status ?? error?.statusCode;
  return status !== 401 && status !== 402;
}

/**
 * Pages that don't handle load errors themselves would otherwise show an
 * empty list ("No jobs yet") when the request failed. This says so instead,
 * for every page, unless the page already shows its own error state.
 */
export default function LoadErrorBanner() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const inlineErrors = useInlineErrorCount();
  const [failed, setFailed] = useState<Query[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const update = () => {
      const next = cache.getAll().filter(isVisibleFailure);
      setFailed((prev) => (prev.length === next.length && prev.every((q, i) => q === next[i]) ? prev : next));
    };
    update();
    return cache.subscribe(update);
  }, [queryClient]);

  if (failed.length === 0 || inlineErrors > 0) return null;

  const described = describeError(failed[0].state.error);
  const retry = async () => {
    setRetrying(true);
    try {
      await Promise.all(failed.map((q) => queryClient.refetchQueries({ queryKey: q.queryKey, exact: true })));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">{t('loadFailedBanner', 'common')}</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">{described.message}</p>
            <p className="mt-1 text-xs text-rose-500/80 dark:text-rose-300/70">
              {t('errReference', 'common')}: <span dir="ltr">{described.ref}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10 sm:self-center"
        >
          <RotateCcw className={`size-4 ${retrying ? 'animate-spin' : ''}`} />
          {t('tryAgain', 'common')}
        </button>
      </div>
    </div>
  );
}
