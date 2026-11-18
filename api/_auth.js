// api/_auth.js
// Arquivos que começam com "_" dentro de /api NÃO viram rotas na Vercel: é só um módulo auxiliar.
import { createClient } from '@supabase/supabase-js';

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
  // Mesma origem (domínio de produção, preview da Vercel ou app instalado) sempre pode
  let sameHost = false;
  try { sameHost = !!origin && new URL(origin).host === (req.headers['x-forwarded-host'] || req.headers.host); } catch {}
  if (origin && !sameHost && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ erro: 'Origem não permitida.' });
    return false;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

let _admin = null;
// Cliente com a chave de serviço (ignora RLS): só no servidor, nunca no navegador
export function adminClient() {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _admin;
}

// Valida o token do Supabase Auth e o perfil ativo. Retorna { id, email, nome, funcao } ou responde 401/500 e retorna null.
export async function requireAuth(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERRO CRÍTICO: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes na Vercel.');
    res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
    return null;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ erro: 'Faça login novamente.' }); return null; }
  try {
    const sb = adminClient();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) throw new Error('token');
    const { data: perfil } = await sb.from('perfis').select('nome, funcao, ativo').eq('user_id', data.user.id).maybeSingle();
    if (!perfil || !perfil.ativo) throw new Error('perfil');
    return { id: data.user.id, email: data.user.email, nome: perfil.nome, funcao: perfil.funcao };
  } catch {
    res.status(401).json({ erro: 'Sessão expirada ou sem acesso. Faça login novamente.' });
    return null;
  }
}

export function isAdmin(usuario) {
  return usuario?.funcao === 'admin';
}
