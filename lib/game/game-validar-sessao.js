import { limitarMetodo, validarToken, supabase } from '../_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  try {
    const dadosToken = validarToken(req.body?.token);
    if (!dadosToken) return res.status(401).json({ valido: false });

    const dados = await supabase(`game_clientes?cpf=eq.${encodeURIComponent(dadosToken.cpf)}&select=creditos&limit=1`);
    const cliente = dados?.[0];
    if (!cliente) return res.status(404).json({ valido: false, creditos: 0 });

    return res.status(200).json({
      valido: true,
      creditos: Number(cliente.creditos || 0),
      expiraEm: dadosToken.exp
    });
  } catch (e) {
    console.error('Validar sessão:', e);
    return res.status(500).json({ valido: false, erro: 'Não foi possível validar a sessão' });
  }
}
