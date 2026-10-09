/* ========================================================
 * DEPILCLEAR WOMEN & MEN - SANDRA RAMOS
 * caixa.js - PDV com Multi-pagamento, Código de Serviço e Fidelidade
 * ======================================================== */

let posServices = [];
let posClients = [];
let posCart = [];
let currentPosClient = null;

let cashOperations = JSON.parse(localStorage.getItem('depilclear_cash_ops') || '[]');
let salesLog = JSON.parse(localStorage.getItem('depilclear_sales_log') || '[]');

// Serviços Padrão com Código Numérico
const defaultServices = [
  { id: 1, code: 101, name: 'Íntima Completa', shortCode: "int'c", duration: 15, price: 70.00 },
  { id: 2, code: 102, name: 'Perna Completa', shortCode: "perna'c", duration: 30, price: 60.00 },
  { id: 3, code: 103, name: 'Axilas', shortCode: 'axilas', duration: 15, price: 25.00 },
  { id: 4, code: 104, name: 'Massagem Relaxante com Óleos', shortCode: 'relax.oleos', duration: 45, price: 150.00 },
  { id: 5, code: 105, name: 'Massagem Corporal Detox', shortCode: 'detox.argila', duration: 50, price: 180.00 },
  { id: 6, code: 106, name: 'Spa Podal Termoterápico', shortCode: 'spa.podal', duration: 30, price: 70.00 }
];

function initPOS() {
  const savedClients = localStorage.getItem('depilclear_clients');
  posClients = savedClients ? JSON.parse(savedClients) : [];

  const savedServices = localStorage.getItem('depilclear_services');
  if (savedServices && JSON.parse(savedServices).length > 0) {
    posServices = JSON.parse(savedServices).map((s, idx) => ({
      ...s,
      code: s.code || (100 + idx + 1)
    }));
  } else {
    posServices = defaultServices;
    localStorage.setItem('depilclear_services', JSON.stringify(posServices));
  }

  renderServicesSelect();
  renderPosCartTable();
  renderPosTotals();
  applyInitialTheme();
  setupNetworkListener();
  lucide.createIcons();
}

/* ========================================================
 * MÁSCARA MONETÁRIA NATURAL
 * ======================================================== */
function handleCurrencyMaskInput(input) {
  let value = input.value.replace(/\D/g, '');
  if (!value) value = '0';
  let num = (parseInt(value, 10) / 100).toFixed(2);
  input.value = num.replace('.', ',');
}

function parseCurrency(strVal) {
  if (!strVal) return 0;
  const clean = strVal.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(clean) || 0;
}

function formatCurrency(num) {
  return (num || 0).toFixed(2).replace('.', ',');
}

/* ========================================================
 * BUSCA E CATÁLOGO DE SERVIÇOS (LUPA E CÓDIGO)
 * ======================================================== */
function renderServicesSelect() {
  const select = document.getElementById('pos-service-select');
  if (!select) return;

  select.innerHTML = posServices.map(s => `
    <option value="${s.id}">[Cód ${s.code}] ${s.name} - R$ ${Number(s.price).toFixed(2)}</option>
  `).join('');
}

