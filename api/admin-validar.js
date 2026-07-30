import { exigirAdmin } from './_admin.js';
export default async function handler(req, res) {
  if (!exigirAdmin(req, res)) return;
  return res.status(200).json({ ok: true });
}
