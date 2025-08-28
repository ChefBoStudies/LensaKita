import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  try {
    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const path = req.query.path;
    if (!path) return res.status(400).send('missing path');
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const r = await fetch(pub.publicUrl);
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await r.arrayBuffer());
    return res.status(200).send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).send('server_error');
  }
}
