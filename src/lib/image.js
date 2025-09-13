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

// Deprecated: we now upload originals and normalize on server
export async function compressImage(file, { maxSide = 2000, quality = 0.85 } = {}) {
  const buf = await readAsArrayBuffer(file);
  return { blob: new Blob([buf], { type: file.type || 'image/jpeg' }), width: null, height: null, corrected: false };
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
