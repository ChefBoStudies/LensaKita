import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const objectPath = req.query.objectPath || req.headers['x-object-path'];
    if (!objectPath) return res.status(400).json({ error: 'missing_object_path' });

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    let pipeline = sharp(buffer);
    let meta; try { meta = await pipeline.metadata(); } catch {}

    // If client provides EXIF orientation, prefer that. Else auto-rotate via metadata.
    const headerOri = Number(req.headers['x-exif-orientation'] || req.query.exifOrientation);
    if (Number.isInteger(headerOri) && headerOri >= 2 && headerOri <= 8) {
      switch (headerOri) {
        case 2: pipeline = pipeline.flop(); break;                 // mirror horizontal
        case 3: pipeline = pipeline.rotate(180); break;            // 180°
        case 4: pipeline = pipeline.flip(); break;                 // mirror vertical
        case 5: pipeline = pipeline.rotate(270).flop(); break;     // mirror horizontal + 270°
        case 6: pipeline = pipeline.rotate(90); break;             // 90° CW
        case 7: pipeline = pipeline.rotate(90).flop(); break;      // mirror horizontal + 90°
        case 8: pipeline = pipeline.rotate(270); break;            // 270° CW
        default: break;
      }
    } else {
      // Auto-rotate based on embedded EXIF
      pipeline = pipeline.rotate();
      // If no EXIF and client hinted intended orientation, enforce it
      const wantsPortrait = req.headers['x-wants-portrait'] === '1';
      const wantsLandscape = req.headers['x-wants-landscape'] === '1';
      if (wantsPortrait || wantsLandscape) {
        const m = await pipeline.metadata().catch(() => ({}));
        const isPortrait = (m?.height || 0) > (m?.width || 0);
        if (wantsPortrait && !isPortrait) {
          pipeline = pipeline.rotate(90);
        } else if (wantsLandscape && isPortrait) {
          pipeline = pipeline.rotate(90);
        }
      }
    }

    const { data: normalized, info } = await pipeline
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, chromaSubsampling: '4:4:4' })
      .toBuffer({ resolveWithObject: true });

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, normalized, { contentType: 'image/jpeg', upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true, orientation: meta?.orientation || null, width: info?.width || null, height: info?.height || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
