import crypto from 'crypto';
import { exigirAdmin } from '../_admin.js';
import { supabase } from '../_supabase.js';

function gerarTokenPremio() {
  const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `ATOS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

async function ajustarEstoqueTokens(premioId, quantidadeDesejada) {
  const tokens = await supabase(
    `game_premio_tokens?premio_id=eq.${premioId}&status=eq.disponivel&select=id&order=criado_em.desc`
  );
  const disponiveis = Array.isArray(tokens) ? tokens : [];
  const diferenca = quantidadeDesejada - disponiveis.length;

  if (diferenca > 0) {
    const novos = Array.from({ length: diferenca }, () => ({
      premio_id: premioId,
      codigo: gerarTokenPremio(),
      status: 'disponivel'
    }));
    await supabase('game_premio_tokens', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(novos)
    });
  } else if (diferenca < 0) {
    const idsRemover = disponiveis.slice(0, Math.abs(diferenca)).map((item) => item.id);
    if (idsRemover.length) {
      await supabase(`game_premio_tokens?id=in.(${idsRemover.join(',')})`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
    }
  }

  await supabase(`game_premios?id=eq.${premioId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      quantidade: quantidadeDesejada,
      atualizado_em: new Date().toISOString()
    })
  });
}

export default async function handler(req, res) {
  if (!exigirAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const premios = await supabase(
        'game_premios?select=id,nome,quantidade,ativo,atualizado_em&order=ativo.desc,nome.asc'
      );
      const ganhos = await supabase(
        'game_premios_ganhos?select=id,cpf,premio_nome,token_codigo,status,criado_em,entregue_em&order=criado_em.desc&limit=150'
      );
      return res.status(200).json({ premios: premios || [], ganhos: ganhos || [] });
    }

    if (req.method !== 'POST') return res.status(405).json({ erro: 'Use GET ou POST' });

    const acao = String(req.body?.acao || 'salvar');

    if (acao === 'salvar') {
      let id = Number(req.body?.id || 0);
      const nome = String(req.body?.nome || '').trim().toUpperCase();
      const quantidade = Math.max(0, Math.floor(Number(req.body?.quantidade || 0)));
      const ativo = req.body?.ativo !== false;

      if (!nome) return res.status(400).json({ erro: 'Informe o nome do prêmio' });

      if (id > 0) {
        const atualizado = await supabase(`game_premios?id=eq.${id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ nome, ativo, atualizado_em: new Date().toISOString() })
        });
        if (!atualizado?.[0]) return res.status(404).json({ erro: 'Prêmio não encontrado' });
      } else {
        const criado = await supabase('game_premios', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ nome, quantidade: 0, ativo })
        });
        id = Number(criado?.[0]?.id || 0);
        if (!id) throw new Error('Não foi possível criar o prêmio');
      }

      await ajustarEstoqueTokens(id, quantidade);
      return res.status(200).json({ ok: true, id, quantidade });
    }

    if (acao === 'resgatar_token') {
      const token = String(req.body?.token || '').trim().toUpperCase();
      if (!token) return res.status(400).json({ erro: 'Informe o token' });

      const dados = await supabase(
        `game_premio_tokens?codigo=eq.${encodeURIComponent(token)}&select=id,status,ganho_id&limit=1`
      );
      const item = dados?.[0];
      if (!item) return res.status(404).json({ erro: 'Token não encontrado' });
      if (item.status === 'resgatado') return res.status(409).json({ erro: 'Este token já foi utilizado' });
      if (item.status !== 'reservado' || !item.ganho_id) {
        return res.status(409).json({ erro: 'Token inválido para retirada' });
      }

      const ganhos = await supabase(
        `game_premios_ganhos?id=eq.${item.ganho_id}&select=id,cpf,premio_nome,status&limit=1`
      );
      const ganho = ganhos?.[0];
      if (!ganho) return res.status(409).json({ erro: 'Prêmio vinculado ao token não encontrado' });
      if (ganho.status === 'entregue') return res.status(409).json({ erro: 'Este token já foi utilizado' });

      const agora = new Date().toISOString();
      await supabase(`game_premio_tokens?id=eq.${item.id}&status=eq.reservado`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'resgatado', resgatado_em: agora })
      });
      await supabase(`game_premios_ganhos?id=eq.${ganho.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'entregue', entregue_em: agora })
      });

      return res.status(200).json({
        ok: true,
        mensagem: 'Prêmio confirmado e token inutilizado',
        premio: ganho.premio_nome,
        cpf: ganho.cpf,
        status: 'entregue'
      });
    }

    if (acao === 'status_ganho') {
      const id = String(req.body?.id || '');
      const status = String(req.body?.status || 'pendente');
      if (!['pendente', 'cancelado'].includes(status)) {
        return res.status(400).json({ erro: 'Para entregar, confirme pelo token' });
      }
      await supabase(`game_premios_ganhos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status, entregue_em: null })
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erro: 'Ação inválida' });
  } catch (erro) {
    console.error('Admin prêmios:', erro);
    return res.status(500).json({ erro: erro.message || 'Erro ao gerenciar prêmios' });
  }
}
