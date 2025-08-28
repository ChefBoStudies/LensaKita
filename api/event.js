import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req, res) {
  try {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: 'bad_request' });
    const { data, error } = await supabase.from('events').select('slug,title,start_at,end_at').eq('slug', slug).single();
    if (error || !data) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ slug: data.slug, title: data.title, startAt: data.start_at, endAt: data.end_at, now: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
}
