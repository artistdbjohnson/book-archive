import { isMember, memberToken } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    res.status(200).json({ member: isMember(req) });
    return;
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'archive_member=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    res.status(200).json({ member: false });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method' });
    return;
  }
  const expected = String(process.env.ARCHIVE_ACCESS_CODE || '');
  if (!expected) {
    res.status(503).json({ error: 'Access code is not set yet.' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const code = String((body && body.code) || '').trim();
  if (!code || code !== expected) {
    res.status(401).json({ error: 'Wrong code.' });
    return;
  }
  const token = memberToken();
  res.setHeader('Set-Cookie', `archive_member=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  res.status(200).json({ member: true });
}
