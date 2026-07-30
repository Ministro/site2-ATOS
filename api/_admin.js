import crypto from 'crypto';

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.GAME_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
}

export function criarAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    role: 'admin',
    exp: Date.now() + 8 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString('hex')
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function validarAdminToken(token) {
  try {
    if (!secret()) return false;
    const [payload, sig] = String(token || '').replace(/^Bearer\s+/i, '').split('.');
    if (!payload || !sig) return false;
    const esperado = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return false;
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return dados.role === 'admin' && Date.now() < Number(dados.exp || 0);
  } catch { return false; }
}

export function exigirAdmin(req, res) {
  const token = req.headers.authorization || req.headers['x-admin-token'];
  if (!validarAdminToken(token)) {
    res.status(401).json({ erro: 'Sessão administrativa inválida ou expirada' });
    return false;
  }
  return true;
}