function openServicesCatalogModal() {
  const modal = document.getElementById('modal-pos-services-catalog');
  const input = document.getElementById('catalog-search-query');
  if (modal) {
    modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      renderCatalogModalGrid('');
      input.focus();
    }
  }
}

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function renderCatalogModalGrid(query) {
  const container = document.getElementById('catalog-services-list');
  if (!container) return;

  const q = normalize(query.trim());
  const matches = posServices.filter(s => {
    if (!q) return true;
    const codeMatch = (s.code || '').toString().includes(q);
    const nameMatch = normalize(s.name).includes(q);
    const shortMatch = normalize(s.shortCode || '').includes(q);
    const priceMatch = Number(s.price).toFixed(2).includes(q);
    return codeMatch || nameMatch || shortMatch || priceMatch;
  });

  if (matches.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Nenhum serviço encontrado.</div>`;
    return;
  }

  container.innerHTML = matches.map(s => `
    <div class="p-3 rounded-2xl border border-brand-lightBorder dark:border-brand-darkBorder bg-brand-lightCard/40 dark:bg-brand-darkBg/40 flex items-center justify-between hover:border-brand-violet transition-all">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-brand-violet/15 text-brand-violet font-black font-mono text-xs flex items-center justify-center border border-brand-violet/30">
          ${s.code || '-'}
        </span>
        <div>
          <h4 class="text-xs font-black text-slate-900 dark:text-white">${s.name}</h4>
          <span class="text-[10px] text-slate-400 font-mono">${s.duration} min • Sigla: ${s.shortCode || s.name}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-black text-brand-gold font-mono mr-2">R$ ${Number(s.price).toFixed(2)}</span>
        <button type="button" onclick="selectServiceFromCatalog(${s.id})" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow">
          Inserir
        </button>
        <button type="button" onclick="openServiceEditModal(${s.id})" class="p-1.5 rounded-xl hover:bg-brand-violet/20 text-slate-400 hover:text-brand-violet">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  lucide.createIcons({ root: container });
}

function selectServiceFromCatalog(serviceId) {
  const select = document.getElementById('pos-service-select');
  if (select) select.value = serviceId;
  closeModal('modal-pos-services-catalog');
  addServiceToPOS();
}

function openServiceEditModal(serviceId = null) {
  const modal = document.getElementById('modal-service-edit');
  const title = document.getElementById('modal-service-edit-title');
  const idInput = document.getElementById('edit-srv-id');
  const codeInput = document.getElementById('edit-srv-code');
  const nameInput = document.getElementById('edit-srv-name');
  const priceInput = document.getElementById('edit-srv-price');
  const durInput = document.getElementById('edit-srv-duration');
  const shortInput = document.getElementById('edit-srv-short');

  if (!modal) return;

  if (serviceId) {
    const s = posServices.find(x => x.id === serviceId);
    if (!s) return;
    title.innerText = 'Editar Serviço';
    idInput.value = s.id;
    codeInput.value = s.code || '';
    nameInput.value = s.name;
    priceInput.value = formatCurrency(Number(s.price));
    durInput.value = s.duration || 15;
    shortInput.value = s.shortCode || '';
  } else {
    title.innerText = 'Cadastrar Novo Serviço';
    idInput.value = '';
    codeInput.value = (posServices.length > 0 ? Math.max(...posServices.map(x => x.code || 0)) + 1 : 101);
    nameInput.value = '';
    priceInput.value = '0,00';
    durInput.value = '15';
    shortInput.value = '';
  }

  modal.classList.remove('hidden');
}

function handleSaveServiceWithCode(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('edit-srv-id').value, 10);
  const code = parseInt(document.getElementById('edit-srv-code').value, 10);
  const name = document.getElementById('edit-srv-name').value.trim();
  const price = parseCurrency(document.getElementById('edit-srv-price').value);
  const duration = parseInt(document.getElementById('edit-srv-duration').value, 10) || 15;
  let shortCode = document.getElementById('edit-srv-short').value.trim();
  if (!shortCode) shortCode = name.slice(0, 8);

  if (id) {
    const s = posServices.find(x => x.id === id);
    if (s) {
      s.code = code;
      s.name = name;
      s.price = price;
      s.duration = duration;
      s.shortCode = shortCode;
      showToast(`Serviço [${code}] atualizado!`, 'success');
    }
  } else {
    const newService = {
      id: Date.now(),
      code,
      name,
      price,
      duration,
      shortCode,
      categoryId: 1
    };
    posServices.push(newService);
    showToast(`Serviço [${code}] adicionado ao sistema!`, 'success');
  }

  localStorage.setItem('depilclear_services', JSON.stringify(posServices));
  renderServicesSelect();
  renderCatalogModalGrid(document.getElementById('catalog-search-query')?.value || '');
  closeModal('modal-service-edit');
}

