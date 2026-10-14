import { put, get } from '@vercel/blob';
import { timingSafeEqual } from 'crypto';
import { isMember } from './_lib.js';

const PATH = 'marks/marks.json';

function authed(req) {
  if (isMember(req)) return true;
  const want = String(process.env.MARKS_TOKEN || '');
  if (!want) return false;
  const h = String(req.headers.authorization || '');
  const url = new URL(req.url, 'http://localhost');
  const got = h.startsWith('Bearer ') ? h.slice(7) : (url.searchParams.get('key') || '');
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readAll() {
  try {
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return [];
    const txt = await new Response(r.stream).text();
    const j = JSON.parse(txt);
    return Array.isArray(j.marks) ? j.marks : [];
  } catch (e) {
    if (/not.?found|404/i.test(String(e && (e.name + e.message)))) return [];
    throw e;
  }
}

async function writeAll(marks) {
  await put(PATH, JSON.stringify({ updatedAt: new Date().toISOString(), marks }), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60
  });
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const c of req) raw += c;
  return JSON.parse(raw || '{}');
}

const FIELDS = ['id','storyId','storyTitle','quote','words','before','after','paragraph','chapter','startWord','endWord','note','resolved','createdAt','updatedAt'];
function clean(m) {
  const o = {};
  FIELDS.forEach(k => { if (m[k] !== undefined) o[k] = typeof m[k] === 'string' ? m[k].slice(0, 4000) : m[k]; });
  return o;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authed(req)) { res.status(401).json({ error: 'auth' }); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    let marks = await readAll();
    if (req.method === 'GET') {
      const story = url.searchParams.get('story');
      const open = url.searchParams.get('open');
      let out = story ? marks.filter(m => m.storyId === story) : marks;
      if (open) out = out.filter(m => !m.resolved);
      res.status(200).json({ count: out.length, marks: out });
      return;
    }
    if (req.method === 'POST') {
      const b = await body(req);
      const incoming = (Array.isArray(b.marks) ? b.marks : [b]).filter(m => m && typeof m.id === 'string' && m.storyId).map(clean);
      const map = new Map(marks.map(m => [m.id, m]));
      incoming.forEach(m => map.set(m.id, Object.assign({}, map.get(m.id) || {}, m)));
      marks = [...map.values()].slice(-2000);
      await writeAll(marks);
      res.status(200).json({ ok: true, count: marks.length });
      return;
    }
    if (req.method === 'DELETE') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
      if (url.searchParams.get('all')) marks = [];
      else if (url.searchParams.get('resolved')) marks = marks.filter(m => !m.resolved);
      else if (ids.length) marks = marks.filter(m => !ids.includes(m.id));
      else { res.status(400).json({ error: 'ids, resolved=1 or all=1' }); return; }
      await writeAll(marks);
      res.status(200).json({ ok: true, count: marks.length });
      return;
    }
    res.status(405).json({ error: 'method' });
  } catch (err) {
    res.status(500).json({ error: 'store', detail: String(err && err.message || err) });
  }
}
