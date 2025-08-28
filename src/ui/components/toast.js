import { el } from '../../lib/dom.js';

let container;
function ensure() {
  if (!container) {
    container = el('div', { class: 'toast-container', role: 'status', 'aria-live': 'polite' });
    document.body.append(container);
  }
}

export function toast(message, type = 'info', timeout = 2200) {
  ensure();
  const t = el('div', { class: `toast ${type}` }, message);
  container.append(t);
  setTimeout(() => t.remove(), timeout);
}
