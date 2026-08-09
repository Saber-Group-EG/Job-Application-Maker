type AuthEventMap = {
  'session-superseded': string; // carries the message
};

type Listener<T> = (payload: T) => void;

const listeners: { [K in keyof AuthEventMap]: Set<Listener<AuthEventMap[K]>> } =
  {
    'session-superseded': new Set(),
  };

export function emitAuthEvent<K extends keyof AuthEventMap>(
  type: K,
  payload: AuthEventMap[K]
) {
  listeners[type].forEach((l) => l(payload));
}

export function subscribeAuthEvent<K extends keyof AuthEventMap>(
  type: K,
  listener: Listener<AuthEventMap[K]>
) {
  listeners[type].add(listener);
  return () => {
    listeners[type].delete(listener);
  };
}
