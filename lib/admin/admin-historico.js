import { exigirAdmin } from '../_admin.js';
import { limparCpf, supabase } from '../_supabase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Use GET' });
  if (!exigirAdmin(req, res)) return;
  try {
    const cpf = limparCpf(req.query?.cpf);
    if (cpf.length !== 11) return res.status(400).json({ erro: 'CPF inválido' });
    const itens = await supabase(`game_movimentacoes?cpf=eq.${cpf}&select=tipo,quantidade,saldo_apos,criado_em&order=criado_em.desc&limit=100`);
    return res.status(200).json({ itens: Array.isArray(itens) ? itens : [] });
  } catch (e) { return res.status(500).json({ erro: e.message || 'Erro ao carregar histórico' }); }
}
