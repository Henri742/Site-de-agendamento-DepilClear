// api/usuarios.js — gestão de logins (somente administradora)
// GET: lista | POST: cria | PATCH: altera (nome, função, ativo, senha) | DELETE ?id=: exclui
import { applyCors, requireAuth, isAdmin, adminClient } from './_auth.js';
import { rateLimit } from './_ratelimit.js';
import { registrar } from './log.js';

const FUNCOES = ['admin', 'recepcao', 'depiladora'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BANIDO = '876000h'; // ~100 anos: "desativado" no Supabase Auth

function validarSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (senha.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
  return '';
}

export default async function handler(req, res) {
  if (!applyCors(req, res, 'GET, POST, PATCH, DELETE, OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();

  const eu = await requireAuth(req, res);
  if (!eu) return;
  if (!isAdmin(eu)) return res.status(403).json({ erro: 'Apenas a administradora pode gerenciar usuários.' });
  if (!(await rateLimit(req, res, { name: 'usuarios', limit: 60, windowSec: 60 }))) return;

  const sb = adminClient();
  try {
    if (req.method === 'GET') {
      const { data: perfis, error } = await sb.from('perfis').select('user_id, nome, email, funcao, ativo, criado_em').order('nome');
      if (error) throw error;
      const { data: lista, error: e2 } = await sb.auth.admin.listUsers({ perPage: 1000 });
      if (e2) throw e2;
      const ultimo = new Map(lista.users.map(u => [u.id, u.last_sign_in_at]));
      return res.status(200).json({ usuarios: perfis.map(p => ({ ...p, ultimo_acesso: ultimo.get(p.user_id) || null, eu: p.user_id === eu.id })) });
    }

    const body = req.body || {};

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const nome = String(body.nome || '').trim().slice(0, 80);
      const funcao = String(body.funcao || '');
      if (!nome) return res.status(400).json({ erro: 'Informe o nome.' });
      if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ erro: 'E-mail inválido.' });
      if (!FUNCOES.includes(funcao)) return res.status(400).json({ erro: 'Função inválida.' });
      const erroSenha = validarSenha(body.senha);
      if (erroSenha) return res.status(400).json({ erro: erroSenha });

      const { data, error } = await sb.auth.admin.createUser({ email, password: body.senha, email_confirm: true, user_metadata: { nome } });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
        throw error;
      }
      const { error: e2 } = await sb.from('perfis').insert({ user_id: data.user.id, nome, email, funcao, ativo: true });
      if (e2) { await sb.auth.admin.deleteUser(data.user.id); throw e2; }
      await registrar(req, eu, [{ evento: 'criou', alvo: `usuário: ${nome} (${email})`, detalhes: { funcao } }]);
      return res.status(201).json({ sucesso: true });
    }

    if (req.method === 'PATCH') {
      const id = String(body.user_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erro: 'Usuário inválido.' });
      const mudancas = { atualizado_em: new Date().toISOString() };
      const auth = {};
      if (body.nome !== undefined) { mudancas.nome = String(body.nome).trim().slice(0, 80); if (!mudancas.nome) return res.status(400).json({ erro: 'Informe o nome.' }); }
      if (body.funcao !== undefined) { if (!FUNCOES.includes(body.funcao)) return res.status(400).json({ erro: 'Função inválida.' }); mudancas.funcao = body.funcao; }
      if (body.ativo !== undefined) { mudancas.ativo = !!body.ativo; auth.ban_duration = body.ativo ? 'none' : BANIDO; }
      if (body.senha) { const e = validarSenha(body.senha); if (e) return res.status(400).json({ erro: e }); auth.password = body.senha; }
      // Não deixa a administradora tirar o próprio acesso (ficaria sem ninguém para reativar)
      if (id === eu.id && (mudancas.ativo === false || (mudancas.funcao && mudancas.funcao !== 'admin'))) {
        return res.status(400).json({ erro: 'Você não pode desativar nem rebaixar o seu próprio usuário.' });
      }
      if (Object.keys(auth).length) { const { error } = await sb.auth.admin.updateUserById(id, auth); if (error) throw error; }
      const { error } = await sb.from('perfis').update(mudancas).eq('user_id', id);
      if (error) throw error;
      const { data: alvo } = await sb.from('perfis').select('nome, email').eq('user_id', id).maybeSingle();
      const o_que = [mudancas.nome !== undefined && 'nome', mudancas.funcao && `função → ${mudancas.funcao}`, mudancas.ativo !== undefined && (mudancas.ativo ? 'reativou' : 'desativou'), body.senha && 'trocou a senha'].filter(Boolean);
      await registrar(req, eu, [{ evento: 'editou', alvo: `usuário: ${alvo?.nome || id} (${alvo?.email || ''})`, detalhes: { mudancas: o_que } }]);
      return res.status(200).json({ sucesso: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erro: 'Usuário inválido.' });
      if (id === eu.id) return res.status(400).json({ erro: 'Você não pode excluir o seu próprio usuário.' });
      const { data: alvo } = await sb.from('perfis').select('nome, email').eq('user_id', id).maybeSingle();
      const { error } = await sb.auth.admin.deleteUser(id); // o perfil sai junto (on delete cascade)
      if (error) throw error;
      await registrar(req, eu, [{ evento: 'excluiu', alvo: `usuário: ${alvo?.nome || id} (${alvo?.email || ''})` }]);
      return res.status(200).json({ sucesso: true });
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro em /api/usuarios:', err);
    return res.status(500).json({ erro: 'Não foi possível concluir. Tente novamente.' });
  }
}
