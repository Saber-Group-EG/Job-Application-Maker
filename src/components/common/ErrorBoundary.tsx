import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw, Sparkles } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { Button } from '../ui/kit';

// After a deploy, a tab opened before it asks for page files that no longer
// exist. That isn't a bug the user can do anything about: reload once to
// pick up the new version.
const NEW_VERSION = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading (CSS )?chunk \S+ failed|Unable to preload CSS/i;
const RELOAD_KEY = 'newVersionReloadAt';

export const isNewVersionError = (error: unknown) => NEW_VERSION.test(String((error as Error)?.message ?? error ?? ''));

/** Reloads the page unless we already did so in the last 30s (avoids a loop). */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

const maskIds = (path: string) => path.replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id');

function crashRef(error: Error): string {
  const time = new Date().toLocaleString('en-GB', { hour12: false });
  const first = String(error?.message ?? error).split('\n')[0].slice(0, 140);
  return `${maskIds(window.location.pathname)} · ${time} · ${error?.name ?? 'Error'}: ${first}`;
}

type Props = {
  children: ReactNode;
  /** Clears the error when it changes (e.g. the route), so navigating away recovers. */
  resetKey?: string;
  /** Fill the viewport; used when there is no app shell around it. */
  fullPage?: boolean;
};
type State = { error: Error | null; ref: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, ref: '' };

  static getDerivedStateFromError(error: Error): State {
    return { error, ref: crashRef(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[crash]', error, info.componentStack);
    if (isNewVersionError(error)) reloadOnceForNewVersion();
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, ref: '' });
  }

  render() {
    const { error, ref } = this.state;
    if (!error) return this.props.children;
    return <CrashScreen newVersion={isNewVersionError(error)} reference={ref} fullPage={this.props.fullPage} />;
  }
}

function CrashScreen({ newVersion, reference, fullPage }: { newVersion: boolean; reference: string; fullPage?: boolean }) {
  const { t } = useLocale();
  return (
    <div className={`flex items-center justify-center px-4 ${fullPage ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'py-16'}`}>
      <div role="alert" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${
            newVersion ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/10' : 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
          }`}
        >
          {newVersion ? <Sparkles className="size-6" /> : <AlertTriangle className="size-6" />}
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {t(newVersion ? 'updateTitle' : 'crashTitle', 'common')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(newVersion ? 'updateText' : 'crashText', 'common')}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => window.location.reload()}>
            {t('crashReload', 'common')}
          </Button>
          {!newVersion && (
            <Button icon={<Home className="size-4" />} onClick={() => window.location.assign('/')}>
              {t('crashHome', 'common')}
            </Button>
          )}
        </div>
        {!newVersion && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-start dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('crashDetails', 'common')}</p>
            <p dir="ltr" className="mt-1 break-words text-left font-mono text-xs text-slate-600 dark:text-slate-300">
              {reference}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
