import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../../context/LocaleContext';

// ─── Quoted-text detection ───────────────────────────────────────────────────
// A reply usually carries the message it answers underneath ("On … wrote:").
// Mail clients mark that part differently; find it so it can be shown as a
// separate, collapsed block instead of running on below the reply.
const QUOTE_SELECTORS = [
  '.gmail_quote', // Gmail
  'blockquote[type="cite"]', // Apple Mail / iPhone, Thunderbird
  '.yahoo_quoted', // Yahoo
  '#divRplyFwdMsg', // Outlook web
  '#appendonsend', // Outlook
  '.moz-cite-prefix', // Thunderbird attribution line
];

// "On Sat, Sep 26, 2026 at 8:15 AM Saber Group <hr@…> wrote:" (plus Arabic).
const ATTRIBUTION = /On\s.{4,300}?wrote:|في\s.{4,300}?كتب/s;

// Where the quoted part starts: a client marker if the stored HTML kept one,
// else the attribution line. Stored replies are sanitised, which removes
// most markers (classes, type="cite"), so the text search is the main path.
function findQuoteStart(doc: Document): { node: Node; offset?: number } | null {
  for (const selector of QUOTE_SELECTORS) {
    const el = doc.body.querySelector(selector);
    if (el) return { node: el };
  }
  // A text node holding the whole attribution line (Apple Mail, plain text).
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const m = ATTRIBUTION.exec(n.textContent || '');
    if (m) return { node: n, offset: m.index };
  }
  // An element whose text starts with the attribution (Gmail wraps the
  // address in a link, splitting it across nodes).
  for (const el of Array.from(doc.body.querySelectorAll('div, p, blockquote, span'))) {
    const text = (el.textContent || '').trim();
    if (text.length < 500 && ATTRIBUTION.test(text) && /^(On\s|في\s)/.test(text)) return { node: el };
  }
  return null;
}

function splitQuoted(html: string): { main: string; quoted: string | null } {
  if (typeof DOMParser === 'undefined' || !html) return { main: html, quoted: null };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const start = findQuoteStart(doc);
  if (!start || !doc.body.lastChild) return { main: html, quoted: null };

  // Cut from the quote start to the end with a Range: partially covered
  // elements are split cleanly, so both halves stay well-formed HTML.
  const range = doc.createRange();
  if (start.offset != null) range.setStart(start.node, start.offset);
  else range.setStartBefore(start.node);
  range.setEndAfter(doc.body.lastChild);
  const holder = doc.createElement('div');
  holder.appendChild(range.extractContents());

  // Nothing written above the quote: not really a reply, show it whole.
  if (!doc.body.textContent?.trim() && !doc.body.querySelector('img')) return { main: html, quoted: null };
  return { main: doc.body.innerHTML, quoted: holder.innerHTML };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildDocument = (html: string, labels: { show: string; hide: string }, dark: boolean) => {
  const { main, quoted } = splitQuoted(html);
  const text = dark ? '#e2e8f0' : '#0f172a';
  const muted = dark ? '#94a3b8' : '#64748b';
  const quoteBg = dark ? '#1e293b' : '#f8fafc';
  const border = dark ? '#334155' : '#e2e8f0';
  return `<!doctype html><html><head><meta charset="utf-8">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 0; }
  body { padding: 16px; font: 14px/1.6 system-ui, -apple-system, 'Segoe UI', sans-serif; color: ${text}; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #0284c7; }
  details.quoted { margin-top: 20px; border: 1px solid ${border}; border-radius: 10px; background: ${quoteBg}; }
  details.quoted > summary { cursor: pointer; list-style: none; padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${muted}; user-select: none; }
  details.quoted > summary::-webkit-details-marker { display: none; }
  details.quoted > summary::before { content: '▸ '; }
  details.quoted[open] > summary::before { content: '▾ '; }
  details.quoted > summary .hide { display: none; }
  details.quoted[open] > summary .show { display: none; }
  details.quoted[open] > summary .hide { display: inline; }
  details.quoted > .quoted-body { padding: 4px 16px 12px; border-top: 1px solid ${border}; color: ${muted}; }
  details.quoted blockquote { margin: 0; padding-left: 12px; border-left: 3px solid ${border}; }
</style></head><body>
<div class="main">${main}</div>
${
  quoted
    ? `<details class="quoted"><summary><span class="show">${escapeHtml(labels.show)}</span><span class="hide">${escapeHtml(labels.hide)}</span></summary><div class="quoted-body">${quoted}</div></details>`
    : ''
}
</body></html>`;
};

type Props = {
  html: string;
  title: string;
  className?: string;
  // Height used before the content has been measured.
  minHeight?: number;
};

// Renders an email body in a sandboxed iframe (no scripts: replies come
// from outside the company) that grows to fit its content, so the page has
// a single scrollbar.
export default function MailBody({ html, title, className = '', minHeight = 160 }: Props) {
  const { t } = useLocale();
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const srcDoc = useMemo(
    () => buildDocument(html, { show: t('showQuoted', 'mailPreview'), hide: t('hideQuoted', 'mailPreview') }, dark),
    [html, t, dark]
  );

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      // body, not documentElement: the latter never reports less than the
      // frame's current height, so the frame could grow but never shrink.
      setHeight(Math.max(minHeight, Math.ceil(doc.body.getBoundingClientRect().height)));
    };

    const onLoad = () => {
      measure();
      const doc = frame.contentDocument;
      if (!doc) return;
      // Images loading or the quoted block opening change the height. The
      // observer must come from the frame's own window to see its elements.
      const FrameResizeObserver =
        (frame.contentWindow as (Window & typeof globalThis) | null)?.ResizeObserver ?? ResizeObserver;
      observer = new FrameResizeObserver(measure);
      observer.observe(doc.body);
      doc.addEventListener('toggle', measure, true);
      doc.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure));
    };

    frame.addEventListener('load', onLoad);
    return () => {
      frame.removeEventListener('load', onLoad);
      observer?.disconnect();
    };
  }, [srcDoc, minHeight]);

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      // No allow-scripts. allow-same-origin lets the parent measure the
      // content height; popups let links open in a new tab.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      title={title}
      scrolling="no"
      style={{ height }}
      className={`block w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${className}`}
    />
  );
}
