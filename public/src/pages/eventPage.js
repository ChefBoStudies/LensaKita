import { el } from '../lib/dom.js';
import { Header } from '../ui/components/header.js';
import { Counter } from '../ui/components/counter.js';
import { Uploader } from '../ui/components/uploader.js';
import { Grid } from '../ui/components/grid.js';
import { Empty } from '../ui/components/empty.js';
import { toast } from '../ui/components/toast.js';
import { compressImage, blobToDataURL } from '../lib/image.js';
import { getOrCreateDeviceId, getUsedCount, incUsedCount, setUsedCount } from '../lib/device.js';
import { getEventBySlug, createUploadUrl, recordPhoto, subscribePhotos, getUsedServerCount } from '../lib/mockApi.js';

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

  async function init() {
    const event = await getEventBySlug(slug);
    const state = deriveState(event.now, event.startAt, event.endAt);
    // sync local remaining with server reservation count
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

    grid = Grid({ photos: [] });
    shell.append(grid.root);

    const unsub = subscribePhotos(slug, (items) => {
      grid.render(items);
      if (!items.length) shell.append(Empty({ kind: 'empty' }));
    });

    if (state !== 'live') {
      shell.append(Empty({ kind: state }));
    }

    shell._cleanup = () => unsub();
  }

  async function onFiles(files) {
    if (remaining <= 0) {
      toast('You reached the 5 photo limit.', 'error');
      return;
    }
    const cap = Math.min(files.length, remaining);
    for (let i = 0; i < cap; i++) {
      const f = files[i];
      try {
        const { blob, width, height } = await compressImage(f, { maxSide: 2000, quality: 0.85 });
        const dataUrl = await blobToDataURL(blob);
        const { objectPath } = await createUploadUrl(slug, deviceId, 'jpg');
        // Optimistic tile
        const temp = { id: `local_${i}_${Date.now()}`, thumbUrl: dataUrl, status: 'loading' };
        const tempNode = grid.prepend(temp);
        // Record final photo (mock)
        await recordPhoto(slug, { objectPath, width, height, dataUrl });
        tempNode.remove();
        const used = incUsedCount(slug);
        remaining = Math.max(0, 5 - used);
        counter.render(remaining);
        uploader?.setDisabled(remaining <= 0);
      } catch (e) {
        console.error(e);
        toast('Upload failed. Try again.', 'error');
        break;
      }
    }
    toast('Upload complete!', 'success');
  }

  init();
  return shell;
}
