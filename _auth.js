// api/_auth.js
// Arquivos que começam com "_" dentro de /api NÃO viram rotas na Vercel: é só um módulo auxiliar.
import jwt from 'jsonwebtoken';

const ALLOWED_ORIGINS = [
  'https://agendamentodepil.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];

// CORS restrito ao domínio oficial (antes whatsapp/fidelidade aceitavam qualquer origem "*")
export function applyCors(req, res, methods = 'POST, OPTIONS') {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Valida o JWT emitido pelo /api/login. Retorna o payload ou responde 401/500 e retorna null.
export function requireAuth(req, res) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não configurado.');
    res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
    return null;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
    return null;
  }
}
