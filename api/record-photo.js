import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { eventSlug, deviceId, storagePath, width, height, caption } = req.body || {};
    if (!eventSlug || !deviceId || !storagePath) return res.status(400).json({ error: 'bad_request' });

    const { data: ev, error: evErr } = await supabase.from('events').select('id').eq('slug', eventSlug).single();
    if (evErr || !ev) return res.status(404).json({ error: 'event_not_found' });

    const { error: insErr } = await supabase.from('photos').insert({
      event_id: ev.id,
      device_id: deviceId,
      storage_path: storagePath,
      width: width || null,
      height: height || null,
      caption: caption ? String(caption).slice(0, 120) : null
    });
    if (insErr) return res.status(500).json({ error: insErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
