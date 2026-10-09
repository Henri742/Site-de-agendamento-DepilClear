/* ========================================================
 * DEPILCLEAR WOMEN & MEN - SANDRA RAMOS
 * caixa.js - Lógica do PDV, Carteira de Crédito & Fechamento
 * ======================================================== */

// Carrega os catálogos unificados guardados pelo app.js
let posServices = [];
let posClients = [];
let posCart = [];
let currentPosClient = null;

// Operações de caixa
let cashOperations = JSON.parse(localStorage.getItem('depilclear_cash_ops') || '[]');
let salesLog = JSON.parse(localStorage.getItem('depilclear_sales_log') || '[]');

// Serviços predefinidos de reserva caso o utilizador ainda não tenha gravado no app.js
const defaultServices = [
  { id: 1, name: 'Massagem Relaxante com Óleos', price: 150.00 },
  { id: 2, name: 'Massagem Corporal Detox', price: 180.00 },
  { id: 3, name: 'Massagem com Pedras Vulcânicas', price: 190.00 },
  { id: 4, name: 'Ritual Escalda-Pés Relaxante', price: 75.00 },
  { id: 5, name: 'Spa Podal Termoterápico', price: 70.00 },
  { id: 6, name: 'Alívio Cervical', price: 25.00 },
  { id: 7, name: 'Íntima Completa', price: 70.00 },
  { id: 8, name: 'Perna Completa', price: 60.00 },
  { id: 9, name: 'Axilas', price: 25.00 },
  { id: 10, name: 'Buço e Queixo', price: 30.00 },
  { id: 11, name: 'Costas Masculino', price: 40.00 }
];

function initPOS() {
  // Carrega os clientes do localStorage
  const savedClients = localStorage.getItem('depilclear_clients');
  posClients = savedClients ? JSON.parse(savedClients) : [];

  // Carrega os serviços do localStorage
  const savedServices = localStorage.getItem('depilclear_services');
  posServices = (savedServices && JSON.parse(savedServices).length > 0)
    ? JSON.parse(savedServices)
    : defaultServices;

  renderServicesSelect();
  renderPosTotals();
  applyInitialTheme();
  setupNetworkListener();
  lucide.createIcons();
}

function renderServicesSelect() {
  const select = document.getElementById('pos-service-select');
  if (!select) return;

  select.innerHTML = posServices.map(s => `
    <option value="${s.id}">${s.name} - R$ ${Number(s.price).toFixed(2)}</option>
  `).join('');
}

/* ========================================================
 * CADASTRO RÁPIDO DE SERVIÇOS NO PDV
 * ======================================================== */
function openQuickCreateServiceModal() {
  const modal = document.getElementById('modal-pos-create-service');
  if (modal) {
    document.getElementById('pos-new-srv-name').value = '';
    document.getElementById('pos-new-srv-price').value = '';
    document.getElementById('pos-new-srv-duration').value = '30';
    document.getElementById('pos-new-srv-short').value = '';
    modal.classList.remove('hidden');
    document.getElementById('pos-new-srv-name')?.focus();
  }
}

function handleQuickCreateService(e) {
  e.preventDefault();
  const name = document.getElementById('pos-new-srv-name').value.trim();
  const price = parseFloat(document.getElementById('pos-new-srv-price').value || 0);
  const duration = parseInt(document.getElementById('pos-new-srv-duration').value || 30, 10);
  let shortCode = document.getElementById('pos-new-srv-short').value.trim();

  if (!name || price < 0) return;
  if (!shortCode) shortCode = name.toLowerCase().slice(0, 10);

  const newService = {
    id: Date.now(),
    name,
    price,
    duration,
    shortCode,
    categoryId: 1 // Categoria padrão (Geral)
  };

  // 1. Atualiza a lista em memória do PDV
  posServices.push(newService);

  // 2. Grava no localStorage global para sincronizar com a Agenda e com as Configurações
  localStorage.setItem('depilclear_services', JSON.stringify(posServices));

  // 3. Atualiza o dropdown e já deixa o novo serviço selecionado
  renderServicesSelect();
  const select = document.getElementById('pos-service-select');
  if (select) select.value = newService.id;

  closeModal('modal-pos-create-service');
  showToast(`Serviço "${name}" cadastrado e pronto para inserir!`, 'success');
}


