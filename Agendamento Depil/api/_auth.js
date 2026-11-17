// api/_auth.js
// Arquivos que começam com "_" dentro de /api NÃO viram rotas na Vercel: é só um módulo auxiliar.
import jwt from 'jsonwebtoken';

const DEFAULT_ORIGINS = [
  'https://agendamentodepil.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];
// Origens extras (ex.: domínio próprio), separadas por vírgula, via variável de ambiente
const EXTRA_ORIGINS = (process.env.EXTRA_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
export const ALLOWED_ORIGINS = [...DEFAULT_ORIGINS, ...EXTRA_ORIGINS];

// CORS restrito. Retorna true se a requisição pode seguir.
// Origem não listada => 403 (não refletimos nenhuma origem "padrão").
// Sem cabeçalho Origin (chamada do mesmo domínio / ferramentas) segue: a rota ainda exige Bearer token.
// Não usamos credenciais por cookie, então NÃO enviamos Access-Control-Allow-Credentials.
export function applyCors(req, res, methods = 'POST, OPTIONS') {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ erro: 'Origem não permitida.' });
    return false;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

// Valida o JWT emitido pelo /api/login. Retorna o payload ou responde 401/500 e retorna null.
export function requireAuth(req, res) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET não configurado.');
    res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
    return null;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    // Algoritmo FIXO: impede "alg: none" e confusão de algoritmos
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!payload || typeof payload !== 'object' || !payload.userId) throw new Error('payload inválido');
    return payload;
  } catch {
    res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
    return null;
  }
}

// Papéis com permissão de escrita (ex.: "admin"). Configurável: ADMIN_ROLES="admin,proprietaria"
export function isAdmin(usuario) {
  const roles = (process.env.ADMIN_ROLES || 'admin').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return roles.includes(String(usuario?.funcao || '').toLowerCase());
}
