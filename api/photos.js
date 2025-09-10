import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function headOk(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  try {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: 'bad_request' });

    const { data: ev, error: evErr } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single();
    if (evErr || !ev) return res.status(404).json({ error: 'event_not_found' });

    const { data: rows, error: phErr } = await supabaseAdmin
      .from('photos')
      .select('id, storage_path, width, height, caption, created_at')
      .eq('event_id', ev.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (phErr) return res.status(500).json({ error: phErr.message });

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';

    // Build items with absolute public URLs for validation, but return proxied URLs for the UI
    const validated = [];
    for (const r of rows || []) {
      const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(r.storage_path);
      const ok = pub?.publicUrl ? await headOk(pub.publicUrl) : false;
      if (ok) {
        validated.push({
          id: r.id,
          storagePath: r.storage_path,
          width: r.width,
          height: r.height,
          caption: r.caption || null,
          createdAt: r.created_at,
          fullUrl: `/api/img?path=${encodeURIComponent(r.storage_path)}`,
          thumbUrl: `/api/img?path=${encodeURIComponent(r.storage_path)}`,
        });
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ eventId: ev.id, photos: validated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
