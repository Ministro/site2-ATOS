import crypto from 'crypto';
import { limitarMetodo, validarToken, supabase } from '../_supabase.js';

function escolherPonderado(itens) {
  const total = itens.reduce((soma, item) => soma + item.peso, 0);
  if (total <= 0) return null;
  let alvo = Math.random() * total;
  for (const item of itens) {
    alvo -= item.peso;
    if (alvo < 0) return item;
  }
  return itens[itens.length - 1] || null;
}

async function ganhoExistente(partidaId, cpf) {
  const dados = await supabase(
    `game_premios_ganhos?partida_id=eq.${encodeURIComponent(partidaId)}` +
    `&cpf=eq.${encodeURIComponent(cpf)}` +
    '&select=id,premio_nome,token_codigo,premio_id&limit=1'
  );
  return dados?.[0] || null;
}

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;

  try {
    const sessao = validarToken(req.body?.token);
    if (!sessao) return res.status(401).json({ ok: false, erro: 'Sessão expirada' });

    const partidaId = String(req.body?.partidaId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(partidaId)) {
      return res.status(400).json({ ok: false, erro: 'Partida inválida' });
    }

    // Torna a chamada idempotente: se a tela repetir a requisição, devolve o mesmo prêmio.
    const anterior = await ganhoExistente(partidaId, sessao.cpf);
    if (anterior) {
      return res.status(200).json({
        ok: true,
        premio: anterior.premio_nome,
        token: anterior.token_codigo,
        repetido: true
      });
    }

    const partidas = await supabase(
      `game_partidas?id=eq.${encodeURIComponent(partidaId)}` +
      `&cpf=eq.${encodeURIComponent(sessao.cpf)}` +
      '&select=id,cpf,premio_resgatado&limit=1'
    );
    const partida = partidas?.[0];
    if (!partida) return res.status(404).json({ ok: false, erro: 'Partida não encontrada' });
    if (partida.premio_resgatado) {
      return res.status(409).json({ ok: false, erro: 'Esta partida já recebeu um prêmio' });
    }

    const [premios, tokens] = await Promise.all([
      supabase('game_premios?ativo=eq.true&quantidade=gt.0&select=id,nome,quantidade'),
      supabase('game_premio_tokens?status=eq.disponivel&select=id,premio_id,codigo')
    ]);

    const tokensPorPremio = new Map();
    for (const token of tokens || []) {
      const chave = Number(token.premio_id);
      if (!tokensPorPremio.has(chave)) tokensPorPremio.set(chave, []);
      tokensPorPremio.get(chave).push(token);
    }

    const candidatos = (premios || []).map((premio) => {
      const disponiveis = tokensPorPremio.get(Number(premio.id)) || [];
      return {
        premio,
        tokens: disponiveis,
        peso: Math.min(Number(premio.quantidade || 0), disponiveis.length)
      };
    }).filter((item) => item.peso > 0);

    if (!candidatos.length) {
      return res.status(409).json({ ok: false, erro: 'Nenhum prêmio com token disponível' });
    }

    // Tenta reservar um token com atualização condicional para evitar uso duplicado.
    let escolhido = null;
    let tokenReservado = null;
    const ganhoId = crypto.randomUUID();
    const agora = new Date().toISOString();

    for (let tentativa = 0; tentativa < 5 && !tokenReservado; tentativa += 1) {
      escolhido = escolherPonderado(candidatos);
      if (!escolhido) break;
      const indice = Math.floor(Math.random() * escolhido.tokens.length);
      const token = escolhido.tokens.splice(indice, 1)[0];
      escolhido.peso = Math.min(escolhido.peso, escolhido.tokens.length);

      const reservado = await supabase(
        `game_premio_tokens?id=eq.${encodeURIComponent(token.id)}&status=eq.disponivel`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'reservado',
            ganho_id: ganhoId,
            reservado_em: agora
          })
        }
      );
      if (reservado?.[0]) tokenReservado = { ...token, ...reservado[0] };
    }

    if (!escolhido || !tokenReservado) {
      return res.status(409).json({ ok: false, erro: 'Não foi possível reservar um token de prêmio' });
    }

    try {
      await supabase('game_premios_ganhos', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: ganhoId,
          partida_id: partidaId,
          premio_id: escolhido.premio.id,
          cpf: sessao.cpf,
          premio_nome: escolhido.premio.nome,
          token_codigo: tokenReservado.codigo,
          status: 'pendente'
        })
      });

      const restantes = Math.max(0, Number(escolhido.premio.quantidade || 0) - 1);
      await Promise.all([
        supabase(`game_premios?id=eq.${escolhido.premio.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantidade: restantes, atualizado_em: agora })
        }),
        supabase(`game_partidas?id=eq.${encodeURIComponent(partidaId)}&premio_resgatado=eq.false`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ premio_resgatado: true })
        })
      ]);

      return res.status(200).json({
        ok: true,
        premio: escolhido.premio.nome,
        token: tokenReservado.codigo,
        quantidadeRestante: restantes
      });
    } catch (erro) {
      // Libera o token caso o registro do ganho não tenha sido concluído.
      await supabase(`game_premio_tokens?id=eq.${encodeURIComponent(tokenReservado.id)}&ganho_id=eq.${ganhoId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'disponivel', ganho_id: null, reservado_em: null })
      }).catch(() => {});
      throw erro;
    }
  } catch (erro) {
    console.error('Resgatar prêmio:', erro);
    return res.status(500).json({
      ok: false,
      erro: erro.message || 'Não foi possível confirmar o prêmio'
    });
  }
}
