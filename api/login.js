import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ndzmpnqpokdsvizskkpd.supabase.co';
// A Service Role Key ou Anon Key pública do seu projeto Supabase
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-depilclear-2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ erro: 'Preencha o e-mail e a palavra-passe.' });
  }

  if (!SUPABASE_KEY) {
    return res.status(500).json({ erro: 'Chave de acesso ao Supabase em falta nas variáveis da Vercel.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const sanitizedEmail = email.trim().toLowerCase();

    // Consulta à tabela de utilizadores por HTTPS
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha_hash, funcao')
      .ilike('email', sanitizedEmail)
      .limit(1);

    if (error) {
      console.error('Erro ao consultar Supabase:', error);
      return res.status(500).json({ erro: `Erro no Supabase: ${error.message}` });
    }

    if (!usuarios || usuarios.length === 0) {
      return res.status(401).json({ erro: 'E-mail ou palavra-passe incorretos.' });
    }

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(password, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'E-mail ou palavra-passe incorretos.' });
    }

    // Registo de último acesso
    await supabase
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', usuario.id);

    const token = jwt.sign(
      { userId: usuario.id, nome: usuario.nome, email: usuario.email, funcao: usuario.funcao },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      sucesso: true,
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, funcao: usuario.funcao }
    });
  } catch (err) {
    console.error('Exceção no login:', err);
    return res.status(500).json({ erro: `Falha interna: ${err.message || 'Erro desconhecido'}` });
  }
}