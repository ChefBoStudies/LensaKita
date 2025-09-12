function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsArrayBuffer(file);
  });
}

function parseExifOrientation(buf) {
  try {
    const view = new DataView(buf);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false); offset += 2;
      if (marker === 0xFFE1) {
        const length = view.getUint16(offset, false); offset += 2;
        if (view.getUint32(offset, false) !== 0x45786966) break; // 'Exif'
        offset += 6;
        const tiff = offset;
        const little = view.getUint16(tiff, false) === 0x4949;
        const firstIFD = view.getUint32(tiff + 4, little);
        if (firstIFD < 0x00000008) return 1;
        const dirStart = tiff + firstIFD;
        const entries = view.getUint16(dirStart, little);
        for (let i = 0; i < entries; i++) {
          const entry = dirStart + 2 + i * 12;
          const tag = view.getUint16(entry, little);
          if (tag === 0x0112) { return view.getUint16(entry + 8, little) || 1; }
        }
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        const length = view.getUint16(offset, false);
        offset += length;
      }
    }
  } catch {}
  return 1;
}

function getDrawParams(orientation) {
  switch (orientation) {
    case 2: return { rotate: 0, flipX: true, flipY: false };
    case 3: return { rotate: 180, flipX: false, flipY: false };
    case 4: return { rotate: 180, flipX: true, flipY: false };
    case 5: return { rotate: 90, flipX: true, flipY: false };
    case 6: return { rotate: 90, flipX: false, flipY: false };
    case 7: return { rotate: 270, flipX: true, flipY: false };
    case 8: return { rotate: 270, flipX: false, flipY: false };
    default: return { rotate: 0, flipX: false, flipY: false };
  }
}

export async function compressImage(file, { maxSide = 2000, quality = 0.85 } = {}) {
  const buf = await readAsArrayBuffer(file);
  const orientation = parseExifOrientation(buf);
  const blob = new Blob([buf], { type: file.type });
  const bitmap = await createImageBitmap(blob);

  let tw = bitmap.width;
  let th = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(tw, th));
  tw = Math.round(tw * scale);
  th = Math.round(th * scale);

  const orient = getDrawParams(orientation);
  const rotate = orient.rotate || 0;
  const swap = rotate === 90 || rotate === 270;
  const cw = swap ? th : tw;
  const ch = swap ? tw : th;

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  if (rotate) ctx.rotate((rotate * Math.PI) / 180);
  const flipX = orient.flipX ? -1 : 1;
  const flipY = orient.flipY ? -1 : 1;
  ctx.scale(flipX, flipY);
  ctx.drawImage(bitmap, -tw / 2, -th / 2, tw, th);
  ctx.restore();

  const output = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  const corrected = orientation !== 1;
  return { blob: output, width: cw, height: ch, corrected };
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
