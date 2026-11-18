// api/backup.js — backup de todos os dados no bucket privado "backups" (mantém 30 dias)
// GET sem login (cron da Vercel, 06:00): grava o backup do dia se ainda não existir. Não devolve dados.
// GET ?baixar=1 com login de administradora: gera agora e devolve o arquivo para download.
// GET ?listar=1 com login de administradora: lista os backups guardados.
import { applyCors, requireAuth, isAdmin, adminClient } from './_auth.js';
import { registrar } from './log.js';

const BUCKET = 'backups';
const MANTER_DIAS = 30;

async function gerar(sb) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from('registros').select('*').order('colecao').order('id').range(de, de + 999);
    if (error) throw error;
    linhas.push(...data);
    if (data.length < 1000) break;
  }
  const { data: perfis, error } = await sb.from('perfis').select('user_id, nome, email, funcao, ativo');
  if (error) throw error;
  return { gerado_em: new Date().toISOString(), total: linhas.length, registros: linhas, perfis };
}

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD

async function guardar(sb, conteudo, nome) {
  const { error } = await sb.storage.from(BUCKET).upload(nome, JSON.stringify(conteudo), { contentType: 'application/json', upsert: true });
  if (error) throw error;
  // Apaga os mais antigos que 30 dias
  const { data: arquivos } = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  const limite = new Date(Date.now() - MANTER_DIAS * 864e5).toISOString().slice(0, 10);
  const velhos = (arquivos || []).map(a => a.name).filter(n => /^backup-\d{4}-\d{2}-\d{2}/.test(n) && n.slice(7, 17) < limite);
  if (velhos.length) await sb.storage.from(BUCKET).remove(velhos);
}

export default async function handler(req, res) {
  if (!applyCors(req, res, 'GET, OPTIONS')) return;
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.query.baixar || req.query.listar) {
      const eu = await requireAuth(req, res);
      if (!eu) return;
      if (!isAdmin(eu)) return res.status(403).json({ erro: 'Apenas a administradora.' });
      const sb = adminClient();
      if (req.query.listar) {
        const { data, error } = await sb.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
        if (error) throw error;
        return res.status(200).json({ backups: data.map(a => ({ nome: a.name, tamanho: a.metadata?.size || 0, criado_em: a.created_at })) });
      }
      const conteudo = await gerar(sb);
      await guardar(sb, conteudo, `backup-${hojeSP()}-manual.json`);
      await registrar(req, eu, [{ evento: 'exportou', alvo: 'backup completo (download)', detalhes: { registros: conteudo.total } }]);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="depilclear-backup-${hojeSP()}.json"`);
      return res.status(200).send(JSON.stringify(conteudo));
    }

    // Cron: idempotente (um por dia); qualquer chamada extra só confirma que já existe
    const sb = adminClient();
    const nome = `backup-${hojeSP()}.json`;
    const { data: existentes } = await sb.storage.from(BUCKET).list('', { search: nome });
    if ((existentes || []).some(a => a.name === nome)) return res.status(200).json({ sucesso: true, ja_existia: true });
    const conteudo = await gerar(sb);
    await guardar(sb, conteudo, nome);
    await sb.from('atividades').delete().lt('criado_em', new Date(Date.now() - 365 * 864e5).toISOString()); // guarda 12 meses
    return res.status(200).json({ sucesso: true, total: conteudo.total });
  } catch (err) {
    console.error('Erro no backup:', err);
    return res.status(500).json({ erro: 'Falha ao gerar o backup.' });
  }
}
