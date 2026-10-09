/* ========================================================
 * DEPILCLEAR WOMEN & MEN - SANDRA RAMOS
 * caixa.js - Lógica PDV, Nota Manual, Sangria e Sincronização
 * ======================================================== */

// Carrega Clientes e Serviços compartilhados do site principal
let clientsList = JSON.parse(localStorage.getItem('depilclear_clients') || '[]');
let servicesList = JSON.parse(localStorage.getItem('depilclear_services') || '[]');
let posSales = JSON.parse(localStorage.getItem('depilclear_pos_sales') || '[]');
let cashOperations = JSON.parse(localStorage.getItem('depilclear_cash_ops') || '[]');

let currentCart = [];

// Inicialização da Tela
window.onload = function() {
  // Sincroniza o tema selecionado no site principal
  if (localStorage.getItem('depilclear_theme') === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Popula seletor de clientes
  const cSelect = document.getElementById('pos-client-select');
  if (cSelect) {
    clientsList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.phone || 'Sem fone'})`;
      cSelect.appendChild(opt);
    });
  }

  // Popula seletor de procedimentos
  const sSelect = document.getElementById('pos-service-select');
  if (sSelect) {
    servicesList.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} - R$ ${Number(s.price).toFixed(2)}`;
      sSelect.appendChild(opt);
    });
  }

  // Define as datas iniciais do filtro de fechamento
  const today = new Date().toISOString().split('T')[0];
  const sDate = document.getElementById('rep-box-start-date');
  const eDate = document.getElementById('rep-box-end-date');
  if (sDate) sDate.value = today;
  if (eDate) eDate.value = today;

  lucide.createIcons();
};

// Alternador de Modo Escuro / Claro
function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.setItem('depilclear_theme', isDark ? 'dark' : 'light');
  lucide.createIcons();
}

// Inserir Procedimento na Nota
function addServiceToPOS() {
  const sId = parseInt(document.getElementById('pos-service-select').value);
  const srv = servicesList.find(s => s.id === sId);
  if (!srv) return;

  currentCart.push({
    id: srv.id,
    name: srv.name,
    price: Number(srv.price)
  });

  renderPosTable();
}

// Remover Item da Nota
function removePosItem(index) {
  currentCart.splice(index, 1);
  renderPosTable();
}

