import alterarCreditos from '../lib/admin/admin-alterar-creditos.js';
import clientes from '../lib/admin/admin-clientes.js';
import historico from '../lib/admin/admin-historico.js';
import login from '../lib/admin/admin-login.js';
import premios from '../lib/admin/admin-premios.js';
import validar from '../lib/admin/admin-validar.js';

const rotas = {
  'alterar-creditos': alterarCreditos,
  clientes,
  historico,
  login,
  premios,
  validar
};

export default async function handler(req, res) {
  const acao = String(req.query?.acao || '').toLowerCase();
  const rota = rotas[acao];
  if (!rota) return res.status(404).json({ erro: 'Ação administrativa não encontrada' });
  return rota(req, res);
}
