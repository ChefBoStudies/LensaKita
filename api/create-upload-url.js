import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { eventSlug, deviceId, ext = 'jpg', caption = '' } = req.body || {};
    if (!eventSlug || !deviceId) return res.status(400).json({ error: 'bad_request' });

    const { data: slotData, error: slotErr } = await supabase.rpc('reserve_upload_slot', {
      event_slug: eventSlug,
      device_id: deviceId
    });
    if (slotErr) {
      const code = slotErr.message?.includes('limit_reached') ? 403 : 400;
      return res.status(code).json({ error: slotErr.message });
    }

    const { data: ev, error: evErr } = await supabase.from('events').select('id').eq('slug', eventSlug).single();
    if (evErr || !ev) return res.status(404).json({ error: 'event_not_found' });

    const photoId = crypto.randomUUID();
    const objectPath = `events/${ev.id}/original/${photoId}.${ext}`;

    const bucket = process.env.SUPABASE_BUCKET || 'wedding';
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, {
        upsert: false,
        contentType: 'image/jpeg'
      });
    if (signErr) return res.status(500).json({ error: signErr.message });

    return res.status(200).json({
      uploadUrl: signed.signedUrl,
      token: signed.token,
      objectPath,
      caption: String(caption || '').slice(0, 120)
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
