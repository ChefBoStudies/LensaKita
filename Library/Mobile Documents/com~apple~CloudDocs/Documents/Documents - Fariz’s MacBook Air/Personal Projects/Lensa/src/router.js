import { store, KEYS } from './state/store.js';

function parseLocation() {
  const path = location.pathname.replace(/\/+/g, '/');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'e' && parts[1]) {
    return { name: 'event', params: { slug: decodeURIComponent(parts[1]) } };
  }
  // default route example
  return { name: 'event', params: { slug: 'my-wedding' } };
}

export function startRouter() {
  function update() { store.set(KEYS.route, parseLocation()); }
  window.addEventListener('popstate', update, { passive: true });
  update();
}

export function navigate(path) {
  history.pushState({}, '', path);
  store.set(KEYS.route, parseLocation());
}
