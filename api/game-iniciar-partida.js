import { cpfValido, limparCpf, limitarMetodo, supabase, criarToken } from './_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  try {
    const cpf = limparCpf(req.body?.cpf);
    if (!cpfValido(cpf)) return res.status(400).json({ autorizado: false, erro: 'CPF inválido' });

    const dados = await supabase(`game_clientes?cpf=eq.${encodeURIComponent(cpf)}&select=creditos&limit=1`);
    const cliente = dados?.[0];
    const creditos = Number(cliente?.creditos || 0);
    if (!cliente || creditos < 1) {
      return res.status(403).json({ autorizado: false, creditosRestantes: 0, erro: 'Você não possui créditos disponíveis' });
    }

    return res.status(200).json({
      autorizado: true,
      creditosRestantes: creditos,
      token: criarToken(cpf)
    });
  } catch (e) {
    console.error('Iniciar sessão de jogo:', e);
    return res.status(500).json({ autorizado: false, erro: 'Não foi possível abrir o jogo' });
  }
}
