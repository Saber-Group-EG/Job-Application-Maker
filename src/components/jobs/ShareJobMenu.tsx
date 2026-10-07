import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, Link2Icon } from 'lucide-react';
import { IconButton } from '../ui/kit';
import { useLocale } from '../../context/LocaleContext';
import { SHARE_SOURCES, buildJobLink } from '../../utils/publicJobLinks';

interface ShareJobMenuProps {
  job: any;
}

const MENU_WIDTH = 224;

/**
 * "Copy link for…" menu: copies the job's public application link tagged with
 * the platform it will be posted on, so applicants show up with that source.
 */
export default function ShareJobMenu({ job }: ShareJobMenuProps) {
  const { t } = useLocale();
  const buttonRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const close = () => setPosition(null);

  useEffect(() => {
    if (!position) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (position) return close();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );
    setPosition({ top: rect.bottom + 4, left });
  };

  const copy = async (e: React.MouseEvent, value: string) => {
    e.preventDefault();
    e.stopPropagation();
    const link = buildJobLink(job, value || undefined);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard blocked (insecure context / permissions): let the user copy by hand.
      window.prompt(t('jobsCopyLinkManual', 'jobs'), link);
    }
    setCopiedValue(value);
    window.setTimeout(() => {
      setCopiedValue(null);
      close();
    }, 900);
  };

  const itemClass =
    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

  return (
    <>
      <span ref={buttonRef} className="inline-flex" onClick={(e) => e.stopPropagation()}>
        <IconButton label={t('jobsCopyLinkFor', 'jobs')} onClick={toggle}>
          <Link2Icon className="size-4" />
        </IconButton>
      </span>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className="z-[9999] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('jobsCopyLinkFor', 'jobs')}
            </p>
            {SHARE_SOURCES.map((source) => (
              <button
                key={source.value}
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={(e) => copy(e, source.value)}
              >
                <span>{source.label}</span>
                {copiedValue === source.value && <CheckIcon className="size-4 text-emerald-600" />}
              </button>
            ))}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={(e) => copy(e, '')}
            >
              <span>{t('jobsCopyPlainLink', 'jobs')}</span>
              {copiedValue === '' && <CheckIcon className="size-4 text-emerald-600" />}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
