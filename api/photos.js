import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  try {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: 'bad_request' });

    const { data: ev, error: evErr } = await supabaseAnon
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single();
    if (evErr || !ev) return res.status(404).json({ error: 'event_not_found' });

    const { data: rows, error: phErr } = await supabaseAnon
      .from('photos')
      .select('id, storage_path, width, height, caption, created_at')
      .eq('event_id', ev.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (phErr) return res.status(500).json({ error: phErr.message });

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const base = process.env.SUPABASE_URL;
    const mapped = (rows || []).map(r => {
      const fullUrl = `${base}/storage/v1/object/public/${bucket}/${r.storage_path}`;
      const thumbUrl = `${base}/storage/v1/render/image/public/${bucket}/${r.storage_path}?width=600&quality=75`;
      return {
        id: r.id,
        storagePath: r.storage_path,
        width: r.width,
        height: r.height,
        caption: r.caption || null,
        createdAt: r.created_at,
        fullUrl,
        thumbUrl,
      };
    });

    return res.status(200).json({ eventId: ev.id, photos: mapped });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
