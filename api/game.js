import consultarCreditos from '../lib/game/game-consultar-creditos.js';
import iniciarPartida from '../lib/game/game-iniciar-partida.js';
import premiosDisponiveis from '../lib/game/game-premios-disponiveis.js';
import resgatarPremio from '../lib/game/game-resgatar-premio.js';
import usarCredito from '../lib/game/game-usar-credito.js';
import validarSessao from '../lib/game/game-validar-sessao.js';

const rotas = {
  'consultar-creditos': consultarCreditos,
  'iniciar-partida': iniciarPartida,
  'premios-disponiveis': premiosDisponiveis,
  'resgatar-premio': resgatarPremio,
  'usar-credito': usarCredito,
  'validar-sessao': validarSessao
};

export default async function handler(req, res) {
  const acao = String(req.query?.acao || '').toLowerCase();
  const rota = rotas[acao];
  if (!rota) return res.status(404).json({ erro: 'Ação do jogo não encontrada' });
  return rota(req, res);
}
