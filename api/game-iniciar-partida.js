import { cpfValido, limparCpf, limitarMetodo, supabase, criarToken } from './_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  try {
    const cpf = limparCpf(req.body?.cpf);
    if (!cpfValido(cpf)) return res.status(400).json({ autorizado: false, erro: 'CPF inválido' });

    const resultado = await supabase('rpc/game_iniciar_partida', {
      method: 'POST',
      body: JSON.stringify({ p_cpf: cpf })
    });

    const linha = Array.isArray(resultado) ? resultado[0] : resultado;
    if (!linha?.autorizado) {
      return res.status(403).json({ autorizado: false, creditosRestantes: 0, erro: 'Você não possui créditos disponíveis' });
    }

    return res.status(200).json({
      autorizado: true,
      creditosRestantes: Number(linha.creditos_restantes || 0),
      token: criarToken(cpf)
    });
  } catch (e) {
    console.error('Iniciar partida:', e);
    return res.status(500).json({ autorizado: false, erro: 'Não foi possível iniciar a partida' });
  }
}
