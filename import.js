/* ========================================================
 * DEPILCLEAR - import.js
 * Importa clientes do SGBR ou de qualquer planilha (XLSX, XLS, CSV).
 * Reconhece as colunas pelo nome, mostra prévia e ignora duplicadas (CPF ou celular).
 * ======================================================== */
(function () {
  // Campo do sistema -> nomes de coluna comuns (sem acento, minúsculos)
  const CAMPOS = [
    ['name', 'Nome', ['nome', 'nome cliente', 'nome do cliente', 'cliente', 'nome completo', 'razao social', 'nome/razao social']],
    ['phone', 'Celular / WhatsApp', ['celular', 'whatsapp', 'telefone celular', 'fone celular', 'cel', 'telefone', 'fone', 'tel', 'telefone 1', 'fone 1', 'telefone1', 'fone1', 'contato']],
    ['cpf', 'CPF', ['cpf', 'cpf/cnpj', 'cnpj/cpf', 'cpf cnpj', 'documento', 'doc']],
    ['email', 'E-mail', ['email', 'e-mail', 'e mail']],
    ['birth', 'Nascimento', ['nascimento', 'data nascimento', 'data de nascimento', 'dt nascimento', 'dt. nascimento', 'dt nasc', 'dt. nasc', 'aniversario', 'data nasc']],
    ['gender', 'Sexo', ['sexo', 'genero']],
    ['cep', 'CEP', ['cep']],
    ['street', 'Endereço', ['endereco', 'logradouro', 'rua', 'endereco completo']],
    ['number', 'Número', ['numero', 'nº', 'n°', 'num', 'nro']],
    ['neighborhood', 'Bairro', ['bairro']],
    ['reference', 'Complemento', ['complemento', 'referencia', 'ponto de referencia']],
    ['city', 'Cidade', ['cidade', 'municipio']],
    ['state', 'UF', ['uf', 'estado']]
  ];

  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const digitos = (s) => String(s == null ? '' : s).replace(/\D/g, '');

  let estado = null; // { cabecalhos, linhas, mapa }

  // CSV exportado no Windows costuma vir em Latin-1: tenta UTF-8 e cai para windows-1252
  function decodificarTexto(buf) {
    const utf = new TextDecoder('utf-8').decode(buf);
    return utf.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf;
  }

  async function lerArquivo(arquivo) {
    const buf = await arquivo.arrayBuffer();
    await loadXlsxLib(); // mesmo leitor de planilhas já usado na exportação (app.js)
    const csv = /\.(csv|txt)$/i.test(arquivo.name);
    const wb = csv ? XLSX.read(decodificarTexto(buf), { type: 'string', raw: true }) // raw: não deixa "05/03" virar data americana
                   : XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false });
    // Cabeçalho = 1ª linha (entre as 15 primeiras) com 2+ colunas reconhecidas (SGBR põe título antes)
    const conhecidos = new Set(CAMPOS.flatMap(c => c[2]));
    let iCab = matriz.findIndex((l, i) => i < 15 && l.filter(c => conhecidos.has(norm(c))).length >= 2);
    if (iCab < 0) iCab = 0;
    const cabecalhos = matriz[iCab].map((c, i) => String(c || `Coluna ${i + 1}`).trim());
    const linhas = matriz.slice(iCab + 1).filter(l => l.some(c => String(c).trim() !== ''));
    const mapa = {};
    CAMPOS.forEach(([campo, , sinonimos]) => {
      // Celular tem prioridade sobre telefone fixo: a ordem dos sinônimos decide
      for (const sin of sinonimos) {
        const i = cabecalhos.findIndex((h, idx) => norm(h) === sin && !Object.values(mapa).includes(idx));
        if (i >= 0) { mapa[campo] = i; break; }
      }
    });
    return { cabecalhos, linhas, mapa };
  }

  function formatarTelefone(v) {
    let d = digitos(v);
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d ? String(v).trim() : '';
  }

  function formatarData(v) {
    if (v instanceof Date && !isNaN(v)) {
      // +12h absorve a diferença de fuso que o Excel embute nas datas (meia-noite UTC ou local)
      const d = new Date(v.getTime() + 12 * 36e5);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const s = String(v || '').trim();
    let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
      let ano = Number(m[3]); if (ano < 100) ano += ano > (new Date().getFullYear() % 100) ? 1900 : 2000;
      const dt = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return Number(m[2]) <= 12 && Number(m[1]) <= 31 ? dt : '';
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : '';
  }

  function formatarCPF(v) {
    const d = digitos(v);
    if (d.length !== 11) return '';
    if (typeof validateCPF === 'function' && !validateCPF(d)) return '';
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  function sexo(v) {
    const s = norm(v);
    if (s.startsWith('f') || s === 'mulher') return 'Feminino';
    if (s.startsWith('m') || s === 'homem') return 'Masculino';
    return '';
  }

  // Monta os clientes e separa as duplicadas
  function montar() {
    const { linhas, mapa } = estado;
    const val = (l, campo) => (mapa[campo] != null ? l[mapa[campo]] : '');
    const chavesExistentes = new Set();
    (typeof clientsList !== 'undefined' ? clientsList : []).forEach(c => {
      const cpf = digitos(c.cpf); if (cpf) chavesExistentes.add('c' + cpf);
      const tel = digitos(c.phone).slice(-9); if (tel.length >= 8) chavesExistentes.add('t' + tel);
    });
    const novos = []; let duplicados = 0, semNome = 0;
    linhas.forEach(l => {
      const name = String(val(l, 'name') || '').replace(/\s+/g, ' ').trim();
      if (!name) { semNome++; return; }
      const phone = formatarTelefone(val(l, 'phone'));
      const cpf = formatarCPF(val(l, 'cpf'));
      const kc = cpf ? 'c' + digitos(cpf) : '', kt = digitos(phone).slice(-9);
      if ((kc && chavesExistentes.has(kc)) || (kt.length >= 8 && chavesExistentes.has('t' + kt))) { duplicados++; return; }
      if (kc) chavesExistentes.add(kc); if (kt.length >= 8) chavesExistentes.add('t' + kt);
      novos.push({
        name: name.slice(0, 120), phone, cpf,
        email: String(val(l, 'email') || '').trim().toLowerCase().slice(0, 254),
        birth: formatarData(val(l, 'birth')),
        gender: sexo(val(l, 'gender')),
        address: {
          cep: digitos(val(l, 'cep')).replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          street: String(val(l, 'street') || '').trim(), number: String(val(l, 'number') || '').trim(),
          neighborhood: String(val(l, 'neighborhood') || '').trim(), reference: String(val(l, 'reference') || '').trim(),
          city: String(val(l, 'city') || '').trim(), state: String(val(l, 'state') || '').trim().toUpperCase().slice(0, 2)
        }
      });
    });
    return { novos, duplicados, semNome };
  }

  /* ---------- Tela ---------- */
  function el(tag, attrs = {}, filhos = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v); });
    (Array.isArray(filhos) ? filhos : [filhos]).forEach(f => f && e.append(f));
    return e;
  }

  function fechar() { document.getElementById('imp-modal')?.remove(); estado = null; }

  function renderPrevia() {
    const corpo = document.getElementById('imp-corpo');
    const { novos, duplicados, semNome } = montar();
    const selects = CAMPOS.map(([campo, rotulo]) => {
      const sel = el('select', { id: 'imp-map-' + campo, 'aria-label': `Coluna para ${rotulo}` });
      sel.add(new Option('(não importar)', ''));
      estado.cabecalhos.forEach((h, i) => sel.add(new Option(h, String(i), false, estado.mapa[campo] === i)));
      sel.onchange = () => { if (sel.value === '') delete estado.mapa[campo]; else estado.mapa[campo] = Number(sel.value); renderPrevia(); };
      return el('label', { class: 'imp-campo' }, [el('span', { text: rotulo + (campo === 'name' ? ' *' : '') }), sel]);
    });
    const previa = el('table', { class: 'imp-tabela' }, [
      el('thead', {}, el('tr', {}, ['Nome', 'Celular', 'CPF', 'Nascimento', 'Cidade'].map(t => el('th', { text: t })))),
      el('tbody', {}, novos.slice(0, 5).map(c => el('tr', {}, [c.name, c.phone, c.cpf, c.birth ? c.birth.split('-').reverse().join('/') : '', c.address.city].map(t => el('td', { text: t || '—' })))))
    ]);
    const resumo = el('p', { class: 'imp-resumo', role: 'status' });
    resumo.textContent = `${novos.length} cliente(s) novo(s) para importar` + (duplicados ? ` · ${duplicados} já cadastrada(s), serão ignoradas` : '') + (semNome ? ` · ${semNome} linha(s) sem nome` : '') + '.';
    const btn = el('button', { type: 'button', class: 'imp-primario', text: `Importar ${novos.length} cliente(s)` });
    btn.disabled = !novos.length || estado.mapa.name == null;
    btn.onclick = () => importar(novos);
    corpo.replaceChildren(
      el('p', { class: 'imp-ajuda', text: 'Confira se cada campo está ligado à coluna certa da planilha. A prévia mostra as 5 primeiras.' }),
      el('div', { class: 'imp-grade' }, selects), resumo,
      el('div', { class: 'imp-rolagem' }, previa),
      el('div', { class: 'imp-acoes' }, [el('button', { type: 'button', text: 'Escolher outro arquivo', onclick: () => abrir() }), btn])
    );
  }

  function importar(novos) {
    const base = Date.now() * 1000; // ids únicos mesmo importando milhares no mesmo milissegundo
    const agora = new Date().toISOString();
    novos.forEach((c, i) => clientsList.push(Object.assign({ id: base + i, importadoEm: agora }, c)));
    saveAllToLocalStorage();
    renderAllViews();
    fechar();
    showToast(`${novos.length} cliente(s) importada(s). Enviando para a nuvem…`, 'success');
  }

  function abrir() {
    fechar();
    const input = el('input', { type: 'file', accept: '.xlsx,.xls,.csv,.txt', id: 'imp-arquivo' });
    const corpo = el('div', { id: 'imp-corpo' }, [
      el('p', { class: 'imp-ajuda', text: 'No SGBR, exporte o cadastro de clientes para Excel (ou CSV) e escolha o arquivo aqui. Também funciona com planilhas de outros sistemas.' }),
      el('label', { class: 'imp-arquivo', for: 'imp-arquivo' }, [el('strong', { text: 'Escolher planilha' }), el('span', { text: 'XLSX, XLS ou CSV' }), input]),
      el('p', { class: 'imp-erro', id: 'imp-erro', role: 'alert' })
    ]);
    input.onchange = async () => {
      const f = input.files && input.files[0]; if (!f) return;
      if (f.size > 20 * 1024 * 1024) { document.getElementById('imp-erro').textContent = 'Arquivo grande demais (máx. 20 MB).'; return; }
      document.getElementById('imp-erro').textContent = 'Lendo planilha…';
      try {
        estado = await lerArquivo(f);
        if (!estado.linhas.length) throw new Error('A planilha está vazia.');
        renderPrevia();
      } catch (e) { document.getElementById('imp-erro').textContent = e.message || 'Não foi possível ler este arquivo.'; }
    };
    const modal = el('div', { id: 'imp-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'imp-titulo', onclick: (e) => { if (e.target.id === 'imp-modal') fechar(); } }, [
      el('div', { class: 'imp-caixa' }, [
        el('div', { class: 'imp-topo' }, [el('h3', { id: 'imp-titulo', text: 'Importar clientes' }), el('button', { type: 'button', 'aria-label': 'Fechar', class: 'imp-x', text: '×', onclick: fechar })]),
        corpo
      ])
    ]);
    modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
    document.body.append(modal);
    setTimeout(() => input.focus(), 30);
  }

  window.abrirImportacao = abrir;
  window.__importTestes = { formatarTelefone, formatarData, formatarCPF, sexo, norm };
})();