/* ========================================================
 * SELEÇÃO E GESTÃO DE CLIENTE
 * ======================================================== */
function openSearchClientModal() {
  const modal = document.getElementById('modal-pos-search-client');
  const input = document.getElementById('pos-client-modal-query');
  if (modal) {
    modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      renderPosClientSearchResults('');
      input.focus();
    }
  }
}

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderPosClientSearchResults(query) {
  const container = document.getElementById('pos-client-search-results');
  if (!container) return;

  const q = normalize(query.trim());
  const digits = query.replace(/\D/g, '');

  const matches = posClients.filter(c => {
    if (!q) return true;
    const nameMatch = normalize(c.name).includes(q);
    const phoneMatch = digits && (c.phone || '').replace(/\D/g, '').includes(digits);
    const cpfMatch = digits && (c.cpf || '').replace(/\D/g, '').includes(digits);
    return nameMatch || phoneMatch || cpfMatch;
  });

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400">
        Nenhum cliente encontrado.
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(c => {
    const credit = getClientCredit(c.id);
    return `
      <div onclick="selectClientForPOS(${c.id})" class="p-2.5 rounded-2xl border border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-violet hover:bg-brand-violet/10 cursor-pointer flex items-center justify-between transition-all">
        <div>
          <strong class="text-xs text-slate-900 dark:text-white">${c.name}</strong>
          <span class="block text-[10px] text-slate-400 font-mono">Tel: ${c.phone} • CPF: ${c.cpf || 'S/N'}</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-emerald-500 font-bold block">Crédito: R$ ${credit.toFixed(2)}</span>
          <span class="text-[9px] text-slate-400">${c.gender}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selectClientForPOS(clientId) {
  const client = posClients.find(c => c.id === clientId);
  if (!client) return;

  currentPosClient = client;
  document.getElementById('pos-selected-client-name').innerText = client.name;
  document.getElementById('pos-selected-client-sub').innerText = `Tel: ${client.phone} • CPF: ${client.cpf || 'S/N'}`;

  // Exibe barra de vantagens
  const perksBar = document.getElementById('pos-client-perks-bar');
  if (perksBar) perksBar.classList.remove('hidden');

  updateClientPerksUI();
  closeModal('modal-pos-search-client');
  showToast(`Cliente ${client.name} vinculada à nota.`, 'success');
}

function clearSelectedClient() {
  currentPosClient = null;
  document.getElementById('pos-selected-client-name').innerText = 'CONSUMIDOR PADRÃO';
  document.getElementById('pos-selected-client-sub').innerText = 'Sem identificação';
  document.getElementById('pos-client-perks-bar')?.classList.add('hidden');
  renderPosTotals();
}

function openQuickCreateClientModal() {
  closeModal('modal-pos-search-client');
  document.getElementById('modal-pos-create-client')?.classList.remove('hidden');
}

function handleQuickCreateClient(e) {
  e.preventDefault();
  const name = document.getElementById('pos-new-cli-name').value.trim();
  const phone = document.getElementById('pos-new-cli-phone').value.trim();
  const cpf = document.getElementById('pos-new-cli-cpf').value.trim();
  const gender = document.getElementById('pos-new-cli-gender').value;

  const newCli = {
    id: Date.now(),
    name,
    phone,
    cpf,
    gender,
    birth: '',
    address: {}
  };

  posClients.push(newCli);
  localStorage.setItem('depilclear_clients', JSON.stringify(posClients));

  closeModal('modal-pos-create-client');
  selectClientForPOS(newCli.id);
  showToast(`Cliente ${name} registada e vinculada com sucesso!`, 'success');
}

/* ========================================================
 * CARTEIRA DE CRÉDITO E FIDELIDADE
 * ======================================================== */
function getClientCredit(clientId) {
  const credits = JSON.parse(localStorage.getItem('depilclear_client_credits') || '{}');
  return Number(credits[clientId] || 0);
}

function setClientCredit(clientId, val) {
  const credits = JSON.parse(localStorage.getItem('depilclear_client_credits') || '{}');
  credits[clientId] = Math.max(0, Number(val));
  localStorage.setItem('depilclear_client_credits', JSON.stringify(credits));
}

function updateClientPerksUI() {
  if (!currentPosClient) return;

  const credit = getClientCredit(currentPosClient.id);
  const creditBadge = document.getElementById('pos-client-credit-badge');
  if (creditBadge) creditBadge.innerText = `R$ ${credit.toFixed(2)}`;

  const btnUse = document.getElementById('btn-use-credit');
  if (btnUse) {
    if (credit > 0) btnUse.classList.remove('hidden');
    else btnUse.classList.add('hidden');
  }

  // Fidelidade
  const fData = JSON.parse(localStorage.getItem(`depilclear_fidelity_${currentPosClient.id}`) || '{"points":[]}');
  const selosCount = fData.points ? fData.points.length : 0;
  const fBadge = document.getElementById('pos-fidelity-badge');
  if (fBadge) fBadge.innerText = `⭐ ${selosCount}/10 Selos`;
}

function openCreditManagementModal() {
  if (!currentPosClient) {
    showToast('Selecione primeiro uma cliente para creditar!', 'warning');
    return;
  }
  document.getElementById('modal-pos-credit')?.classList.remove('hidden');
}

function handleAddClientCredit(e) {
  e.preventDefault();
  if (!currentPosClient) return;

  const amount = parseFloat(document.getElementById('pos-credit-amount').value || 0);
  const method = document.getElementById('pos-credit-payment-method').value;

  if (amount <= 0) return;

  const current = getClientCredit(currentPosClient.id);
  setClientCredit(currentPosClient.id, current + amount);

  // Regista a entrada financeira no caixa
  cashOperations.push({
    id: Date.now(),
    type: 'recarga_credito',
    amount: amount,
    method: method,
    desc: `Recarga de crédito para ${currentPosClient.name}`,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('depilclear_cash_ops', JSON.stringify(cashOperations));

  closeModal('modal-pos-credit');
  updateClientPerksUI();
  showToast(`R$ ${amount.toFixed(2)} creditados na conta de ${currentPosClient.name}!`, 'success');
}

function applyClientCreditToPOS() {
  if (!currentPosClient) return;
  const credit = getClientCredit(currentPosClient.id);
  const total = calculateCartTotal();

  if (credit <= 0) {
    showToast('A cliente não tem saldo de crédito disponível.', 'warning');
    return;
  }

  const methodSelect = document.getElementById('pos-payment-method');
  if (methodSelect) methodSelect.value = 'SALDO CRÉDITO';

  const discountInput = document.getElementById('pos-discount');
  if (credit >= total) {
    showToast(`O saldo de R$ ${credit.toFixed(2)} cobre o total da nota.`, 'info');
  } else {
    // Abate parcial
    discountInput.value = credit.toFixed(2);
    renderPosTotals();
    showToast(`Abatido crédito de R$ ${credit.toFixed(2)} no total!`, 'success');
  }
}

/* ========================================================
 * LANÇAMENTO DE ITENS E TOTAIS
 * ======================================================== */
function addServiceToPOS() {
  const serviceId = parseInt(document.getElementById('pos-service-select').value);
  const service = posServices.find(s => s.id === serviceId);
  if (!service) return;

  const existing = posCart.find(item => item.id === service.id);
  if (existing) {
    existing.qtd++;
  } else {
    posCart.push({
      id: service.id,
      name: service.name,
      price: Number(service.price),
      qtd: 1
    });
  }

  renderPosCartTable();
  renderPosTotals();
}

function removePosItem(index) {
  posCart.splice(index, 1);
  renderPosCartTable();
  renderPosTotals();
}

function changeItemQtd(index, delta) {
  if (!posCart[index]) return;
  posCart[index].qtd += delta;
  if (posCart[index].qtd <= 0) {
    posCart.splice(index, 1);
  }
  renderPosCartTable();
  renderPosTotals();
}

function renderPosCartTable() {
  const tbody = document.getElementById('pos-items-table-body');
  if (!tbody) return;

  if (posCart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="p-6 text-center text-xs text-slate-400">
          Nenhum procedimento lançado na nota.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = posCart.map((item, idx) => `
    <tr class="hover:bg-brand-lightCard/40 dark:hover:bg-brand-darkBg/40">
      <td class="p-3 font-bold text-slate-900 dark:text-white">${item.name}</td>
      <td class="p-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button type="button" onclick="changeItemQtd(${idx}, -1)" class="w-5 h-5 rounded-md bg-slate-200 dark:bg-brand-darkBorder text-slate-700 dark:text-slate-300 font-black flex items-center justify-center">-</button>
          <span class="font-mono font-bold">${item.qtd}</span>
          <button type="button" onclick="changeItemQtd(${idx}, 1)" class="w-5 h-5 rounded-md bg-slate-200 dark:bg-brand-darkBorder text-slate-700 dark:text-slate-300 font-black flex items-center justify-center">+</button>
        </div>
      </td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-300">R$ ${item.price.toFixed(2)}</td>
      <td class="p-3 font-mono font-black text-brand-gold">R$ ${(item.price * item.qtd).toFixed(2)}</td>
      <td class="p-3 text-right">
        <button type="button" onclick="removePosItem(${idx})" class="p-1 text-slate-400 hover:text-rose-500">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons({ root: tbody });
}

function calculateCartTotal() {
  return posCart.reduce((acc, item) => acc + (item.price * item.qtd), 0);
}

function renderPosTotals() {
  const rawTotal = calculateCartTotal();
  const discount = Math.max(0, parseFloat(document.getElementById('pos-discount')?.value || 0));
  const finalTotal = Math.max(0, rawTotal - discount);

  const grandEl = document.getElementById('pos-grand-total');
  if (grandEl) grandEl.innerText = `R$ ${finalTotal.toFixed(2)}`;

  const received = parseFloat(document.getElementById('pos-received-value')?.value || 0);
  const change = Math.max(0, received - finalTotal);

  const changeEl = document.getElementById('pos-change-value');
  if (changeEl) changeEl.innerText = `R$ ${change.toFixed(2)}`;
}

function clearPosCart() {
  posCart = [];
  document.getElementById('pos-discount').value = '0.00';
  document.getElementById('pos-received-value').value = '0.00';
  renderPosCartTable();
  renderPosTotals();
  showToast('Nota cancelada e limpa.', 'info');
}

/* ========================================================
 * FINALIZAR VENDA
 * ======================================================== */
function finalizeSale() {
  if (posCart.length === 0) {
    showToast('Adicione pelo menos um procedimento à nota!', 'warning');
    return;
  }

  const rawTotal = calculateCartTotal();
  const discount = Math.max(0, parseFloat(document.getElementById('pos-discount')?.value || 0));
  const finalTotal = Math.max(0, rawTotal - discount);
  const method = document.getElementById('pos-payment-method').value;

  // Se o método for SALDO CRÉDITO, verifica se a cliente possui crédito suficiente
  if (method === 'SALDO CRÉDITO') {
    if (!currentPosClient) {
      showToast('Selecione a cliente para descontar do saldo de crédito!', 'error');
      return;
    }
    const available = getClientCredit(currentPosClient.id);
    if (available < finalTotal) {
      showToast(`Crédito insuficiente! (Saldo atual: R$ ${available.toFixed(2)})`, 'error');
      return;
    }
    // Deduz do saldo
    setClientCredit(currentPosClient.id, available - finalTotal);
  }

  const saleRecord = {
    id: Date.now(),
    clientId: currentPosClient ? currentPosClient.id : null,
    clientName: currentPosClient ? currentPosClient.name : 'CONSUMIDOR PADRÃO',
    items: [...posCart],
    rawTotal,
    discount,
    finalTotal,
    method,
    timestamp: new Date().toISOString()
  };

  salesLog.push(saleRecord);
  localStorage.setItem('depilclear_sales_log', JSON.stringify(salesLog));

  // Atribui selo de fidelidade se houver cliente vinculada
  if (currentPosClient) {
    awardFidelityPointFromPOS(currentPosClient.id);
  }

  showToast(`Venda finalizada com sucesso! Total: R$ ${finalTotal.toFixed(2)}`, 'success');
  clearPosCart();
  updateClientPerksUI();
}

function awardFidelityPointFromPOS(clientId) {
  const fKey = `depilclear_fidelity_${clientId}`;
  const f = JSON.parse(localStorage.getItem(fKey) || '{"points":[],"rewardsClaimed":0}');
  if (f.points.length < 10) {
    f.points.push({
      date: new Date().toISOString().split('T')[0],
      type: 'atendimento',
      desc: 'Atendimento via Caixa PDV'
    });
    localStorage.setItem(fKey, JSON.stringify(f));
  }
}

/* ========================================================
 * OPERAÇÕES DE CAIXA: SANGRIA, SUPRIMENTO & FUNDO
 * ======================================================== */
function openCashOperationModal(type) {
  const modal = document.getElementById('modal-cash-op');
  const title = document.getElementById('cash-op-title');
  const typeInput = document.getElementById('cash-op-type');
  const descInput = document.getElementById('cash-op-desc');

  if (!modal || !typeInput) return;

  typeInput.value = type;
  if (type === 'fundo') {
    title.innerText = 'Fundo de Caixa (Abertura/Troco)';
    descInput.value = 'Troco inicial de abertura';
  } else if (type === 'suprimento') {
    title.innerText = 'Suprimento (Entrada de Dinheiro)';
    descInput.value = '';
  } else if (type === 'sangria') {
    title.innerText = 'Sangria (Retirada de Dinheiro)';
    descInput.value = '';
  }

  modal.classList.remove('hidden');
}

function handleSaveCashOperation(e) {
  e.preventDefault();
  const type = document.getElementById('cash-op-type').value;
  const amount = parseFloat(document.getElementById('cash-op-amount').value || 0);
  const desc = document.getElementById('cash-op-desc').value.trim();

  if (amount <= 0) return;

  cashOperations.push({
    id: Date.now(),
    type,
    amount,
    desc,
    timestamp: new Date().toISOString()
  });

  localStorage.setItem('depilclear_cash_ops', JSON.stringify(cashOperations));
  closeModal('modal-cash-op');
  showToast(`Operação de ${type.toUpperCase()} registada com sucesso!`, 'success');
}

/* ========================================================
 * FECHAMENTO & RELATÓRIOS
 * ======================================================== */
function openReportModal() {
  const modal = document.getElementById('modal-pos-reports');
  const todayStr = new Date().toISOString().split('T')[0];

  const startInput = document.getElementById('rep-box-start-date');
  const endInput = document.getElementById('rep-box-end-date');

  if (startInput) startInput.value = todayStr;
  if (endInput) endInput.value = todayStr;

  calculateAndRenderClosingReport();
  modal?.classList.remove('hidden');
  lucide.createIcons();
}

function switchReportTab(tab) {
  const btnFech = document.getElementById('tab-btn-fechamento');
  const btnDet = document.getElementById('tab-btn-detalhado');
  const contentFech = document.getElementById('report-content-fechamento');
  const contentDet = document.getElementById('report-content-detalhado');

  if (tab === 'fechamento') {
    btnFech.className = 'px-4 py-2 bg-brand-violet text-white font-bold text-xs rounded-2xl shadow';
    btnDet.className = 'px-4 py-2 bg-brand-lightCard dark:bg-brand-darkBg text-slate-500 font-semibold text-xs rounded-2xl hover:text-brand-gold';
    contentFech?.classList.remove('hidden');
    contentDet?.classList.add('hidden');
  } else {
    btnDet.className = 'px-4 py-2 bg-brand-violet text-white font-bold text-xs rounded-2xl shadow';
    btnFech.className = 'px-4 py-2 bg-brand-lightCard dark:bg-brand-darkBg text-slate-500 font-semibold text-xs rounded-2xl hover:text-brand-gold';
    contentDet?.classList.remove('hidden');
    contentFech?.classList.add('hidden');
  }
}

function calculateAndRenderClosingReport() {
  const startDate = document.getElementById('rep-box-start-date')?.value || '';
  const endDate = document.getElementById('rep-box-end-date')?.value || '';
  const startTime = document.getElementById('rep-box-start-time')?.value || '00:00';
  const endTime = document.getElementById('rep-box-end-time')?.value || '23:59';

  const startFull = `${startDate}T${startTime}:00`;
  const endFull = `${endDate}T${endTime}:59`;

  const filteredSales = salesLog.filter(s => s.timestamp >= startFull && s.timestamp <= endFull);
  const filteredOps = cashOperations.filter(o => o.timestamp >= startFull && o.timestamp <= endFull);

  let totalVendas = 0;
  const formasMap = {};

  filteredSales.forEach(s => {
    totalVendas += Number(s.finalTotal);
    formasMap[s.method] = (formasMap[s.method] || 0) + Number(s.finalTotal);
  });

  let totalFundo = 0;
  let totalSuprimento = 0;
  let totalSangria = 0;

  filteredOps.forEach(o => {
    if (o.type === 'fundo') totalFundo += Number(o.amount);
    if (o.type === 'suprimento' || o.type === 'recarga_credito') totalSuprimento += Number(o.amount);
    if (o.type === 'sangria') totalSangria += Number(o.amount);
  });

  const saldoFinal = totalFundo + totalVendas + totalSuprimento - totalSangria;

  // Atualiza cupão térmico
  document.getElementById('t-fundo').innerText = `R$ ${totalFundo.toFixed(2)}`;
  document.getElementById('t-vendas').innerText = `R$ ${totalVendas.toFixed(2)}`;
  document.getElementById('t-suprimentos').innerText = `R$ ${totalSuprimento.toFixed(2)}`;
  document.getElementById('t-sangrias').innerText = `R$ ${totalSangria.toFixed(2)}`;
  document.getElementById('t-saldo').innerText = `R$ ${saldoFinal.toFixed(2)}`;
  document.getElementById('ticket-period').innerText = `Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;

  const formasEl = document.getElementById('t-formas');
  if (formasEl) {
    formasEl.innerHTML = Object.entries(formasMap).map(([m, val]) => `
      <div class="flex justify-between">
        <span>● ${m}:</span>
        <span class="font-bold">R$ ${val.toFixed(2)}</span>
      </div>
    `).join('') || '<div>Sem vendas no período.</div>';
  }

  // Tabela detalhada
  const detTbody = document.getElementById('rep-detailed-table-body');
  if (detTbody) {
    detTbody.innerHTML = filteredSales.map(s => {
      const hora = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dia = new Date(s.timestamp).toLocaleDateString();
      const itensNomes = s.items.map(i => `${i.qtd}x ${i.name}`).join(', ');

      return `
        <tr>
          <td class="p-3 font-mono text-slate-400">${dia} ${hora}</td>
          <td class="p-3 font-bold text-slate-900 dark:text-white">${s.clientName}</td>
          <td class="p-3 text-brand-violet">${itensNomes}</td>
          <td class="p-3 font-bold">${s.method}</td>
          <td class="p-3 text-right font-mono font-black text-emerald-500">R$ ${s.finalTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="5" class="p-4 text-center text-slate-400">Sem registos.</td></tr>`;
  }
}

/* ========================================================
 * MENU DE CONTEXTO GLOBAL DO PDV (CLIQUE DIREITO)
 * ======================================================== */
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showPosContextMenu(e);
});

document.addEventListener('click', () => {
  document.getElementById('custom-context-menu')?.classList.add('hidden');
});

function showPosContextMenu(e) {
  const menu = document.getElementById('custom-context-menu');
  const content = document.getElementById('custom-context-menu-content');
  if (!menu || !content) return;

  content.innerHTML = `
    <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
      Ações do Caixa
    </div>
    <div class="py-1.5 space-y-0.5">
      <button type="button" onclick="openSearchClientModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="search" class="w-4 h-4 text-brand-violet"></i> Pesquisar Cliente
      </button>
      <button type="button" onclick="openQuickCreateClientModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="user-plus" class="w-4 h-4 text-blue-400"></i> Cadastrar Nova Cliente
      </button>
      <button type="button" onclick="openQuickCreateServiceModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i> Cadastrar Novo Serviço
      </button>
      <button type="button" onclick="openCreditManagementModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="wallet" class="w-4 h-4 text-emerald-400"></i> Adicionar Saldo de Crédito
      </button>
      <button type="button" onclick="openCashOperationModal('fundo')" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="vault" class="w-4 h-4 text-amber-400"></i> Fundo de Caixa (Abertura)
      </button>
      <button type="button" onclick="openReportModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="file-text" class="w-4 h-4 text-brand-gold"></i> Fechamento & Relatórios
      </button>
    </div>
    <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
      <button type="button" onclick="clearPosCart()" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
        <i data-lucide="trash-2" class="w-4 h-4"></i> Limpar / Cancelar Nota
      </button>
    </div>
  `;

  lucide.createIcons({ root: content });

  const posX = Math.min(e.clientX, window.innerWidth - 240);
  const posY = Math.min(e.clientY, window.innerHeight - 280);

  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;
  menu.classList.remove('hidden');
}

/* ========================================================
 * TEMA, INTERNET & UTILITÁRIOS
 * ======================================================== */
function applyInitialTheme() {
  if (localStorage.getItem('depilclear_theme') === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme(btnElement = null) {
  const html = document.documentElement;
  if (btnElement) {
    btnElement.style.transform = 'scale(0.92)';
    setTimeout(() => { btnElement.style.transform = ''; }, 200);
  }

  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.setItem('depilclear_theme', isDark ? 'dark' : 'light');
  lucide.createIcons();
}

function setupNetworkListener() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    const badge = document.getElementById('connection-status-pos');
    const text = document.getElementById('connection-status-text');
    if (!badge || !text) return;

    if (isOnline) {
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Online</span>`;
    } else {
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-[11px] text-amber-500 font-bold">Offline</span>`;
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

function showToast(message, type = 'info') {
  const wrapper = document.getElementById('toast-wrapper');
  if (!wrapper) return;

  const toast = document.createElement('div');
  const typeStyles = {
    success: 'bg-emerald-600 text-white border-emerald-400',
    error: 'bg-rose-600 text-white border-rose-400',
    warning: 'bg-amber-600 text-white border-amber-400',
    info: 'bg-brand-violet text-white border-brand-violetLight'
  };

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold transform transition-all duration-300 translate-y-3 opacity-0 ${typeStyles[type] || typeStyles.info}`;
  toast.innerHTML = `<span>${message}</span>`;

  wrapper.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.remove('translate-y-3', 'opacity-0'); });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// Inicialização automática do PDV
window.onload = initPOS;