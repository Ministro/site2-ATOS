import { exigirAdmin } from './_admin.js';
import { limparCpf, supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  if (!exigirAdmin(req, res)) return;
  try {
    const cpf = limparCpf(req.body?.cpf);
    const modo = String(req.body?.modo || 'adicionar');
    const valor = Math.max(0, Math.floor(Number(req.body?.valor || 0)));
    if (cpf.length !== 11) return res.status(400).json({ erro: 'CPF inválido' });
    if (!['adicionar','remover','definir'].includes(modo)) return res.status(400).json({ erro: 'Modo inválido' });
    const dados = await supabase(`game_clientes?cpf=eq.${cpf}&select=cpf,nome,creditos&limit=1`);
    const cliente = dados?.[0];
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const atual = Number(cliente.creditos || 0);
    let novo = atual;
    if (modo === 'adicionar') novo = atual + valor;
    if (modo === 'remover') novo = Math.max(0, atual - valor);
    if (modo === 'definir') novo = valor;
    const alterados = await supabase(`game_clientes?cpf=eq.${cpf}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ creditos: novo, atualizado_em: new Date().toISOString() })
    });
    const delta = novo - atual;
    try {
      await supabase('game_movimentacoes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ cpf, tipo: `ajuste_admin_${modo}`, quantidade: delta, saldo_apos: novo })
      });
    } catch (logErr) { console.warn('Falha no log administrativo:', logErr.message); }
    return res.status(200).json({ ok: true, cpf, saldoAnterior: atual, creditos: novo, cliente: alterados?.[0] || null });
  } catch (e) {
    console.error('Alterar créditos:', e);
    return res.status(500).json({ erro: e.message || 'Erro ao alterar créditos' });
  }
}
