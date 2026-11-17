import { createClient } from '@supabase/supabase-js';
import { applyCors, requireAuth, isAdmin } from './_auth.js';
import { rateLimit } from './_ratelimit.js';

const ORIGENS_VALIDAS = ['atendimento', 'indicacao', 'manual'];

// Falha FECHADO: sem as variáveis de ambiente a rota não funciona
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Erro genérico para o cliente; o detalhe fica só no log do servidor
function erroInterno(res, contexto, err) {
  console.error(`[FIDELIDADE] ${contexto}:`, err);
  return res.status(500).json({ erro: 'Não foi possível concluir a operação.' });
}

function parseClientId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export default async function handler(req, res) {
  if (!applyCors(req, res, 'GET, POST, DELETE, OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Esta rota usa a SERVICE ROLE KEY: sempre exige login
  const usuario = requireAuth(req, res);
  if (!usuario) return;

  if (!(await rateLimit(req, res, { name: 'fidelidade', limit: 30, windowSec: 60 }))) return;

  const supabase = getSupabase();
  if (!supabase) {
    console.error(`[FIDELIDADE] variáveis ausentes: ${[!process.env.SUPABASE_URL && 'SUPABASE_URL', !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ')}`);
    return res.status(500).json({ erro: 'Configuração interna do servidor pendente.' });
  }

  // ---------- GET: qualquer usuário logado ----------
  if (req.method === 'GET') {
    try {
      let q = supabase.from('fidelidade_pontos').select('*').order('created_at', { ascending: true }).limit(2000);
      if (req.query.clientId !== undefined) {
        const id = parseClientId(req.query.clientId);
        if (!id) return res.status(400).json({ erro: 'clientId inválido.' });
        q = q.eq('client_id', id);
      }
      const { data, error } = await q;
      if (error) return erroInterno(res, 'GET', error);
      return res.status(200).json({ pontos: data || [] });
    } catch (err) {
      return erroInterno(res, 'GET', err);
    }
  }

  // ---------- POST / DELETE: somente administradores ----------
  if (req.method === 'POST' || req.method === 'DELETE') {
    if (!isAdmin(usuario)) {
      return res.status(403).json({ erro: 'Sem permissão para esta operação.' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const clientId = parseClientId(body.clientId);
    if (!clientId) return res.status(400).json({ erro: 'clientId inválido.' });

    const origem = body.origem === undefined ? 'atendimento' : body.origem;
    if (!ORIGENS_VALIDAS.includes(origem)) return res.status(400).json({ erro: 'Origem inválida.' });

    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
    if (descricao.length > 200) return res.status(400).json({ erro: 'Descrição muito longa (máx. 200 caracteres).' });

    const clientName = (typeof body.clientName === 'string' ? body.clientName : '').trim().slice(0, 120);

    try {
      const { count, error: countError } = await supabase
        .from('fidelidade_pontos')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      if (countError) return erroInterno(res, 'POST/count', countError);

      if (count >= 10) return res.status(400).json({ erro: 'Cartão com 10 selos completos.' });

      const { data, error } = await supabase.from('fidelidade_pontos').insert([{
        client_id: clientId,
        client_name: clientName,
        origem,
        descricao
      }]).select();
      if (error) return erroInterno(res, 'POST/insert', error);

      console.info('[AUDITORIA FIDELIDADE]', JSON.stringify({ acao: 'adicionar', usuario: usuario.email || usuario.userId, clientId, origem }));
      return res.status(201).json({ sucesso: true, ponto: data[0] });
    } catch (err) {
      return erroInterno(res, 'POST', err);
    }
  }

  if (req.method === 'DELETE') {
    const body = req.body || {};
    const clientId = parseClientId(body.clientId);
    if (!clientId) return res.status(400).json({ erro: 'clientId inválido.' });

    let quantidade = 10;
    if (body.quantidade !== undefined) {
      quantidade = Number(body.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10) {
        return res.status(400).json({ erro: 'Quantidade inválida (1 a 10).' });
      }
    }

    try {
      if (quantidade === 10) {
        const { error } = await supabase.from('fidelidade_pontos').delete().eq('client_id', clientId);
        if (error) return erroInterno(res, 'DELETE/all', error);
      } else {
        const { data: pts, error: selError } = await supabase
          .from('fidelidade_pontos')
          .select('id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true })
          .limit(quantidade);
        if (selError) return erroInterno(res, 'DELETE/select', selError);

        const ids = (pts || []).map(p => p.id);
        if (ids.length > 0) {
          const { error } = await supabase.from('fidelidade_pontos').delete().in('id', ids);
          if (error) return erroInterno(res, 'DELETE/some', error);
        }
      }
      console.info('[AUDITORIA FIDELIDADE]', JSON.stringify({ acao: 'remover', usuario: usuario.email || usuario.userId, clientId, quantidade }));
      return res.status(200).json({ sucesso: true });
    } catch (err) {
      return erroInterno(res, 'DELETE', err);
    }
  }

  return res.status(405).json({ erro: 'Método não permitido.' });
}
