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

export function Lightbox({ photo, onClose }) {
  const backdrop = el('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true' });
  const sheet = el('div', { class: 'modal container', style: { borderTopLeftRadius: '0', borderTopRightRadius: '0', height: '100dvh', display: 'grid', gridTemplateRows: 'auto 1fr auto', position: 'relative' } }, [
    el('div', { class: 'modal-header h2', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
      'Photo',
      // Close button (visible control for mobile)
      (() => {
        const b = el('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'Close', style: { padding: '8px 10px' } }, '✕');
        b.addEventListener('click', () => close());
        return b;
      })()
    ]),
    el('div', { style: { display: 'grid', placeItems: 'center' } }, [
      el('img', { src: photo.fullUrl || photo.thumbUrl, alt: photo.caption || 'Photo', style: { maxWidth: '100%', maxHeight: '70dvh', objectFit: 'contain' } })
    ]),
    el('div', {}, [
      el('p', { class: 'subtitle', style: { paddingTop: '8px' } }, photo.caption || '')
    ])
  ]);
  backdrop.append(sheet);
  function open() { document.body.append(backdrop); }
  function close() { backdrop.remove(); onClose?.(); }
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc);} });
  return { open, close, root: backdrop };
}
