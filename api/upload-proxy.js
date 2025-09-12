import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const objectPath = req.query.objectPath || req.headers['x-object-path'];
    const skipRotate = req.query.skipRotate === '1' || req.headers['x-skip-rotate'] === '1';
    if (!objectPath) return res.status(400).json({ error: 'missing_object_path' });

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    let normalized;
    try {
      let p = sharp(buffer);
      if (!skipRotate) p = p.rotate();
      normalized = await p
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, chromaSubsampling: '4:4:4' })
        .toBuffer();
    } catch (e) {
      normalized = buffer;
    }

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, normalized, { contentType: 'image/jpeg', upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
