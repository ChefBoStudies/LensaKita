import { el } from '../../lib/dom.js';

export function Uploader({ onFiles, disabled }) {
  const inputCamera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', multiple: true, class: 'visually-hidden', id: 'file-input-camera' });
  const inputGallery = el('input', { type: 'file', accept: 'image/*', multiple: true, class: 'visually-hidden', id: 'file-input-gallery' });

  const btnCamera = el('button', { class: `btn btn-primary cta${disabled ? ' btn-disabled' : ''}`, type: 'button', style: { width: '100%' } }, 'Take Photo');
  const btnGallery = el('button', { class: `btn btn-ghost${disabled ? ' btn-disabled' : ''}`, type: 'button', style: { width: '100%' } }, 'Choose from Gallery');

  const wrap = el('div', { class: 'container', style: { display: 'grid', gap: '8px' } }, [btnCamera, btnGallery, inputCamera, inputGallery]);
  const root = el('div', { class: 'uploader' }, wrap);

  function trigger(input) {
    if (btnCamera.classList.contains('btn-disabled')) return;
    input.click();
  }

  btnCamera.addEventListener('click', () => trigger(inputCamera));
  btnGallery.addEventListener('click', () => trigger(inputGallery));

  function handleChange(input) {
    const files = Array.from(input.files || []);
    if (files.length) onFiles?.(files);
    input.value = '';
  }

  inputCamera.addEventListener('change', () => handleChange(inputCamera));
  inputGallery.addEventListener('change', () => handleChange(inputGallery));

  return {
    root,
    setDisabled: (d) => {
      btnCamera.classList.toggle('btn-disabled', !!d);
      btnGallery.classList.toggle('btn-disabled', !!d);
    }
  };
}
