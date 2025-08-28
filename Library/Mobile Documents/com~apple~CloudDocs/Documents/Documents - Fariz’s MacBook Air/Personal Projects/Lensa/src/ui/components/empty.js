import { el } from '../../lib/dom.js';

export function Empty({ kind, event }) {
  const title = kind === 'pre' ? 'We start soon' : kind === 'closed' ? 'Event closed' : 'No photos yet';
  const desc = kind === 'pre' ? 'Come back when the event starts.' : kind === 'closed' ? 'Uploads are closed. Check back for the final album.' : 'Be the first to share a photo!';
  const root = el('div', { class: 'empty container' }, [
    el('div', { class: 'h2', style: { marginBottom: '8px' } }, title),
    el('div', { class: 'mute' }, desc)
  ]);
  return root;
}
