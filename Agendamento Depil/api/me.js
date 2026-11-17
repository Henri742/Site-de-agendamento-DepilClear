// api/me.js
// GET /api/me -> valida o token (assinatura HS256 + exp) e devolve o payload mínimo.
// É o que o front-end consulta antes de liberar o dashboard e o caixa.
import { applyCors, requireAuth } from './_auth.js';
import { rateLimit } from './_ratelimit.js';

export default async function handler(req, res) {
  if (!applyCors(req, res, 'GET, OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });

  if (!(await rateLimit(req, res, { name: 'me', limit: 60, windowSec: 60 }))) return;

  const usuario = requireAuth(req, res);
  if (!usuario) return;

  return res.status(200).json({
    sucesso: true,
    usuario: { nome: usuario.nome, email: usuario.email, funcao: usuario.funcao },
    exp: usuario.exp
  });
}