/* ========================================================
 * SELEÇÃO E CADASTRO COMPLETO DE CLIENTES
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
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Nenhum cliente localizado.</div>`;
    return;
  }

  container.innerHTML = matches.map(c => {
    const credit = getClientCredit(c.id);
    const fData = JSON.parse(localStorage.getItem(`depilclear_fidelity_${c.id}`) || '{"points":[]}');
    const selos = fData.points ? fData.points.length : 0;

    return `
      <div onclick="selectClientForPOS(${c.id})" class="p-3 rounded-2xl border border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-violet hover:bg-brand-violet/10 cursor-pointer flex items-center justify-between transition-all">
        <div>
          <strong class="text-xs text-slate-900 dark:text-white">${c.name}</strong>
          <span class="block text-[10px] text-slate-400 font-mono">Tel: ${c.phone} • CPF: ${c.cpf || 'S/N'}</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-emerald-500 font-bold block">Crédito: R$ ${credit.toFixed(2)}</span>
          <span class="text-[10px] text-brand-gold font-bold">⭐ ${selos}/10 Selos</span>
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

  document.getElementById('pos-client-perks-bar')?.classList.remove('hidden');
  updateClientPerksUI();
  closeModal('modal-pos-search-client');
  renderPosTotals();
  showToast(`Cliente ${client.name} vinculada.`, 'success');
}

function clearSelectedClient() {
  currentPosClient = null;
  document.getElementById('pos-selected-client-name').innerText = 'CONSUMIDOR PADRÃO';
  document.getElementById('pos-selected-client-sub').innerText = 'Sem identificação';
  document.getElementById('pos-client-perks-bar')?.classList.add('hidden');
  renderPosTotals();
}

function openCompleteCreateClientModal() {
  closeModal('modal-pos-search-client');
  document.getElementById('modal-pos-create-client')?.classList.remove('hidden');
}

async function buscarEnderecoPorCEP(cepVal) {
  const clean = (cepVal || '').replace(/\D/g, '');
  if (clean.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (!data.erro) {
      document.getElementById('cli-street').value = data.logradouro || '';
      document.getElementById('cli-neighborhood').value = data.bairro || '';
      document.getElementById('cli-city').value = `${data.localidade || 'Maceió'} - ${data.uf || 'AL'}`;
      document.getElementById('cli-number')?.focus();
    }
  } catch (err) {
    console.warn('Erro ao consultar CEP:', err);
  }
}

function handleSaveCompleteClient(e) {
  e.preventDefault();
  const name = document.getElementById('cli-name').value.trim();
  const birth = document.getElementById('cli-birth').value;
  const phone = document.getElementById('cli-phone').value.trim();
  const cpf = document.getElementById('cli-cpf').value.trim();
  const gender = document.getElementById('cli-gender').value;
  const email = document.getElementById('cli-email').value.trim();

  const cep = document.getElementById('cli-cep').value.trim();
  const street = document.getElementById('cli-street').value.trim();
  const number = document.getElementById('cli-number').value.trim();
  const neighborhood = document.getElementById('cli-neighborhood').value.trim();
  const city = document.getElementById('cli-city').value.trim();

  const newClient = {
    id: Date.now(),
    name,
    birth,
    phone,
    cpf,
    gender,
    email,
    address: { cep, street, number, neighborhood, city }
  };

  posClients.push(newClient);
  localStorage.setItem('depilclear_clients', JSON.stringify(posClients));

  closeModal('modal-pos-create-client');
  selectClientForPOS(newClient.id);
  showToast(`Cliente ${name} cadastrado com sucesso!`, 'success');
}

/* ========================================================
 * CRÉDITO & CARTÃO FIDELIDADE (BENEFÍCIO ÍNTIMA COMPLETA)
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
  document.getElementById('pos-client-credit-badge').innerText = `R$ ${credit.toFixed(2)}`;

  const fKey = `depilclear_fidelity_${currentPosClient.id}`;
  const fData = JSON.parse(localStorage.getItem(fKey) || '{"points":[]}');
  const selos = fData.points ? fData.points.length : 0;
  
  const fBadge = document.getElementById('pos-fidelity-badge');
  if (fBadge) fBadge.innerText = `⭐ ${selos}/10 Selos`;

  // Linha de resgate de benefício do fidelidade
  const btnRedeem = document.getElementById('btn-redeem-fidelidade-pay');
  if (btnRedeem) {
    if (selos >= 10) {
      btnRedeem.disabled = false;
      btnRedeem.className = 'px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-[11px] animate-pulse';
      btnRedeem.innerText = 'Resgatar Íntima (100% OFF)';
    } else {
      btnRedeem.disabled = true;
      btnRedeem.className = 'px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-brand-darkCard text-slate-400 font-bold text-[11px] cursor-not-allowed';
      btnRedeem.innerText = `Bloqueado (${selos}/10)`;
    }
  }
}

function openCreditManagementModal() {
  if (!currentPosClient) return showToast('Selecione primeiro uma cliente!', 'warning');
  document.getElementById('modal-pos-credit')?.classList.remove('hidden');
}

function handleAddClientCredit(e) {
  e.preventDefault();
  if (!currentPosClient) return;

  const amount = parseCurrency(document.getElementById('pos-credit-amount').value);
  const method = document.getElementById('pos-credit-payment-method').value;
  if (amount <= 0) return;

  const current = getClientCredit(currentPosClient.id);
  setClientCredit(currentPosClient.id, current + amount);

  cashOperations.push({
    id: Date.now(),
    type: 'recarga_credito',
    amount,
    method,
    desc: `Crédito em conta para ${currentPosClient.name}`,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('depilclear_cash_ops', JSON.stringify(cashOperations));

  closeModal('modal-pos-credit');
  updateClientPerksUI();
  showToast(`R$ ${amount.toFixed(2)} creditados com sucesso!`, 'success');
}

function openFidelityManageModal() {
  if (!currentPosClient) return showToast('Selecione uma cliente!', 'warning');
  const fData = JSON.parse(localStorage.getItem(`depilclear_fidelity_${currentPosClient.id}`) || '{"points":[]}');
  document.getElementById('fid-modal-count').innerText = `${fData.points ? fData.points.length : 0} / 10`;
  document.getElementById('modal-fidelidade-manage')?.classList.remove('hidden');
}

function adjustFidelityPoints(delta) {
  if (!currentPosClient) return;
  const fKey = `depilclear_fidelity_${currentPosClient.id}`;
  const fData = JSON.parse(localStorage.getItem(fKey) || '{"points":[]}');
  if (!fData.points) fData.points = [];

  if (delta > 0 && fData.points.length < 10) {
    fData.points.push({ date: new Date().toISOString().split('T')[0], type: 'manual', desc: 'Ajuste Manual' });
  } else if (delta < 0 && fData.points.length > 0) {
    fData.points.pop();
  }

  localStorage.setItem(fKey, JSON.stringify(fData));
  document.getElementById('fid-modal-count').innerText = `${fData.points.length} / 10`;
  updateClientPerksUI();
  renderPosTotals();
}

function applyFidelityPercentageReward() {
  const perc = parseFloat(document.getElementById('fid-custom-perc').value || 0);
  if (perc <= 0) return;
  const raw = calculateCartTotal();
  const descVal = (raw * (perc / 100));
  document.getElementById('pos-discount').value = formatCurrency(descVal);
  closeModal('modal-fidelidade-manage');
  renderPosTotals();
  showToast(`Desconto de ${perc}% aplicado na nota!`, 'success');
}

function applyFidelityIntimaRewardToPOS() {
  if (!currentPosClient) return;
  const fKey = `depilclear_fidelity_${currentPosClient.id}`;
  const fData = JSON.parse(localStorage.getItem(fKey) || '{"points":[]}');

  if (!fData.points || fData.points.length < 10) {
    showToast('O cartão ainda não atingiu os 10 selos completos!', 'error');
    return;
  }

  // Verifica se há Íntima Completa na nota; se não houver, insere automaticamente com valor zerado
  const intimaSrv = posServices.find(s => normalize(s.name).includes('intima') || normalize(s.shortCode || '').includes('int'));
  const targetId = intimaSrv ? intimaSrv.id : (posServices[0] ? posServices[0].id : null);

  if (targetId) {
    const srv = posServices.find(s => s.id === targetId);
    posCart.push({
      id: srv.id,
      name: `${srv.name} (Prêmio Fidelidade)`,
      price: 0.00,
      qtd: 1,
      isFidelityReward: true
    });
    renderPosCartTable();
  }

  // Zera os selos do cartão
  fData.points = [];
  localStorage.setItem(fKey, JSON.stringify(fData));
  updateClientPerksUI();
  renderPosTotals();
  showToast('✓ Benefício Íntima Completa Gratuita resgatado!', 'success');
}

/* ========================================================
 * LANÇAMENTO DE ITENS E CÁLCULO MULTI-FORMA
 * ======================================================== */
