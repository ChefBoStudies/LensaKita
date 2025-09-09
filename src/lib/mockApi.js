import { getOrCreateDeviceId } from './device.js';

const USE_REAL = Boolean(globalThis?.window?.__USE_REAL_API__);

const DB = { events: new Map(), photos: new Map(), reservations: new Map(), subs: new Map() };

function uuid() { return (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`); }
function key(ev, dev) { return `${ev}|${dev}`; }
function nowIso() { return new Date().toISOString(); }

async function realGetEventBySlug(slug) {
  const r = await fetch(`/api/event?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) throw new Error('event_not_found');
  return r.json();
}

async function realCreateUploadUrl(eventSlug, deviceId, ext, caption) {
  const r = await fetch('/api/create-upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventSlug, deviceId, ext, caption }) });
  if (!r.ok) { const t = await r.json().catch(() => ({})); const err = new Error(t.error || 'upload_error'); err.status = r.status; throw err; }
  return r.json();
}

async function realRecordPhoto(eventSlug, payload) {
  const r = await fetch('/api/record-photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventSlug, deviceId: getOrCreateDeviceId(), ...payload }) });
  if (!r.ok) throw new Error('record_error');
  return r.json();
}

async function realListPhotos(slug) { const r = await fetch(`/api/photos?slug=${encodeURIComponent(slug)}`); if (!r.ok) throw new Error('photos_error'); return r.json(); }

function ensureEvent(slug) { if (DB.events.has(slug)) return DB.events.get(slug); const ev = { id: uuid(), slug, title: 'Wedding Cam' }; DB.events.set(slug, ev); DB.photos.set(ev.id, []); return ev; }

function emit(eventId) { const set = DB.subs.get(eventId); if (!set) return; const all = (DB.photos.get(eventId) || []).slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200); for (const fn of set) fn(all); }

function svgPlaceholder(seed, w = 600, h = 600) { const bg = ['#ffe4e6','#e0f2fe','#ede9fe','#dcfce7','#fef9c3'][seed % 5]; const fg = ['#ff385c','#0ea5e9','#7c3aed','#16a34a','#a16207'][seed % 5]; const txt = String(seed + 1).padStart(2, '0'); const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${bg}'/><circle cx='50%' cy='45%' r='120' fill='${fg}' opacity='0.2'/><text x='50%' y='54%' font-size='72' font-family='system-ui, Inter' fill='${fg}' text-anchor='middle' dominant-baseline='central'>${txt}</text></svg>`; return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }

function seedPhotos(eventId) { const arr = DB.photos.get(eventId) || []; if (arr.length) return; for (let i = 0; i < 24; i++) { arr.push({ id: uuid(), eventId, thumbUrl: svgPlaceholder(i), fullUrl: svgPlaceholder(i, 1200, 1200), width: 600, height: 600, createdAt: nowIso(), status: 'ready' }); } DB.photos.set(eventId, arr); }

export async function getEventBySlug(slug) { if (USE_REAL) return realGetEventBySlug(slug); const ev = ensureEvent(slug); seedPhotos(ev.id); return { slug: ev.slug, title: ev.title }; }

export async function createUploadUrl(eventSlug, deviceId, ext = 'jpg', caption = '') { if (USE_REAL) return realCreateUploadUrl(eventSlug, deviceId, ext, caption); const ev = ensureEvent(eventSlug); const count = DB.reservations.get(key(ev.id, deviceId)) || 0; if (count >= 5) { const err = new Error('limit_reached'); err.status = 403; throw err; } DB.reservations.set(key(ev.id, deviceId), count + 1); const photoId = uuid(); const objectPath = `events/${ev.id}/original/${photoId}.${ext}`; return { uploadUrl: `mock://${objectPath}`, objectPath, caption }; }

export async function recordPhoto(eventSlug, { objectPath, width, height, dataUrl, caption }) { if (USE_REAL) return realRecordPhoto(eventSlug, { storagePath: objectPath, width, height, caption }); const ev = ensureEvent(eventSlug); const photo = { id: uuid(), eventId: ev.id, storagePath: objectPath, thumbUrl: dataUrl, fullUrl: dataUrl, width, height, createdAt: nowIso(), status: 'ready', caption: caption || null }; const arr = DB.photos.get(ev.id) || []; arr.unshift(photo); DB.photos.set(ev.id, arr); emit(ev.id); return photo; }

export function subscribePhotos(eventSlug, cb) { const ev = ensureEvent(eventSlug); if (!DB.subs.has(ev.id)) DB.subs.set(ev.id, new Set()); const set = DB.subs.get(ev.id); set.add(cb); emit(ev.id); return () => { set.delete(cb); }; }

export async function listPhotosReal(slug) { return realListPhotos(slug); }

export function getUsedServerCount(eventSlug, deviceId) {
  const ev = ensureEvent(eventSlug);
  return DB.reservations.get(key(ev.id, deviceId)) || 0;
}
