import { issueSignedToken, presignUrl } from '@vercel/blob';

const FILES = {
  'first-water': 'ark-survey-ch01-v2-leo.mp3'
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method' });
    return;
  }
  const url = new URL(req.url, 'http://localhost');
  const book = url.searchParams.get('book') || 'first-water';
  const pathname = FILES[book];
  if (!pathname) {
    res.status(404).json({ error: 'unknown book' });
    return;
  }
  try {
    const validUntil = Date.now() + 40 * 60 * 1000;
    const token = await issueSignedToken({
      pathname,
      operations: ['get', 'head'],
      validUntil,
      storeId: process.env.BLOB_STORE_ID
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil
    });
    res.status(200).json({ url: presignedUrl, expires: validUntil });
  } catch (err) {
    res.status(500).json({ error: 'sign failed', detail: String(err && err.message || err) });
  }
}
