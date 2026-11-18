/* ========================================================
 * DEPILCLEAR - sync.js
 * Dados na nuvem (Supabase) com fila offline e atualização ao vivo.
 * Carregue DEPOIS de vendor/supabase.js e security.js, e ANTES de app.js / caixa.js.
 *
 * Como funciona: o app continua gravando as listas no localStorage. Aqui, cada gravação é
 * comparada item a item com a última versão conhecida. O que mudou entra numa fila (salva no
 * aparelho) e é enviado ao banco quando há internet. As mudanças feitas nos outros aparelhos
 * chegam pelo Realtime e são aplicadas no localStorage; o app redesenha ao receber o evento
 * "depilclear:remoto".
 * ======================================================== */
(function () {
  const SUPABASE_URL = 'https://ndzmpnqpokdsvizskkpd.supabase.co';
  // Chave PÚBLICA (pode ficar no código): quem controla o acesso são as regras RLS do banco
  const SUPABASE_KEY = 'sb_publishable_dvTWrwrHtR9TOUvEjZpQLg_k1m75p7O';
  const AUTH_KEY = 'dc-auth', OUTBOX_KEY = 'dc-outbox', CURSOR_KEY = 'dc-cursor', PERFIL_KEY = 'dc-perfil';

  // Chave do localStorage -> coleção no banco
  const LISTAS = {
    depilclear_appointments: 'appointments', depilclear_clients: 'clients', depilclear_services: 'services',
    depilclear_categories: 'categories', depilclear_professionals: 'professionals', depilclear_wpp_templates: 'wpp_templates',
    depilclear_sales_log: 'sales_log', depilclear_cash_ops: 'cash_ops', depilclear_fidelity_redeemed_log: 'fidelity_redeemed'
  };
  const OBJETOS = { depilclear_company_config: 'company_config' };          // um documento só (id "main")
  const MAPAS = { depilclear_client_credits: 'client_credits', depilclear_wpp_sent: 'wpp_sent' }; // { chave: valor }
  const FID_PREFIX = 'depilclear_fidelity_';                                   // + id da cliente
  const ASSINADAS = new Set(['depilclear_sales_log', 'depilclear_cash_ops', 'depilclear_fidelity_redeemed_log']);

  const CHAVE_DA_COLECAO = {};
  [LISTAS, OBJETOS, MAPAS].forEach(m => Object.entries(m).forEach(([k, c]) => { CHAVE_DA_COLECAO[c] = k; }));

  function descrever(key) {
    if (LISTAS[key]) return { colecao: LISTAS[key], tipo: 'lista' };
    if (OBJETOS[key]) return { colecao: OBJETOS[key], tipo: 'objeto' };
    if (MAPAS[key]) return { colecao: MAPAS[key], tipo: 'mapa' };
    if (key.startsWith(FID_PREFIX) && key !== 'depilclear_fidelity_redeemed_log') {
      const id = key.slice(FID_PREFIX.length);
      // ids de cliente; ignora as chaves de controle do caixa ("redeemed_log__mac" etc.)
      if (/^[\w-]{1,100}$/.test(id) && !id.includes('__') && !id.startsWith('redeemed')) return { colecao: 'fidelity', tipo: 'doc', id };
    }
    return null;
  }

  function semAssinatura(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !('_sig' in item)) return item;
    const c = Object.assign({}, item); delete c._sig; return c;
  }
  function hashTexto(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'h' + (h >>> 0).toString(36); }

  // Divide o valor gravado em itens [id, dados]
  function itensDe(d, valor) {
    if (d.tipo === 'lista') {
      return (Array.isArray(valor) ? valor : []).filter(i => i && typeof i === 'object').map(i => {
        const dados = semAssinatura(i);
        return [i.id != null && i.id !== '' ? String(i.id) : hashTexto(JSON.stringify(dados)), dados];
      });
    }
    if (d.tipo === 'objeto') return valor && typeof valor === 'object' ? [['main', valor]] : [];
    if (d.tipo === 'mapa') return valor && typeof valor === 'object' ? Object.entries(valor) : [];
    return valor && typeof valor === 'object' ? [[d.id, valor]] : [];
  }

  /* ---------- Estado ---------- */
  const setOrig = Storage.prototype.setItem;
  const removeOrig = Storage.prototype.removeItem;
  const getLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const setLocal = (k, v) => { try { setOrig.call(localStorage, k, v); return true; } catch (e) { console.error('[sync] sem espaço no aparelho', e); return false; } };

  const snap = new Map();      // colecao -> Map(id -> json): última versão conhecida de cada item
  const ultimoTexto = new Map(); // chave -> texto gravado (atalho: se não mudou, nem compara)
  let outbox = new Map();      // "colecao|id" -> registro pendente
  let aplicandoRemoto = false;
  let iniciado = false, enviando = false, falhas = 0, timerEnvio = 0, perfil = null, canal = null;

  try { outbox = new Map(JSON.parse(getLocal(OUTBOX_KEY) || '[]')); } catch (e) { outbox = new Map(); }
  const salvarOutbox = () => setLocal(OUTBOX_KEY, JSON.stringify([...outbox]));
  const chaveFila = (c, id) => c + '|' + id;
  const mapaDe = (c) => { if (!snap.has(c)) snap.set(c, new Map()); return snap.get(c); };

  function chavesSincronizadas() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && descrever(k)) out.push(k); }
    return out;
  }

  // Foto do estado atual: base para detectar o que muda daqui em diante
  function fotografar() {
    chavesSincronizadas().forEach(k => {
      const d = descrever(k), txt = getLocal(k);
      let v; try { v = JSON.parse(txt); } catch (e) { return; }
      const m = mapaDe(d.colecao);
      itensDe(d, v).forEach(([id, dados]) => m.set(id, JSON.stringify(dados)));
      ultimoTexto.set(k, txt);
    });
  }

  function enfileirar(colecao, id, dados, excluido) {
    outbox.set(chaveFila(colecao, id), { colecao, id, dados: excluido ? null : dados, excluido: !!excluido, alterado_em: new Date().toISOString() });
  }

  function detectar(key, texto, removido) {
    const d = descrever(key);
    if (!d || (!removido && ultimoTexto.get(key) === texto)) return;
    if (perfil && perfil.funcao === 'depiladora') return; // só leitura: nada vai para a fila
    ultimoTexto.set(key, texto);
    let valor = null;
    if (!removido) { try { valor = JSON.parse(texto); } catch (e) { return; } }
    const m = mapaDe(d.colecao);
    const itens = itensDe(d, valor);
    const vistos = new Set();
    let mudou = false;
    itens.forEach(([id, dados]) => {
      vistos.add(id);
      const j = JSON.stringify(dados);
      if (m.get(id) !== j) { m.set(id, j); enfileirar(d.colecao, id, dados, false); mudou = true; }
    });
    // Itens que sumiram = excluídos (num documento de fidelidade só existe o próprio id)
    const candidatos = d.tipo === 'doc' ? [d.id] : [...m.keys()];
    candidatos.forEach(id => {
      if (!vistos.has(id) && m.has(id)) { m.delete(id); enfileirar(d.colecao, id, null, true); mudou = true; }
    });
    if (mudou) { salvarOutbox(); agendarEnvio(300); atualizarStatus(); }
  }

  // Intercepta as gravações do app (só no localStorage, nunca no sessionStorage)
  Storage.prototype.setItem = function (k, v) {
    setOrig.call(this, k, v);
    if (this === localStorage && !aplicandoRemoto && iniciado) detectar(String(k), String(v), false);
  };
  Storage.prototype.removeItem = function (k) {
    removeOrig.call(this, k);
    if (this === localStorage && !aplicandoRemoto && iniciado) detectar(String(k), null, true);
  };

  /* ---------- Cliente Supabase e login ---------- */
  const sb = window.supabase && window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_KEY, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } }
  });
  let tokenAtual = '';
  if (sb) sb.auth.onAuthStateChange((_ev, session) => { tokenAtual = session ? session.access_token : ''; });

  function sessaoSalva() {
    try { const s = JSON.parse(getLocal(AUTH_KEY) || 'null'); return s && s.refresh_token && s.user ? s : null; } catch (e) { return null; }
  }

  async function carregarPerfil(userId) {
    const { data, error } = await sb.from('perfis').select('nome, email, funcao, ativo').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function login(email, senha) {
    if (!sb) return { ok: false, erro: 'Não foi possível carregar o sistema de login. Recarregue a página.' };
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      const msg = /invalid login/i.test(error.message) ? 'E-mail ou senha incorretos.'
        : /rate|too many/i.test(error.message) ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
        : (!navigator.onLine || /fetch|network/i.test(error.message)) ? 'Sem internet. Conecte-se para entrar pela primeira vez.'
        : 'Não foi possível entrar agora. Tente novamente.';
      return { ok: false, erro: msg };
    }
    tokenAtual = data.session.access_token;
    let p = null;
    try { p = await carregarPerfil(data.user.id); } catch (e) { /* trata abaixo */ }
    if (!p || !p.ativo) {
      await sb.auth.signOut({ scope: 'local' });
      return { ok: false, erro: 'Usuário sem acesso. Fale com a administradora.' };
    }
    perfil = p; setLocal(PERFIL_KEY, JSON.stringify(p));
    return { ok: true, usuario: p };
  }

  // { ok, offline?, usuario?, reason? } — mesmo formato da validação antiga
  async function sessao() {
    if (!sb) return { ok: false, reason: 'token' };
    let session = null;
    try { ({ data: { session } } = await sb.auth.getSession()); } catch (e) { /* offline */ }
    const salva = sessaoSalva();
    if (!session && !salva) return { ok: false, reason: 'token' };
    const user = (session && session.user) || salva.user;
    if (session) tokenAtual = session.access_token;
    let cache = null; try { cache = JSON.parse(getLocal(PERFIL_KEY) || 'null'); } catch (e) { /* ignora */ }
    if (navigator.onLine && session) {
      try {
        const p = await carregarPerfil(user.id);
        if (!p || !p.ativo) return { ok: false, reason: 'unauthorized' };
        perfil = p; setLocal(PERFIL_KEY, JSON.stringify(p));
        return { ok: true, usuario: p };
      } catch (e) { /* servidor fora: usa o cache abaixo */ }
    }
    if (cache && cache.ativo && cache.email === (user.email || '').toLowerCase()) {
      perfil = cache;
      return { ok: true, offline: true, usuario: cache };
    }
    return { ok: false, reason: 'offline' };
  }

  async function logout() {
    parar();
    removeOrig.call(localStorage, PERFIL_KEY);
    perfil = null; tokenAtual = '';
    // A fila de pendências NÃO é apagada: é enviada no próximo login neste aparelho
    try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch (e) { removeOrig.call(localStorage, AUTH_KEY); }
  }

  /* ---------- Envio (fila -> banco) ---------- */
  function agendarEnvio(ms) { clearTimeout(timerEnvio); timerEnvio = setTimeout(enviar, ms); }

  async function enviar() {
    if (enviando || !iniciado || !outbox.size || !navigator.onLine || !perfil || perfil.funcao === 'depiladora') return;
    enviando = true; atualizarStatus();
    try {
      while (outbox.size && navigator.onLine) {
        const lote = [...outbox.entries()].slice(0, 500);
        const { error } = await sb.rpc('sincronizar', { lote: lote.map(([, r]) => r) });
        if (error) throw error;
        lote.forEach(([k, r]) => { if (outbox.get(k) === r) outbox.delete(k); }); // não apaga se mudou durante o envio
        salvarOutbox();
      }
      falhas = 0;
    } catch (e) {
      falhas++;
      console.warn('[sync] envio falhou, nova tentativa em breve:', e.message || e);
      agendarEnvio(Math.min(60000, 3000 * 2 ** Math.min(falhas, 5)));
    } finally { enviando = false; atualizarStatus(); }
  }

  /* ---------- Recebimento (banco -> aparelho) ---------- */
  let remotosPendentes = new Set(), timerEvento = 0;
  function avisarApp(chave) {
    remotosPendentes.add(chave);
    clearTimeout(timerEvento);
    timerEvento = setTimeout(() => {
      const chaves = [...remotosPendentes]; remotosPendentes = new Set();
      window.dispatchEvent(new CustomEvent('depilclear:remoto', { detail: { chaves } }));
    }, 120);
  }

  function aplicarRemotos(linhas) {
    const porChave = new Map();
    linhas.forEach(r => {
      if (!r || !r.colecao) return;
      if (outbox.has(chaveFila(r.colecao, r.id))) return; // há edição local mais nova esperando envio
      const chave = r.colecao === 'fidelity' ? FID_PREFIX + r.id : CHAVE_DA_COLECAO[r.colecao];
      if (!chave) return;
      if (!porChave.has(chave)) porChave.set(chave, []);
      porChave.get(chave).push(r);
    });
    porChave.forEach((rows, chave) => {
      const d = descrever(chave); if (!d) return;
      const m = mapaDe(d.colecao);
      let valor; try { valor = JSON.parse(getLocal(chave) || 'null'); } catch (e) { valor = null; }
      if (d.tipo === 'lista') {
        const arr = Array.isArray(valor) ? valor : [];
        const pos = new Map(); arr.forEach((it, i) => { if (it && it.id != null) pos.set(String(it.id), i); });
        const remover = new Set();
        rows.forEach(r => {
          const i = pos.get(String(r.id));
          if (r.excluido) { if (i != null) remover.add(i); }
          else if (i != null) arr[i] = r.dados; else { pos.set(String(r.id), arr.length); arr.push(r.dados); }
        });
        valor = remover.size ? arr.filter((_, i) => !remover.has(i)) : arr;
      } else if (d.tipo === 'objeto') {
        const ult = rows[rows.length - 1]; valor = ult.excluido ? null : ult.dados;
      } else if (d.tipo === 'mapa') {
        valor = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
        rows.forEach(r => { if (r.excluido) delete valor[r.id]; else valor[r.id] = r.dados; });
      } else {
        const ult = rows[rows.length - 1]; valor = ult.excluido ? null : ult.dados;
      }
      rows.forEach(r => { if (r.excluido) m.delete(String(r.id)); else m.set(String(r.id), JSON.stringify(r.dados)); });
      aplicandoRemoto = true;
      try {
        if (valor == null) removeOrig.call(localStorage, chave);
        else if (ASSINADAS.has(chave) && typeof safeWriteStore === 'function') safeWriteStore(chave, valor);
        else setLocal(chave, JSON.stringify(valor));
      } finally { aplicandoRemoto = false; }
      ultimoTexto.set(chave, getLocal(chave));
      avisarApp(chave);
    });
  }

  async function puxar() {
    const cursor = getLocal(CURSOR_KEY) || '1970-01-01T00:00:00Z';
    const PAG = 1000; let desde = 0, maior = cursor, todas = [];
    for (;;) {
      const { data, error } = await sb.from('registros').select('colecao, id, dados, excluido, atualizado_em')
        .gt('atualizado_em', cursor).order('atualizado_em').order('colecao').order('id').range(desde, desde + PAG - 1);
      if (error) throw error;
      todas = todas.concat(data);
      data.forEach(r => { if (r.atualizado_em > maior) maior = r.atualizado_em; });
      if (data.length < PAG) break;
      desde += PAG;
    }
    if (todas.length) aplicarRemotos(todas);
    setLocal(CURSOR_KEY, maior);
    return todas;
  }

  // 1ª sincronização deste aparelho: envia o que só existe aqui (ex.: dados de antes da nuvem)
  function enviarSoLocais(remotas) {
    const naNuvem = new Set(remotas.map(r => chaveFila(r.colecao, r.id)));
    let n = 0;
    snap.forEach((m, colecao) => m.forEach((j, id) => {
      if (!naNuvem.has(chaveFila(colecao, id)) && !outbox.has(chaveFila(colecao, id))) { enfileirar(colecao, id, JSON.parse(j), false); n++; }
    }));
    if (n) salvarOutbox();
  }

  function assinarTempoReal() {
    if (canal) return;
    canal = sb.channel('registros-ao-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, (p) => {
        if (p.new && p.new.colecao) {
          aplicarRemotos([p.new]);
          if (p.new.atualizado_em > (getLocal(CURSOR_KEY) || '')) setLocal(CURSOR_KEY, p.new.atualizado_em);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, async (p) => {
        // Desativada ou excluída pela administradora: sai na hora
        const meu = sessaoSalva(); const uid = meu && meu.user && meu.user.id;
        const alvo = (p.new && p.new.user_id) || (p.old && p.old.user_id);
        if (uid && alvo === uid && (p.eventType === 'DELETE' || (p.new && !p.new.ativo))) {
          await logout();
          window.dispatchEvent(new CustomEvent('depilclear:acesso-revogado'));
        }
      })
      .subscribe((status) => {
        estadoCanal = status;
        if (status === 'SUBSCRIBED') puxar().catch(() => {}); // recupera o que chegou enquanto estava desconectado
        atualizarStatus();
      });
  }
  let estadoCanal = '';

  let iniciando = false;
  async function iniciar() {
    if (iniciado || iniciando || !sb) return;
    iniciando = true;
    const primeira = !getLocal(CURSOR_KEY);
    let remotas = null;
    // Primeiro traz a nuvem (sem detectar), depois fotografa: assim o que veio de fora não volta como "alteração local"
    if (navigator.onLine) {
      try { remotas = await puxar(); } catch (e) { console.warn('[sync] carga inicial falhou:', e.message || e); }
    }
    fotografar();
    iniciado = true; iniciando = false;
    if (primeira && remotas && perfil && perfil.funcao !== 'depiladora') enviarSoLocais(remotas);
    atualizarStatus();
    assinarTempoReal();
    agendarEnvio(200);
  }

  function parar() {
    if (canal) { sb.removeChannel(canal); canal = null; }
    iniciado = false; clearTimeout(timerEnvio); atualizarStatus();
  }

  window.addEventListener('online', () => { agendarEnvio(500); if (iniciado) puxar().catch(() => {}); atualizarStatus(); });
  window.addEventListener('offline', atualizarStatus);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && iniciado && navigator.onLine) { puxar().catch(() => {}); agendarEnvio(300); } });

  /* ---------- Indicador de status ---------- */
  function atualizarStatus() {
    const n = outbox.size;
    let texto, tom;
    if (!navigator.onLine) { texto = n ? `Offline · ${n} pendente(s)` : 'Offline · salvando no aparelho'; tom = 'off'; }
    else if (!iniciado) { texto = 'Online'; tom = 'ok'; }
    else if (enviando || n) { texto = `Sincronizando · ${n}`; tom = 'sync'; }
    else if (estadoCanal && estadoCanal !== 'SUBSCRIBED') { texto = 'Reconectando…'; tom = 'sync'; }
    else { texto = 'Online · sincronizado'; tom = 'ok'; }
    const el = document.getElementById('connection-text');
    if (el) el.textContent = texto;
    const badge = document.getElementById('connection-indicator-desktop');
    if (badge) badge.dataset.sync = tom;
    const mob = document.getElementById('mobile-sync');
    if (mob) {
      mob.dataset.sync = tom;
      document.getElementById('mobile-sync-text').textContent = tom === 'ok' ? 'Online' : texto.replace(' · salvando no aparelho', '');
    }
    let pill = document.getElementById('dc-sync-pill');
    if (!el) {
      if (!pill && document.body) {
        pill = document.createElement('div'); pill.id = 'dc-sync-pill'; pill.setAttribute('role', 'status');
        document.body.appendChild(pill);
      }
      if (pill) { pill.textContent = texto; pill.dataset.sync = tom; pill.hidden = !iniciado && navigator.onLine; }
    }
  }
  document.addEventListener('DOMContentLoaded', atualizarStatus);

  window.DC = {
    sb, login, logout, sessao, iniciar, parar,
    token: () => tokenAtual,
    temSessaoSalva: () => !!sessaoSalva(),
    perfil: () => perfil,
    pendentes: () => outbox.size,
    enviarAgora: () => enviar(),
    _testes: { descrever, itensDe }
  };
})();
