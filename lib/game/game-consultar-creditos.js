import { cpfValido, limparCpf, limitarMetodo, supabase } from '../_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;
  try {
    const cpf = limparCpf(req.body?.cpf);
    if (!cpfValido(cpf)) return res.status(400).json({ erro: 'CPF inválido' });

    const dados = await supabase(`game_clientes?cpf=eq.${encodeURIComponent(cpf)}&select=nome,creditos&limit=1`);
    const cliente = dados?.[0];
    if (!cliente) return res.status(404).json({ encontrado: false, creditos: 0, erro: 'CPF não encontrado' });

    return res.status(200).json({
      encontrado: true,
      nome: cliente.nome || '',
      creditos: Number(cliente.creditos || 0)
    });
  } catch (e) {
    console.error('Consultar créditos:', e);
    return res.status(500).json({ erro: 'Não foi possível consultar os créditos' });
  }
}
