const listeners = new Map();

function emit(key, value) {
  const subs = listeners.get(key);
  if (!subs) return;
  for (const fn of subs) fn(value);
}

export const store = {
  set(key, value) { emit(key, value); },
  subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key)?.delete(fn);
  }
};

export const KEYS = {
  route: 'route',
  event: 'event',
  photos: 'photos',
  remaining: 'remaining',
  state: 'state', // pre | live | closed
};