// Renderizar Grade de Itens
function renderPosTable() {
  const tbody = document.getElementById('pos-items-table-body');
  if (!tbody) return;

  if (currentCart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="p-6 text-center text-xs text-slate-400">
          Nenhum procedimento adicionado à nota ainda.
        </td>
      </tr>
    `;
    renderPosTotals();
    return;
  }

  tbody.innerHTML = currentCart.map((item, idx) => `
    <tr class="hover:bg-brand-lightCard/50 dark:hover:bg-brand-darkBg/50 transition-colors">
      <td class="p-3 font-bold text-slate-800 dark:text-white">${item.name}</td>
      <td class="p-3 text-center font-mono">1</td>
      <td class="p-3 font-mono text-slate-400">R$ ${item.price.toFixed(2)}</td>
      <td class="p-3 font-mono font-black text-brand-gold">R$ ${item.price.toFixed(2)}</td>
      <td class="p-3 text-right">
        <button type="button" onclick="removePosItem(${idx})" class="p-1 text-slate-400 hover:text-rose-500 rounded-lg">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons({ root: tbody });
  renderPosTotals();
}

// Calcular Subtotal, Desconto e Troco
function renderPosTotals() {
  const subtotal = currentCart.reduce((sum, i) => sum + i.price, 0);
  const discount = parseFloat(document.getElementById('pos-discount')?.value || 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const totalEl = document.getElementById('pos-grand-total');
  if (totalEl) totalEl.textContent = `R$ ${grandTotal.toFixed(2)}`;

  const received = parseFloat(document.getElementById('pos-received-value')?.value || 0);
  const change = Math.max(0, received - grandTotal);
  const changeEl = document.getElementById('pos-change-value');
  if (changeEl) changeEl.textContent = `R$ ${change.toFixed(2)}`;
}

// Verificar Selos do Cartão Fidelidade da Cliente Selecionada
function checkPosClientFidelity() {
  const cId = document.getElementById('pos-client-select').value;
  const notice = document.getElementById('pos-fidelity-notice');
  if (!cId) {
    notice?.classList.add('hidden');
    return;
  }

  const f = JSON.parse(localStorage.getItem(`depilclear_fidelity_${cId}`) || '{"points":[]}');
  const count = (f.points || []).length;

  const textEl = document.getElementById('pos-fidelity-text');
  if (textEl) textEl.textContent = `⭐ Fidelidade: ${count}/10`;
  notice?.classList.remove('hidden');
}

// Resgatar Benefício da Fidelidade (Desconto no Caixa)
function applyFidelityDiscountToPOS() {
  const cId = document.getElementById('pos-client-select').value;
  if (!cId) return;

  const perc = prompt('Qual porcentagem de desconto aplicar por este selo (Ex: 50 para 50%)?', '50');
  if (perc) {
    const subtotal = currentCart.reduce((sum, i) => sum + i.price, 0);
    const discValue = (subtotal * (parseFloat(perc) / 100));
    document.getElementById('pos-discount').value = discValue.toFixed(2);
    renderPosTotals();
    showToast(`Desconto de ${perc}% aplicado com sucesso!`, 'success');
  }
}

// Gravação e Finalização da Venda (Suporte Offline + Nuvem)
async function finalizeSale() {
  if (currentCart.length === 0) {
    showToast('Insira pelo menos um procedimento na nota!', 'warning');
    return;
  }

  const cId = document.getElementById('pos-client-select').value;
  const client = clientsList.find(c => c.id == cId);
  const subtotal = currentCart.reduce((sum, i) => sum + i.price, 0);
  const discount = parseFloat(document.getElementById('pos-discount')?.value || 0);
  const finalAmount = Math.max(0, subtotal - discount);
  const paymentMethod = document.getElementById('pos-payment-method').value;

  const now = new Date();
  const sale = {
    id: Date.now(),
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0].substring(0, 5),
    clientId: client ? client.id : null,
    clientName: client ? client.name : 'CONSUMIDOR PADRÃO',
    services: currentCart.map(i => i.name).join(', '),
    paymentMethod,
    subtotal,
    discount,
    total: finalAmount,
    synced: false
  };

  // 1. Grava no disco local imediatamente
  posSales.push(sale);
  localStorage.setItem('depilclear_pos_sales', JSON.stringify(posSales));
  showToast('✓ Venda finalizada e gravada com sucesso!', 'success');
  clearPosCart();

  // 2. Se online, replica no Supabase
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoRegistro: 'venda',
          dados: {
            client_id: sale.clientId,
            client_name: sale.clientName,
            servicos: sale.services,
            forma_pagamento: sale.paymentMethod,
            subtotal: sale.subtotal,
            desconto: sale.discount,
            total: sale.total
          }
        })
      });
      if (res.ok) {
        sale.synced = true;
        localStorage.setItem('depilclear_pos_sales', JSON.stringify(posSales));
      }
    } catch (_) {}
  }
}

// Limpar Formulário
function clearPosCart() {
  currentCart = [];
  document.getElementById('pos-discount').value = '0.00';
  document.getElementById('pos-received-value').value = '0.00';
  renderPosTable();
}

// Gestão de Sangria & Suprimento
function openCashOperationModal(type) {
  document.getElementById('cash-op-type').value = type;
  document.getElementById('cash-op-title').textContent = type === 'sangria' ? 'Sangria (Saída de Dinheiro)' : 'Suprimento (Fundo de Caixa)';
  document.getElementById('modal-cash-op').classList.remove('hidden');
}

async function handleSaveCashOperation(e) {
  e.preventDefault();
  const type = document.getElementById('cash-op-type').value;
  const amount = parseFloat(document.getElementById('cash-op-amount').value);
  const desc = document.getElementById('cash-op-desc').value;

  const now = new Date();
  const op = {
    type,
    amount,
    desc,
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0].substring(0, 5),
    synced: false
  };

  cashOperations.push(op);
  localStorage.setItem('depilclear_cash_ops', JSON.stringify(cashOperations));
  showToast('Operação de caixa gravada!', 'success');
  closeModal('modal-cash-op');

  if (navigator.onLine) {
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoRegistro: 'operacao',
          dados: {
            tipo: op.type,
            valor: op.amount,
            descricao: op.desc
          }
        })
      });
      if (res.ok) {
        op.synced = true;
        localStorage.setItem('depilclear_cash_ops', JSON.stringify(cashOperations));
      }
    } catch (_) {}
  }
}

// Relatórios de Fechamento de Caixa
function openReportModal() {
  document.getElementById('modal-pos-reports').classList.remove('hidden');
  generateBoxReport();
  lucide.createIcons();
}

