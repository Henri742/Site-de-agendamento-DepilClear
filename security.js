/* ========================================================
 * DEPILCLEAR - security.js
 * Utilitários de segurança compartilhados (index.html e caixa.html).
 * Carregue ESTE arquivo antes de app.js / caixa.js.
 *
 *  1) Escape/validação de saída (XSS): escapeHtml, jsStr, safeImageSrc, safeColor
 *  2) Integridade de dados sensíveis no localStorage (HMAC-SHA256)
 *  3) Sessão: Supabase Auth (sync.js), funciona offline com a sessão salva no aparelho
 * ======================================================== */

/* ---------- 0) DESEMPENHO DOS ÍCONES ---------- */
// lucide 0.462 ignora "root" e varre o documento INTEIRO a cada createIcons() (com milhares de linhas
// isso custava ~90 ms por chamada, várias vezes por clique). Agrupa todas as chamadas da mesma tarefa
// em uma só, executada antes da próxima pintura. Sem a CDN (offline sem cache), vira no-op em vez de quebrar.
(function () {
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') {
    window.lucide = { createIcons() {}, icons: {} };
    return;
  }
  const original = window.lucide.createIcons;
  let agendado = false;
  // Só (re)desenha <i data-lucide> novos e <svg> cujo data-lucide mudou (ex.: olho da senha);
  // os SVGs já corretos são pulados em vez de recriados.
  function desenharPendentes() {
    agendado = false;
    let algum = false;
    document.querySelectorAll('[data-lucide]').forEach((el) => {
      const nome = el.getAttribute('data-lucide');
      if (el.getAttribute('data-lucide-done') === nome) return;
      el.setAttribute('data-lucide-todo', nome);
      algum = true;
    });
    if (!algum) return;
    original({ nameAttr: 'data-lucide-todo' });
    document.querySelectorAll('[data-lucide-todo]').forEach((el) => {
      el.setAttribute('data-lucide-done', el.getAttribute('data-lucide-todo'));
      el.removeAttribute('data-lucide-todo');
    });
  }
  window.lucide.createIcons = function () {
    if (agendado) return;
    agendado = true;
    queueMicrotask(desenharPendentes);
  };
})();

/* ---------- 1) PROTEÇÃO CONTRA XSS ---------- */

// ÚNICA função de escape do projeto. Use em TODO dado dinâmico dentro de innerHTML,
// inclusive dentro de atributos entre aspas (title="...", value="...").
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"'`]/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[ch]
  ));
}

// Para valores de TEXTO dentro de handlers inline: onclick="fn('${jsStr(valor)}')".
// IMPORTANTE: escapeHtml NÃO basta aí, pois o navegador decodifica &#39; antes de executar o JS.
// Aqui todo caractere fora de [A-Za-z0-9 _.-] vira \xHH / \uHHHH (seguro em string JS e em atributo HTML).
function jsStr(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9 _.\-]/g, ch => {
    const code = ch.charCodeAt(0);
    return code < 256
      ? '\\x' + code.toString(16).padStart(2, '0')
      : '\\u' + code.toString(16).padStart(4, '0');
  });
}

// Aceita apenas data:image/(png|jpeg|jpg|gif|webp);base64, https: e caminhos relativos simples.
// Rejeita javascript:, vbscript:, data:text/html, data:image/svg+xml (pode conter script) etc.
function safeImageSrc(url, fallback = '') {
  const u = String(url ?? '').trim();
  if (!u) return fallback;
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(u)) return u;
  if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
  if (/^(?!\/\/)[A-Za-z0-9_\-./]+\.(png|jpe?g|gif|webp|svg)$/i.test(u)) return u; // arquivo local (ex.: logo.webp)
  return fallback;
}

// Aceita somente cores hexadecimais (#rgb, #rgba, #rrggbb, #rrggbbaa).
function safeColor(color, fallback = '#a78bfa') {
  const c = String(color ?? '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
}

/* ---------- 2) INTEGRIDADE DO localStorage (HMAC-SHA256) ---------- */
/* Implementação síncrona de SHA-256/HMAC (a Web Crypto é assíncrona e o app lê os dados de forma síncrona). */

const _SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function _sha256(bytes) {
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const bitLen = len * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);

  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + _SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v >>> 0));
  return out;
}

