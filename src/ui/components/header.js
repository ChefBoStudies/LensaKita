import { el } from '../../lib/dom.js';

export function Header({ title }) {
  const root = el('header', { class: 'header' }, [
    el('div', { class: 'header-inner container' }, [
      el('div', { class: 'header-title' }, 'Lensa Kita')
    ])
  ]);
  return root;
}
