import { el } from '../../lib/dom.js';

export function Tile({ photo }) {
  const root = el('div', { class: 'tile card shadow-200' });
  if (photo.status === 'loading') {
    root.append(el('div', { class: 'shimmer', 'aria-hidden': 'true' }));
  }
  const img = el('img', { src: photo.thumbUrl, alt: 'Guest photo', loading: 'lazy', decoding: 'async' });
  root.append(img);
  if (photo.status && photo.status !== 'ready') {
    const badge = el('div', { class: 'badge' }, photo.status);
    root.append(badge);
  }
  return root;
}
