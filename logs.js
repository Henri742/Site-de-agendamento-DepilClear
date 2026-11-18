/* logs.js — página de logs e segurança.
 * Quem pode ver é decidido no banco (função sou_auditor + regra RLS). Este arquivo não tem nenhum
 * e-mail nem lista de pessoas: se o banco não liberar, a consulta volta vazia e a página mostra "restrito". */
const $ = (id) => document.getElementById(id);
const TZ = 'America/Sao_Paulo';
const POR_PAGINA = 150;

const GRUPOS = {
  acesso: ['login', 'login_falhou', 'logout', 'sessao', 'acesso_negado'],
  visto: ['abriu'],
  mudanca: ['criou', 'editou', 'excluiu', 'alterou_lote'],
  exportou: ['exportou'],
  whatsapp: ['whatsapp']
};
const ICONE = { login: '🔓', sessao: '📲', logout: '🚪', login_falhou: '⛔', acesso_negado: '🚫', abriu: '👁️', criou: '➕', editou: '✏️', excluiu: '🗑️', alterou_lote: '📦', exportou: '📤', whatsapp: '💬' };
const CLASSE = { login: 'ev-acesso', sessao: 'ev-acesso', logout: 'ev-acesso', login_falhou: 'ev-falha', acesso_negado: 'ev-falha', criou: 'ev-mudanca', editou: 'ev-mudanca', alterou_lote: 'ev-mudanca', excluiu: 'ev-exclusao', exportou: 'ev-export' };

