import { exigirAdmin } from '../_admin.js';
import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Use GET' });
  if (!exigirAdmin(req, res)) return;
  try {
    const q = String(req.query?.q || '').trim();
    let filtro = '';
    if (q) {
      const limpo = q.replace(/[%*,()]/g, '');
      filtro = `&or=(cpf.ilike.*${encodeURIComponent(limpo)}*,nome.ilike.*${encodeURIComponent(limpo)}*)`;
    }
    const clientes = await supabase(`game_clientes?select=cpf,nome,creditos,atualizado_em${filtro}&order=creditos.desc,atualizado_em.desc&limit=300`);
    const lista = Array.isArray(clientes) ? clientes : [];
    return res.status(200).json({
      clientes: lista,
      resumo: {
        clientes: lista.length,
        comCreditos: lista.filter(c => Number(c.creditos) > 0).length,
        semCreditos: lista.filter(c => Number(c.creditos) <= 0).length,
        creditosDisponiveis: lista.reduce((s, c) => s + Number(c.creditos || 0), 0)
      }
    });
  } catch (e) {
    console.error('Admin clientes:', e);
    return res.status(500).json({ erro: e.message || 'Erro ao carregar clientes' });
  }
}
