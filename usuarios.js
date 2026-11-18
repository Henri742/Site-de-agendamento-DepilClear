/* usuarios.js — página de gestão de logins e backups (somente administradora) */
const FUNCAO_NOME = { admin: 'Administradora', recepcao: 'Recepção', depiladora: 'Depiladora' };
const $ = (id) => document.getElementById(id);

async function tokenAtual() {
  const { data } = await DC.sb.auth.getSession();
  return data.session ? data.session.access_token : '';
}

async function api(url, opcoes = {}) {
  const res = await fetch(url, Object.assign({}, opcoes, {
    headers: Object.assign({ 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenAtual()}` }, opcoes.headers || {})
  }));
  if (res.status === 401) { window.location.replace('index.html'); throw new Error('sessão'); }
  return res;
}

function mostrar(id, texto, tipo) {
  const el = $(id);
  el.textContent = texto; el.className = `msg ${tipo}`;
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 6000);
}

function gerarSenha() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const v = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(v, n => letras[n % letras.length]).join('');
}

function dataBR(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

async function carregarLista() {
  const res = await api('/api/usuarios');
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) { mostrar('msg-lista', dados.erro || 'Não foi possível carregar a lista.', 'erro'); return; }
  const tbody = $('lista');
  tbody.replaceChildren(...dados.usuarios.map(linhaUsuario));
}

function linhaUsuario(u) {
  const tr = document.createElement('tr');
  const td = (conteudo) => { const c = document.createElement('td'); if (conteudo instanceof Node) c.append(conteudo); else c.textContent = conteudo; tr.append(c); return c; };

  td(u.nome + (u.eu ? ' (você)' : ''));
  td(u.email);

  const sel = document.createElement('select');
  sel.setAttribute('aria-label', `Função de ${u.nome}`);
  Object.entries(FUNCAO_NOME).forEach(([v, t]) => sel.add(new Option(t, v, false, v === u.funcao)));
  sel.disabled = u.eu;
  sel.onchange = () => alterar(u, { funcao: sel.value }, `Função de ${u.nome} alterada.`);
  td(sel);

  const tag = document.createElement('span');
  tag.className = `tag ${u.ativo ? 'on' : 'off'}`; tag.textContent = u.ativo ? 'Ativo' : 'Desativado';
  td(tag);
  td(dataBR(u.ultimo_acesso));

  const acoes = document.createElement('div'); acoes.className = 'acoes';
  const botao = (texto, fn, classe = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = texto; b.className = classe; b.onclick = fn; acoes.append(b); return b; };
  botao('Trocar senha', () => {
    const senha = prompt(`Nova senha para ${u.nome} (mínimo 8 caracteres).\nDeixe em branco para gerar uma automaticamente:`, '');
    if (senha === null) return;
    const nova = senha.trim() || gerarSenha();
    alterar(u, { senha: nova }, `Senha de ${u.nome} alterada para: ${nova} — anote e entregue à pessoa.`);
  });
  if (!u.eu) {
    botao(u.ativo ? 'Desativar' : 'Reativar', () => alterar(u, { ativo: !u.ativo }, `${u.nome} ${u.ativo ? 'desativado(a)' : 'reativado(a)'}.`), u.ativo ? 'danger' : '');
    botao('Excluir', async () => {
      if (!confirm(`Excluir o login de ${u.nome}? Esta ação não pode ser desfeita.\n(Se for temporário, prefira "Desativar".)`)) return;
      const res = await api(`/api/usuarios?id=${encodeURIComponent(u.user_id)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      mostrar('msg-lista', res.ok ? `${u.nome} excluído(a).` : (d.erro || 'Falha ao excluir.'), res.ok ? 'ok' : 'erro');
      carregarLista();
    }, 'danger');
  }
  td(acoes);
  return tr;
}

async function alterar(u, mudancas, sucesso) {
  const res = await api('/api/usuarios', { method: 'PATCH', body: JSON.stringify(Object.assign({ user_id: u.user_id }, mudancas)) });
  const d = await res.json().catch(() => ({}));
  mostrar('msg-lista', res.ok ? sucesso : (d.erro || 'Não foi possível alterar.'), res.ok ? 'ok' : 'erro');
  carregarLista();
}

async function carregarBackups() {
  const res = await api('/api/backup?listar=1');
  const d = await res.json().catch(() => ({}));
  const ul = $('backups');
  if (!res.ok) { ul.innerHTML = ''; return; }
  ul.replaceChildren(...(d.backups.length ? d.backups : [{ nome: 'Nenhum backup ainda (o primeiro sai amanhã às 06:00).' }]).map(b => {
    const li = document.createElement('li');
    const a = document.createElement('span'); a.textContent = b.nome;
    const s = document.createElement('span'); s.className = 'muted'; s.textContent = b.tamanho ? `${(b.tamanho / 1024).toFixed(0)} KB` : '';
    li.append(a, s); return li;
  }));
}

document.addEventListener('DOMContentLoaded', async () => {
  const sessao = await validateSession();
  if (!sessao.ok) { window.location.replace('index.html'); return; }
  if (!sessao.usuario || sessao.usuario.funcao !== 'admin') { $('sem-acesso').classList.remove('hidden'); return; }
  $('conteudo').classList.remove('hidden');

  $('gerar').onclick = () => { $('n-senha').value = gerarSenha(); };
  $('form-novo').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('criar'); btn.disabled = true;
    try {
      const corpo = { nome: $('n-nome').value.trim(), email: $('n-email').value.trim(), funcao: $('n-funcao').value, senha: $('n-senha').value };
      const res = await api('/api/usuarios', { method: 'POST', body: JSON.stringify(corpo) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        mostrar('msg-novo', `Usuário criado. Login: ${corpo.email} · Senha: ${corpo.senha} — anote e entregue à pessoa.`, 'ok');
        e.target.reset();
        carregarLista();
      } else mostrar('msg-novo', d.erro || 'Não foi possível criar.', 'erro');
    } finally { btn.disabled = false; }
  };

  $('baixar').onclick = async () => {
    const btn = $('baixar'); btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      const res = await api('/api/backup?baixar=1');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `depilclear-backup-${new Date().toLocaleDateString('sv-SE')}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      carregarBackups();
    } catch (e) { alert('Não foi possível gerar o backup agora. Tente novamente.'); }
    finally { btn.disabled = false; btn.textContent = 'Baixar backup agora'; }
  };

  carregarLista();
  carregarBackups();
  // Outra administradora alterou algo: atualiza a lista
  DC.sb.channel('perfis-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, () => carregarLista()).subscribe();
});
