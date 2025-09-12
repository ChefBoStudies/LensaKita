import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function shouldRotate(meta) {
  const ori = meta?.orientation || 1;
  const w = meta?.width || 0;
  const h = meta?.height || 0;
  // If EXIF says 90/270 (5..8) but the pixels are already portrait (h > w), skip rotate
  if (ori >= 5 && ori <= 8) return w >= h; // rotate only if pixels are landscape
  // If EXIF says 180 (3/4), rotate when it matters (doesn't swap w/h)
  if (ori === 3 || ori === 4) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const objectPath = req.query.objectPath || req.headers['x-object-path'];
    const skipRotateHint = req.query.skipRotate === '1' || req.headers['x-skip-rotate'] === '1';
    if (!objectPath) return res.status(400).json({ error: 'missing_object_path' });

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    let pipeline = sharp(buffer);
    let meta; try { meta = await pipeline.metadata(); } catch {}

    const doRotate = !skipRotateHint && shouldRotate(meta);
    if (doRotate) pipeline = pipeline.rotate();

    const normalized = await pipeline
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, normalized, { contentType: 'image/jpeg', upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true, rotated: doRotate, orientation: meta?.orientation, width: meta?.width, height: meta?.height });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