function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  let k = enc.encode(key);
  if (k.length > 64) k = _sha256(k);
  const ipad = new Uint8Array(64).fill(0x36);
  const opad = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i]; }
  const m = enc.encode(message);
  const inner = new Uint8Array(64 + m.length);
  inner.set(ipad); inner.set(m, 64);
  const innerHash = _sha256(inner);
  const outer = new Uint8Array(64 + 32);
  outer.set(opad); outer.set(innerHash, 64);
  return Array.from(_sha256(outer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/*
 * ATENÇÃO (limite conhecido): este segredo fica no JavaScript entregue ao navegador.
 * O HMAC protege contra EDIÇÃO CASUAL dos dados no DevTools/localStorage (um registro
 * alterado "na mão" vai para a quarentena e não entra nos relatórios). NÃO protege contra
 * quem lê este arquivo e recalcula a assinatura.
 * TODO (médio prazo): mover vendas e operações de caixa para o back-end (Supabase com RLS),
 * onde a integridade é garantida pelo servidor e não pelo navegador.
 */
const INTEGRITY_SECRET = 'depilclear::integrity::v1::7f3a9c1e-b2d4-4e8a-9a51-3c6d0e5f7b21';
const INTEGRITY_MARK_SUFFIX = '__integrity_v1';
const INTEGRITY_MAC_SUFFIX = '__mac';
const QUARANTINE_SUFFIX = '__quarantine';

// JSON com chaves ordenadas: a assinatura não muda se a ordem das chaves mudar
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function signRecord(record) {
  const clone = Object.assign({}, record);
  delete clone._sig;
  return hmacSha256Hex(INTEGRITY_SECRET, stableStringify(clone));
}

function _constEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function _notifyIntegrity(key, count) {
  const msg = `⚠️ ${count} registro(s) de "${key.replace('depilclear_', '')}" falharam na verificação de integridade e foram enviados para a quarentena (não entram nos relatórios).`;
  console.warn('[INTEGRIDADE]', msg);
  try {
    if (typeof showToast === 'function') showToast(msg, 'error');
  } catch (e) { /* ignora */ }
  try {
    if (!document.getElementById('integrity-banner') && document.body) {
      const bar = document.createElement('div');
      bar.id = 'integrity-banner';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#9f1239;color:#fff;font:600 12px/1.4 sans-serif;padding:8px 14px;display:flex;gap:12px;align-items:center;justify-content:space-between;';
      const span = document.createElement('span');
      span.textContent = msg;
      const btn = document.createElement('button');
      btn.textContent = 'Entendi';
      btn.style.cssText = 'background:#fff;color:#9f1239;border:0;border-radius:8px;padding:4px 10px;font-weight:700;cursor:pointer;';
      btn.onclick = () => bar.remove();
      bar.append(span, btn);
      document.body.appendChild(bar);
    }
  } catch (e) { /* ignora */ }
}

function _quarantine(key, records) {
  try {
    const qKey = key + QUARANTINE_SUFFIX;
    const prev = JSON.parse(localStorage.getItem(qKey) || '[]');
    const stamped = records.map(r => ({ quarantinedAt: new Date().toISOString(), record: r }));
    localStorage.setItem(qKey, JSON.stringify(prev.concat(stamped).slice(-500)));
  } catch (e) { /* cota cheia: segue sem quarentena persistente */ }
}

function _macOf(records) {
  return hmacSha256Hex(INTEGRITY_SECRET, 'LIST|' + records.map(r => r._sig).join('|'));
}

// Leitura única e segura dos registros sensíveis (vendas e operações de caixa).
function safeReadStore(key, fallback = []) {
  let raw;
  try { raw = localStorage.getItem(key); } catch (e) { return fallback.slice(); }
  if (!raw) return fallback.slice();

  let arr;
  try { arr = JSON.parse(raw); } catch (e) {
    _quarantine(key, [{ corrupted: String(raw).slice(0, 2000) }]);
    _notifyIntegrity(key, 1);
    return fallback.slice();
  }
  if (!Array.isArray(arr)) {
    _quarantine(key, [{ unexpected: String(raw).slice(0, 2000) }]);
    _notifyIntegrity(key, 1);
    return fallback.slice();
  }

  const migrated = localStorage.getItem(key + INTEGRITY_MARK_SUFFIX) === '1';
  const valid = [];
  const bad = [];
  let legacyUnsigned = false;

  arr.forEach(rec => {
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { bad.push(rec); return; }
    if (rec._sig) {
      if (_constEq(rec._sig, signRecord(rec))) valid.push(rec); else bad.push(rec);
    } else if (!migrated) {
      valid.push(rec); // dado antigo (antes do HMAC): aceito UMA vez e assinado abaixo
      legacyUnsigned = true;
    } else {
      bad.push(rec); // sem assinatura depois da migração = inserido por fora do app
    }
  });

  if (bad.length) {
    _quarantine(key, bad);
    _notifyIntegrity(key, bad.length);
  } else if (migrated && !legacyUnsigned) {
    // Registros removidos/reordenados por fora não são detectáveis um a um: confere o MAC da lista
    const storedMac = localStorage.getItem(key + INTEGRITY_MAC_SUFFIX);
    if (storedMac && !_constEq(storedMac, _macOf(valid))) {
      console.warn(`[INTEGRIDADE] A lista "${key}" foi alterada fora do sistema (registros removidos ou reordenados).`);
      try { if (typeof showToast === 'function') showToast('⚠️ Foi detectada alteração externa em registros do caixa (remoção/ordem). Confira os relatórios.', 'warning'); } catch (e) { /* ignora */ }
    }
  }

  if (!migrated || legacyUnsigned || bad.length) safeWriteStore(key, valid);
  return valid;
}

// Escrita única: assina cada registro e grava o MAC da lista.
function safeWriteStore(key, records) {
  const signed = (records || []).map(r => {
    const c = Object.assign({}, r);
    delete c._sig;
    c._sig = signRecord(c);
    return c;
  });
  // mantém as referências em memória atualizadas com a assinatura
  (records || []).forEach((r, i) => { r._sig = signed[i]._sig; });
  localStorage.setItem(key, JSON.stringify(signed));
  localStorage.setItem(key + INTEGRITY_MARK_SUFFIX, '1');
  localStorage.setItem(key + INTEGRITY_MAC_SUFFIX, _macOf(signed));
  return signed;
}

/* ---------- 3) SESSÃO (Supabase Auth, via sync.js) ---------- */

function getAuthToken() {
  return (window.DC && DC.token()) || '';
}

function clearSession() {
  ['depilclear_token', 'depilclear_session_validated', 'depilclear_active_user'].forEach(k => sessionStorage.removeItem(k));
  document.documentElement.classList.remove('has-session');
  if (window.DC) DC.logout();
}

// Retorna { ok, offline?, usuario?, reason? }. Offline: vale a sessão salva no aparelho e o último perfil conhecido.
async function validateSession() {
  if (!window.DC) return { ok: false, reason: 'token' };
  return DC.sessao();
}


/* ---------- 4) ACESSIBILIDADE COMPARTILHADA (modais, botões só com ícone e campos sem rótulo) ---------- */

const _ICON_LABELS = {
  x: 'Fechar', menu: 'Abrir menu', trash: 'Excluir', 'trash-2': 'Excluir', pencil: 'Editar', edit: 'Editar', 'edit-2': 'Editar', 'edit-3': 'Editar',
  plus: 'Adicionar', search: 'Buscar', printer: 'Imprimir', download: 'Baixar', 'chevron-left': 'Anterior', 'chevron-right': 'Próximo',
  'arrow-left': 'Voltar', 'arrow-right': 'Avançar', sun: 'Alternar tema', moon: 'Alternar tema', 'log-out': 'Sair', history: 'Histórico',
  user: 'Dados da cliente', eye: 'Ver', copy: 'Copiar', 'refresh-cw': 'Atualizar', calendar: 'Calendário', 'calendar-days': 'Calendário',
  'external-link': 'Abrir em nova aba', check: 'Confirmar', 'check-circle': 'Confirmar', 'check-circle-2': 'Confirmar', settings: 'Configurações'
};

// Dá nome acessível a botões/links que só têm ícone (leitores de tela e navegação por voz)
function labelIconButtons(root = document) {
  root.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
    if ((el.textContent || '').trim()) return;
    const title = el.getAttribute('title');
    if (title) { el.setAttribute('aria-label', title); return; }
    const icon = el.querySelector('[data-lucide]');
    const name = icon && icon.getAttribute('data-lucide');
    if (name && _ICON_LABELS[name]) el.setAttribute('aria-label', _ICON_LABELS[name]);
  });
  root.querySelectorAll('[data-lucide]').forEach(i => { if (!i.hasAttribute('aria-hidden')) i.setAttribute('aria-hidden', 'true'); });
}