function addServiceToPOS() {
  const serviceId = parseInt(document.getElementById('pos-service-select').value, 10);
  const service = posServices.find(s => s.id === serviceId);
  if (!service) return;

  const existing = posCart.find(item => item.id === service.id && !item.isFidelityReward);
  if (existing) {
    existing.qtd++;
  } else {
    posCart.push({
      id: service.id,
      code: service.code,
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
  if (posCart[index].qtd <= 0) posCart.splice(index, 1);
  renderPosCartTable();
  renderPosTotals();
}

function renderPosCartTable() {
  const tbody = document.getElementById('pos-items-table-body');
  if (!tbody) return;

  if (posCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs text-slate-400">Nenhum procedimento na nota.</td></tr>`;
    return;
  }

  tbody.innerHTML = posCart.map((item, idx) => `
    <tr class="hover:bg-brand-lightCard/40 dark:hover:bg-brand-darkBg/40">
      <td class="p-3 font-bold text-slate-900 dark:text-white">
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-violet/20 text-brand-violet font-black mr-1">${item.code || '-'}</span>
        ${item.name}
      </td>
      <td class="p-3 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button type="button" onclick="changeItemQtd(${idx}, -1)" class="w-5 h-5 rounded bg-slate-200 dark:bg-brand-darkBorder text-slate-700 dark:text-slate-300 font-black">-</button>
          <span class="font-mono font-bold">${item.qtd}</span>
          <button type="button" onclick="changeItemQtd(${idx}, 1)" class="w-5 h-5 rounded bg-slate-200 dark:bg-brand-darkBorder text-slate-700 dark:text-slate-300 font-black">+</button>
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
  const discount = parseCurrency(document.getElementById('pos-discount')?.value || '0');
  const finalTotal = Math.max(0, rawTotal - discount);

  document.getElementById('pos-grand-total').innerText = `R$ ${finalTotal.toFixed(2)}`;

  // Soma de todas as formas de pagamento preenchidas na tabela
  const payPix = parseCurrency(document.getElementById('pay-pix')?.value);
  const payDinheiro = parseCurrency(document.getElementById('pay-dinheiro')?.value);
  const payCredito = parseCurrency(document.getElementById('pay-credito')?.value);
  const payDebito = parseCurrency(document.getElementById('pay-debito')?.value);
  const paySaldo = parseCurrency(document.getElementById('pay-saldo')?.value);

  const totalPaid = payPix + payDinheiro + payCredito + payDebito + paySaldo;
  document.getElementById('pos-total-paid-info').innerText = `R$ ${totalPaid.toFixed(2)}`;

  const diff = totalPaid - finalTotal;
  const balanceLabel = document.getElementById('pos-balance-label');
  const balanceVal = document.getElementById('pos-balance-value');
  const statusBadge = document.getElementById('pos-payment-status-badge');

  if (diff >= 0) {
    balanceLabel.innerText = 'Troco:';
    balanceVal.innerText = `R$ ${diff.toFixed(2)}`;
    balanceVal.className = 'text-base font-black text-emerald-500 font-mono';
    statusBadge.innerText = 'Total Atingido';
    statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500';
  } else {
    balanceLabel.innerText = 'Faltando:';
    balanceVal.innerText = `R$ ${Math.abs(diff).toFixed(2)}`;
    balanceVal.className = 'text-base font-black text-rose-500 font-mono';
    statusBadge.innerText = 'Pendente';
    statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500';
  }
}

function clearPosCart() {
  posCart = [];
  document.getElementById('pos-discount').value = '0,00';
  document.getElementById('pay-pix').value = '0,00';
  document.getElementById('pay-dinheiro').value = '0,00';
  document.getElementById('pay-credito').value = '0,00';
  document.getElementById('pay-debito').value = '0,00';
  document.getElementById('pay-saldo').value = '0,00';
  renderPosCartTable();
  renderPosTotals();
}

/* ========================================================
 * FINALIZAR VENDA OU CANCELAR NOTA
 * ======================================================== */
function finalizeSale() {
  if (posCart.length === 0) return showToast('Adicione procedimentos à nota!', 'warning');

  const rawTotal = calculateCartTotal();
  const discount = parseCurrency(document.getElementById('pos-discount')?.value);
  const finalTotal = Math.max(0, rawTotal - discount);

  const payPix = parseCurrency(document.getElementById('pay-pix')?.value);
  const payDinheiro = parseCurrency(document.getElementById('pay-dinheiro')?.value);
  const payCredito = parseCurrency(document.getElementById('pay-credito')?.value);
  const payDebito = parseCurrency(document.getElementById('pay-debito')?.value);
  const paySaldo = parseCurrency(document.getElementById('pay-saldo')?.value);

  const totalPaid = payPix + payDinheiro + payCredito + payDebito + paySaldo;

  if (totalPaid < finalTotal) {
    return showToast(`Faltam R$ ${(finalTotal - totalPaid).toFixed(2)} para quitar a nota!`, 'error');
  }

  // Verifica e desconta saldo pré-pago se houver
  if (paySaldo > 0) {
    if (!currentPosClient) return showToast('Selecione a cliente para utilizar saldo pré-pago!', 'error');
    const available = getClientCredit(currentPosClient.id);
    if (available < paySaldo) return showToast(`Saldo pré-pago insuficiente! (Disponível: R$ ${available.toFixed(2)})`, 'error');
    setClientCredit(currentPosClient.id, available - paySaldo);
  }

  const paymentsBreakdown = [];
  if (payPix > 0) paymentsBreakdown.push(`PIX: R$ ${payPix.toFixed(2)}`);
  if (payDinheiro > 0) paymentsBreakdown.push(`Dinheiro: R$ ${payDinheiro.toFixed(2)}`);
  if (payCredito > 0) paymentsBreakdown.push(`Crédito: R$ ${payCredito.toFixed(2)}`);
  if (payDebito > 0) paymentsBreakdown.push(`Débito: R$ ${payDebito.toFixed(2)}`);
  if (paySaldo > 0) paymentsBreakdown.push(`Saldo: R$ ${paySaldo.toFixed(2)}`);

  const saleRecord = {
    id: Date.now(),
    clientId: currentPosClient ? currentPosClient.id : null,
    clientName: currentPosClient ? currentPosClient.name : 'CONSUMIDOR PADRÃO',
    items: [...posCart],
    rawTotal,
    discount,
    finalTotal,
    status: 'Finalizada',
    method: paymentsBreakdown.join(' | ') || 'Não especificado',
    timestamp: new Date().toISOString()
  };

  salesLog.push(saleRecord);
  localStorage.setItem('depilclear_sales_log', JSON.stringify(salesLog));

  // Atribui 1 selo ao atendimento concluído
  if (currentPosClient) {
    const fKey = `depilclear_fidelity_${currentPosClient.id}`;
    const f = JSON.parse(localStorage.getItem(fKey) || '{"points":[]}');
    if (f.points.length < 10) {
      f.points.push({ date: new Date().toISOString().split('T')[0], type: 'atendimento', desc: 'Atendimento PDV' });
      localStorage.setItem(fKey, JSON.stringify(f));
    }
  }

  showToast(`✓ Venda finalizada com sucesso!`, 'success');
  clearPosCart();
  updateClientPerksUI();
}

function cancelCurrentSale() {
  if (posCart.length === 0) return showToast('Nenhuma nota aberta para cancelar.', 'info');

  const rawTotal = calculateCartTotal();
  const saleRecord = {
    id: Date.now(),
    clientId: currentPosClient ? currentPosClient.id : null,
    clientName: currentPosClient ? currentPosClient.name : 'CONSUMIDOR PADRÃO',
    items: [...posCart],
    rawTotal,
    discount: 0,
    finalTotal: rawTotal,
    status: 'Cancelada',
    method: 'CANCELADA',
    timestamp: new Date().toISOString()
  };

  salesLog.push(saleRecord);
  localStorage.setItem('depilclear_sales_log', JSON.stringify(salesLog));

  clearPosCart();
  showToast('Nota cancelada e registrada no histórico como CANCELADA.', 'warning');
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
  document.getElementById('cash-op-amount').value = '0,00';

  if (type === 'fundo') {
    title.innerText = 'Fundo de Caixa (Abertura / Troco)';
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
  const amount = parseCurrency(document.getElementById('cash-op-amount').value);
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
  showToast(`Operação de ${type.toUpperCase()} registrada!`, 'success');
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
  let totalCanceladas = 0;
  const formasMap = {};

  filteredSales.forEach(s => {
    if (s.status === 'Cancelada') {
      totalCanceladas += Number(s.finalTotal);
    } else {
      totalVendas += Number(s.finalTotal);
      formasMap[s.method] = (formasMap[s.method] || 0) + Number(s.finalTotal);
    }
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

  document.getElementById('t-fundo').innerText = `R$ ${totalFundo.toFixed(2)}`;
  document.getElementById('t-vendas').innerText = `R$ ${totalVendas.toFixed(2)}`;
  document.getElementById('t-suprimentos').innerText = `R$ ${totalSuprimento.toFixed(2)}`;
  document.getElementById('t-sangrias').innerText = `R$ ${totalSangria.toFixed(2)}`;
  document.getElementById('t-canceladas').innerText = `R$ ${totalCanceladas.toFixed(2)}`;
  document.getElementById('t-saldo').innerText = `R$ ${saldoFinal.toFixed(2)}`;
  document.getElementById('ticket-period').innerText = `Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;

  const formasEl = document.getElementById('t-formas');
  if (formasEl) {
    formasEl.innerHTML = Object.entries(formasMap).map(([m, val]) => `
      <div class="flex justify-between text-[10px]">
        <span class="truncate pr-2">● ${m}:</span>
        <span class="font-bold">R$ ${val.toFixed(2)}</span>
      </div>
    `).join('') || '<div>Sem vendas concluídas.</div>';
  }

  const detTbody = document.getElementById('rep-detailed-table-body');
  if (detTbody) {
    detTbody.innerHTML = filteredSales.map(s => {
      const hora = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dia = new Date(s.timestamp).toLocaleDateString();
      const itensNomes = s.items.map(i => `${i.qtd}x ${i.name}`).join(', ');
      const isCancel = s.status === 'Cancelada';

      return `
        <tr class="${isCancel ? 'bg-rose-500/10' : ''}">
          <td class="p-3 font-mono text-slate-400">${dia} ${hora}</td>
          <td class="p-3 font-bold text-slate-900 dark:text-white">${s.clientName}</td>
          <td class="p-3 text-brand-violet">${itensNomes}</td>
          <td class="p-3 font-bold ${isCancel ? 'text-rose-500' : 'text-emerald-500'}">${s.status}</td>
          <td class="p-3 text-right font-mono font-black ${isCancel ? 'text-rose-500 line-through' : 'text-emerald-500'}">R$ ${s.finalTotal.toFixed(2)}</td>
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
      <button type="button" onclick="openCompleteCreateClientModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="user-plus" class="w-4 h-4 text-blue-400"></i> Cadastrar Cliente Completo
      </button>
      <button type="button" onclick="openServicesCatalogModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="search" class="w-4 h-4 text-brand-gold"></i> Catálogo / Lupa de Serviços
      </button>
      <button type="button" onclick="openFidelityManageModal()" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
        <i data-lucide="award" class="w-4 h-4 text-amber-500"></i> Gerir Cartão Fidelidade
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
      <button type="button" onclick="cancelCurrentSale()" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
        <i data-lucide="x-circle" class="w-4 h-4"></i> Cancelar Nota
      </button>
    </div>
  `;

  lucide.createIcons({ root: content });

  const posX = Math.min(e.clientX, window.innerWidth - 240);
  const posY = Math.min(e.clientY, window.innerHeight - 300);

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
    if (!badge) return;

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

window.onload = initPOS;