// api/log.js — grava o registro de atividades (auditoria) com IP, localização aproximada e aparelho.
// POST { eventos: [{ evento, alvo, detalhes, ocorrido_em, device_id }] }
//  - com login (Bearer): até 50 eventos por chamada
//  - sem login: só "login_falhou" (tentativa de entrar), 1 por chamada, com limite por IP
// A localização vem dos cabeçalhos da Vercel (cidade/estado/país pelo IP), sem pedir GPS ao aparelho.
import { applyCors, requireAuth, adminClient } from './_auth.js';
import { rateLimit, getClientIp } from './_ratelimit.js';

const EVENTOS = new Set(['login', 'login_falhou', 'logout', 'sessao', 'abriu', 'criou', 'editou', 'excluiu', 'alterou_lote', 'exportou', 'whatsapp', 'acesso_negado']);
const corta = (v, n) => (v == null ? null : String(v).slice(0, n));

export function lerAparelho(ua = '') {
  const s = String(ua);
  const sistema = /Windows NT 10/.test(s) ? 'Windows 10/11' : /Windows/.test(s) ? 'Windows'
    : /iPhone|iPad|iPod/.test(s) ? (/iPad/.test(s) ? 'iPadOS' : 'iOS') : /Android/.test(s) ? 'Android'
    : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Outro';
  const navegador = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet'
    : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Outro';
  const aparelho = /iPad|Tablet/.test(s) ? 'Tablet' : /Mobi|iPhone|Android/.test(s) ? 'Celular' : 'Computador';
  return { sistema, navegador, aparelho };
}

export function lerLocal(req) {
  const h = (k) => { const v = req.headers[k]; try { return v ? decodeURIComponent(String(v)) : null; } catch { return String(v); } };
  const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
  return {
    ip: corta(getClientIp(req), 64),
    cidade: corta(h('x-vercel-ip-city'), 80),
    regiao: corta(h('x-vercel-ip-country-region'), 20),
    pais: corta(h('x-vercel-ip-country'), 4),
    lat: num(h('x-vercel-ip-latitude')),
    lon: num(h('x-vercel-ip-longitude'))
  };
}

// Também usado por outras rotas do servidor (usuários, backup) para registrar ações sensíveis
export async function registrar(req, usuario, eventos) {
  const ua = String(req.headers['user-agent'] || '');
  const base = { ...lerLocal(req), ...lerAparelho(ua), user_agent: corta(ua, 400) };
  const linhas = eventos.map(e => ({
    ...base,
    user_id: usuario?.id || null,
    email: corta(usuario?.email || e.email, 254),
    nome: corta(usuario?.nome, 80),
    funcao: corta(usuario?.funcao, 20),
    evento: e.evento,
    alvo: corta(e.alvo, 200),
    detalhes: e.detalhes && typeof e.detalhes === 'object' ? (JSON.stringify(e.detalhes).length <= 4000 ? e.detalhes : { truncado: true }) : null,
    ocorrido_em: e.ocorrido_em && !isNaN(Date.parse(e.ocorrido_em)) ? new Date(e.ocorrido_em).toISOString() : null,
    device_id: corta(e.device_id, 64)
  }));
  const { error } = await adminClient().from('atividades').insert(linhas);
  if (error) console.error('Falha ao gravar atividades:', error);
}

export default async function handler(req, res) {
  if (!applyCors(req, res, 'POST, OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const lista = Array.isArray(req.body?.eventos) ? req.body.eventos : [];
  const validos = lista.filter(e => e && EVENTOS.has(e.evento)).slice(0, 50);
  if (!validos.length) return res.status(400).json({ erro: 'Nada para registrar.' });

  try {
    if (!req.headers.authorization) {
      // Sem login: só tentativa de entrar que falhou
      if (!(await rateLimit(req, res, { name: 'log-anon', limit: 20, windowSec: 600 }))) return;
      const e = validos.find(x => x.evento === 'login_falhou');
      if (!e) return res.status(401).json({ erro: 'Faça login.' });
      const email = String(e.email || '').trim().toLowerCase().slice(0, 254);
      await registrar(req, null, [{ ...e, email, detalhes: { motivo: corta(e.detalhes?.motivo, 120) } }]);
      return res.status(200).json({ sucesso: true });
    }
    const usuario = await requireAuth(req, res);
    if (!usuario) return;
    if (!(await rateLimit(req, res, { name: 'log', limit: 120, windowSec: 60 }))) return;
    await registrar(req, usuario, validos.filter(e => e.evento !== 'login_falhou'));
    return res.status(200).json({ sucesso: true });
  } catch (err) {
    console.error('Erro em /api/log:', err);
    return res.status(500).json({ erro: 'Falha ao registrar.' });
  }
}
