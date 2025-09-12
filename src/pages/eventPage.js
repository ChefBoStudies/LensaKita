import { el } from '../lib/dom.js';
import { Header } from '../ui/components/header.js';
import { Counter } from '../ui/components/counter.js';
import { Uploader } from '../ui/components/uploader.js';
import { Grid } from '../ui/components/grid.js';
import { Empty } from '../ui/components/empty.js';
import { toast } from '../ui/components/toast.js';
import { compressImage, blobToDataURL } from '../lib/image.js';
import { getOrCreateDeviceId, setUsedCount } from '../lib/device.js';
import { getEventBySlug, createUploadUrl, recordPhoto, subscribePhotos, listPhotosReal } from '../lib/mockApi.js';
import { Lightbox } from '../ui/components/modal.js';

export function EventPage({ slug }) {
  const deviceId = getOrCreateDeviceId();
  const shell = el('main');
  let grid, counter, uploader;
  let remaining = 5;
  const useReal = Boolean(globalThis.window?.__USE_REAL_API__);
  let poller = null;

  async function fetchRemaining() {
    const r = await fetch(`/api/remaining?slug=${encodeURIComponent(slug)}&deviceId=${encodeURIComponent(deviceId)}`);
    if (r.ok) {
      const { used, remaining: rem } = await r.json();
      setUsedCount(slug, used);
      remaining = rem;
      if (counter) counter.render(remaining);
      if (uploader) uploader.setDisabled(remaining <= 0);
    }
  }

  async function init() {
    const event = await getEventBySlug(slug);

    shell.append(Header({ title: event.title }));
    counter = Counter({ remaining });
    shell.append(counter.root);

    uploader = Uploader({ onFiles: onFiles, disabled: remaining <= 0 });
    shell.append(uploader.root);

    grid = Grid({ photos: [], onTileClick: openLightbox });
    shell.append(grid.root);

    if (useReal) {
      await refreshPhotos();
      poller = setInterval(refreshPhotos, 12000);
      await fetchRemaining();
    } else {
      const unsub = subscribePhotos(slug, (items) => { grid.render(items); if (!items.length) shell.append(Empty({ kind: 'empty' })); });
      shell._cleanup = () => unsub();
    }

    if (!shell._cleanup) shell._cleanup = () => { if (poller) clearInterval(poller); };
  }

  async function refreshPhotos() { try { const { photos } = await listPhotosReal(slug); grid.render(photos); } catch (e) { console.error(e); } }

  function openLightbox(photo) { const lb = Lightbox({ photo, onClose: () => {} }); lb.open(); }

  async function onFiles(files) {
    if (remaining <= 0) { toast('You reached the 5 photo limit.', 'error'); return; }
    const cap = Math.min(files.length, remaining);
    for (let i = 0; i < cap; i++) {
      const f = files[i];
      let tempNode;
      try {
        const { blob, width, height, corrected } = await compressImage(f, { maxSide: 2000, quality: 0.85 });
        const dataUrl = await blobToDataURL(blob);
        const { objectPath } = await createUploadUrl(slug, deviceId, 'jpg', '');
        const temp = { id: `local_${i}_${Date.now()}`, thumbUrl: dataUrl, status: 'loading' };
        tempNode = grid.prepend(temp);

        const up = await fetch(`/api/upload-proxy?objectPath=${encodeURIComponent(objectPath)}` + (corrected ? '&skipRotate=1' : ''), { method: 'POST', headers: { 'x-content-type': 'image/jpeg' }, body: blob });
        const upText = await up.text().catch(() => '');
        if (!up.ok) throw new Error(`upload_failed ${up.status} ${upText}`);

        await recordPhoto(slug, { objectPath, width, height, caption: '' });
        tempNode.remove();
        await fetchRemaining();
        if (useReal) await refreshPhotos();
        toast('Upload complete!', 'success');
      } catch (e) { console.error(e); if (tempNode) tempNode.remove(); toast(`Upload failed. ${e?.message || ''}`.trim(), 'error'); break; }
    }
  }

  init();
  return shell;
}
