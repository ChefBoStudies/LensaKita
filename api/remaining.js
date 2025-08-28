import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  try {
    const { slug, deviceId } = req.query;
    if (!slug || !deviceId) return res.status(400).json({ error: 'bad_request' });
    const { data: ev, error: evErr } = await supabase.from('events').select('id').eq('slug', slug).single();
    if (evErr || !ev) return res.status(404).json({ error: 'event_not_found' });
    const { count, error: cErr } = await supabase
      .from('upload_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', ev.id)
      .eq('device_id', deviceId);
    if (cErr) return res.status(500).json({ error: cErr.message });
    return res.status(200).json({ used: count || 0, remaining: Math.max(0, 5 - (count || 0)) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
