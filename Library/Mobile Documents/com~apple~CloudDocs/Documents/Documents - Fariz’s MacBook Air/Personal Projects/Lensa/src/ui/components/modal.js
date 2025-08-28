import { el } from '../../lib/dom.js';

export function Modal({ title, content, actions = [] }) {
  const backdrop = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true' });
  const sheet = el('div', { class: 'modal container modal' }, [
    el('div', { class: 'modal-header h2' }, title || ''),
    el('div', {}, content || ''),
    el('div', { class: 'modal-actions' }, actions.map(a => {
      const b = el('button', { class: `btn ${a.primary ? 'btn-primary' : 'btn-ghost'}`, type: 'button' }, a.label);
      b.addEventListener('click', () => a.onClick?.());
      return b;
    }))
  ]);
  backdrop.append(sheet);
  function open() { document.body.append(backdrop); }
  function close() { backdrop.remove(); }
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  return { open, close, root: backdrop };
}
