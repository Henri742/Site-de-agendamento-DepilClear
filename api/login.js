import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { applyCors } from './_auth.js';
import { rlStatus, rlIncr, rlReset, getClientIp } from './_ratelimit.js';

// --- CONFIGURAÇÃO (tudo vem do ambiente; sem valores fixos no código) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // sem fallback para a chave ANON
const JWT_SECRET = process.env.JWT_SECRET;

// --- LIMITADOR DE TENTATIVAS (brute force) ---
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const MAX_PASSWORD_LENGTH = 200; // bcrypt só usa 72 bytes; evita custo de CPU com entradas gigantes

// "_" e "%" são curingas no ILIKE: escapa para o e-mail ser comparado literalmente
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

// Hash falso para gastar o mesmo tempo quando o e-mail não existe (evita descobrir e-mails válidos pelo tempo de resposta)
const DUMMY_HASH = bcrypt.hashSync('senha-falsa-para-igualar-tempo', 10);

export default async function handler(req, res) {
  if (!applyCors(req, res, 'POST, OPTIONS')) return;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  // Falha FECHADO: sem configuração completa, ninguém entra
  if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO CRÍTICO: JWT_SECRET, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
    return res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
  }

  const clientIp = getClientIp(req);
  const failKey = `login:fail:${clientIp}`;

  const status = await rlStatus(failKey);
  if (status.count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      erro: `Muitas tentativas incorretas. Tente novamente em ${Math.max(1, Math.ceil(status.ttlSec / 60))} minuto(s).`
    });
  }

  const { email, password } = req.body || {};
  const sanitizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
  // Senha: NÃO usar trim (espaços fazem parte da senha)
  const rawPassword = typeof password === 'string' ? password : '';

  if (!sanitizedEmail || !rawPassword) {
    return res.status(400).json({ erro: 'Preencha o e-mail e a senha.' });
  }
  if (sanitizedEmail.length > 254 || rawPassword.length > MAX_PASSWORD_LENGTH) {
    await rlIncr(failKey, LOCK_SECONDS);
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha_hash, funcao')
      .ilike('email', escapeLike(sanitizedEmail))
      .limit(1);

    if (error) {
      console.error('Erro de consulta Supabase:', error);
      return res.status(500).json({ erro: 'Erro ao conectar à base de dados.' });
    }

    if (!usuarios || usuarios.length === 0) {
      await bcrypt.compare(rawPassword, DUMMY_HASH);
      await rlIncr(failKey, LOCK_SECONDS);
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(rawPassword, usuario.senha_hash);

    if (!senhaValida) {
      await rlIncr(failKey, LOCK_SECONDS);
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    await rlReset(failKey);

    // Auditoria do acesso (falha aqui não impede o login)
    const { error: updError } = await supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuario.id);
    if (updError) console.error('Falha ao registrar ultimo_login:', updError);

    // JWT HS256 com expiração de 8h e jti (id único) para permitir revogação futura
    const token = jwt.sign(
      { userId: usuario.id, nome: usuario.nome, email: usuario.email, funcao: usuario.funcao },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h', jwtid: randomUUID() }
    );

    // Resposta mínima: sem id interno nem hash
    return res.status(200).json({
      sucesso: true,
      token,
      usuario: { nome: usuario.nome, email: usuario.email, funcao: usuario.funcao }
    });
  } catch (err) {
    console.error('Exceção no login:', err);
    return res.status(500).json({ erro: 'Falha interna durante a autenticação.' });
  }
}
