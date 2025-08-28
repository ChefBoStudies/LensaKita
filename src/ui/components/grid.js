import { el } from '../../lib/dom.js';
import { Tile } from './tile.js';

export function Grid({ photos }) {
  const root = el('section', { class: 'grid container', 'aria-label': 'Photo gallery' }, [
    el('div', { class: 'grid-inner' })
  ]);
  const inner = root.firstElementChild;

  function render(items) {
    inner.innerHTML = '';
    for (const p of items) inner.append(Tile({ photo: p }));
  }

  function prepend(photoLike) {
    const node = photoLike instanceof HTMLElement ? photoLike : Tile({ photo: photoLike });
    inner.prepend(node);
    return node;
  }

  render(photos);
  return { root, render, prepend };
}
