import { el } from '../../lib/dom.js';

export function Tile({ photo, onClick }) {
  const root = el('button', { class: 'tile card shadow-200', type: 'button', 'aria-label': photo.caption ? `Photo: ${photo.caption}` : 'Guest photo' });
  if (photo.status === 'loading') {
    root.append(el('div', { class: 'shimmer', 'aria-hidden': 'true' }));
  }
  const img = el('img', { src: photo.fullUrl, alt: '', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => {
    // Remove broken tile; next poll will also exclude if API filters it out
    root.remove();
  });
  root.append(img);
  if (photo.status && photo.status !== 'ready') {
    const badge = el('div', { class: 'badge' }, photo.status);
    root.append(badge);
  }
  if (onClick) root.addEventListener('click', () => onClick(photo));
  return root;
}
