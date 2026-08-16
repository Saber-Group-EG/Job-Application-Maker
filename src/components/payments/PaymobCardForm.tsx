import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchPaymobCardMethod,
  paymobFeBaseUrl,
  PaymobApiError,
  isDarkMode,
  buildPaymobIframeCustomStyle,
  type PaymobCardMethod,
} from '../../lib/paymobApi';

const IFRAME_PATH = 'iframe-card';

interface Props {
  publicKey: string;
  clientSecret: string;
  checkoutUrl?: string;
  payButtonLabel: string;
  saveCard?: boolean;
  onSuccess: () => void;
  onPending: (redirectUrl: string) => void;
  onRetry?: () => void;
  onCancel?: () => void;
}

interface PaymentResponse {
  status?: number;
  data?: Record<string, unknown>;
}

function isTrue(v: unknown): boolean {
  return v === true || v === 'true' || v === 'True';
}

function extractError(data: unknown, fallback: string): string {
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

export default function PaymobCardForm({
  publicKey,
  clientSecret,
  checkoutUrl,
  payButtonLabel,
  saveCard = false,
  onSuccess,
  onPending,
  onRetry,
  onCancel,
}: Props) {
  const { t, dir } = useLocale();

  const [method, setMethod] = useState<PaymobCardMethod | null>(null);
  const [loadingMethod, setLoadingMethod] = useState(true);
  const [methodError, setMethodError] = useState(false);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(224);
  const [holderName, setHolderName] = useState('');
  const [holderError, setHolderError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payDisabledByIframe, setPayDisabledByIframe] = useState(false);
  const [payError, setPayError] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const feBase = useMemo(() => paymobFeBaseUrl(checkoutUrl), [checkoutUrl]);
  const iframeSrc = useMemo(
    () =>
      `${feBase}/${IFRAME_PATH}/?type=card&v=2&integration_type=directPayment`,
    [feBase]
  );

  const loadMethod = () => {
    setMethodError(false);
    setLoadingMethod(true);
    fetchPaymobCardMethod(publicKey, clientSecret, checkoutUrl)
      .then(setMethod)
      .catch((err) => {
        if (err instanceof PaymobApiError && err.redirect) {
          onPending(err.redirect);
          return;
        }
        setMethodError(true);
      })
      .finally(() => setLoadingMethod(false));
  };

  useEffect(() => {
    loadMethod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, clientSecret]);

  const postToIframe = (message: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(message, feBase);
  };

  useEffect(() => {
    if (!method) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== feBase) return;
      const msg = event.data as Record<string, unknown>;
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'isIframeLoaded':
          setIframeLoaded(true);
          postToIframe({
            type: 'customStyles',
            payload: {
              styling: buildPaymobIframeCustomStyle(isDarkMode()),
              options: { hideCardHolderName: true },
            },
          });
          break;
        case 'iframeCardHight':
          if (typeof msg.iframeCardHight === 'number') {
            setIframeHeight(msg.iframeCardHight);
          }
          break;
        case 'loading':
          if (typeof msg.loading === 'boolean') setPaying(msg.loading);
          break;
        case 'shouldDisableActionBtn':
          if (typeof msg.shouldDisableActionBtn === 'boolean') {
            setPayDisabledByIframe(msg.shouldDisableActionBtn);
          }
          break;
        case 'paymentResponse': {
          setPaying(false);
          const response = (msg.response ?? {}) as PaymentResponse;
          const data = response.data ?? {};
          if (
            response.status === 200 &&
            isTrue(data.success) &&
            !isTrue(data.is_3d_secure)
          ) {
            onSuccess();
            return;
          }
          const url =
            typeof data.redirection_url === 'string'
              ? data.redirection_url
              : typeof data.redirect_url === 'string'
                ? data.redirect_url
                : typeof data.redirect === 'string'
                  ? data.redirect
                  : null;
          if (url) {
            onPending(url);
            return;
          }
          setPayError(extractError(data, t('subscription.payFailed', 'settings')));
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, feBase]);

  if (loadingMethod) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        <Loader2 className="size-4 animate-spin" />
        {t('subscription.cardFormLoading', 'settings')}
      </div>
    );
  }

  if (methodError || !method) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {t('subscription.tokenLoadFailed', 'settings')}
        </p>
        <button
          type="button"
          onClick={() => {
            if (onRetry) onRetry();
            else loadMethod();
          }}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('subscription.retry', 'settings')}
        </button>
      </div>
    );
  }

  const submit = () => {
    if (!method || paying) return;
    if (!holderName.trim()) {
      setHolderError(t('subscription.cardHolderNameRequired', 'settings'));
      return;
    }
    setHolderError('');
    setPayError('');
    setPaying(true);
    postToIframe({
      type: 'cardData',
      payload: {
        paymentToken: method.paymentToken,
        subType: {},
        currency: method.currency,
        cardHolderName: holderName.trim(),
        saveCard,
        tenure: null,
        shouldSubmitData: true,
        country: 'EG',
        integrationId: method.integrationId,
        discounts: {},
        checkBinFees: false,
        feesAmount: 0,
        isInstantRefundActive: false,
      },
    });
  };

  const labelClass = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <label className={labelClass} htmlFor="pm-holder">
          {t('subscription.cardHolderName', 'settings')}
        </label>
        <input
          id="pm-holder"
          autoComplete="cc-name"
          value={holderName}
          onChange={(e) => {
            setHolderName(e.target.value);
            if (holderError) setHolderError('');
          }}
          placeholder={t('subscription.cardHolderNamePlaceholder', 'settings')}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            holderError
              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/60'
              : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800'
          }`}
        />
        {holderError && <p className="mt-1 text-xs text-red-500">{holderError}</p>}
      </div>

      <div>
        <label className={labelClass}>
          {t('subscription.cardDetails', 'settings')}
        </label>
        <iframe
          ref={iframeRef}
          title="Card details"
          src={iframeSrc}
          frameBorder="0"
          scrolling="no"
          width="100%"
          height={iframeHeight}
          style={{ border: 0, overflow: 'hidden' }}
        />
        {!iframeLoaded && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            {t('subscription.cardFormLoading', 'settings')}
          </div>
        )}
      </div>

      {payError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {payError}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!iframeLoaded || paying || payDisabledByIframe}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paying && <Loader2 className="size-4 animate-spin" />}
        {payButtonLabel}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="size-3.5" />
        {t('subscription.securePayment', 'settings')}
      </p>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('back', 'common')}
        </button>
      )}
    </div>
  );
}