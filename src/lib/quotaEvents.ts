type QuotaEventMap = {
  'quota-exceeded': void;
  'near-limit-companies': string[];
};

type Listener<T> = (payload: T) => void;

const listeners: {
  [K in keyof QuotaEventMap]: Set<Listener<QuotaEventMap[K]>>;
} = {
  'quota-exceeded': new Set(),
  'near-limit-companies': new Set(),
};

export function emitQuotaEvent<K extends keyof QuotaEventMap>(
  type: K,
  ...payload: QuotaEventMap[K] extends void ? [] : [QuotaEventMap[K]]
) {
  const set = listeners[type] as Set<Listener<QuotaEventMap[K]>>;
  set.forEach((l) => l(payload[0] as QuotaEventMap[K]));
}

export function subscribeQuotaEvent<K extends keyof QuotaEventMap>(
  type: K,
  listener: Listener<QuotaEventMap[K]>
) {
  const set = listeners[type] as Set<Listener<QuotaEventMap[K]>>;
  set.add(listener);
  // Explicit block body — `() => set.delete(listener)` would implicitly
  // return Set.delete's boolean result, which React's cleanup-function
  // type (Destructor) rejects since it expects void.
  return () => {
    set.delete(listener);
  };
}
