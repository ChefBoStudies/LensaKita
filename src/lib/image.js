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
        if (view.getUint32(offset, false) !== 0x45786966) break;
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

export async function getExifOrientation(file) {
  const buf = await readAsArrayBuffer(file);
  return parseExifOrientation(buf);
}

export async function compressImage(file, { maxSide = 2000, quality = 0.85 } = {}) {
  const buf = await readAsArrayBuffer(file);
  const orientation = parseExifOrientation(buf);
  const blob = new Blob([buf], { type: file.type });
  const bitmap = await createImageBitmap(blob);

  // Decide whether to rotate
  const isLandscapePixels = bitmap.width >= bitmap.height;
  let rotate = 0; let flipX = false; let flipY = false;
  switch (orientation) {
    case 2: flipX = true; break; // mirror
    case 3: rotate = 180; break;
    case 4: flipY = true; break; // mirror
    case 5: rotate = 270; flipX = true; break;
    case 6: rotate = 90; break;
    case 7: rotate = 90; flipX = true; break;
    case 8: rotate = 270; break;
    default: rotate = 0;
  }
  // If EXIF suggests 90/270 but pixels already portrait, skip rotation
  if ((rotate === 90 || rotate === 270) && !isLandscapePixels) rotate = 0;

  // Scale
  let tw = bitmap.width;
  let th = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(tw, th));
  tw = Math.round(tw * scale);
  th = Math.round(th * scale);

  const swap = rotate === 90 || rotate === 270;
  const cw = swap ? th : tw;
  const ch = swap ? tw : th;

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  if (rotate) ctx.rotate((rotate * Math.PI) / 180);
  if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(bitmap, -tw / 2, -th / 2, tw, th);
  ctx.restore();

  const output = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  const corrected = rotate !== 0 || flipX || flipY;
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