// Liga cada <label> ao seu campo e dá nome aos campos que continuam sem rótulo
function linkLabels(root = document) {
  root.querySelectorAll('label:not([for])').forEach(label => {
    if (label.querySelector('input, select, textarea')) return;
    const field = label.parentElement && label.parentElement.querySelector('input[id], select[id], textarea[id]');
    if (field && !label.dataset.linked) { label.setAttribute('for', field.id); label.dataset.linked = '1'; }
  });
  const byId = { 'wpp-img-range-mode': 'Intervalo de horários da imagem', 'wpp-img-start-time': 'Horário inicial', 'wpp-img-end-time': 'Horário final',
    'wpp-tpl-advance-days': 'Dias de antecedência do lembrete', 'wpp-tpl-send-time': 'Horário do disparo' };
  root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea').forEach(el => {
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || (el.labels && el.labels.length)) return;
    const handler = el.getAttribute('onchange') || '';
    let name = byId[el.id] || el.getAttribute('placeholder') || el.getAttribute('title') || '';
    if (!name && /handleUpdateAppointmentStatus/.test(handler)) name = 'Status do agendamento';
    if (!name && el.type === 'file') name = 'Enviar imagem';
    if (name) el.setAttribute('aria-label', name);
  });
}

function _visibleModals() {
  return [...document.querySelectorAll('[id^="modal-"].fixed')].filter(m => !m.classList.contains('hidden'));
}

