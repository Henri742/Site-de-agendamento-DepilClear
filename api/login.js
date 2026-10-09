import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Client } = pg;

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-depilclear-2026';

export default async function handler(req, res) {
  // Configura headers CORS
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
    return res.status(400).json({ erro: 'Preencha o e-mail e a senha.' });
  }

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('ERRO: Vercel não possui DATABASE_URL configurada nas Environment Variables!');
    return res.status(500).json({ erro: 'Variável de banco de dados não configurada na Vercel.' });
  }

  // Cria cliente direto sob demanda para Serverless
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });

  try {
    await client.connect();

    const sanitizedEmail = email.trim().toLowerCase();
    const query = 'SELECT id, nome, email, senha_hash, funcao FROM usuarios WHERE LOWER(email) = \$1 LIMIT 1';
    const result = await client.query(query, [sanitizedEmail]);

    if (result.rows.length === 0) {
      await client.end();
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(password, usuario.senha_hash);

    if (!senhaValida) {
      await client.end();
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    // Registra último login
    try {
      await client.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = \$1', [usuario.id]);
    } catch (ignoreErr) {
      // Ignora erro secundário de log
    }

    await client.end();

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
    console.error('Erro de conexão detalhado:', err);
    try { await client.end(); } catch (e) {}
    return res.status(500).json({ erro: `Erro ao conectar no banco: ${err.message || 'Falha de conexão'}` });
  }
}