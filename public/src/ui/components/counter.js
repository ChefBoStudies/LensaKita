import { el } from '../../lib/dom.js';

export function Counter({ remaining }) {
  const root = el('div', { class: 'counter container', role: 'status', 'aria-live': 'polite' });
  function render(n) {
    root.innerHTML = '';
    root.append(
      el('span', {}, [
        'You can share ', el('strong', {}, String(n)), ' more photo', n === 1 ? '' : 's', '.'
      ])
    );
  }
  render(remaining);
  return { root, render };
}