let estado = { dias: 0, tipo: '', pessoa: '', aparelho: '', busca: '', limite: POR_PAGINA };
let eventos = [];   // eventos do período
let historico = []; // acessos dos últimos 90 dias (base para os alertas)

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const diaChave = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ });
const diaNome = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' });
const horaSP = (iso) => Number(new Date(iso).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24;
const quem = (e) => e.nome || e.email || 'Alguém';
const local = (e) => [e.cidade, e.regiao, e.pais && e.pais !== 'BR' ? e.pais : ''].filter(Boolean).join('/') || '';

function inicioPeriodo(dias) {
  const hojeSP = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  const d = new Date(`${hojeSP}T00:00:00-03:00`);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

/* ---------- Frases fáceis de entender ---------- */
function frase(e) {
  const n = `<b>${esc(quem(e))}</b>`;
  const alvo = esc(e.alvo || '');
  switch (e.evento) {
    case 'login': return `${n} entrou no sistema${e.detalhes && e.detalhes.lembrar_de_mim === false ? ' (sem "lembrar de mim")' : ''}`;
    case 'sessao': return `${n} abriu o sistema já conectado${e.detalhes && e.detalhes.offline ? ' (sem internet)' : ''}`;
    case 'logout': return `${n} saiu do sistema`;
    case 'login_falhou': return `Tentativa de entrar com <b>${esc(e.email || '?')}</b> falhou (senha ou e-mail errado)`;
    case 'acesso_negado': return `${n} tentou abrir uma área restrita: ${alvo}`;
    case 'abriu': return `${n} viu ${alvo}`;
    case 'criou': return `${n} cadastrou ${alvo}`;
    case 'editou': {
      const c = e.detalhes && e.detalhes.campos ? Object.entries(e.detalhes.campos) : [];
      const mud = e.detalhes && e.detalhes.mudancas ? e.detalhes.mudancas.join(', ') : '';
      const resumo = c.slice(0, 3).map(([k, [a, b]]) => `${esc(k)}: ${esc(a || '—')} → ${esc(b || '—')}`).join('; ');
      return `${n} alterou ${alvo}${resumo ? ` <span class="meta">(${resumo})</span>` : ''}${mud ? ` <span class="meta">(${esc(mud)})</span>` : ''}`;
    }
    case 'excluiu': return `${n} excluiu ${alvo}`;
    case 'alterou_lote': {
      const d = e.detalhes || {};
      return `${n} alterou vários registros de ${alvo} <span class="meta">(${d.criados || 0} novos, ${d.editados || 0} editados, ${d.excluidos || 0} excluídos)</span>`;
    }
    case 'exportou': return `${n} exportou/imprimiu ${alvo}`;
    case 'whatsapp': return `${n} abriu o WhatsApp: ${alvo}`;
    default: return `${n} ${esc(e.evento)} ${alvo}`;
  }
}

function linhaMeta(e) {
  return [hora(e.criado_em), e.aparelho, e.sistema, e.navegador, local(e), e.ip ? `IP ${e.ip}` : ''].filter(Boolean).map(esc).join(' · ');
}

function detalhesHTML(e) {
  const linhas = [
    ['Pessoa', `${quem(e)}${e.email ? ` (${e.email})` : ''}${e.funcao ? ` · ${e.funcao}` : ''}`],
    ['Quando', new Date(e.criado_em).toLocaleString('pt-BR', { timeZone: TZ }) + (e.ocorrido_em && Math.abs(new Date(e.ocorrido_em) - new Date(e.criado_em)) > 120000 ? ` (no aparelho: ${new Date(e.ocorrido_em).toLocaleString('pt-BR', { timeZone: TZ })} — estava sem internet)` : '')],
    ['Aparelho', [e.aparelho, e.sistema, e.navegador].filter(Boolean).join(' · ')],
    ['ID do aparelho', e.device_id ? e.device_id.slice(0, 8) : '—'],
    ['Local aproximado', local(e) || '—'],
    ['IP', e.ip || '—']
  ];
  if (e.lat != null && e.lon != null) linhas.push(['Mapa', `<a href="https://www.google.com/maps?q=${e.lat},${e.lon}" target="_blank" rel="noopener">abrir no mapa (aproximado pelo IP)</a>`]);
  if (e.detalhes) {
    Object.entries(e.detalhes).forEach(([k, v]) => {
      if (k === 'campos' && v && typeof v === 'object') Object.entries(v).forEach(([c, [a, b]]) => linhas.push([`Campo ${c}`, `${a || '—'} → ${b || '—'}`]));
      else if (!['colecao', 'id'].includes(k)) linhas.push([k.replace(/_/g, ' '), typeof v === 'object' ? JSON.stringify(v) : String(v)]);
    });
  }
  if (e.user_agent) linhas.push(['Navegador (técnico)', e.user_agent]);
  return linhas.map(([k, v]) => `<div><span>${esc(k)}</span><span>${k === 'Mapa' ? v : esc(v)}</span></div>`).join('');
}

/* ---------- Detector de atividades suspeitas ---------- */
function distanciaKm(a, b) {
  const R = 6371, rad = (x) => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Recebe acessos/exclusões em ordem cronológica e devolve alertas { nivel, titulo, texto, pessoa, quando }
function detectarSuspeitas(lista) {
  const alertas = [];
  const porPessoa = new Map();
  const ordenada = [...lista].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const acessos = ordenada.filter(e => e.evento === 'login' || e.evento === 'sessao');

  acessos.forEach(e => {
    const k = e.user_id || e.email;
    if (!k) return;
    const p = porPessoa.get(k) || { aparelhos: new Set(), cidades: new Set(), total: 0, ultimos: [] };
    if (p.total >= 3) {
      if (e.device_id && !p.aparelhos.has(e.device_id)) alertas.push({ nivel: 'medio', titulo: 'Aparelho novo', texto: `${quem(e)} entrou por um aparelho nunca usado antes (${[e.aparelho, e.sistema, e.navegador].filter(Boolean).join(' · ')}).`, pessoa: k, quando: e.criado_em });
      if (e.cidade && !p.cidades.has(e.cidade)) alertas.push({ nivel: 'medio', titulo: 'Local novo', texto: `${quem(e)} acessou de ${local(e)}, um local diferente do habitual.`, pessoa: k, quando: e.criado_em });
    }
    if (e.pais && e.pais !== 'BR') alertas.push({ nivel: 'alto', titulo: 'Acesso fora do Brasil', texto: `${quem(e)} acessou de ${local(e)}.`, pessoa: k, quando: e.criado_em });
    const h = horaSP(e.criado_em);
    if (e.evento === 'login' && (h < 6 || h >= 22)) alertas.push({ nivel: 'baixo', titulo: 'Horário incomum', texto: `${quem(e)} entrou às ${hora(e.criado_em)}.`, pessoa: k, quando: e.criado_em });
    // "Viagem impossível": dois acessos longe demais em pouco tempo
    const ant = p.ultimos.filter(x => x.lat != null).slice(-1)[0];
    if (ant && e.lat != null && (new Date(e.criado_em) - new Date(ant.criado_em)) < 3 * 3600e3) {
      const km = distanciaKm(ant, e);
      if (km > 300) alertas.push({ nivel: 'alto', titulo: 'Acessos de lugares distantes', texto: `${quem(e)} acessou de ${local(ant)} e, ${Math.round((new Date(e.criado_em) - new Date(ant.criado_em)) / 60000)} min depois, de ${local(e)} (${Math.round(km)} km).`, pessoa: k, quando: e.criado_em });
    }
    // Vários aparelhos ao mesmo tempo
    const umaHora = p.ultimos.filter(x => new Date(e.criado_em) - new Date(x.criado_em) < 3600e3).map(x => x.device_id);
    const distintos = new Set([...umaHora, e.device_id].filter(Boolean));
    if (distintos.size >= 3 && !p.alertouMulti) { alertas.push({ nivel: 'medio', titulo: 'Vários aparelhos ao mesmo tempo', texto: `${quem(e)} usou ${distintos.size} aparelhos diferentes em menos de 1 hora.`, pessoa: k, quando: e.criado_em }); p.alertouMulti = true; }
    if (e.device_id) p.aparelhos.add(e.device_id);
    if (e.cidade) p.cidades.add(e.cidade);
    p.total++;
    p.ultimos.push(e); if (p.ultimos.length > 20) p.ultimos.shift();
    porPessoa.set(k, p);
  });

  // Muitas senhas erradas (5+ em 15 min para o mesmo e-mail)
  const falhas = ordenada.filter(e => e.evento === 'login_falhou');
  const porEmail = new Map();
  falhas.forEach(e => { const k = e.email || '?'; (porEmail.get(k) || porEmail.set(k, []).get(k)).push(e); });
  porEmail.forEach((lst, email) => {
    for (let i = 0; i + 4 < lst.length; i++) {
      if (new Date(lst[i + 4].criado_em) - new Date(lst[i].criado_em) <= 15 * 60000) {
        alertas.push({ nivel: 'alto', titulo: 'Muitas senhas erradas', texto: `${lst.length >= 5 ? lst.length : 5} tentativas falhas com ${email} (IP ${lst[i].ip || '?'}${local(lst[i]) ? ', ' + local(lst[i]) : ''}).`, pessoa: email, quando: lst[i + 4].criado_em });
        break;
      }
    }
  });

  // Exclusões em massa (10+ em 10 min pela mesma pessoa)
  const exclusoes = ordenada.filter(e => e.evento === 'excluiu');
  const porQuem = new Map();
  exclusoes.forEach(e => { const k = e.user_id || e.email; (porQuem.get(k) || porQuem.set(k, []).get(k)).push(e); });
  porQuem.forEach((lst, k) => {
    for (let i = 0; i + 9 < lst.length; i++) {
      if (new Date(lst[i + 9].criado_em) - new Date(lst[i].criado_em) <= 10 * 60000) {
        alertas.push({ nivel: 'alto', titulo: 'Muitas exclusões seguidas', texto: `${quem(lst[i])} excluiu ${lst.length} registros em pouco tempo.`, pessoa: k, quando: lst[i + 9].criado_em });
        break;
      }
    }
  });

  const peso = { alto: 0, medio: 1, baixo: 2 };
  return alertas.sort((a, b) => peso[a.nivel] - peso[b.nivel] || b.quando.localeCompare(a.quando));
}

/* ---------- Dados ---------- */
async function carregar() {
  const inicio = inicioPeriodo(estado.dias);
  const sb = DC.sb;
  const [periodo, base] = await Promise.all([
    sb.from('atividades').select('*').gte('criado_em', inicio).order('criado_em', { ascending: false }).limit(3000),
    sb.from('atividades').select('user_id, email, nome, evento, device_id, cidade, regiao, pais, lat, lon, aparelho, sistema, navegador, ip, criado_em')
      .in('evento', ['login', 'sessao', 'login_falhou', 'excluiu']).gte('criado_em', inicioPeriodo(90)).order('criado_em', { ascending: true }).limit(8000)
  ]);
  if (periodo.error) throw periodo.error;
  eventos = periodo.data || [];
  historico = (base.data || []);
  preencherPessoas();
  render();
}

function preencherPessoas() {
  const sel = $('f-pessoa');
  const atual = sel.value;
  const pessoas = new Map();
  [...historico, ...eventos].forEach(e => { const k = e.user_id || e.email; if (k && !pessoas.has(k)) pessoas.set(k, quem(e)); });
  sel.replaceChildren(new Option('Todas', ''), ...[...pessoas].sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => new Option(n, k)));
  sel.value = pessoas.has(atual) ? atual : '';
}

function filtrados() {
  const b = estado.busca.trim().toLowerCase();
  return eventos.filter(e =>
    (!estado.tipo || (GRUPOS[estado.tipo] || []).includes(e.evento)) &&
    (!estado.pessoa || (e.user_id || e.email) === estado.pessoa) &&
    (!estado.aparelho || e.aparelho === estado.aparelho) &&
    (!b || [e.alvo, e.nome, e.email, e.cidade, e.ip, e.sistema, e.navegador].some(v => v && String(v).toLowerCase().includes(b)))
  );
}

function render() {
  const inicio = inicioPeriodo(estado.dias);
  const lista = filtrados();

  // Resumo do período
  $('n-acessos').textContent = eventos.filter(e => e.evento === 'login' || e.evento === 'sessao').length;
  $('n-pessoas').textContent = new Set(eventos.map(e => e.user_id).filter(Boolean)).size;
  $('n-alteracoes').textContent = eventos.filter(e => GRUPOS.mudanca.includes(e.evento)).length;

  // Alertas do período (calculados com 90 dias de histórico como base)
  const alertas = detectarSuspeitas(historico).filter(a => a.quando >= inicio);
  $('n-alertas').textContent = alertas.length;
  const ul = $('lista-alertas');
  ul.innerHTML = alertas.length ? alertas.slice(0, 30).map((a, i) => `
    <li class="${a.nivel}"><button type="button" data-i="${i}">
      <span class="nivel">${a.nivel === 'alto' ? 'Alto' : a.nivel === 'medio' ? 'Médio' : 'Baixo'}</span>
      <strong>${esc(a.titulo)}</strong>
      <small>${esc(a.texto)} · ${esc(new Date(a.quando).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }))}</small>
    </button></li>`).join('') : '<li class="nenhum">✓ Nenhuma atividade suspeita neste período.</li>';
  ul.querySelectorAll('button[data-i]').forEach(btn => btn.onclick = () => {
    estado.pessoa = alertas[Number(btn.dataset.i)].pessoa;
    estado.tipo = 'acesso';
    sincronizarControles();
    render();
    $('lista-eventos').scrollIntoView({ behavior: 'smooth' });
  });

  // Linha do tempo agrupada por dia
  $('contagem').textContent = `${lista.length} evento${lista.length === 1 ? '' : 's'}`;
  const visiveis = lista.slice(0, estado.limite);
  let dia = '';
  const partes = [];
  visiveis.forEach(e => {
    const d = diaChave(e.criado_em);
    if (d !== dia) { dia = d; partes.push(`<p class="dia">${esc(diaNome(e.criado_em))}</p>`); }
    partes.push(`<details class="ev ${CLASSE[e.evento] || ''}"><summary><span class="ic" aria-hidden="true">${ICONE[e.evento] || '•'}</span><span class="frase">${frase(e)}</span><span class="meta">${linhaMeta(e)}</span></summary><div class="det">${detalhesHTML(e)}</div></details>`);
  });
  $('lista-eventos').innerHTML = partes.join('') || '<p class="vazio">Nenhum evento com esses filtros.</p>';
  $('mais').hidden = lista.length <= estado.limite;
}

function sincronizarControles() {
  document.querySelectorAll('#f-periodo button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.dias) === estado.dias)));
  document.querySelectorAll('#f-tipo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === estado.tipo)));
  $('f-pessoa').value = estado.pessoa;
  $('f-aparelho').value = estado.aparelho;
  $('f-busca').value = estado.busca;
}

function baixarCSV() {
  const cols = ['criado_em', 'nome', 'email', 'funcao', 'evento', 'alvo', 'aparelho', 'sistema', 'navegador', 'cidade', 'regiao', 'pais', 'ip', 'device_id'];
  const linhas = [cols.join(';'), ...filtrados().map(e => cols.map(c => `"${String(c === 'criado_em' ? new Date(e[c]).toLocaleString('pt-BR', { timeZone: TZ }) : (e[c] ?? '')).replace(/"/g, '""')}"`).join(';'))];
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `logs-depilclear-${new Date().toLocaleDateString('sv-SE')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  DC.log('exportou', 'logs (CSV)');
}

/* ---------- Início ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const sessao = await validateSession();
  if (!sessao.ok) { window.location.replace('index.html'); return; }
  const liberado = await DC.souAuditor();
  if (!liberado) {
    $('sem-acesso').hidden = false;
    DC.log('acesso_negado', 'página de logs');
    return;
  }
  $('conteudo').hidden = false;
  DC.log('abriu', 'tela: Logs e segurança');

  document.querySelectorAll('#f-periodo button').forEach(b => b.onclick = async () => { estado.dias = Number(b.dataset.dias); estado.limite = POR_PAGINA; sincronizarControles(); await carregar(); });
  document.querySelectorAll('#f-tipo button').forEach(b => b.onclick = () => { estado.tipo = b.dataset.tipo; estado.limite = POR_PAGINA; sincronizarControles(); render(); });
  $('f-pessoa').onchange = (e) => { estado.pessoa = e.target.value; estado.limite = POR_PAGINA; render(); };
  $('f-aparelho').onchange = (e) => { estado.aparelho = e.target.value; estado.limite = POR_PAGINA; render(); };
  let t = 0;
  $('f-busca').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { estado.busca = e.target.value; estado.limite = POR_PAGINA; render(); }, 200); };
  $('limpar').onclick = () => { estado = { ...estado, tipo: '', pessoa: '', aparelho: '', busca: '', limite: POR_PAGINA }; sincronizarControles(); render(); };
  $('exportar').onclick = baixarCSV;
  $('mais').onclick = () => { estado.limite += POR_PAGINA; render(); };

  try { await carregar(); } catch (e) { $('lista-eventos').innerHTML = '<p class="vazio">Não foi possível carregar os logs. Verifique a internet.</p>'; }

  // Ao vivo: novos eventos aparecem sozinhos
  let timer = 0;
  DC.sb.channel('logs-ao-vivo')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'atividades' }, () => { clearTimeout(timer); timer = setTimeout(() => carregar().catch(() => {}), 1500); })
    .subscribe((st) => { $('ao-vivo').hidden = st !== 'SUBSCRIBED'; });
});

window.__logsTestes = { detectarSuspeitas, frase };
