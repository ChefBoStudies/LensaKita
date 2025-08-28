import { el } from '../../lib/dom.js';

export function Uploader({ onFiles, disabled }) {
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, class: 'visually-hidden', id: 'file-input' });
  const btn = el('button', { class: `btn btn-primary cta${disabled ? ' btn-disabled' : ''}`, type: 'button', style: { width: '100%' } }, 'Take/Upload Photos');
  const wrap = el('div', { class: 'container' }, [btn, input]);
  const root = el('div', { class: 'uploader' }, wrap);

  // Always trigger the hidden input when the button is pressed
  btn.addEventListener('click', () => {
    if (btn.classList.contains('btn-disabled')) return;
    input.click();
  });

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length) onFiles?.(files);
    input.value = '';
  });

  return { root, setDisabled: (d) => btn.classList.toggle('btn-disabled', !!d) };
}
