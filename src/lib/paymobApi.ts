// Headless Paymob integration (custom UI around Paymob's card iframe).
// Paymob no longer exposes a browser tokenization REST endpoint, so the
// card number/expiry/cvv inputs live in Paymob's hosted iframe
// (`/iframe-card/`), which we theme with our brand colors, drive via
// postMessage, and wrap in our own page, pay button and result handling.

const API_BASE_BY_CHECKOUT_HOST: Record<string, string> = {
  'eg.checkout.paymob.com': 'https://accept.paymob.com',
  'ksa.checkout.paymob.com': 'https://ksa.paymob.com',
  'uae.checkout.paymob.com': 'https://uae.paymob.com',
  'oman.checkout.paymob.com': 'https://oman.paymob.com',
  'pakistan.checkout.paymob.com': 'https://pakistan.paymob.com',
};

const FE_BASE_BY_CHECKOUT_HOST: Record<string, string> = {
  'eg.checkout.paymob.com': 'https://eg.checkout.paymob.com',
  'ksa.checkout.paymob.com': 'https://ksa.checkout.paymob.com',
  'uae.checkout.paymob.com': 'https://uae.checkout.paymob.com',
  'om.checkout.paymob.com': 'https://om.checkout.paymob.com',
  'pk.checkout.paymob.com': 'https://pk.checkout.paymob.com',
};

function checkoutHost(checkoutUrl?: string): string | null {
  if (!checkoutUrl) return null;
  try {
    return new URL(checkoutUrl).host;
  } catch {
    return null;
  }
}

/** Paymob Accept API base for the checkout region (defaults to Egypt). */
export function paymobApiBaseUrl(checkoutUrl?: string): string {
  const host = checkoutHost(checkoutUrl);
  if (host && API_BASE_BY_CHECKOUT_HOST[host]) return API_BASE_BY_CHECKOUT_HOST[host];
  return 'https://accept.paymob.com';
}

/** Paymob card-iframe frontend base for the checkout region (defaults to Egypt). */
export function paymobFeBaseUrl(checkoutUrl?: string): string {
  const host = checkoutHost(checkoutUrl);
  if (host && FE_BASE_BY_CHECKOUT_HOST[host]) return FE_BASE_BY_CHECKOUT_HOST[host];
  return 'https://eg.checkout.paymob.com';
}

export class PaymobApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown,
    public readonly redirect?: string
  ) {
    super(message);
    this.name = 'PaymobApiError';
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (Array.isArray(data) && data.length > 0) return String(data[0]);
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['msg', 'message', 'error', 'detail']) {
      const v = obj[key];
      if (typeof v === 'string' && v) return v;
    }
  }
  return fallback;
}

export interface PaymobCardMethod {
  /** `payment_keys.card` — used by the iframe to tokenize + pay. */
  paymentToken: string;
  /** The card payment method integration id (for the `cardData` message). */
  integrationId: number | null;
  currency: string;
}

/**
 * Resolves the intention via the public element endpoint and returns the
 * card payment method data needed to drive the card iframe.
 */
export async function fetchPaymobCardMethod(
  publicKey: string,
  clientSecret: string,
  checkoutUrl?: string
): Promise<PaymobCardMethod> {
  const base = paymobApiBaseUrl(checkoutUrl);
  let res: Response;
  try {
    res = await fetch(
      `${base}/v1/intention/element/${encodeURIComponent(publicKey)}/${encodeURIComponent(clientSecret)}/`
    );
  } catch {
    throw new PaymobApiError('network');
  }
  if (!res.ok) {
    throw new PaymobApiError(
      extractErrorMessage(await res.json().catch(() => null), 'intention'),
      res.status
    );
  }
  const data = (await res.json()) as {
    payment_keys?: Record<string, unknown>;
    payment_methods?: Array<{ name?: string; integration_id?: number }>;
    intention_detail?: { currency?: string };
    redirect?: unknown;
    error?: unknown;
  };
  const redirect = typeof data.redirect === 'string' ? data.redirect : undefined;
  if (redirect) {
    throw new PaymobApiError(
      typeof data.error === 'string' && data.error ? data.error : 'pending_payment',
      res.status,
      data,
      redirect
    );
  }
  const paymentToken = data.payment_keys?.['card'];
  if (typeof paymentToken !== 'string' || !paymentToken) {
    throw new PaymobApiError('no_card_method');
  }
  const cardMethod = (data.payment_methods ?? []).find(
    (m) => (m.name ?? '').toLowerCase() === 'card'
  );
  return {
    paymentToken,
    integrationId: typeof cardMethod?.integration_id === 'number' ? cardMethod.integration_id : null,
    currency: data.intention_detail?.currency ?? 'EGP',
  };
}

/**
 * Extracts Pixel credentials from a hosted checkout URL like
 * `https://eg.checkout.paymob.com/?publicKey=...&clientSecret=...`
 * so the payment can be embedded instead of redirecting away.
 */
export function parsePaymobCheckoutUrl(
  url: string
): { publicKey: string; clientSecret: string; checkoutUrl: string } | null {
  try {
    const parsed = new URL(url);
    const publicKey = parsed.searchParams.get('publicKey');
    const clientSecret = parsed.searchParams.get('clientSecret');
    if (publicKey && clientSecret) {
      return { publicKey, clientSecret, checkoutUrl: url };
    }
  } catch {
    // not a parseable URL — leave it to the caller to redirect
  }
  return null;
}

export function isDarkMode(): boolean {
  return (
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark')
  );
}

/**
 * Brand-matched styling sent to the Paymob card iframe via `customStyles`.
 *
 * The iframe renders the card fields as one connected block (shared borders,
 * no gaps), so we override per-field inline styles to split it into
 * standalone boxes that mirror the app's inputs: text-sm (14px), h-11
 * (44px), rounded-xl (12px), slate palette, 16px gaps.
 *
 * Structure must match what the iframe reads: `input`, `placeholder`,
 * `label`, `error`, `container` and `hideCardIcons`.
 */
export function buildPaymobIframeCustomStyle(
  dark: boolean
): Record<string, unknown> {
  const fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
  return dark
    ? {
        container: { direction: 'ltr', width: '100%' },
        label: {
          fontFamily,
          fontSize: '12px',
          fontWeight: '600',
          color: '#cbd5e1',
        },
        input: {
          fontFamily,
          fontSize: '14px',
          fontWeight: '400',
          color: '#f1f5f9',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          height: '44px',
          padding: '0 16px',
          marginTop: '16px',
          marginRight: '16px',
        },
        error: { color: '#f87171' },
        placeholder: { color: '#64748b' },
        hideCardIcons: true,
      }
    : {
        container: { direction: 'ltr', width: '100%' },
        label: {
          fontFamily,
          fontSize: '12px',
          fontWeight: '600',
          color: '#475569',
        },
        input: {
          fontFamily,
          fontSize: '14px',
          fontWeight: '400',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          height: '44px',
          padding: '0 16px',
          marginTop: '16px',
          marginRight: '16px',
        },
        error: { color: '#ef4444' },
        placeholder: { color: '#94a3b8' },
        hideCardIcons: true,
      };
}