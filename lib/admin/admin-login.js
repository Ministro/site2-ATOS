import crypto from 'crypto';
import { criarAdminToken } from '../_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  const configurada = String(process.env.ADMIN_PASSWORD || '');
  const informada = String(req.body?.senha || '');
  if (!configurada) return res.status(500).json({ erro: 'ADMIN_PASSWORD não configurada na Vercel' });
  const a = Buffer.from(configurada);
  const b = Buffer.from(informada);
  const correta = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!correta) return res.status(401).json({ erro: 'Senha incorreta' });
  return res.status(200).json({ ok: true, token: criarAdminToken(), expiraEmHoras: 8 });
}
