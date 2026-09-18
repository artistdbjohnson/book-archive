import { isMember } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ member: isMember(req) });
}
