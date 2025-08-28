import { el } from '../../lib/dom.js';

export function Uploader({ onFiles, disabled }) {
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, class: 'visually-hidden', id: 'file-input' });
  const btn = el('button', { class: `btn btn-primary cta${disabled ? ' btn-disabled' : ''}`, type: 'button', style: { width: '100%' } }, 'Take/Upload Photos');
  const wrap = el('div', { class: 'container' }, btn);
  const label = el('label', { for: 'file-input', class: 'uploader' }, [wrap, input]);

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length) onFiles?.(files);
    input.value = '';
  });

  return { root: label, setDisabled: (d) => btn.classList.toggle('btn-disabled', !!d) };
}
