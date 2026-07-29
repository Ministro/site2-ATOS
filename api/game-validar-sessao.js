import { limitarMetodo, validarToken } from './_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  const dados = validarToken(req.body?.token);
  if (!dados) return res.status(401).json({ valido: false });
  return res.status(200).json({ valido: true, expiraEm: dados.exp });
}
