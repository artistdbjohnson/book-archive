import { createHash } from 'crypto';

export function memberToken() {
  const code = String(process.env.ARCHIVE_ACCESS_CODE || '');
  if (!code) return '';
  return createHash('sha256')
    .update(code + '|' + String(process.env.BLOB_STORE_ID || 'archive'))
    .digest('hex');
}

export function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const hit = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

export function isMember(req) {
  const token = memberToken();
  if (!token) return false;
  return readCookie(req, 'archive_member') === token;
}
