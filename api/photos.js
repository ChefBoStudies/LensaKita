import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

    const paths = (rows || []).map(r => r.storage_path);
    let existing = new Set(paths);
    if (paths.length) {
      const { data: objs, error: soErr } = await supabaseAdmin
        .from('storage.objects')
        .select('name')
        .eq('bucket_id', process.env.SUPABASE_BUCKET || 'wedding')
        .in('name', paths)
        .is('deleted_at', null);
      if (!soErr && objs) existing = new Set(objs.map(o => o.name));
    }

    const mapped = (rows || [])
      .filter(r => existing.has(r.storage_path))
      .map(r => ({
        id: r.id,
        storagePath: r.storage_path,
        width: r.width,
        height: r.height,
        caption: r.caption || null,
        createdAt: r.created_at,
        fullUrl: `/api/img?path=${encodeURIComponent(r.storage_path)}`,
        thumbUrl: `/api/img?path=${encodeURIComponent(r.storage_path)}`,
      }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ eventId: ev.id, photos: mapped });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
