// Turns any failure (API response, network drop, code bug) into a sentence
// an end user can act on, plus a short reference line a developer can use to
// find the failing request. Raw server/JS text is only shown when it already
// reads like a sentence written for people.
import enCommon from '../../locales/en/common.json';
import arCommon from '../../locales/ar/common.json';

export interface UserError {
  /** What the user sees. */
  message: string;
  /** e.g. "500 · PUT /companies/:id/settings · 14:32:05" */
  ref: string;
  status?: number;
}

type Strings = Record<string, string>;

// Runs outside React, so read the language the LocaleProvider put on <html>.
export function errorText(key: string, params?: Record<string, string>): string {
  const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
  let s = ((ar ? arCommon : enCommon) as Strings)[key] ?? (enCommon as Strings)[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
  return s;
}

// Text that means nothing to a user: stack traces, DB and JS internals,
// transport errors, HTTP boilerplate.
const TECHNICAL =
  /Cast to|ObjectId|E11000|duplicate key|Mongo|Mongoose|ValidationError|TypeError|ReferenceError|SyntaxError|RangeError|Cannot (read|set) prop|is not a function|is not defined|is not iterable|is not allowed$|\bundefined\b|\bnull\b|\bNaN\b|\[object |Unexpected (token|end)|JSON|jwt|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|status code|Network ?Error|Failed to fetch|Load failed|Internal Server Error|\bat \S+ \(|timeout of \d+ms|\bERR_|Cannot (GET|POST|PUT|PATCH|DELETE)|\broute\b|^[A-Z0-9_]+$|^\s*[{[<]/i;

export function isReadable(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 1 && text.length <= 500 && !TECHNICAL.test(text.trim());
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function humanizeField(path: string): string {
  const last = path.replace(/\[\d+\]/g, '').split('.').filter((p) => p && !/^\d+$/.test(p)).pop() ?? path;
  const words = last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// `"firstName" is required` / `Path \`email\` is required.` -> `First name is required`
function cleanValidation(message: string): string {
  return message
    .replace(/^Path\s+`([^`]+)`/, (_, f) => humanizeField(f))
    .replace(/"([^"]+)"/g, (_, f) => humanizeField(f))
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function joinReadable(messages: unknown[]): string | undefined {
  const lines = messages
    .map((m) => (typeof m === 'string' ? cleanValidation(m) : undefined))
    .filter(isReadable);
  return lines.length ? Array.from(new Set(lines)).join('\n') : undefined;
}

// Joi `details`, express-validator `errors`, or a Mongoose "X validation failed: a: msg, b: msg".
function validationMessage(data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  if (Array.isArray(data.details)) return joinReadable(data.details.map((d: any) => d?.message));
  if (Array.isArray(data.errors)) return joinReadable(data.errors.map((e: any) => (typeof e === 'string' ? e : e?.msg ?? e?.message)));
  if (data.errors && typeof data.errors === 'object') {
    return joinReadable(Object.values(data.errors).map((e: any) => (typeof e === 'string' ? e : e?.message)));
  }
  const msg = str(data.message);
  if (msg && /validation failed:/i.test(msg)) {
    return joinReadable(msg.replace(/^.*?validation failed:\s*/i, '').split(/,\s*(?=[\w.[\]]+:\s)/).map((p) => p.replace(/^[\w.[\]]+:\s*/, '')));
  }
  return undefined;
}

function duplicateMessage(raw: string): string | undefined {
  if (!/E11000|duplicate key/i.test(raw)) return undefined;
  const field = raw.match(/dup key:\s*\{\s*"?([\w.]+)"?\s*:/)?.[1] ?? raw.match(/index:\s*([\w.]+?)_-?1/)?.[1];
  return field ? errorText('errDuplicateField', { field: humanizeField(field).toLowerCase() }) : errorText('errDuplicate');
}

const maskPath = (url: string) =>
  url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api(?=\/)/, '')
    .split('?')[0]
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id')
    .replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/:id')
    .replace(/\/\d{4,}(?=\/|$)/g, '/:id');

const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const isNetworkFailure = (e: any) =>
  e?.isAxiosError === true || e?.name === 'ApiError' || /Network ?Error|Failed to fetch|Load failed|NetworkError/i.test(String(e?.message ?? ''));

export function describeError(err: unknown): UserError {
  const e: any = err ?? {};
  if (e.__userError) return e.__userError as UserError;
  if (typeof err === 'string') {
    return { message: isReadable(err) ? err : errorText('errUnexpected'), ref: `JS · ${clock()} · ${err.slice(0, 80)}` };
  }

  const status: number | undefined =
    typeof e.response?.status === 'number' ? e.response.status : typeof e.statusCode === 'number' ? e.statusCode : undefined;
  const data = e.response?.data ?? e.data;
  const url: string = e.config?.url ?? '';
  const method = String(e.config?.method ?? '').toUpperCase();
  const serverMsg = str(data?.message) ?? str(typeof data?.error === 'string' ? data.error : data?.error?.message) ?? str(typeof data === 'string' ? data : undefined);
  // Errors re-thrown by our services carry an already-friendly message.
  const ownMsg = e.name === 'ApiError' && isReadable(e.message) && e.message !== 'An error occurred' ? e.message : undefined;
  const readable = isReadable(serverMsg) ? serverMsg : ownMsg;

  let message: string;
  const duplicate = duplicateMessage(`${serverMsg ?? ''} ${e.message ?? ''}`);

  if (status === undefined) {
    if (e.code === 'ECONNABORTED' || /timeout/i.test(String(e.message ?? ''))) message = errorText('errTimeout');
    else if (isNetworkFailure(e)) message = ownMsg ?? (typeof navigator !== 'undefined' && navigator.onLine === false ? errorText('errOffline') : errorText('errNetwork'));
    else message = isReadable(e.message) ? e.message : errorText('errUnexpected');
  } else if (duplicate) {
    message = duplicate;
  } else if (status >= 500) {
    message = errorText('errServer');
  } else if (status === 401) {
    const signingIn = /\/auth\/(?!me\b|refresh)/.test(url);
    message = readable && !/token|unauthori[sz]ed|not authenticated/i.test(readable)
      ? readable
      : signingIn ? errorText('errInvalid') : errorText('errSession');
  } else if (status === 403) {
    message = readable ?? errorText('errForbidden');
  } else if (status === 404) {
    message = readable ?? errorText('errNotFound');
  } else if (status === 413) {
    message = errorText('errTooLarge');
  } else if (status === 429) {
    message = errorText('errRateLimited');
  } else {
    message = validationMessage(data) ?? readable ?? (status === 409 ? errorText('errDuplicate') : status === 402 ? errorText('errForbidden') : errorText('errInvalid'));
  }

  const requestId = str(e.response?.headers?.['x-request-id']) ?? str(data?.requestId);
  const ref = status === undefined && !isNetworkFailure(e)
    ? `JS · ${clock()} · ${String(e.name ?? 'Error')}: ${String(e.message ?? '').slice(0, 80)}`
    : [status ?? 'NET', method && url ? `${method} ${maskPath(url)}` : url ? maskPath(url) : '', requestId, clock()].filter(Boolean).join(' · ');

  return { message, ref, status };
}

// The last failure, so an error popup opened right after it can print its
// reference without every call site passing it through.
let last: { ref: string; at: number } | null = null;

export function rememberError(ue: UserError) {
  last = { ref: ue.ref, at: Date.now() };
  console.warn(`[error] ${ue.ref}`);
}

export function recentErrorRef(withinMs = 8000): string | undefined {
  return last && Date.now() - last.at < withinMs ? last.ref : undefined;
}

// For text already headed into an error popup: keep it if it's readable,
// otherwise swap in a generic sentence and keep the original as the reference.
export function friendlyText(text: string): { text: string; ref?: string } {
  if (text.split('\n').every((line) => !line.trim() || isReadable(line))) return { text };
  return { text: errorText('errUnexpected'), ref: `JS · ${clock()} · ${text.slice(0, 80)}` };
}
