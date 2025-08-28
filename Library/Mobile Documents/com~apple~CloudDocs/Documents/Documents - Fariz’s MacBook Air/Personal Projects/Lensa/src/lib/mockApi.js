import { getOrCreateDeviceId } from './device.js';

const DB = {
  events: new Map(), // slug -> { id, slug, title, startAt, endAt }
  photos: new Map(), // eventId -> Array<photo>
  reservations: new Map(), // key(eventId|deviceId) -> count
  subs: new Map(), // eventId -> Set<fn>
};

function uuid() { return (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`); }
function key(ev, dev) { return `${ev}|${dev}`; }

function nowIso() { return new Date().toISOString(); }

function ensureEvent(slug) {
  if (DB.events.has(slug)) return DB.events.get(slug);
  const start = new Date(Date.now() - 30 * 60 * 1000); // started 30m ago
  const end = new Date(Date.now() + 11.5 * 60 * 60 * 1000); // ends in 11.5h
  const ev = { id: uuid(), slug, title: 'Wedding Cam', startAt: start.toISOString(), endAt: end.toISOString() };
  DB.events.set(slug, ev);
  DB.photos.set(ev.id, []);
  return ev;
}

function emit(eventId) {
  const set = DB.subs.get(eventId);
  if (!set) return;
  const all = (DB.photos.get(eventId) || []).slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
  for (const fn of set) fn(all);
}

function svgPlaceholder(seed, w = 600, h = 600) {
  const bg = ['#ffe4e6','#e0f2fe','#ede9fe','#dcfce7','#fef9c3'][seed % 5];
  const fg = ['#ff385c','#0ea5e9','#7c3aed','#16a34a','#a16207'][seed % 5];
  const txt = String(seed + 1).padStart(2, '0');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <rect width='100%' height='100%' fill='${bg}'/>
    <circle cx='50%' cy='45%' r='120' fill='${fg}' opacity='0.2'/>
    <text x='50%' y='54%' font-size='72' font-family='system-ui, Inter' fill='${fg}' text-anchor='middle' dominant-baseline='central'>${txt}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function seedPhotos(eventId) {
  const arr = DB.photos.get(eventId) || [];
  if (arr.length) return;
  for (let i = 0; i < 24; i++) {
    arr.push({ id: uuid(), eventId, thumbUrl: svgPlaceholder(i), fullUrl: svgPlaceholder(i, 1200, 1200), width: 600, height: 600, createdAt: nowIso(), status: 'ready' });
  }
  DB.photos.set(eventId, arr);
}

export async function getEventBySlug(slug) {
  const ev = ensureEvent(slug);
  seedPhotos(ev.id);
  return { ...ev, now: nowIso() };
}

export async function createUploadUrl(eventSlug, deviceId, ext = 'jpg') {
  const ev = ensureEvent(eventSlug);
  const count = DB.reservations.get(key(ev.id, deviceId)) || 0;
  if (count >= 5) {
    const err = new Error('limit_reached'); err.status = 403; throw err;
  }
  DB.reservations.set(key(ev.id, deviceId), count + 1);
  const photoId = uuid();
  const objectPath = `events/${ev.id}/original/${photoId}.${ext}`;
  // Signed URL mock
  return { uploadUrl: `mock://${objectPath}`, objectPath };
}

export async function recordPhoto(eventSlug, { objectPath, width, height, dataUrl }) {
  const ev = ensureEvent(eventSlug);
  const photo = { id: uuid(), eventId: ev.id, storagePath: objectPath, thumbUrl: dataUrl, fullUrl: dataUrl, width, height, createdAt: nowIso(), status: 'ready' };
  const arr = DB.photos.get(ev.id) || [];
  arr.unshift(photo);
  DB.photos.set(ev.id, arr);
  emit(ev.id);
  return photo;
}

export function subscribePhotos(eventSlug, cb) {
  const ev = ensureEvent(eventSlug);
  if (!DB.subs.has(ev.id)) DB.subs.set(ev.id, new Set());
  const set = DB.subs.get(ev.id);
  set.add(cb);
  emit(ev.id);
  // Simulate incoming photos every 6–12s
  const timer = setInterval(() => {
    const i = Math.floor(Math.random() * 1000);
    const p = { id: uuid(), eventId: ev.id, thumbUrl: svgPlaceholder(i), fullUrl: svgPlaceholder(i, 1200, 1200), width: 600, height: 600, createdAt: nowIso(), status: 'ready' };
    const arr = DB.photos.get(ev.id) || [];
    arr.unshift(p);
    DB.photos.set(ev.id, arr);
    emit(ev.id);
  }, 6000 + Math.random() * 6000);
  return () => { clearInterval(timer); set.delete(cb); };
}

export function getUsedServerCount(eventSlug, deviceId) {
  const ev = ensureEvent(eventSlug);
  return DB.reservations.get(key(ev.id, deviceId)) || 0;
}
