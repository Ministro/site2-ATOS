import { exigirAdmin } from './_admin.js';
import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (!exigirAdmin(req, res)) return;
  try {
    if (req.method === 'GET') {
      const premios = await supabase('game_premios?select=id,nome,quantidade,ativo,atualizado_em&order=ativo.desc,nome.asc');
      const ganhos = await supabase('game_premios_ganhos?select=id,cpf,premio_nome,status,criado_em,entregue_em&order=criado_em.desc&limit=100');
      return res.status(200).json({ premios: premios || [], ganhos: ganhos || [] });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Use GET ou POST' });
    const acao = String(req.body?.acao || 'salvar');
    if (acao === 'salvar') {
      const id = Number(req.body?.id || 0);
      const nome = String(req.body?.nome || '').trim().toUpperCase();
      const quantidade = Math.max(0, Math.floor(Number(req.body?.quantidade || 0)));
      const ativo = req.body?.ativo !== false;
      if (!nome) return res.status(400).json({ erro: 'Informe o nome do prêmio' });
      if (id > 0) {
        const d = await supabase(`game_premios?id=eq.${id}`, { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify({nome,quantidade,ativo,atualizado_em:new Date().toISOString()}) });
        return res.status(200).json({ ok:true, premio:d?.[0] || null });
      }
      const d = await supabase('game_premios', { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({nome,quantidade,ativo}) });
      return res.status(200).json({ ok:true, premio:d?.[0] || null });
    }
    if (acao === 'status_ganho') {
      const id = String(req.body?.id || '');
      const status = String(req.body?.status || 'pendente');
      if (!['pendente','entregue','cancelado'].includes(status)) return res.status(400).json({ erro:'Status inválido' });
      await supabase(`game_premios_ganhos?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({status, entregue_em:status==='entregue'?new Date().toISOString():null}) });
      return res.status(200).json({ ok:true });
    }
    return res.status(400).json({ erro:'Ação inválida' });
  } catch (e) {
    console.error('Admin prêmios:', e);
    return res.status(500).json({ erro:e.message || 'Erro ao gerenciar prêmios' });
  }
}