// Modais: role="dialog", Esc fecha o de cima (o último aberto), foco entra ao abrir, fica preso dentro (Tab) e volta ao fechar
function enhanceModalsA11y() {
  const openers = new WeakMap();
  document.querySelectorAll('[id^="modal-"].fixed').forEach(m => {
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    const heading = m.querySelector('h1, h2, h3');
    if (heading) {
      if (!heading.id) heading.id = m.id + '-title';
      m.setAttribute('aria-labelledby', heading.id);
    }
    new MutationObserver(() => {
      const open = !m.classList.contains('hidden');
      if (open) {
        if (!m.dataset.openedAt) m.dataset.openedAt = String(Date.now() + Math.random());
        openers.set(m, document.activeElement);
        // Foca o primeiro CAMPO; se não houver, o próprio painel (nunca o botão "X", que ficaria com anel de foco)
        const field = m.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
        const panel = m.querySelector('[onclick*="stopPropagation"]') || m;
        const target = field || panel;
        if (!field && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        if (!m.contains(document.activeElement)) setTimeout(() => target.focus({ preventScroll: true }), 30);
      } else {
        delete m.dataset.openedAt;
        const back = openers.get(m);
        if (back && document.contains(back)) setTimeout(() => back.focus({ preventScroll: true }), 30);
      }
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
  });

  document.addEventListener('keydown', (e) => {
    const open = _visibleModals();
    if (!open.length) return;
    const top = open.reduce((a, b) => (parseFloat(b.dataset.openedAt || 0) >= parseFloat(a.dataset.openedAt || 0) ? b : a));
    if (e.key === 'Escape') {
      if (typeof closeModal === 'function') closeModal(top.id); else top.classList.add('hidden');
      return;
    }
    if (e.key === 'Tab') {
      const f = [...top.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

// Itens clicáveis que não são <button> (células do mural, cartões, linhas da tabela) ficam
// acessíveis pelo teclado: entram no Tab e respondem a Enter/Espaço como um clique.
const _NATIVE_CLICKABLE = 'button, a, input, select, textarea, label, summary';
function makeClickablesFocusable() {
  document.querySelectorAll('[onclick]:not([tabindex]):not([id^="modal-"])').forEach(el => {
    if (el.matches(_NATIVE_CLICKABLE) || el.id === 'mobile-menu-overlay') return;
    const h = el.getAttribute('onclick') || '';
    if (/^\s*event\.stopPropagation\(\);?\s*$/.test(h) || h.includes('handleBackdropClick')) return;
    el.setAttribute('tabindex', '0');
    if (el.tagName !== 'TR' && !el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (!(el instanceof HTMLElement) || el.getAttribute('tabindex') !== '0' || !el.hasAttribute('onclick') || el.matches(_NATIVE_CLICKABLE)) return;
  e.preventDefault();
  el.click();
});

// Celular: cada célula recebe o nome da sua coluna (data-label) para a tabela virar lista de cartões no CSS.
// Fica de fora a planilha do mural (precisa ser grade) e a lista de clientes (tem layout próprio).
function rotularTabelas(root = document) {
  root.querySelectorAll('table:not(.sheet-table)').forEach(t => {
    if (t.querySelector('#clients-table-body')) return;
    const nomes = [...t.querySelectorAll('thead th')].map(th => th.textContent.replace(/\s+/g, ' ').trim());
    if (!nomes.length) return;
    t.classList.add('tabela-cartoes');
    t.querySelectorAll('tbody tr').forEach(tr => {
      [...tr.children].forEach((td, i) => { if (!td.hasAttribute('colspan') && nomes[i] && td.dataset.label !== nomes[i]) td.dataset.label = nomes[i]; });
    });
  });
}

function initA11y() {
  enhanceModalsA11y();
  labelIconButtons(); linkLabels(); makeClickablesFocusable(); rotularTabelas();
  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { labelIconButtons(); linkLabels(); makeClickablesFocusable(); rotularTabelas(); }, 120);
  }).observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initA11y); else initA11y();