function switchReportTab(tab) {
  const btnFech = document.getElementById('tab-btn-fechamento');
  const btnDet = document.getElementById('tab-btn-detalhado');
  const cFech = document.getElementById('report-content-fechamento');
  const cDet = document.getElementById('report-content-detalhado');

  if (tab === 'fechamento') {
    btnFech.className = 'px-4 py-2 bg-brand-violet text-white font-bold text-xs rounded-2xl shadow';
    btnDet.className = 'px-4 py-2 bg-brand-lightCard dark:bg-brand-darkBg text-slate-500 font-semibold text-xs rounded-2xl';
    cFech.classList.remove('hidden');
    cDet.classList.add('hidden');
  } else {
    btnDet.className = 'px-4 py-2 bg-brand-violet text-white font-bold text-xs rounded-2xl shadow';
    btnFech.className = 'px-4 py-2 bg-brand-lightCard dark:bg-brand-darkBg text-slate-500 font-semibold text-xs rounded-2xl';
    cDet.classList.remove('hidden');
    cFech.classList.add('hidden');
  }
  generateBoxReport();
}

function generateBoxReport() {
  const sDate = document.getElementById('rep-box-start-date').value;
  const sTime = document.getElementById('rep-box-start-time').value;
  const eDate = document.getElementById('rep-box-end-date').value;
  const eTime = document.getElementById('rep-box-end-time').value;

  const salesFiltered = posSales.filter(s => {
    const full = `${s.date}T${s.time}`;
    return full >= `${sDate}T${sTime}` && full <= `${eDate}T${eTime}`;
  });

  const opsFiltered = cashOperations.filter(o => {
    const full = `${o.date}T${o.time}`;
    return full >= `${sDate}T${sTime}` && full <= `${eDate}T${eTime}`;
  });

  let totalVendas = 0;
  const formasMap = {};

  salesFiltered.forEach(s => {
    totalVendas += s.total;
    formasMap[s.paymentMethod] = (formasMap[s.paymentMethod] || 0) + s.total;
  });

  let totalSuprimentos = opsFiltered.filter(o => o.type === 'suprimento').reduce((a, b) => a + b.amount, 0);
  let totalSangrias = opsFiltered.filter(o => o.type === 'sangria').reduce((a, b) => a + b.amount, 0);
  let saldo = totalVendas + totalSuprimentos - totalSangrias;

  // Atualiza Cupom
  document.getElementById('ticket-period').textContent = `Período: ${sDate.split('-').reverse().join('/')} ${sTime} às ${eDate.split('-').reverse().join('/')} ${eTime}`;
  document.getElementById('t-vendas').textContent = `R$ ${totalVendas.toFixed(2)}`;
  document.getElementById('t-suprimentos').textContent = `R$ ${totalSuprimentos.toFixed(2)}`;
  document.getElementById('t-sangrias').textContent = `R$ ${totalSangrias.toFixed(2)}`;
  document.getElementById('t-saldo').textContent = `R$ ${saldo.toFixed(2)}`;

  document.getElementById('t-formas').innerHTML = Object.entries(formasMap).map(([f, val]) => `
    <div class="flex justify-between"><span>${f}:</span><span>R$ ${val.toFixed(2)}</span></div>
  `).join('') || '<span>Sem vendas no período</span>';

  // Atualiza Tabela Detalhada
  const tbody = document.getElementById('rep-detailed-table-body');
  if (tbody) {
    tbody.innerHTML = salesFiltered.map(s => `
      <tr class="hover:bg-brand-lightCard/50 dark:hover:bg-brand-darkBg/50">
        <td class="p-3 font-mono">${s.date.split('-').reverse().join('/')} ${s.time}</td>
        <td class="p-3 font-bold text-slate-800 dark:text-white">${s.clientName}</td>
        <td class="p-3">${s.services}</td>
        <td class="p-3 font-bold text-brand-gold">${s.paymentMethod}</td>
        <td class="p-3 text-right font-black text-emerald-500 font-mono">R$ ${s.total.toFixed(2)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum atendimento no período.</td></tr>';
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
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

  const styleClass = typeStyles[type] || typeStyles.info;
  toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold ${styleClass}`;
  toast.innerHTML = `<span>${message}</span>`;
  wrapper.appendChild(toast);

  setTimeout(() => toast.remove(), 3200);
}

// Sincronização em background quando voltar à internet
window.addEventListener('online', async () => {
  const pendingSales = posSales.filter(s => !s.synced);
  for (const s of pendingSales) {
    try {
      await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoRegistro: 'venda',
          dados: {
            client_id: s.clientId,
            client_name: s.clientName,
            servicos: s.services,
            forma_pagamento: s.paymentMethod,
            subtotal: s.subtotal,
            desconto: s.discount,
            total: s.total
          }
        })
      });
      s.synced = true;
    } catch (_) {}
  }
  localStorage.setItem('depilclear_pos_sales', JSON.stringify(posSales));
  showToast('Vendas offline sincronizadas com o banco!', 'success');
});