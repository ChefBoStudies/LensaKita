const KEY = 'wed_device_id_v1';

function setCookie(name, value, days = 365 * 2) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; samesite=lax`;
}

export function getOrCreateDeviceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(KEY, id);
    setCookie('did', id);
  }
  return id;
}

export function getUsedCount(eventSlug) {
  return Number(localStorage.getItem(`used_${eventSlug}`) || '0');
}

export function incUsedCount(eventSlug) {
  const next = getUsedCount(eventSlug) + 1;
  localStorage.setItem(`used_${eventSlug}`, String(next));
  return next;
}

export function setUsedCount(eventSlug, count) {
  localStorage.setItem(`used_${eventSlug}`, String(count));
}
