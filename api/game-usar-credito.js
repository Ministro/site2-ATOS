import { limitarMetodo, validarToken, supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (!limitarMetodo(req, res)) return;

  try {
    const dadosToken = validarToken(req.body?.token);
    if (!dadosToken) {
      return res.status(401).json({
        autorizado: false,
        erro: 'Sessão expirada. Consulte o CPF novamente.'
      });
    }

    // Desconto otimista e atômico sem depender do formato de retorno de RPCs
    // antigas existentes no Supabase. A condição creditos=eq.saldo impede que
    // duas solicitações consumam o mesmo crédito ao mesmo tempo.
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      const clientes = await supabase(
        `game_clientes?cpf=eq.${encodeURIComponent(dadosToken.cpf)}&select=creditos&limit=1`
      );
      const cliente = clientes?.[0];
      const saldoAtual = Number(cliente?.creditos ?? 0);

      if (!cliente || !Number.isFinite(saldoAtual) || saldoAtual < 1) {
        return res.status(403).json({
          autorizado: false,
          creditosRestantes: 0,
          erro: 'Seus créditos acabaram.'
        });
      }

      const novoSaldo = saldoAtual - 1;
      const atualizado = await supabase(
        `game_clientes?cpf=eq.${encodeURIComponent(dadosToken.cpf)}&creditos=eq.${saldoAtual}&select=creditos`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ creditos: novoSaldo })
        }
      );

      if (Array.isArray(atualizado) && atualizado.length > 0) {
        return res.status(200).json({
          autorizado: true,
          creditosRestantes: Number(atualizado[0].creditos ?? novoSaldo)
        });
      }
      // O saldo mudou entre leitura e atualização; tenta novamente.
    }

    return res.status(409).json({
      autorizado: false,
      erro: 'Não foi possível confirmar o crédito. Tente novamente.'
    });
  } catch (e) {
    console.error('Usar crédito:', e);
    return res.status(500).json({
      autorizado: false,
      erro: 'Não foi possível utilizar o crédito'
    });
  }
}
