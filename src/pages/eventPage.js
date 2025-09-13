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
        // Upload original file; server normalizes orientation and resizes
        const dataUrl = await blobToDataURL(f);
        const { objectPath } = await createUploadUrl(slug, deviceId, 'jpg', '');
        const temp = { id: `local_${i}_${Date.now()}`, thumbUrl: dataUrl, status: 'loading' };
        tempNode = grid.prepend(temp);

        // Extract EXIF orientation on client for reliability across mobile browsers
        let exifOrientationHeader = {};
        // Also compute displayed orientation as a fallback hint (portrait/landscape)
        let orientationHintHeader = {};
        try {
          const blobUrl = URL.createObjectURL(f);
          const img = new Image();
          const dims = await new Promise((resolve, reject) => {
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = reject;
            img.src = blobUrl;
          });
          URL.revokeObjectURL(blobUrl);
          if (dims && dims.w && dims.h) {
            if (dims.h > dims.w) orientationHintHeader = { 'x-wants-portrait': '1' };
            else if (dims.w > dims.h) orientationHintHeader = { 'x-wants-landscape': '1' };
          }
        } catch {}
        try {
          const arr = await f.arrayBuffer();
          const view = new DataView(arr);
          let ori = 1;
          if (view.getUint16(0, false) === 0xFFD8) {
            let offset = 2;
            while (offset < view.byteLength) {
              const marker = view.getUint16(offset, false); offset += 2;
              if (marker === 0xFFE1) {
                const len = view.getUint16(offset, false); offset += 2;
                if (view.getUint32(offset, false) !== 0x45786966) break;
                offset += 6;
                const tiff = offset;
                const little = view.getUint16(tiff, false) === 0x4949;
                const firstIFD = view.getUint32(tiff + 4, little);
                const dirStart = tiff + firstIFD;
                const entries = view.getUint16(dirStart, little);
                for (let i = 0; i < entries; i++) {
                  const entry = dirStart + 2 + i * 12;
                  const tag = view.getUint16(entry, little);
                  if (tag === 0x0112) { ori = view.getUint16(entry + 8, little) || 1; break; }
                }
              } else {
                const len = view.getUint16(offset, false);
                offset += len;
              }
            }
          }
          if (ori && ori !== 1) exifOrientationHeader = { 'x-exif-orientation': String(ori) };
        } catch {}

        const up = await fetch(`/api/upload-proxy?objectPath=${encodeURIComponent(objectPath)}`, { method: 'POST', headers: { 'x-content-type': f.type || 'image/jpeg', ...exifOrientationHeader, ...orientationHintHeader }, body: f });
        const upText = await up.text().catch(() => '');
        if (!up.ok) throw new Error(`upload_failed ${up.status} ${upText}`);
        let width = null, height = null;
        try { const j = JSON.parse(upText); width = j.width || null; height = j.height || null; } catch {}

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
