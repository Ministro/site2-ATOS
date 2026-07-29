import { limitarMetodo, validarToken, supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  try {
    const dadosToken = validarToken(req.body?.token);
    if (!dadosToken) return res.status(401).json({ autorizado: false, erro: 'Sessão expirada. Consulte o CPF novamente.' });

    const resultado = await supabase('rpc/game_iniciar_partida', {
      method: 'POST',
      body: JSON.stringify({ p_cpf: dadosToken.cpf })
    });
    const linha = Array.isArray(resultado) ? resultado[0] : resultado;
    if (!linha?.autorizado) {
      return res.status(403).json({ autorizado: false, creditosRestantes: 0, erro: 'Seus créditos acabaram.' });
    }

    return res.status(200).json({
      autorizado: true,
      creditosRestantes: Number(linha.creditos_restantes || 0)
    });
  } catch (e) {
    console.error('Usar crédito:', e);
    return res.status(500).json({ autorizado: false, erro: 'Não foi possível utilizar o crédito' });
  }
}
