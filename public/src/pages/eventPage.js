import { el } from '../lib/dom.js';
import { Header } from '../ui/components/header.js';
import { Counter } from '../ui/components/counter.js';
import { Uploader } from '../ui/components/uploader.js';
import { Grid } from '../ui/components/grid.js';
import { Empty } from '../ui/components/empty.js';
import { toast } from '../ui/components/toast.js';
import { compressImage, blobToDataURL } from '../lib/image.js';
import { getOrCreateDeviceId, getUsedCount, incUsedCount, setUsedCount } from '../lib/device.js';
import { getEventBySlug, createUploadUrl, recordPhoto, subscribePhotos, getUsedServerCount, listPhotosReal } from '../lib/mockApi.js';
import { Lightbox } from '../ui/components/modal.js';

function deriveState(nowIso, startIso, endIso) {
  const now = new Date(nowIso).getTime();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (now < start) return 'pre';
  if (now > end) return 'closed';
  return 'live';
}

export function EventPage({ slug }) {
  const deviceId = getOrCreateDeviceId();
  const shell = el('main');
  let grid, counter, uploader;
  let remaining = 5;
  const useReal = Boolean(globalThis.window?.__USE_REAL_API__);
  let poller = null;

  async function init() {
    const event = await getEventBySlug(slug);
    const state = deriveState(event.now, event.startAt, event.endAt);
    const serverUsed = getUsedServerCount(slug, deviceId);
    const localUsed = getUsedCount(slug);
    const used = Math.max(serverUsed, localUsed);
    setUsedCount(slug, used);
    remaining = Math.max(0, 5 - used);

    shell.append(Header({ title: event.title }));
    counter = Counter({ remaining });
    shell.append(counter.root);

    if (state === 'live') {
      uploader = Uploader({ onFiles: onFiles, disabled: remaining <= 0 });
      shell.append(uploader.root);
    }

    grid = Grid({ photos: [], onTileClick: openLightbox });
    shell.append(grid.root);

    if (useReal) {
      await refreshPhotos();
      poller = setInterval(refreshPhotos, 12000);
    } else {
      const unsub = subscribePhotos(slug, (items) => {
        grid.render(items);
        if (!items.length) shell.append(Empty({ kind: 'empty' }));
      });
      shell._cleanup = () => unsub();
    }

    if (state !== 'live') {
      shell.append(Empty({ kind: state }));
    }

    if (!shell._cleanup) shell._cleanup = () => { if (poller) clearInterval(poller); };
  }

  async function refreshPhotos() {
    try {
      const { photos } = await listPhotosReal(slug);
      grid.render(photos);
    } catch (e) {
      console.error(e);
    }
  }

  function openLightbox(photo) {
    const lb = Lightbox({ photo, onClose: () => {} });
    lb.open();
  }

  async function onFiles(files) {
    if (remaining <= 0) {
      toast('You reached the 5 photo limit.', 'error');
      return;
    }
    const cap = Math.min(files.length, remaining);
    for (let i = 0; i < cap; i++) {
      const f = files[i];
      let tempNode;
      try {
        const { blob, width, height } = await compressImage(f, { maxSide: 2000, quality: 0.85 });
        const dataUrl = await blobToDataURL(blob);
        const { objectPath, uploadUrl, token } = await createUploadUrl(slug, deviceId, 'jpg', '');
        const temp = { id: `local_${i}_${Date.now()}`, thumbUrl: dataUrl, status: 'loading' };
        tempNode = grid.prepend(temp);

        const fd = new FormData();
        fd.append('file', blob, 'photo.jpg');
        if (token) fd.append('token', token);
        const up = await fetch(uploadUrl, { method: 'POST', body: fd });
        const upText = await up.text().catch(() => '');
        if (!up.ok) throw new Error(`upload_failed ${up.status} ${upText}`);

        const rec = await recordPhoto(slug, { objectPath, width, height, caption: '' });
        tempNode.remove();
        const used = incUsedCount(slug);
        remaining = Math.max(0, 5 - used);
        counter.render(remaining);
        uploader?.setDisabled(remaining <= 0);
        if (useReal) await refreshPhotos();
        toast('Upload complete!', 'success');
      } catch (e) {
        console.error(e);
        if (tempNode) tempNode.remove();
        toast(`Upload failed. ${e?.message || ''}`.trim(), 'error');
        break;
      }
    }
  }

  init();
  return shell;
}
