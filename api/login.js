import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- CONFIGURAÇÃO DAS VARIÁVEIS (Segredo estrito na Vercel) ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ndzmpnqpokdsvizskkpd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// --- A) LIMITADOR DE TENTATIVAS EM MEMÓRIA (Brute Force Protection) ---
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos de bloqueio

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  // Se já passou o tempo de bloqueio, limpa o histórico do IP
  if (now > record.blockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((record.blockedUntil - now) / 60000);
    return { allowed: false, minutesLeft };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + LOCK_TIME_MS;
  }
  loginAttempts.set(ip, record);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

export default async function handler(req, res) {
  // Identifica o IP do cliente de forma segura
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  // --- D) RESTRIÇÃO DE CORS (Apenas seu domínio oficial) ---
  const allowedOrigins = [
    'https://agendamentodepil.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500' // Suporte para Live Server local
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://agendamentodepil.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  // --- VALIDAÇÃO DO RATE LIMIT ---
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      erro: `Muitas tentativas incorretas. Tente novamente em ${rateLimit.minutesLeft} minuto(s).`
    });
  }

  // --- B) VALIDAÇÃO DE SEGREDOS DO AMBIENTE ---
  if (!JWT_SECRET) {
    console.error('ERRO CRÍTICO: JWT_SECRET não configurado nas Environment Variables.');
    return res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
  }

  const { email, password } = req.body || {};
  const sanitizedEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!sanitizedEmail || !cleanPassword) {
    return res.status(400).json({ erro: 'Preencha o e-mail e a senha.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    // Consulta parametrizada segura via SDK oficial
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha_hash, funcao')
      .ilike('email', sanitizedEmail)
      .limit(1);

    if (error) {
      console.error('Erro de consulta Supabase:', error);
      return res.status(500).json({ erro: 'Erro ao conectar à base de dados.' });
    }

    if (!usuarios || usuarios.length === 0) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = usuarios[0];

    // Validação estrita da hash bcrypt (Sem senhas fixas no código)
    const senhaValida = await bcrypt.compare(cleanPassword, usuario.senha_hash);

    if (!senhaValida) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    // Sucesso no login: limpa o contador do IP
    clearAttempts(clientIp);

    // Registro seguro de auditoria do acesso
    await supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuario.id);

    // Geração do token JWT assinado
    const token = jwt.sign(
      { userId: usuario.id, nome: usuario.nome, email: usuario.email, funcao: usuario.funcao },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      sucesso: true,
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, funcao: usuario.funcao }
    });

  } catch (err) {
    console.error('Exceção no login:', err);
    return res.status(500).json({ erro: 'Falha interna durante a autenticação.' });
  }
}