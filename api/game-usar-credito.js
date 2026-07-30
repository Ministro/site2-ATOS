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

    const resultado = await supabase('rpc/game_iniciar_partida', {
      method: 'POST',
      body: JSON.stringify({ p_cpf: dadosToken.cpf })
    });

    // Compatibilidade com as duas versões da função existentes no Supabase:
    // 1) retorna um número: saldo restante ou -1 quando não há crédito;
    // 2) retorna uma linha: { autorizado, creditos_restantes }.
    const linha = Array.isArray(resultado) ? resultado[0] : resultado;

    let autorizado = false;
    let creditosRestantes = 0;

    if (typeof linha === 'number' || (typeof linha === 'string' && linha.trim() !== '')) {
      const saldo = Number(linha);
      autorizado = Number.isFinite(saldo) && saldo >= 0;
      creditosRestantes = autorizado ? saldo : 0;
    } else if (linha && typeof linha === 'object') {
      autorizado = linha.autorizado === true;
      creditosRestantes = Number(
        linha.creditos_restantes ?? linha.creditosRestantes ?? 0
      );

      if (!Number.isFinite(creditosRestantes) || creditosRestantes < 0) {
        creditosRestantes = 0;
      }
    }

    if (!autorizado) {
      return res.status(403).json({
        autorizado: false,
        creditosRestantes,
        erro: 'Seus créditos acabaram.'
      });
    }

    return res.status(200).json({
      autorizado: true,
      creditosRestantes
    });
  } catch (e) {
    console.error('Usar crédito:', e);
    return res.status(500).json({
      autorizado: false,
      erro: 'Não foi possível utilizar o crédito'
    });
  }
}
