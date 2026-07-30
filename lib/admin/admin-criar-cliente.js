import { exigirAdmin } from '../_admin.js';
import { limparCpf, cpfValido, supabase } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  if (!exigirAdmin(req, res)) return;

  try {
    const nome = String(req.body?.nome || '').trim().replace(/\s+/g, ' ');
    const cpf = limparCpf(req.body?.cpf);
    const creditos = Math.max(0, Math.floor(Number(req.body?.creditos || 0)));

    if (nome.length < 2) return res.status(400).json({ erro: 'Informe o nome do cliente' });
    if (nome.length > 120) return res.status(400).json({ erro: 'Nome muito longo' });
    if (!cpfValido(cpf)) return res.status(400).json({ erro: 'CPF inválido' });
    if (!Number.isFinite(creditos) || creditos > 100000) {
      return res.status(400).json({ erro: 'Quantidade de créditos inválida' });
    }

    const existente = await supabase(`game_clientes?cpf=eq.${encodeURIComponent(cpf)}&select=cpf,nome,creditos&limit=1`);
    if (existente?.length) {
      return res.status(409).json({ erro: 'Este CPF já está cadastrado' });
    }

    const agora = new Date().toISOString();
    const criado = await supabase('game_clientes', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ nome, cpf, creditos, atualizado_em: agora })
    });

    try {
      await supabase('game_movimentacoes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          cpf,
          tipo: 'cadastro_admin',
          quantidade: creditos,
          saldo_apos: creditos
        })
      });
    } catch (logErr) {
      console.warn('Falha ao registrar cadastro administrativo:', logErr.message);
    }

    return res.status(201).json({ ok: true, cliente: criado?.[0] || { nome, cpf, creditos } });
  } catch (e) {
    console.error('Criar cliente:', e);
    return res.status(500).json({ erro: e.message || 'Erro ao cadastrar cliente' });
  }
}
