import crypto from 'crypto';

export function limparCpf(valor) {
  return String(valor || '').replace(/\D/g, '');
}

export function cpfValido(cpf) {
  cpf = limparCpf(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base, fator) => {
    let soma = 0;
    for (const n of base) soma += Number(n) * fator--;
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function config() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase não configurado na Vercel');
  return { url, key };
}

export async function supabase(path, options = {}) {
  const { url, key } = config();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await resp.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!resp.ok) {
    const message = data?.message || data?.hint || `Erro Supabase (${resp.status})`;
    throw new Error(message);
  }
  return data;
}

function assinatura(payload) {
  const secret = process.env.GAME_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Segredo de sessão não configurado');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function criarToken(cpf) {
  const payload = Buffer.from(JSON.stringify({
    cpf,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString('hex')
  })).toString('base64url');
  return `${payload}.${assinatura(payload)}`;
}

export function validarToken(token) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const esperado = assinatura(payload);
    if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!dados.cpf || !dados.exp || Date.now() > dados.exp) return null;
    return dados;
  } catch {
    return null;
  }
}

export function limitarMetodo(req, res, metodo = 'POST') {
  if (req.method !== metodo) {
    res.setHeader('Allow', metodo);
    res.status(405).json({ erro: `Use ${metodo}` });
    return false;
  }
  return true;
}
