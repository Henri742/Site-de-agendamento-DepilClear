import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000 // Evita travar a requisição
});

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-depilclear-2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ erro: 'Preencha o e-mail e a palavra-passe.' });
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP desconhecido';

  try {
    const query = 'SELECT id, nome, email, senha_hash, funcao FROM usuarios WHERE email = $1 LIMIT 1';
    const result = await pool.query(query, [sanitizedEmail]);

    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO logs_acesso (email_tentativa, ip_origem, status) VALUES ($1, $2, $3)',
        [sanitizedEmail, clientIp, 'FALHA']
      );
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(password, usuario.senha_hash);

    if (!senhaValida) {
      await pool.query(
        'INSERT INTO logs_acesso (usuario_id, email_tentativa, ip_origem, status) VALUES ($1, $2, $3, $4)',
        [usuario.id, sanitizedEmail, clientIp, 'FALHA']
      );
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [usuario.id]);
    await pool.query(
      'INSERT INTO logs_acesso (usuario_id, email_tentativa, ip_origem, status) VALUES ($1, $2, $3, $4)',
      [usuario.id, sanitizedEmail, clientIp, 'SUCESSO']
    );

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
  } catch (erro) {
    console.error('Erro na autenticação:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor de base de dados.' });
  }
}