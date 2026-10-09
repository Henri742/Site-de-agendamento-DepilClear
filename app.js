/* ========================================================
 * DEPILCLEAR WOMEN & MEN - SANDRA RAMOS
 * app.js - Lógica Principal, Persistência e Utilitários
 * ======================================================== */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Paleta de 20 tons suaves para categorização
const SOFT_PASTEL_PALETTE = [
  { name: 'Lavanda Suave', hex: '#a78bfa' },
  { name: 'Rosa Quartzo', hex: '#f472b6' },
  { name: 'Lilás Névoa', hex: '#c084fc' },
  { name: 'Menta Serena', hex: '#6ee7b7' },
  { name: 'Ouro Pálido', hex: '#eab308' },
  { name: 'Pêssego Delicado', hex: '#fca5a5' },
  { name: 'Céu Sereno', hex: '#7dd3fc' },
  { name: 'Camomila Doce', hex: '#fde047' },
  { name: 'Verde Sálvia', hex: '#86efac' },
  { name: 'Azul Glaciar', hex: '#93c5fd' },
  { name: 'Coral Claro', hex: '#fdba74' },
  { name: 'Ametista Floral', hex: '#d8b4fe' },
  { name: 'Capim-Santo', hex: '#a3e635' },
  { name: 'Rosa Bebê', hex: '#f9a8d4' },
  { name: 'Turquesa Suave', hex: '#5eead4' },
  { name: 'Areia Dourada', hex: '#fed7aa' },
  { name: 'Violeta Bruma', hex: '#818cf8' },
  { name: 'Jade Tranquilo', hex: '#34d399' },
  { name: 'Blush Radiante', hex: '#fb7185' },
  { name: 'Nuvem Prata', hex: '#cbd5e1' }
];

// Dados Iniciais e Configurações Padrão
let companyConfig = {
  name: 'DepilClear Women & Men - Sandra Ramos',
  street: 'Atendimento com Agendamento Prévio',
  number: 'S/N',
  bairro: 'Maceió',
  cep: '57000-000',
  complement: 'Sala Spa',
  whatsapp: '(82) 98722-3360',
  openTime: '08:00',
  closeTime: '18:00',
  slotIntervalMinutes: 15,
  maxClientsPerSlot: 3,
  logoUrl: null
};

const today = new Date();
let currentSelectedDate = today.toISOString().split('T')[0];
let calendarViewYear = today.getFullYear();
let calendarViewMonth = today.getMonth();

let inModalCalYear = today.getFullYear();
let inModalCalMonth = today.getMonth();
let inModalSelectedDate = currentSelectedDate;

let receptionPopoverYear = today.getFullYear();
let receptionPopoverMonth = today.getMonth();

let categoriesList = [
  { id: 1, name: 'Terapias Corporais', color: '#a78bfa' },
  { id: 2, name: 'Cuidados Podais & Spa dos Pés', color: '#6ee7b7' },
  { id: 3, name: 'Upgrades & Potencializadores', color: '#eab308' },
  { id: 4, name: 'Epilação Feminina', color: '#f472b6' },
  { id: 5, name: 'Epilação Masculina', color: '#7dd3fc' }
];

let servicesList = [
  { id: 1, name: 'Massagem Relaxante com Óleos', shortCode: 'relax.oleos', categoryId: 1, duration: 45, price: 150.00 },
  { id: 2, name: 'Massagem Corporal Detox', shortCode: 'detox.argila', categoryId: 1, duration: 50, price: 180.00 },
  { id: 3, name: 'Massagem com Pedras Vulcânicas', shortCode: 'pedras.vulc', categoryId: 1, duration: 60, price: 190.00 },
  { id: 4, name: 'Ritual Escalda-Pés Relaxante', shortCode: 'escalda.pes', categoryId: 2, duration: 30, price: 75.00 },
  { id: 5, name: 'Spa Podal Termoterápico', shortCode: 'spa.podal', categoryId: 2, duration: 30, price: 70.00 },
  { id: 6, name: 'Alívio Cervical', shortCode: 'alivio.cerv', categoryId: 3, duration: 20, price: 25.00 },
  { id: 7, name: 'Íntima Completa', shortCode: "int'c", categoryId: 4, duration: 15, price: 70.00 },
  { id: 8, name: 'Perna Completa', shortCode: "perna'c", categoryId: 4, duration: 30, price: 60.00 },
  { id: 9, name: 'Axilas', shortCode: 'axilas', categoryId: 4, duration: 15, price: 25.00 },
  { id: 10, name: 'Buço e Queixo', shortCode: 'buço e queixo', categoryId: 4, duration: 15, price: 30.00 },
  { id: 11, name: 'Costas Masculino', shortCode: 'costas.masc', categoryId: 5, duration: 25, price: 40.00 }
];

let professionalsList = [
  { id: 1, name: 'Sandra Ramos', photo: null },
  { id: 2, name: 'Beth', photo: null },
  { id: 3, name: 'Erica', photo: null }
];

let clientsList = [
  { id: 1, name: 'Mayara Silva', cpf: '012.345.678-90', phone: '82987223360', email: 'mayara@gmail.com', birth: '1992-04-12', gender: 'Feminino' },
  { id: 2, name: 'Dariane Albuquerque', cpf: '987.654.321-00', phone: '82991234567', email: 'dariane@gmail.com', birth: '1989-08-25', gender: 'Feminino' },
  { id: 3, name: 'Carlita Almeida', cpf: '111.444.777-35', phone: '82988112233', email: 'carlita@email.com', birth: '1995-02-17', gender: 'Feminino' },
  { id: 4, name: 'Jullyana Stephany', cpf: '222.555.888-40', phone: '82999443322', email: 'jullyana@email.com', birth: '1996-09-03', gender: 'Feminino' },
  { id: 5, name: 'Regina Tavares', cpf: '333.666.999-52', phone: '82996554411', email: 'regina@email.com', birth: '1985-07-29', gender: 'Feminino' },
  { id: 6, name: 'João Bernardino', cpf: '444.777.000-60', phone: '82991122334', email: 'joao@email.com', birth: '1988-11-20', gender: 'Masculino' }
];

let appointmentsList = [
  {
    id: 101,
    clientId: 1,
    clientName: 'Mayara Silva',
    gender: 'Feminino',
    phone: '82987223360',
    services: [
      { id: 7, name: 'Íntima Completa', price: 70.00, duration: 15, categoryId: 4 },
      { id: 8, name: 'Perna Completa', price: 60.00, duration: 30, categoryId: 4 }
    ],
    serviceName: "Íntima Completa + Perna Completa",
    serviceShort: "int'c, perna'c",
    professional: 'Beth',
    date: currentSelectedDate,
    time: '08:00',
    price: 130.00,
    status: 'Confirmada',
    isFirstTime: false,
    arrivedAtReception: true,
    receptionStatus: 'Confirmada'
  }
];

let whatsappTemplates = [
  {
    id: 'confirmacao',
    title: 'Confirmação de Agendamento',
    trigger: 'Agendado',
    active: true,
    text: '✨ Olá {nome}! Seu agendamento na {empresa} foi pré-agendado com sucesso!\n\n📅 Data: {data}\n⏰ Horário: {horario}\n💆‍♀️ Procedimento(s): {servico}\n👩‍⚕️ Profissional: {profissional}\n💰 Valor Total: R$ {valor}\n📍 Local: {endereco}'
  },
  {
    id: 'confirmada',
    title: 'Presença Confirmada (Mural)',
    trigger: 'Confirmada',
    active: true,
    text: '✅ Olá {nome}! Sua presença foi CONFIRMADA para o dia {data} às {horario}. Seu atendimento com {profissional} já consta na nossa recepção da {empresa}!'
  }
];

// Variáveis de Controle e Filtros
let agendaSelectedStatuses = [];
let agendaSelectedGender = 'TODOS';
let agendaFilterInactiveOnly = false;
let agendaSearchQuery = '';
let agendaFilterByDateRange = false;
let agendaStartDate = '';
let agendaEndDate = '';

let currentClientGenderFilter = 'TODOS';
let tempProPhotoData = null;
let selectedServiceIdsInModal = [];
let selectedProfessionalInModal = 'Sem preferência';
let selectedTimeInModal = '';
let currentViewingClientId = null;

/* ========================================================
 * PERSISTÊNCIA PERMANENTE (LOCALSTORAGE)
 * ======================================================== */
function saveAllToLocalStorage() {
  try {
    localStorage.setItem('depilclear_appointments', JSON.stringify(appointmentsList));
    localStorage.setItem('depilclear_clients', JSON.stringify(clientsList));
    localStorage.setItem('depilclear_services', JSON.stringify(servicesList));
    localStorage.setItem('depilclear_categories', JSON.stringify(categoriesList));
    localStorage.setItem('depilclear_professionals', JSON.stringify(professionalsList));
    localStorage.setItem('depilclear_wpp_templates', JSON.stringify(whatsappTemplates));
    localStorage.setItem('depilclear_company_config', JSON.stringify(companyConfig));
  } catch (err) {
    console.error('Erro ao gravar no localStorage:', err);
  }
}

function loadAllFromLocalStorage() {
  try {
    const apps = localStorage.getItem('depilclear_appointments');
    if (apps) appointmentsList = JSON.parse(apps);

    const clis = localStorage.getItem('depilclear_clients');
    if (clis) clientsList = JSON.parse(clis);

    const srvs = localStorage.getItem('depilclear_services');
    if (srvs) servicesList = JSON.parse(srvs);

    const cats = localStorage.getItem('depilclear_categories');
    if (cats) categoriesList = JSON.parse(cats);

    const pros = localStorage.getItem('depilclear_professionals');
    if (pros) professionalsList = JSON.parse(pros);

    const wpps = localStorage.getItem('depilclear_wpp_templates');
    if (wpps) whatsappTemplates = JSON.parse(wpps);

    const cfg = localStorage.getItem('depilclear_company_config');
    if (cfg) companyConfig = JSON.parse(cfg);
  } catch (err) {
    console.error('Erro ao recuperar dados do localStorage:', err);
  }
}

/* ========================================================
 * NAVEGAÇÃO, AUTENTICAÇÃO E TEMA
 * ======================================================== */
// Autenticação com a API da Vercel / Supabase
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showToast('Preencha seu e-mail e senha.', 'warning');
    return;
  }

  showToast('A verificar credenciais...', 'info');

  try {
    const resposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      showToast(dados.erro || 'Credenciais inválidas.', 'error');
      return;
    }

    // Guarda a sessão segura
    localStorage.setItem('depilclear_jwt_token', dados.token);
    localStorage.setItem('depilclear_active_user', dados.usuario.email);

    document.getElementById('view-login')?.classList.add('hidden');
    document.getElementById('view-dashboard')?.classList.remove('hidden');

    const userDisplay = document.getElementById('user-display-email');
    if (userDisplay) userDisplay.innerText = dados.usuario.email;

    initCalendar();
    renderAllViews();
    showToast(`Bem-vindo(a), ${dados.usuario.nome}!`, 'success');
    lucide.createIcons();
  } catch (erro) {
    console.error('Erro de conexão:', erro);
    showToast('Erro ao ligar ao servidor.', 'error');
  }
}

function toggleLoginPassword() {
  const pwd = document.getElementById('login-password');
  const eyeIcon = document.getElementById('login-eye-icon');
  if (!pwd) return;
  if (pwd.type === 'password') {
    pwd.type = 'text';
    eyeIcon?.setAttribute('data-lucide', 'eye-off');
  } else {
    pwd.type = 'password';
    eyeIcon?.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

// Botão Sair da conta
function handleLogout() {
  localStorage.removeItem('depilclear_jwt_token');
  localStorage.removeItem('depilclear_active_user');

  const pwdInput = document.getElementById('login-password');
  if (pwdInput) pwdInput.value = '';

  document.getElementById('view-dashboard')?.classList.add('hidden');
  document.getElementById('view-login')?.classList.remove('hidden');
  showToast('Saiu do sistema com segurança.', 'info');
}

function toggleTheme(btnElement = null) {
  const html = document.documentElement;
  html.classList.toggle('dark');
  
  const isDark = html.classList.contains('dark');
  localStorage.setItem('depilclear_theme', isDark ? 'dark' : 'light');
  
  lucide.createIcons();
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) sidebar.classList.toggle('-translate-x-full');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`section-${tabId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('bg-gradient-to-r', 'from-brand-purpleDeep', 'to-brand-violet', 'text-white', 'shadow-md', 'shadow-purple-900/30');
    el.classList.add('text-slate-600', 'dark:text-slate-300');
  });

  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-600', 'dark:text-slate-300');
    activeNav.classList.add('bg-gradient-to-r', 'from-brand-purpleDeep', 'to-brand-violet', 'text-white', 'shadow-md', 'shadow-purple-900/30');
  }

  const sidebar = document.getElementById('app-sidebar');
  if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.add('-translate-x-full');
  }

  renderAllViews();
  lucide.createIcons();
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

  const icons = {
    success: 'check-circle-2',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  const styleClass = typeStyles[type] || typeStyles.info;
  const iconName = icons[type] || 'info';

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold transform transition-all duration-300 translate-y-3 opacity-0 ${styleClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span class="flex-1">${message}</span>
  `;

  wrapper.appendChild(toast);
  lucide.createIcons({ root: toast });

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function handleBackdropClick(event, id) {
  if (event.target && event.target.id === id) {
    closeModal(id);
  }
}

/* ========================================================
 * ORDENAÇÃO DE SERVIÇOS E FORMATAÇÃO DO MURAL
 * ======================================================== */
function getSortedServicesForAppointment(services) {
  if (!services || !Array.isArray(services)) return [];

  return [...services].sort((a, b) => {
    const catA = categoriesList.find(c => c.id === a.categoryId);
    const catB = categoriesList.find(c => c.id === b.categoryId);
    const nameA = (catA ? catA.name : '').toLowerCase();
    const nameB = (catB ? catB.name : '').toLowerCase();

    const isDepilA = nameA.includes('epilação') || nameA.includes('depilação');
    const isDepilB = nameB.includes('epilação') || nameB.includes('depilação');

    if (isDepilA && !isDepilB) return -1;
    if (!isDepilA && isDepilB) return 1;
    return (a.categoryId || 99) - (b.categoryId || 99);
  });
}

function renderMuralServiceBadges(app) {
  const sortedServices = getSortedServicesForAppointment(app.services || []);
  if (sortedServices.length === 0) {
    const proText = app.professional && app.professional !== 'Sem preferência' ? ` <strong class="text-slate-900 dark:text-white font-black">(${app.professional})</strong>` : '';
    return `<span class="text-[11px] font-semibold">${app.serviceShort || app.serviceName || ''}${proText}</span>`;
  }

  const badgesHtml = sortedServices.map(srv => {
    const cat = categoriesList.find(c => c.id === srv.categoryId);
    const catColor = cat ? cat.color : '#a78bfa';
    const label = srv.shortCode || srv.name;

    return `
      <span 
        class="inline-block px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold border leading-tight shadow-xs mr-1 mb-0.5"
        style="background-color: ${catColor}25; color: #1e1135; border-color: ${catColor}80;"
        title="${srv.name} (${cat ? cat.name : ''})"
      >
        ${label}
      </span>
    `;
  }).join('');

  const proText = app.professional && app.professional !== 'Sem preferência' 
    ? `<span class="text-[11px] text-slate-900 dark:text-slate-100 font-extrabold ml-1 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">(${app.professional})</span>` 
    : '';
  return `<div class="flex flex-wrap items-center gap-0.5">${badgesHtml}${proText}</div>`;
}

function formatServicesShortTextSorted(services, professional) {
  const sorted = getSortedServicesForAppointment(services || []);
  const labels = sorted.map(s => s.shortCode || s.name).join(', ');
  return professional && professional !== 'Sem preferência' ? `${labels} (${professional})` : labels;
}

function generate15MinSlots() {
  const slots = [];
  const [startHour, startMin] = companyConfig.openTime.split(':').map(Number);
  const [endHour, endMin] = companyConfig.closeTime.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += companyConfig.slotIntervalMinutes;
  }
  return slots;
}

function isClientInactive(clientId) {
  const clientApps = appointmentsList.filter(a => a.clientId === clientId && a.status !== 'Cancelado');
  if (clientApps.length === 0) return true;
  const dates = clientApps.map(a => new Date(a.date).getTime()).filter(t => !isNaN(t));
  if (dates.length === 0) return true;
  const lastDate = Math.max(...dates);
  const diffDays = (new Date().getTime() - lastDate) / (1000 * 60 * 60 * 24);
  return diffDays > 90;
}

/* ========================================================
 * BUSCA TOLERANTE E FILTROS DE INTERVALO
 * ======================================================== */
function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatchWord(target, query) {
  if (!query) return true;
  const nTarget = normalizeStr(target);
  const nQuery = normalizeStr(query);
  if (nTarget.includes(nQuery)) return true;

  const targetWords = nTarget.split(/\s+/);
  const queryWords = nQuery.split(/\s+/);

  return queryWords.every(qWord => {
    if (nTarget.includes(qWord)) return true;
    return targetWords.some(tWord => {
      if (Math.abs(tWord.length - qWord.length) > 2) return false;
      return levenshteinDistance(tWord, qWord) <= 2;
    });
  });
}

function toggleAgendaFilterPopover(event) {
  if (event) event.stopPropagation();
  document.getElementById('agenda-filter-popover')?.classList.toggle('hidden');
}

function handleDateRangeCheckboxChange() {
  const cb = document.getElementById('filter-date-range-cb');
  const container = document.getElementById('filter-date-range-inputs');
  agendaFilterByDateRange = Boolean(cb && cb.checked);

  if (agendaFilterByDateRange) {
    container?.classList.remove('hidden');
    if (!document.getElementById('filter-date-start').value) {
      document.getElementById('filter-date-start').value = currentSelectedDate;
    }
    if (!document.getElementById('filter-date-end').value) {
      document.getElementById('filter-date-end').value = currentSelectedDate;
    }
  } else {
    container?.classList.add('hidden');
  }
  handleFilterCheckboxChange();
}

function handleFilterCheckboxChange() {
  const checkedBoxes = Array.from(document.querySelectorAll('.filter-status-cb:checked')).map(cb => cb.value);
  agendaSelectedStatuses = checkedBoxes;
  agendaFilterInactiveOnly = document.getElementById('filter-inactive-only-cb')?.checked || false;

  const dateRangeCb = document.getElementById('filter-date-range-cb');
  agendaFilterByDateRange = Boolean(dateRangeCb && dateRangeCb.checked);
  agendaStartDate = document.getElementById('filter-date-start')?.value || '';
  agendaEndDate = document.getElementById('filter-date-end')?.value || '';

  updateFilterBadgeCount();
  renderAgendaView();
}

function setMultiFilterGender(gender) {
  agendaSelectedGender = gender;
  document.querySelectorAll('.multi-filter-gender-btn').forEach(btn => {
    if (btn.getAttribute('data-g') === gender) {
      btn.className = 'multi-filter-gender-btn flex-1 py-1 rounded-xl text-[11px] font-bold bg-brand-violet text-white';
    } else {
      btn.className = 'multi-filter-gender-btn flex-1 py-1 rounded-xl text-[11px] font-semibold text-slate-500 bg-brand-lightCard dark:bg-brand-darkBg border border-brand-lightBorder dark:border-brand-darkBorder';
    }
  });
  updateFilterBadgeCount();
  renderAgendaView();
}

function resetAgendaMultiFilters() {
  document.querySelectorAll('.filter-status-cb').forEach(cb => cb.checked = false);
  const inactiveCb = document.getElementById('filter-inactive-only-cb');
  if (inactiveCb) inactiveCb.checked = false;
  const dateRangeCb = document.getElementById('filter-date-range-cb');
  if (dateRangeCb) dateRangeCb.checked = false;
  document.getElementById('filter-date-range-inputs')?.classList.add('hidden');

  agendaSelectedStatuses = [];
  agendaFilterInactiveOnly = false;
  agendaFilterByDateRange = false;
  agendaStartDate = '';
  agendaEndDate = '';
  setMultiFilterGender('TODOS');
  updateFilterBadgeCount();
  renderAgendaView();
}

function updateFilterBadgeCount() {
  let count = agendaSelectedStatuses.length;
  if (agendaSelectedGender !== 'TODOS') count++;
  if (agendaFilterInactiveOnly) count++;
  if (agendaFilterByDateRange) count++;

  const badge = document.getElementById('active-filters-count-badge');
  if (badge) {
    if (count > 0) {
      badge.innerText = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function handleAgendaSearchFilter(query) {
  agendaSearchQuery = query.trim();
  const clearBtn = document.getElementById('agenda-clear-search-btn');
  if (agendaSearchQuery) {
    clearBtn?.classList.remove('hidden');
  } else {
    clearBtn?.classList.add('hidden');
  }
  renderAgendaView();
}

function clearAgendaSearch() {
  const input = document.getElementById('agenda-client-search');
  if (input) input.value = '';
  agendaSearchQuery = '';
  document.getElementById('agenda-clear-search-btn')?.classList.add('hidden');
  renderAgendaView();
}

/* ========================================================
 * MENUS DE CONTEXTO E BOTÃO DIREITO
 * ======================================================== */
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

document.addEventListener('click', (e) => {
  const customMenu = document.getElementById('custom-context-menu');
  if (customMenu && !customMenu.contains(e.target)) {
    customMenu.classList.add('hidden');
  }
  const filterPop = document.getElementById('agenda-filter-popover');
  const filterBtn = document.getElementById('btn-agenda-filters-popover');
  if (filterPop && !filterPop.contains(e.target) && filterBtn && !filterBtn.contains(e.target)) {
    filterPop.classList.add('hidden');
  }
});

function showCustomContextMenu(event, type, id) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const menu = document.getElementById('custom-context-menu');
  const content = document.getElementById('custom-context-menu-content');
  if (!menu || !content) return;

  let menuItemsHtml = '';

  if (type === 'agenda' || type === 'reception') {
    const app = appointmentsList.find(a => a.id === id);
    if (!app) return;
    menuItemsHtml = `
      <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
        ${app.clientName}
      </div>
      <div class="py-1.5 space-y-0.5">
        <button type="button" onclick="closeContextMenu(); openEditAppointmentModal(${app.id})" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="edit-3" class="w-4 h-4 text-brand-violet"></i> Editar agendamento
        </button>
        <button type="button" onclick="closeContextMenu(); openClientProfileModal(${app.clientId}, 'dados')" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="user" class="w-4 h-4 text-blue-400"></i> Dados da cliente
        </button>
        <button type="button" onclick="closeContextMenu(); openClientProfileModal(${app.clientId}, 'historico')" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="history" class="w-4 h-4 text-emerald-400"></i> Histórico completo
        </button>
      </div>
      <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
        <button type="button" onclick="closeContextMenu(); handleCancelAppointmentViaContext(${app.id})" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
          <i data-lucide="x-circle" class="w-4 h-4"></i> Cancelar Agendamento
        </button>
      </div>
    `;
  } else if (type === 'client') {
    const client = clientsList.find(c => c.id === id);
    if (!client) return;
    menuItemsHtml = `
      <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
        ${client.name}
      </div>
      <div class="py-1.5 space-y-0.5">
        <button type="button" onclick="closeContextMenu(); openClientModal(${client.id})" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="edit-3" class="w-4 h-4 text-brand-violet"></i> Editar cliente
        </button>
        <button type="button" onclick="closeContextMenu(); openClientProfileModal(${client.id}, 'dados')" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="user" class="w-4 h-4 text-blue-400"></i> Dados da cliente
        </button>
        <button type="button" onclick="closeContextMenu(); openClientProfileModal(${client.id}, 'historico')" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="history" class="w-4 h-4 text-emerald-400"></i> Ver histórico
        </button>
      </div>
      <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
        <button type="button" onclick="closeContextMenu(); handleDeleteClient(${client.id})" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir definitivamente
        </button>
      </div>
    `;
  } else if (type === 'category') {
    const cat = categoriesList.find(c => c.id === id);
    if (!cat) return;
    menuItemsHtml = `
      <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
        ${cat.name}
      </div>
      <div class="py-1.5 space-y-0.5">
        <button type="button" onclick="closeContextMenu(); openCategoryModal(${cat.id})" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="edit-3" class="w-4 h-4 text-brand-violet"></i> Editar categoria
        </button>
      </div>
      <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
        <button type="button" onclick="closeContextMenu(); handleDeleteCategory(${cat.id})" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir categoria
        </button>
      </div>
    `;
  } else if (type === 'service') {
    const srv = servicesList.find(s => s.id === id);
    if (!srv) return;
    menuItemsHtml = `
      <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
        ${srv.name}
      </div>
      <div class="py-1.5 space-y-0.5">
        <button type="button" onclick="closeContextMenu(); openServiceModal(${srv.id})" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="edit-3" class="w-4 h-4 text-brand-violet"></i> Editar serviço
        </button>
      </div>
      <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
        <button type="button" onclick="closeContextMenu(); handleDeleteService(${srv.id})" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir serviço
        </button>
      </div>
    `;
  } else if (type === 'professional') {
    const pro = professionalsList.find(p => p.id === id);
    if (!pro) return;
    menuItemsHtml = `
      <div class="px-4 py-2.5 text-xs text-brand-gold font-bold uppercase truncate border-b border-brand-lightBorder dark:border-brand-darkBorder">
        ${pro.name}
      </div>
      <div class="py-1.5 space-y-0.5">
        <button type="button" onclick="closeContextMenu(); openProfessionalModal(${pro.id})" class="w-full text-left px-4 py-2 hover:bg-brand-violet/20 flex items-center gap-2.5 text-xs font-semibold">
          <i data-lucide="edit-3" class="w-4 h-4 text-brand-violet"></i> Editar Profissional
        </button>
      </div>
      <div class="py-1.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
        <button type="button" onclick="closeContextMenu(); handleDeleteProfessional(${pro.id})" class="w-full text-left px-4 py-2 hover:bg-rose-500/15 text-rose-500 flex items-center gap-2.5 text-xs font-bold">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Excluir profissional
        </button>
      </div>
    `;
  }

  content.innerHTML = menuItemsHtml;
  lucide.createIcons({ root: content });

  const menuWidth = 260;
  const menuHeight = 220;
  let posX = event.clientX;
  let posY = event.clientY;

  if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 20;
  if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 20;

  menu.style.left = `${Math.max(10, posX)}px`;
  menu.style.top = `${Math.max(10, posY)}px`;
  menu.classList.remove('hidden');
}

function closeContextMenu() {
  document.getElementById('custom-context-menu')?.classList.add('hidden');
}

function handleCancelAppointmentViaContext(appId) {
  const app = appointmentsList.find(a => a.id === appId);
  if (!app) return;
  app.status = 'Cancelado';
  saveAllToLocalStorage();
  showToast(`Agendamento de ${app.clientName} marcado como CANCELADO.`, 'warning');
  renderAgendaView();
  renderPhysicalReceptionSheet();
}

/* ========================================================
 * VISÃO DA AGENDA
 * ======================================================== */
function renderAgendaView() {
  const container = document.getElementById('agenda-list-container');
  const countBadge = document.getElementById('agenda-count-badge');
  const dateTitle = document.getElementById('agenda-date-title');
  const dateBadge = document.getElementById('selected-date-badge');

  if (!container) return;

  const [y, m, d] = currentSelectedDate.split('-');
  const isSearchingHistory = Boolean(agendaSearchQuery && agendaSearchQuery.trim().length > 0);

  if (isSearchingHistory) {
    if (dateTitle) dateTitle.innerHTML = `<i data-lucide="search" class="w-4 h-4 text-brand-gold"></i> Histórico encontrado para "${agendaSearchQuery}"`;
    if (dateBadge) dateBadge.innerText = `Pesquisa Ativa`;
  } else if (agendaFilterInactiveOnly) {
    if (dateTitle) dateTitle.innerHTML = `<i data-lucide="user-x" class="w-4 h-4 text-rose-500"></i> Clientes Inativas (&gt; 3 meses) em Todo o Banco`;
    if (dateBadge) dateBadge.innerText = `Inativas Globais`;
  } else if (agendaFilterByDateRange && agendaStartDate && agendaEndDate) {
    const [sy, sm, sd] = agendaStartDate.split('-');
    const [ey, em, ed] = agendaEndDate.split('-');
    if (dateTitle) dateTitle.innerHTML = `<i data-lucide="calendar-range" class="w-4 h-4 text-brand-gold"></i> Período: ${sd}/${sm}/${sy} até ${ed}/${em}/${ey}`;
    if (dateBadge) dateBadge.innerText = `${sd}/${sm} - ${ed}/${em}`;
  } else {
    if (dateTitle) dateTitle.innerHTML = `<i data-lucide="calendar-days" class="w-4 h-4"></i> Agendamentos de ${d}/${m}/${y}`;
    if (dateBadge) dateBadge.innerText = `${d}/${m}/${y}`;
  }

  const scanEntireDatabase = isSearchingHistory || agendaFilterInactiveOnly || agendaFilterByDateRange;
  let listToFilter = scanEntireDatabase ? appointmentsList : appointmentsList.filter(a => a.date === currentSelectedDate);

  let filtered = listToFilter.filter(app => {
    if (agendaFilterByDateRange && agendaStartDate && agendaEndDate) {
      if (app.date < agendaStartDate || app.date > agendaEndDate) return false;
    }

    if (agendaFilterInactiveOnly) {
      if (!isClientInactive(app.clientId)) return false;
    }

    if (isSearchingHistory) {
      const queryRaw = agendaSearchQuery.trim();
      const queryDigits = queryRaw.replace(/\D/g, '');
      const clientObj = clientsList.find(c => c.id === app.clientId);

      const nameMatch = fuzzyMatchWord(app.clientName, queryRaw);
      const phoneMatch = queryDigits.length > 2 && (app.phone || '').replace(/\D/g, '').includes(queryDigits);
      const cpfMatch = queryDigits.length > 2 && clientObj && (clientObj.cpf || '').replace(/\D/g, '').includes(queryDigits);
      const emailMatch = clientObj && (clientObj.email || '').toLowerCase().includes(queryRaw.toLowerCase());
      const birthMatch = queryRaw.length >= 4 && clientObj && (clientObj.birth || '').includes(queryRaw);

      if (!nameMatch && !phoneMatch && !cpfMatch && !emailMatch && !birthMatch) return false;
    }

    if (agendaSelectedStatuses.length > 0) {
      if (!agendaSelectedStatuses.includes(app.status)) return false;
    }

    if (agendaSelectedGender !== 'TODOS') {
      if (app.gender !== agendaSelectedGender) return false;
    }

    return true;
  });

  if (countBadge) countBadge.innerText = `${filtered.length} resultado(s)`;

  if (filtered.length === 0) {
    let emptyMsg = isSearchingHistory 
      ? `Nenhum agendamento encontrado para "${agendaSearchQuery}"` 
      : 'Nenhum agendamento encontrado para os filtros selecionados.';

    container.innerHTML = `
      <div class="p-8 text-center bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder rounded-3xl">
        <i data-lucide="calendar-x" class="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50"></i>
        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">${emptyMsg}</h4>
        <p class="text-xs text-slate-400 mt-1">Verifique os filtros ou clique em "Novo Agendamento".</p>
      </div>
    `;
    lucide.createIcons({ root: container });
    return;
  }

  const statusBubbleStyles = {
    'Agendado': 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
    'Confirmada': 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    'Finalizado': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    'Reagendar': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    'Cancelado': 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
  };

  container.innerHTML = filtered.map(app => {
    const isMale = app.gender === 'Masculino';
    const bubbleStyle = statusBubbleStyles[app.status] || statusBubbleStyles['Agendado'];
    const isInactive = isClientInactive(app.clientId);
    const [appY, appM, appD] = (app.date || '').split('-');
    const showFullDate = isSearchingHistory || agendaFilterInactiveOnly || agendaFilterByDateRange;

    return `
      <div 
        oncontextmenu="showCustomContextMenu(event, 'agenda', ${app.id})" 
        onclick="openClientProfileModal(${app.clientId}, 'dados')"
        class="p-4 rounded-3xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:border-brand-violet/60 transition-all group"
      >
        <div class="flex items-start sm:items-center gap-3">
          <div class="px-3 py-2 rounded-2xl bg-brand-lightCard dark:bg-brand-darkBg text-center border border-brand-lightBorder dark:border-brand-darkBorder shrink-0">
            <span class="text-xs font-black font-mono text-brand-gold block">${app.time}</span>
            <span class="text-[9px] text-slate-400 font-bold">${showFullDate ? `${appD}/${appM}/${appY}` : '15m'}</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-violet transition-colors">${app.clientName}</h4>
              ${app.isFirstTime ? '<span class="text-[9px] px-2 py-0.5 rounded-full font-black bg-amber-500 text-slate-950 shadow-xs">⭐ 1° vez</span>' : ''}
              <span class="text-[9px] px-2 py-0.5 rounded-full font-bold ${isMale ? 'bg-sky-500/15 text-sky-500' : 'bg-pink-500/15 text-pink-500'}">${app.gender}</span>
              ${app.status === 'Confirmada' ? '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-500 border border-teal-500/30">No Mural</span>' : ''}
              ${isInactive ? '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">Inativa</span>' : ''}
            </div>
            <div class="text-xs text-brand-violet dark:text-brand-violetLight font-medium mt-0.5">
              ${app.serviceName}
            </div>
            <div class="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
              <span>👩‍⚕️ Depiladora: <strong class="text-slate-700 dark:text-slate-300 font-bold">${app.professional}</strong></span>
              <span>•</span>
              <span class="text-emerald-500 font-bold">R$ ${Number(app.price).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end md:self-center" onclick="event.stopPropagation()">
          <select onchange="handleUpdateAppointmentStatus(${app.id}, this.value)" class="px-3 py-1.5 rounded-2xl border text-xs font-bold ${bubbleStyle} bg-brand-lightSurface dark:bg-brand-darkSurface outline-none cursor-pointer">
            <option value="Agendado" ${app.status === 'Agendado' ? 'selected' : ''}>● Agendado</option>
            <option value="Confirmada" ${app.status === 'Confirmada' ? 'selected' : ''}>● Confirmada</option>
            <option value="Finalizado" ${app.status === 'Finalizado' ? 'selected' : ''}>● Finalizado</option>
            <option value="Reagendar" ${app.status === 'Reagendar' ? 'selected' : ''}>● Reagendar</option>
            <option value="Cancelado" ${app.status === 'Cancelado' ? 'selected' : ''}>● Cancelado</option>
          </select>

          <button onclick="openEditAppointmentModal(${app.id})" class="p-2 text-slate-400 hover:text-brand-gold rounded-xl hover:bg-brand-lightCard dark:hover:bg-brand-darkCard" title="Editar">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="handleDeleteAppointment(${app.id})" class="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/10" title="Excluir">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons({ root: container });
}

/* ========================================================
 * MURAL DA RECEPÇÃO (FOLHA FÍSICA)
 * ======================================================== */
function renderPhysicalReceptionSheet() {
  const thead = document.getElementById('physical-sheet-thead');
  const tbody = document.getElementById('physical-sheet-body');
  const headerDate = document.getElementById('sheet-header-print-date');
  const receptionDateText = document.getElementById('reception-sheet-current-date-text');

  if (!tbody) return;

  const [y, m, d] = currentSelectedDate.split('-');
  const formattedDate = `${d}/${m}/${y}`;

  if (headerDate) headerDate.innerText = `DATA: ${formattedDate}`;
  if (receptionDateText) receptionDateText.innerText = formattedDate;

  const slots = generate15MinSlots();
  const daysApps = appointmentsList.filter(a => a.date === currentSelectedDate && a.status !== 'Cancelado');

  let maxColsPairs = 2;
  slots.forEach(time => {
    const count = daysApps.filter(a => a.time === time).length;
    if (count > maxColsPairs) maxColsPairs = count;
  });

  if (thead) {
    let thHtml = `<tr class="bg-slate-200 dark:bg-brand-darkBg text-slate-900 dark:text-white uppercase font-black text-[11px]">`;
    thHtml += `<th style="width: 75px;" class="text-center">HR</th>`;
    for (let i = 1; i <= maxColsPairs; i++) {
      thHtml += `<th style="min-width: 170px;" class="text-left px-3">NOME ${i > 1 ? i : ''}</th>`;
      thHtml += `<th style="min-width: 220px;" class="text-left px-3">ÁREA / SERVIÇO ${i > 1 ? i : ''}</th>`;
    }
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;
  }

  tbody.innerHTML = slots.map(time => {
    const appsAtTime = daysApps.filter(a => a.time === time);
    let rowCells = `<td class="text-center font-bold font-mono bg-slate-50 dark:bg-brand-darkBg text-slate-800 dark:text-slate-200">${time}</td>`;

    for (let i = 0; i < maxColsPairs; i++) {
      const app = appsAtTime[i] || null;
      const isArrived = app && app.arrivedAtReception;
      const cellClass = isArrived ? 'sheet-arrived' : 'sheet-not-arrived';

      const nameContent = app ? `
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-bold">${app.clientName}</span>
          ${app.isFirstTime ? '<span class="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black shadow-xs">1° vez</span>' : ''}
        </div>
      ` : '';

      const serviceContent = app ? renderMuralServiceBadges(app) : '';

      rowCells += `
        <td 
          class="${cellClass} cursor-pointer transition-colors px-3 py-2" 
          onclick="${app ? `toggleReceptionArrival(${app.id})` : ''}"
          oncontextmenu="${app ? `showCustomContextMenu(event, 'reception', ${app.id})` : ''}"
          title="${app ? 'Clique para marcar presença' : ''}"
        >
          ${nameContent}
        </td>
        <td class="${cellClass} px-3 py-2">
          ${serviceContent}
        </td>
      `;
    }

    return `<tr>${rowCells}</tr>`;
  }).join('');
}

function toggleReceptionArrival(id) {
  const app = appointmentsList.find(a => a.id === id);
  if (!app) return;
  app.arrivedAtReception = !app.arrivedAtReception;
  saveAllToLocalStorage();
  renderPhysicalReceptionSheet();
  showToast(`${app.clientName} marcada como ${app.arrivedAtReception ? 'CHEGOU (Verde)' : 'NÃO CHEGOU'}`, 'info');
}

/* ========================================================
 * SALVAR AGENDAMENTOS E ATUALIZAÇÕES
 * ======================================================== */
function handleSaveAppointment(e) {
  e.preventDefault();
  const clientId = document.getElementById('app-client-id').value;
  const client = clientsList.find(c => c.id == clientId);
  if (!client) {
    showToast('Selecione uma cliente válida!', 'error');
    return;
  }

  if (selectedServiceIdsInModal.length === 0) {
    showToast('Selecione pelo menos um procedimento!', 'error');
    return;
  }

  if (!selectedTimeInModal) {
    showToast('Selecione um horário na grade!', 'error');
    return;
  }

  const date = inModalSelectedDate || document.getElementById('app-date').value;
  const editId = parseInt(document.getElementById('app-edit-id').value);

  const selectedServices = servicesList.filter(s => selectedServiceIdsInModal.includes(s.id));
  const sortedServices = getSortedServicesForAppointment(selectedServices);

  const totalPrice = sortedServices.reduce((sum, s) => sum + s.price, 0);
  const fullServiceNames = sortedServices.map(s => s.name).join(' + ');
  const shortServiceNames = sortedServices.map(s => s.shortCode || s.name).join(', ');
  const status = document.getElementById('app-status-select').value;
  const isFirstTime = document.getElementById('app-first-time-toggle')?.checked || false;

  if (editId) {
    const app = appointmentsList.find(a => a.id === editId);
    if (app) {
      app.clientId = client.id;
      app.clientName = client.name;
      app.gender = client.gender;
      app.phone = client.phone;
      app.services = sortedServices;
      app.serviceName = fullServiceNames;
      app.serviceShort = shortServiceNames;
      app.professional = selectedProfessionalInModal;
      app.date = date;
      app.time = selectedTimeInModal;
      app.price = totalPrice;
      app.status = status;
      app.isFirstTime = isFirstTime;
      showToast(`Agendamento de ${client.name} atualizado!`, 'success');
    }
  } else {
    const newApp = {
      id: Date.now(),
      clientId: client.id,
      clientName: client.name,
      gender: client.gender,
      phone: client.phone,
      services: sortedServices,
      serviceName: fullServiceNames,
      serviceShort: shortServiceNames,
      professional: selectedProfessionalInModal,
      date: date,
      time: selectedTimeInModal,
      price: totalPrice,
      status: status,
      isFirstTime: isFirstTime,
      arrivedAtReception: false,
      receptionStatus: 'Agendada'
    };
    appointmentsList.push(newApp);
    showToast(`Agendamento de ${client.name} realizado com sucesso!`, 'success');
  }

  saveAllToLocalStorage();
  currentSelectedDate = date;
  closeModal('modal-appointment');
  initCalendar();
  renderAllViews();
}

function handleUpdateAppointmentStatus(appId, newStatus) {
  const app = appointmentsList.find(a => a.id === appId);
  if (!app) return;

  app.status = newStatus;
  saveAllToLocalStorage();
  showToast(`Status atualizado para: ${newStatus}`, 'success');
  renderAgendaView();
  renderPhysicalReceptionSheet();
}

function handleDeleteAppointment(id) {
  const app = appointmentsList.find(a => a.id === id);
  if (!app) return;
  app.status = 'Cancelado';
  saveAllToLocalStorage();
  showToast(`Agendamento de ${app.clientName} cancelado!`, 'warning');
  renderAllViews();
}

/* ========================================================
 * CALENDÁRIOS E NAVEGAÇÃO
 * ======================================================== */
function initCalendar() {
  const monthTitle = document.getElementById('calendar-month-year');
  const grid = document.getElementById('calendar-days-grid');
  if (!monthTitle || !grid) return;

  monthTitle.innerText = `${MONTH_NAMES[calendarViewMonth]} ${calendarViewYear}`;
  grid.innerHTML = '';

  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'py-1.5';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = day;

    const isSelected = dateStr === currentSelectedDate;
    const hasApps = appointmentsList.some(a => a.date === dateStr && a.status !== 'Cancelado');

    let btnClass = 'w-full py-1.5 rounded-xl font-bold transition-all relative flex items-center justify-center text-xs ';
    if (isSelected) {
      btnClass += 'bg-gradient-to-r from-brand-purpleDeep to-brand-violet text-white shadow-md border border-brand-gold/60 scale-105';
    } else if (hasApps) {
      btnClass += 'text-brand-gold font-black bg-brand-gold/10 hover:bg-brand-gold/20';
    } else {
      btnClass += 'text-slate-700 dark:text-slate-300 hover:bg-brand-violet/20';
    }

    btn.className = btnClass;
    btn.onclick = () => {
      currentSelectedDate = dateStr;
      renderAllViews();
      initCalendar();
    };
    grid.appendChild(btn);
  }

  renderSlotOccupancyList();
}

function navigateMonth(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth < 0) {
    calendarViewMonth = 11;
    calendarViewYear--;
  } else if (calendarViewMonth > 11) {
    calendarViewMonth = 0;
    calendarViewYear++;
  }
  initCalendar();
}

function renderSlotOccupancyList() {
  const container = document.getElementById('slot-occupancy-list');
  if (!container) return;

  const slots = generate15MinSlots();
  const daysApps = appointmentsList.filter(a => a.date === currentSelectedDate && a.status !== 'Cancelado');

  const occupiedSlots = slots.map(time => {
    const count = daysApps.filter(a => a.time === time).length;
    return { time, count };
  }).filter(s => s.count > 0);

  if (occupiedSlots.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-400">Nenhum atendimento marcado para este dia.</span>`;
    return;
  }

  container.innerHTML = occupiedSlots.map(s => `
    <div class="flex items-center justify-between p-2 rounded-xl bg-brand-lightCard dark:bg-brand-darkBg text-xs">
      <span class="font-mono font-bold text-slate-800 dark:text-slate-200">⏰ ${s.time}</span>
      <span class="px-2 py-0.5 rounded-full font-bold ${s.count >= companyConfig.maxClientsPerSlot ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}">
        ${s.count}/${companyConfig.maxClientsPerSlot} atend.
      </span>
    </div>
  `).join('');
}

function navInModalCal(delta) {
  inModalCalMonth += delta;
  if (inModalCalMonth < 0) {
    inModalCalMonth = 11;
    inModalCalYear--;
  } else if (inModalCalMonth > 11) {
    inModalCalMonth = 0;
    inModalCalYear++;
  }
  renderInModalCalendar();
}

function renderInModalCalendar() {
  const title = document.getElementById('inmodal-cal-title');
  const grid = document.getElementById('inmodal-cal-grid');
  if (!title || !grid) return;

  title.innerText = `${MONTH_NAMES[inModalCalMonth]} ${inModalCalYear}`;
  grid.innerHTML = '';

  const firstDayIndex = new Date(inModalCalYear, inModalCalMonth, 1).getDay();
  const totalDays = new Date(inModalCalYear, inModalCalMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement('div');
    blank.className = 'py-1.5';
    grid.appendChild(blank);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = `${inModalCalYear}-${String(inModalCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = day;

    const isSelected = dayStr === inModalSelectedDate;
    const isPast = dayStr < todayStr;
    const hasApps = appointmentsList.some(a => a.date === dayStr && a.status !== 'Cancelado');

    let btnClass = 'w-full py-1.5 rounded-xl font-bold transition-all relative flex flex-col items-center justify-center ';
    if (isSelected) {
      btnClass += 'bg-gradient-to-r from-brand-purpleDeep to-brand-violet text-white shadow-md shadow-purple-900/30 scale-105 border border-brand-gold/60';
    } else if (isPast) {
      btnClass += 'text-slate-400/50 hover:bg-transparent cursor-not-allowed';
    } else {
      btnClass += 'text-slate-700 dark:text-slate-200 hover:bg-brand-violet/20';
    }

    if (hasApps && !isSelected) {
      btnClass += ' border-b-2 border-brand-gold';
    }

    btn.className = btnClass;
    if (!isPast) {
      btn.onclick = () => selectInModalDate(dayStr);
    }
    grid.appendChild(btn);
  }
}

function selectInModalDate(dateStr) {
  inModalSelectedDate = dateStr;
  const dateInput = document.getElementById('app-date');
  if (dateInput) dateInput.value = dateStr;
  renderInModalCalendar();
  renderBookingTimeSlotsGrid();
}

function openReceptionCalendarModal() {
  const modal = document.getElementById('modal-reception-calendar');
  if (!modal) return;
  const [y, m] = currentSelectedDate.split('-').map(Number);
  receptionPopoverYear = y;
  receptionPopoverMonth = m - 1;
  renderReceptionModalCalendar();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function navReceptionModalMonth(delta) {
  receptionPopoverMonth += delta;
  if (receptionPopoverMonth < 0) {
    receptionPopoverMonth = 11;
    receptionPopoverYear--;
  } else if (receptionPopoverMonth > 11) {
    receptionPopoverMonth = 0;
    receptionPopoverYear++;
  }
  renderReceptionModalCalendar();
}

function renderReceptionModalCalendar() {
  const title = document.getElementById('reception-modal-month-title');
  const grid = document.getElementById('reception-modal-days-grid');
  if (!title || !grid) return;

  title.innerText = `${MONTH_NAMES[receptionPopoverMonth]} ${receptionPopoverYear}`;
  grid.innerHTML = '';

  const firstDay = new Date(receptionPopoverYear, receptionPopoverMonth, 1).getDay();
  const totalDays = new Date(receptionPopoverYear, receptionPopoverMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'py-2';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${receptionPopoverYear}-${String(receptionPopoverMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = day;

    const isSelected = dateStr === currentSelectedDate;
    const hasApps = appointmentsList.some(a => a.date === dateStr && (a.status === 'Confirmada' || a.status === 'Finalizado'));

    let btnClass = 'w-full py-2 rounded-xl font-bold transition-all relative flex items-center justify-center text-xs ';
    if (isSelected) {
      btnClass += 'bg-gradient-to-r from-brand-purpleDeep to-brand-violet text-white shadow-md border border-brand-gold/80 scale-105';
    } else if (hasApps) {
      btnClass += 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30 hover:bg-brand-gold hover:text-slate-950';
    } else {
      btnClass += 'text-slate-700 dark:text-slate-200 hover:bg-brand-violet/20';
    }

    btn.className = btnClass;
    btn.onclick = () => selectReceptionDateFromModal(dateStr);
    grid.appendChild(btn);
  }
}

function selectReceptionDateFromModal(dateStr) {
  currentSelectedDate = dateStr;
  closeModal('modal-reception-calendar');
  renderAllViews();
  showToast(`Planilha carregada para ${dateStr.split('-').reverse().join('/')}`, 'info');
}

function selectQuickReceptionDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  selectReceptionDateFromModal(d.toISOString().split('T')[0]);
}

function shiftReceptionDate(delta) {
  const [y, m, d] = currentSelectedDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  currentSelectedDate = date.toISOString().split('T')[0];
  renderAllViews();
}

function setReceptionToToday() {
  currentSelectedDate = new Date().toISOString().split('T')[0];
  renderAllViews();
}

/* ========================================================
 * SELEÇÃO DE CLIENTE E AUTOCOMPLETE
 * ======================================================== */
function handleClientSearchInput(val) {
  const dropdown = document.getElementById('client-autocomplete-dropdown');
  const clearBtn = document.getElementById('client-clear-search-btn');
  if (!dropdown) return;

  const query = (val || '').trim();
  if (query.length > 0) {
    clearBtn?.classList.remove('hidden');
  } else {
    clearBtn?.classList.add('hidden');
  }

  if (query.length === 0) {
    renderClientDropdown(clientsList);
    dropdown.classList.remove('hidden');
    return;
  }

  const queryDigits = query.replace(/\D/g, '');
  const matches = clientsList.filter(c => {
    const nameMatch = fuzzyMatchWord(c.name, query);
    const phoneMatch = queryDigits && (c.phone || '').replace(/\D/g, '').includes(queryDigits);
    const cpfMatch = queryDigits && (c.cpf || '').replace(/\D/g, '').includes(queryDigits);
    const emailMatch = (c.email || '').toLowerCase().includes(query.toLowerCase());
    return nameMatch || phoneMatch || cpfMatch || emailMatch;
  });

  renderClientDropdown(matches);
  dropdown.classList.remove('hidden');
}

function handleClientSearchFocus() {
  const input = document.getElementById('client-search-input');
  if (input) handleClientSearchInput(input.value);
}

function renderClientDropdown(list) {
  const dropdown = document.getElementById('client-autocomplete-dropdown');
  if (!dropdown) return;

  if (list.length === 0) {
    dropdown.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        Nenhum cliente encontrado.
        <button type="button" onclick="openClientModal()" class="block mx-auto mt-1.5 text-brand-gold font-bold hover:underline">+ Cadastrar novo</button>
      </div>
    `;
    return;
  }

  dropdown.innerHTML = list.map(c => `
    <div onclick="selectClientFromAutocomplete(${c.id})" class="p-2.5 hover:bg-brand-violet/15 cursor-pointer transition-colors flex items-center justify-between text-xs">
      <div>
        <div class="font-bold text-slate-900 dark:text-white">${c.name}</div>
        <div class="text-[10px] text-slate-400 font-mono">CPF: ${c.cpf} • ${c.phone}</div>
      </div>
      <span class="text-[9px] px-2 py-0.5 rounded-full font-bold ${c.gender === 'Masculino' ? 'bg-sky-500/15 text-sky-500' : 'bg-pink-500/15 text-pink-500'}">${c.gender}</span>
    </div>
  `).join('');
}

function selectClientFromAutocomplete(id) {
  const client = clientsList.find(c => c.id === id);
  if (!client) return;

  document.getElementById('app-client-id').value = client.id;
  document.getElementById('client-search-input').value = client.name;
  document.getElementById('chip-client-name').innerText = client.name;
  
  const chipGender = document.getElementById('chip-client-gender');
  if (chipGender) {
    chipGender.innerText = client.gender;
    chipGender.className = `text-[9px] px-2 py-0.5 rounded-full font-bold ${client.gender === 'Masculino' ? 'bg-sky-500/15 text-sky-500' : 'bg-pink-500/15 text-pink-500'}`;
  }

  const chipDetails = document.getElementById('chip-client-details');
  if (chipDetails) chipDetails.innerText = `CPF: ${client.cpf} • ${client.phone}`;

  document.getElementById('selected-client-chip')?.classList.remove('hidden');
  document.getElementById('client-autocomplete-dropdown')?.classList.add('hidden');
}

function clearClientSelection() {
  const idInput = document.getElementById('app-client-id');
  const searchInput = document.getElementById('client-search-input');
  if (idInput) idInput.value = '';
  if (searchInput) searchInput.value = '';
  document.getElementById('selected-client-chip')?.classList.add('hidden');
  document.getElementById('client-autocomplete-dropdown')?.classList.add('hidden');
  document.getElementById('client-clear-search-btn')?.classList.add('hidden');
}

/* ========================================================
 * MODAL DE AGENDAMENTO
 * ======================================================== */
function openNewAppointmentModal() {
  document.getElementById('app-edit-id').value = '';
  document.getElementById('modal-appointment-title').innerText = 'Novo Agendamento';
  clearClientSelection();

  inModalSelectedDate = currentSelectedDate;
  selectedServiceIdsInModal = [];
  selectedProfessionalInModal = 'Sem preferência';
  selectedTimeInModal = '';

  const firstTimeToggle = document.getElementById('app-first-time-toggle');
  if (firstTimeToggle) firstTimeToggle.checked = false;

  document.getElementById('app-status-select').value = 'Agendado';

  selectInModalDate(currentSelectedDate);
  renderBookingServicesByCategory();
  renderBookingProfessionalsCards();
  renderBookingTimeSlotsGrid();
  updateBookingTotals();

  document.getElementById('modal-appointment').classList.remove('hidden');
  lucide.createIcons();
}

function openEditAppointmentModal(id) {
  const app = appointmentsList.find(a => a.id === id);
  if (!app) return;

  document.getElementById('app-edit-id').value = app.id;
  document.getElementById('modal-appointment-title').innerText = 'Editar Agendamento';

  selectClientFromAutocomplete(app.clientId);

  inModalSelectedDate = app.date;
  selectedServiceIdsInModal = (app.services || []).map(s => s.id);
  selectedProfessionalInModal = app.professional || 'Sem preferência';
  selectedTimeInModal = app.time;

  const firstTimeToggle = document.getElementById('app-first-time-toggle');
  if (firstTimeToggle) firstTimeToggle.checked = Boolean(app.isFirstTime);

  document.getElementById('app-status-select').value = app.status;

  selectInModalDate(app.date);
  renderBookingServicesByCategory();
  renderBookingProfessionalsCards();
  renderBookingTimeSlotsGrid();
  updateBookingTotals();

  document.getElementById('modal-appointment').classList.remove('hidden');
  lucide.createIcons();
}

function renderBookingServicesByCategory() {
  const container = document.getElementById('booking-services-by-category');
  if (!container) return;

  container.innerHTML = categoriesList.map(cat => {
    const catServices = servicesList.filter(s => s.categoryId === cat.id);
    if (catServices.length === 0) return '';

    return `
      <div class="p-3 rounded-2xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder space-y-2">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full" style="background-color: ${cat.color || '#a78bfa'}"></span>
          <h5 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">${cat.name}</h5>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${catServices.map(srv => {
            const isChecked = selectedServiceIdsInModal.includes(srv.id);
            return `
              <div 
                onclick="toggleServiceSelection(${srv.id})" 
                class="p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${isChecked ? 'border-brand-violet bg-brand-violet/15' : 'border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-violet/50'}"
              >
                <div>
                  <div class="font-bold text-slate-900 dark:text-white">${srv.name}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${srv.duration} min • Planilha: <strong class="text-brand-gold">${srv.shortCode || srv.name}</strong></div>
                </div>
                <div class="font-black text-brand-gold">R$ ${Number(srv.price).toFixed(2)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleServiceSelection(srvId) {
  const idx = selectedServiceIdsInModal.indexOf(srvId);
  if (idx > -1) {
    selectedServiceIdsInModal.splice(idx, 1);
  } else {
    selectedServiceIdsInModal.push(srvId);
  }
  renderBookingServicesByCategory();
  updateBookingTotals();
}

function updateBookingTotals() {
  const selected = servicesList.filter(s => selectedServiceIdsInModal.includes(s.id));
  const totalPrice = selected.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selected.reduce((sum, s) => sum + Number(s.duration), 0);

  const summary = document.getElementById('booking-services-summary');
  if (summary) summary.innerText = `${selected.length} selecionado(s) • Total: R$ ${totalPrice.toFixed(2)}`;

  const priceText = document.getElementById('booking-final-price-text');
  if (priceText) priceText.innerText = `R$ ${totalPrice.toFixed(2)}`;

  const durText = document.getElementById('booking-final-duration-text');
  if (durText) durText.innerText = `(${totalDuration} min)`;
}

function renderBookingProfessionalsCards() {
  const container = document.getElementById('booking-professionals-cards');
  if (!container) return;

  const pros = [{ id: 0, name: 'Sem preferência', photo: null }, ...professionalsList];

  container.innerHTML = pros.map(p => {
    const isSelected = selectedProfessionalInModal === p.name;
    return `
      <div 
        onclick="selectProfessionalInModal('${p.name}')" 
        class="p-2.5 rounded-2xl border text-center cursor-pointer transition-all ${isSelected ? 'border-brand-gold bg-brand-gold/15 scale-105 shadow-md' : 'border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-gold/40'}"
      >
        <div class="w-10 h-10 mx-auto rounded-full bg-brand-purpleDeep text-brand-gold flex items-center justify-center font-bold text-xs mb-1 border border-brand-gold/30 overflow-hidden shadow">
          ${p.photo ? `<img src="${p.photo}" class="w-full h-full object-cover">` : p.name.charAt(0)}
        </div>
        <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${p.name}</div>
      </div>
    `;
  }).join('');
}

function selectProfessionalInModal(name) {
  selectedProfessionalInModal = name;
  document.getElementById('app-selected-professional').value = name;
  renderBookingProfessionalsCards();
}

function renderBookingTimeSlotsGrid() {
  const container = document.getElementById('booking-time-slots-grid');
  if (!container) return;

  const slots = generate15MinSlots();
  const dateStr = inModalSelectedDate || currentSelectedDate;
  const daysApps = appointmentsList.filter(a => a.date === dateStr && a.status !== 'Cancelado');

  container.innerHTML = slots.map(time => {
    const count = daysApps.filter(a => a.time === time).length;
    const isSelected = selectedTimeInModal === time;
    const isOver = count >= companyConfig.maxClientsPerSlot;

    let cls = 'p-2 rounded-xl text-center cursor-pointer transition-all border text-xs ';
    if (isSelected) {
      cls += 'bg-gradient-to-r from-brand-purpleDeep to-brand-violet text-white font-black border-brand-gold shadow-md';
    } else if (isOver) {
      cls += 'border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20';
    } else {
      cls += 'border-brand-lightBorder dark:border-brand-darkBorder text-slate-700 dark:text-slate-300 hover:border-brand-violet/50';
    }

    return `
      <div onclick="selectTimeSlotInModal('${time}', ${count})" class="${cls}">
        <div class="font-mono font-bold">${time}</div>
        <div class="text-[9px] ${isOver ? 'text-amber-500 font-extrabold' : 'text-slate-400'}">${count}/${companyConfig.maxClientsPerSlot}</div>
      </div>
    `;
  }).join('');
}

function selectTimeSlotInModal(time, count) {
  selectedTimeInModal = time;
  document.getElementById('app-selected-time').value = time;
  renderBookingTimeSlotsGrid();
}

/* ========================================================
 * CLIENTES & CPF
 * ======================================================== */
function validateCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.substring(10, 11));
}

function validateCPFInputUI(input) {
  const fb = document.getElementById('cpf-validation-feedback');
  if (!fb) return;
  if (!input || !input.value) {
    fb.innerText = '';
    return;
  }
  const valid = validateCPF(input.value);
  if (valid) {
    fb.innerText = '✓ CPF válido';
    fb.className = 'text-[10px] mt-0.5 block font-semibold text-emerald-500';
  } else {
    fb.innerText = '⚠ CPF inválido';
    fb.className = 'text-[10px] mt-0.5 block font-semibold text-rose-500';
  }
}

function openClientModal(id = null) {
  document.getElementById('cli-edit-id').value = id || '';
  document.getElementById('modal-client-title').innerText = id ? 'Editar Cliente' : 'Novo Cliente';

  const feedback = document.getElementById('cpf-validation-feedback');
  if (feedback) feedback.innerText = '';

  if (id) {
    const client = clientsList.find(c => c.id === id);
    if (client) {
      document.getElementById('cli-name').value = client.name;
      document.getElementById('cli-phone').value = client.phone;
      document.getElementById('cli-cpf').value = client.cpf;
      document.getElementById('cli-email').value = client.email || '';
      document.getElementById('cli-birth').value = client.birth || '';
      document.getElementById('cli-gender').value = client.gender || 'Feminino';
    }
  } else {
    document.getElementById('form-client')?.reset();
  }

  document.getElementById('modal-client')?.classList.remove('hidden');
  lucide.createIcons();
}

function handleSaveClient(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('cli-edit-id').value);
  const name = document.getElementById('cli-name').value.trim();
  const phone = document.getElementById('cli-phone').value.trim();
  const cpf = document.getElementById('cli-cpf').value.trim();
  const email = document.getElementById('cli-email').value.trim();
  const birth = document.getElementById('cli-birth').value;
  const gender = document.getElementById('cli-gender').value;

  if (id) {
    const client = clientsList.find(c => c.id === id);
    if (client) {
      client.name = name;
      client.phone = phone;
      client.cpf = cpf;
      client.email = email;
      client.birth = birth;
      client.gender = gender;
      showToast(`Cliente ${name} atualizado!`, 'success');
    }
  } else {
    clientsList.push({ id: Date.now(), name, phone, cpf, email, birth, gender });
    showToast(`Cliente ${name} cadastrado!`, 'success');
  }

  saveAllToLocalStorage();
  closeModal('modal-client');
  renderAllViews();
}

function handleDeleteClient(id) {
  const idx = clientsList.findIndex(c => c.id === id);
  if (idx > -1) {
    const name = clientsList[idx].name;
    clientsList.splice(idx, 1);
    saveAllToLocalStorage();
    showToast(`Cliente ${name} excluído!`, 'warning');
    renderAllViews();
  }
}

function openClientProfileModal(clientId, initialTab = 'dados') {
  const client = clientsList.find(c => c.id === clientId);
  if (!client) return;

  currentViewingClientId = clientId;

  const avatar = document.getElementById('profile-avatar-circle');
  if (avatar) avatar.innerText = client.name.charAt(0);

  document.getElementById('profile-client-name').innerText = client.name;
  
  const genderBadge = document.getElementById('profile-client-gender-badge');
  if (genderBadge) {
    genderBadge.innerText = client.gender;
    genderBadge.className = `text-[10px] px-2.5 py-0.5 rounded-full font-bold ${client.gender === 'Masculino' ? 'bg-sky-500/15 text-sky-500' : 'bg-pink-500/15 text-pink-500'}`;
  }

  const isInactive = isClientInactive(client.id);
  const actBadge = document.getElementById('profile-client-activity-badge');
  if (actBadge) {
    actBadge.innerText = isInactive ? 'Inativa (>3m)' : 'Ativa';
    actBadge.className = `text-[10px] px-2.5 py-0.5 rounded-full font-bold ${isInactive ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'}`;
  }

  document.getElementById('profile-client-subinfo').innerText = `CPF: ${client.cpf} • WhatsApp: ${client.phone}`;
  document.getElementById('profile-data-name').innerText = client.name;
  document.getElementById('profile-data-phone').innerText = client.phone;
  document.getElementById('profile-data-cpf').innerText = client.cpf;
  document.getElementById('profile-data-email').innerText = client.email || 'Não informado';
  document.getElementById('profile-data-birth').innerText = client.birth || 'Não informada';
  document.getElementById('profile-data-gender').innerText = client.gender;

  const editBtn = document.getElementById('profile-btn-edit-client');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('modal-client-profile');
      openClientModal(client.id);
    };
  }

  renderProfileHistoryTab(client.id);
  switchProfileTab(initialTab);
  document.getElementById('modal-client-profile')?.classList.remove('hidden');
  lucide.createIcons();
}

function switchProfileTab(tab) {
  const btnDados = document.getElementById('profile-tab-btn-dados');
  const btnHist = document.getElementById('profile-tab-btn-historico');
  const contentDados = document.getElementById('profile-tab-content-dados');
  const contentHist = document.getElementById('profile-tab-content-historico');

  if (tab === 'dados') {
    btnDados.className = 'px-4 py-2 rounded-2xl text-xs font-bold bg-brand-violet text-white transition-all shadow';
    btnHist.className = 'px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-brand-lightCard dark:bg-brand-darkCard hover:bg-brand-violet/20 transition-all';
    contentDados.classList.remove('hidden');
    contentHist.classList.add('hidden');
  } else {
    btnHist.className = 'px-4 py-2 rounded-2xl text-xs font-bold bg-brand-violet text-white transition-all shadow';
    btnDados.className = 'px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-brand-lightCard dark:bg-brand-darkCard hover:bg-brand-violet/20 transition-all';
    contentHist.classList.remove('hidden');
    contentDados.classList.add('hidden');
  }
}

function renderProfileHistoryTab(clientId) {
  const catGrid = document.getElementById('profile-category-summary-grid');
  const timeline = document.getElementById('profile-appointments-timeline');
  if (!catGrid || !timeline) return;

  const clientApps = appointmentsList.filter(a => a.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const catCountMap = {};
  clientApps.forEach(app => {
    (app.services || []).forEach(srv => {
      const catId = srv.categoryId || 1;
      const catObj = categoriesList.find(c => c.id === catId);
      const catName = catObj ? catObj.name : 'Geral';
      const catColor = catObj ? catObj.color : '#a78bfa';
      if (!catCountMap[catName]) {
        catCountMap[catName] = { count: 0, color: catColor };
      }
      catCountMap[catName].count++;
    });
  });

  const catEntries = Object.entries(catCountMap);
  if (catEntries.length === 0) {
    catGrid.innerHTML = `<span class="text-xs text-slate-400">Nenhum serviço realizado ainda.</span>`;
  } else {
    catGrid.innerHTML = catEntries.map(([catName, data]) => `
      <div class="px-3 py-1.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-brand-lightSurface dark:bg-brand-darkSurface flex items-center gap-2 text-xs">
        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${data.color}"></span>
        <span class="font-bold text-slate-800 dark:text-slate-200">${catName}:</span>
        <span class="font-extrabold text-brand-gold">${data.count}x</span>
      </div>
    `).join('');
  }

  if (clientApps.length === 0) {
    timeline.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Nenhum agendamento registrado.</div>`;
  } else {
    timeline.innerHTML = clientApps.map(app => {
      const [y, m, d] = (app.date || '').split('-');
      return `
        <div class="p-3 rounded-2xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between text-xs">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-brand-gold">📅 ${d}/${m}/${y} às ${app.time}</span>
              <span class="text-[9px] px-2 py-0.5 rounded-full font-bold border">${app.status}</span>
            </div>
            <p class="font-bold text-slate-900 dark:text-white">${app.serviceName}</p>
            <span class="text-[10px] text-slate-400">Depiladora: ${app.professional} • R$ ${Number(app.price).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderClientsView() {
  const tbody = document.getElementById('clients-table-body');
  const badge = document.getElementById('badge-clientes-count');
  if (badge) badge.innerText = clientsList.length;
  if (!tbody) return;

  let list = clientsList;
  if (currentClientGenderFilter !== 'TODOS') list = list.filter(c => c.gender === currentClientGenderFilter);

  tbody.innerHTML = list.map(c => {
    const inactive = isClientInactive(c.id);
    return `
      <tr 
        oncontextmenu="showCustomContextMenu(event, 'client', ${c.id})" 
        onclick="openClientProfileModal(${c.id}, 'dados')"
        class="hover:bg-brand-lightCard/40 dark:hover:bg-brand-darkBg/40 cursor-pointer transition-colors group"
      >
        <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white group-hover:text-brand-violet transition-colors">
          ${c.name}
          ${inactive ? '<span class="ml-2 text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-500 border border-rose-500/20">Inativa</span>' : ''}
        </td>
        <td class="py-3.5 px-4"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.gender === 'Masculino' ? 'bg-sky-500/15 text-sky-500' : 'bg-pink-500/15 text-pink-500'}">${c.gender}</span></td>
        <td class="py-3.5 px-4 font-mono text-emerald-500 text-xs">${c.cpf}</td>
        <td class="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 text-xs">${c.phone}</td>
        <td class="py-3.5 px-4 text-slate-400 text-xs">${c.birth || '-'}</td>
        <td class="py-3.5 px-4 text-right" onclick="event.stopPropagation()">
          <button onclick="openClientProfileModal(${c.id}, 'historico')" class="p-1 text-slate-400 hover:text-emerald-400"><i data-lucide="history" class="w-4 h-4"></i></button>
          <button onclick="openClientModal(${c.id})" class="p-1 text-slate-400 hover:text-brand-gold"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
          <button onclick="handleDeleteClient(${c.id})" class="p-1 text-slate-400 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
      </tr>
    `;
  }).join('');
  lucide.createIcons();
}

function filterClientsByGender(gender) {
  currentClientGenderFilter = gender;
  document.querySelectorAll('.client-gender-btn').forEach(btn => {
    if (btn.getAttribute('data-gender') === gender) {
      btn.className = 'client-gender-btn px-4 py-2 rounded-2xl text-xs font-bold bg-brand-violet text-white';
    } else {
      btn.className = 'client-gender-btn px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 bg-brand-lightCard dark:bg-brand-darkBg border border-brand-lightBorder dark:border-brand-darkBorder';
    }
  });
  renderClientsView();
}

/* ========================================================
 * SERVIÇOS & CATEGORIAS
 * ======================================================== */
function openServiceModal(id = null) {
  document.getElementById('srv-edit-id').value = id || '';
  document.getElementById('modal-service-title').innerText = id ? 'Editar Serviço' : 'Cadastrar Serviço';

  const select = document.getElementById('srv-category');
  if (select) {
    select.innerHTML = categoriesList.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (id) {
    const srv = servicesList.find(s => s.id === id);
    if (srv) {
      document.getElementById('srv-name').value = srv.name;
      document.getElementById('srv-short').value = srv.shortCode || '';
      document.getElementById('srv-category').value = srv.categoryId;
      document.getElementById('srv-duration').value = srv.duration;
      document.getElementById('srv-price').value = srv.price;
    }
  } else {
    document.getElementById('form-service').reset();
  }

  document.getElementById('modal-service').classList.remove('hidden');
  lucide.createIcons();
}

function handleSaveService(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('srv-edit-id').value);
  const name = document.getElementById('srv-name').value.trim();
  const shortCode = document.getElementById('srv-short').value.trim();
  const categoryId = parseInt(document.getElementById('srv-category').value);
  const duration = parseInt(document.getElementById('srv-duration').value);
  const price = parseFloat(document.getElementById('srv-price').value);

  if (id) {
    const s = servicesList.find(s => s.id === id);
    if (s) {
      s.name = name;
      s.shortCode = shortCode;
      s.categoryId = categoryId;
      s.duration = duration;
      s.price = price;
      showToast(`Serviço ${name} atualizado!`, 'success');
    }
  } else {
    servicesList.push({ id: Date.now(), name, shortCode, categoryId, duration, price });
    showToast(`Serviço ${name} cadastrado!`, 'success');
  }

  saveAllToLocalStorage();
  closeModal('modal-service');
  renderAllViews();
}

function handleDeleteService(id) {
  const idx = servicesList.findIndex(s => s.id === id);
  if (idx > -1) {
    const name = servicesList[idx].name;
    servicesList.splice(idx, 1);
    saveAllToLocalStorage();
    showToast(`Serviço ${name} excluído!`, 'warning');
    renderAllViews();
  }
}

function renderServicesView() {
  const container = document.getElementById('services-grid');
  if (!container) return;

  container.innerHTML = servicesList.map(s => {
    const cat = categoriesList.find(c => c.id === s.categoryId);
    return `
      <div 
        oncontextmenu="showCustomContextMenu(event, 'service', ${s.id})" 
        class="p-4 rounded-3xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder shadow-sm flex flex-col justify-between gap-3 hover:border-brand-violet/60 transition-all cursor-pointer"
      >
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold text-slate-800 dark:text-white" style="background-color: ${cat ? cat.color + '40' : '#a78bfa40'}; border: 1px solid ${cat ? cat.color : '#a78bfa'}">
              ${cat ? cat.name : 'Geral'}
            </span>
            <span class="text-xs font-black text-brand-gold">R$ ${Number(s.price).toFixed(2)}</span>
          </div>
          <h4 class="text-sm font-black text-slate-900 dark:text-white">${s.name}</h4>
          <span class="text-[10px] text-slate-400 font-mono block mt-1">Duração: ${s.duration} min • Planilha: <strong class="text-brand-gold">${s.shortCode || s.name}</strong></span>
        </div>
        <div class="pt-2 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-end gap-1" onclick="event.stopPropagation()">
          <button onclick="openServiceModal(${s.id})" class="p-1.5 text-slate-400 hover:text-brand-gold"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
          <button onclick="handleDeleteService(${s.id})" class="p-1.5 text-slate-400 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function openCategoryModal(id = null) {
  document.getElementById('cat-edit-id').value = id || '';
  document.getElementById('modal-category-title').innerText = id ? 'Editar Categoria' : 'Nova Categoria';

  const paletteContainer = document.getElementById('category-color-palette');
  if (paletteContainer) {
    paletteContainer.innerHTML = SOFT_PASTEL_PALETTE.map(c => `
      <button 
        type="button" 
        onclick="selectCategoryColor('${c.hex}')" 
        title="${c.name}"
        class="w-7 h-7 rounded-xl border border-black/20 hover:scale-110 transition-transform flex items-center justify-center" 
        style="background-color: ${c.hex}"
      >
        <span id="palette-check-${c.hex.replace('#', '')}" class="text-[10px] text-black font-black hidden">✓</span>
      </button>
    `).join('');
  }

  if (id) {
    const cat = categoriesList.find(c => c.id === id);
    if (cat) {
      document.getElementById('cat-name').value = cat.name;
      selectCategoryColor(cat.color || '#a78bfa');
    }
  } else {
    document.getElementById('form-category').reset();
    selectCategoryColor('#a78bfa');
  }

  document.getElementById('modal-category').classList.remove('hidden');
  lucide.createIcons();
}

function selectCategoryColor(hex) {
  document.getElementById('cat-color').value = hex;
  SOFT_PASTEL_PALETTE.forEach(c => {
    const check = document.getElementById(`palette-check-${c.hex.replace('#', '')}`);
    if (check) {
      if (c.hex.toLowerCase() === hex.toLowerCase()) {
        check.classList.remove('hidden');
      } else {
        check.classList.add('hidden');
      }
    }
  });
}

function handleSaveCategory(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('cat-edit-id').value);
  const name = document.getElementById('cat-name').value.trim();
  const color = document.getElementById('cat-color').value;

  if (id) {
    const c = categoriesList.find(c => c.id === id);
    if (c) {
      c.name = name;
      c.color = color;
      showToast(`Categoria ${name} atualizada!`, 'success');
    }
  } else {
    categoriesList.push({ id: Date.now(), name, color });
    showToast(`Categoria ${name} criada com sucesso!`, 'success');
  }

  saveAllToLocalStorage();
  closeModal('modal-category');
  renderAllViews();
}

function handleDeleteCategory(id) {
  const idx = categoriesList.findIndex(c => c.id === id);
  if (idx > -1) {
    const name = categoriesList[idx].name;
    categoriesList.splice(idx, 1);
    saveAllToLocalStorage();
    showToast(`Categoria ${name} removida!`, 'warning');
    renderAllViews();
  }
}

function renderCategoriesView() {
  const container = document.getElementById('categories-list');
  if (!container) return;

  container.innerHTML = categoriesList.map(cat => `
    <div 
      oncontextmenu="showCustomContextMenu(event, 'category', ${cat.id})"
      class="p-4 rounded-3xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between shadow-sm cursor-pointer hover:border-brand-violet/60 transition-all"
    >
      <div class="flex items-center gap-2.5">
        <span class="w-4 h-4 rounded-full border border-black/10 shrink-0" style="background-color: ${cat.color || '#a78bfa'}"></span>
        <span class="text-xs font-bold text-slate-800 dark:text-white">${cat.name}</span>
      </div>
      <div class="flex items-center gap-1" onclick="event.stopPropagation()">
        <button onclick="openCategoryModal(${cat.id})" class="p-1.5 text-slate-400 hover:text-brand-gold"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
        <button onclick="handleDeleteCategory(${cat.id})" class="p-1.5 text-slate-400 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

/* ========================================================
 * PROFISSIONAIS & CONFIGURAÇÕES DA EMPRESA
 * ======================================================== */
function openProfessionalModal(id = null) {
  document.getElementById('pro-edit-id').value = id || '';
  document.getElementById('modal-professional-title').innerText = id ? 'Editar Profissional' : 'Cadastrar Profissional';
  tempProPhotoData = null;

  const preview = document.getElementById('pro-photo-preview');

  if (id) {
    const p = professionalsList.find(p => p.id === id);
    if (p) {
      document.getElementById('pro-name').value = p.name;
      if (p.photo) {
        preview.innerHTML = `<img src="${p.photo}" class="w-full h-full object-cover">`;
        tempProPhotoData = p.photo;
      } else {
        preview.innerHTML = `<i data-lucide="user" class="w-6 h-6"></i>`;
      }
    }
  } else {
    document.getElementById('form-professional').reset();
    preview.innerHTML = `<i data-lucide="user" class="w-6 h-6"></i>`;
  }

  document.getElementById('modal-professional').classList.remove('hidden');
  lucide.createIcons();
}

function previewProfessionalPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    tempProPhotoData = evt.target.result;
    const preview = document.getElementById('pro-photo-preview');
    if (preview) preview.innerHTML = `<img src="${tempProPhotoData}" class="w-full h-full object-cover">`;
  };
  reader.readAsDataURL(file);
}

function handleSaveProfessional(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('pro-edit-id').value);
  const name = document.getElementById('pro-name').value.trim();

  if (id) {
    const p = professionalsList.find(p => p.id === id);
    if (p) {
      p.name = name;
      if (tempProPhotoData) p.photo = tempProPhotoData;
      showToast(`Profissional ${name} atualizada!`, 'success');
    }
  } else {
    professionalsList.push({ id: Date.now(), name, photo: tempProPhotoData });
    showToast(`Profissional ${name} cadastrada!`, 'success');
  }

  saveAllToLocalStorage();
  closeModal('modal-professional');
  renderAllViews();
}

function handleDeleteProfessional(id) {
  const idx = professionalsList.findIndex(p => p.id === id);
  if (idx > -1) {
    const name = professionalsList[idx].name;
    professionalsList.splice(idx, 1);
    saveAllToLocalStorage();
    showToast(`Profissional ${name} excluída!`, 'warning');
    renderAllViews();
  }
}

function renderProfessionalsView() {
  const container = document.getElementById('professionals-grid');
  if (!container) return;

  container.innerHTML = professionalsList.map(p => `
    <div class="p-4 rounded-3xl bg-brand-lightSurface dark:bg-brand-darkSurface border border-brand-lightBorder dark:border-brand-darkBorder shadow-sm flex flex-col items-center text-center justify-between gap-3">
      <div class="w-16 h-16 rounded-full bg-brand-purpleDeep text-brand-gold flex items-center justify-center font-black text-xl border-2 border-brand-gold/60 overflow-hidden shadow">
        ${p.photo ? `<img src="${p.photo}" class="w-full h-full object-cover">` : p.name.charAt(0)}
      </div>
      <div>
        <h4 class="text-sm font-black text-slate-900 dark:text-white">${p.name}</h4>
        <span class="text-[10px] text-brand-gold font-semibold uppercase tracking-wider block mt-0.5">Depiladora Profissional</span>
      </div>
      <div class="pt-2 border-t border-brand-lightBorder dark:border-brand-darkBorder w-full flex items-center justify-center gap-2">
        <button onclick="openProfessionalModal(${p.id})" class="px-3 py-1.5 rounded-xl bg-brand-violet/15 hover:bg-brand-violet text-brand-violet hover:text-white text-xs font-bold transition-all flex items-center gap-1">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar
        </button>
        <button onclick="handleDeleteProfessional(${p.id})" class="p-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-all">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    companyConfig.logoUrl = evt.target.result;
    saveAllToLocalStorage();
    const preview = document.getElementById('company-logo-preview');
    if (preview) preview.innerHTML = `<img src="${companyConfig.logoUrl}" class="w-full h-full object-cover">`;
    const sideHolder = document.getElementById('sidebar-company-logo-holder');
    if (sideHolder) sideHolder.innerHTML = `<img src="${companyConfig.logoUrl}" class="w-full h-full object-cover">`;
    const mobHolder = document.getElementById('mobile-company-logo-holder');
    if (mobHolder) mobHolder.innerHTML = `<img src="${companyConfig.logoUrl}" class="w-full h-full object-cover">`;
    showToast('Logotipo atualizado no sistema!', 'success');
  };
  reader.readAsDataURL(file);
}

function handleSaveCompanyInfo(e) {
  e.preventDefault();
  companyConfig.name = document.getElementById('cfg-company-name').value;
  companyConfig.street = document.getElementById('cfg-street').value;
  companyConfig.number = document.getElementById('cfg-number').value;
  companyConfig.bairro = document.getElementById('cfg-bairro').value;
  companyConfig.cep = document.getElementById('cfg-cep').value;
  companyConfig.complement = document.getElementById('cfg-complement').value;
  companyConfig.whatsapp = document.getElementById('cfg-whatsapp').value;
  saveAllToLocalStorage();
  showToast('Informações da empresa salvas com sucesso!', 'success');
}

/* ========================================================
 * WHATSAPP E AUTOMAÇÃO
 * ======================================================== */
function openNewWhatsAppTemplateModal(id = null) {
  document.getElementById('wpp-tpl-id').value = id || '';
  if (id) {
    const tpl = whatsappTemplates.find(t => t.id === id);
    if (tpl) {
      document.getElementById('wpp-tpl-title').value = tpl.title;
      document.getElementById('wpp-tpl-trigger').value = tpl.trigger;
      document.getElementById('wpp-tpl-active').value = tpl.active ? 'true' : 'false';
      document.getElementById('wpp-tpl-text').value = tpl.text;
    }
  } else {
    document.getElementById('form-wpp-template').reset();
  }
  document.getElementById('modal-whatsapp-template').classList.remove('hidden');
  lucide.createIcons();
}

function insertVariableIntoWpp(tag) {
  const textarea = document.getElementById('wpp-tpl-text');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + tag + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

function handleSaveWppTemplate(e) {
  e.preventDefault();
  const id = document.getElementById('wpp-tpl-id').value || `tpl_${Date.now()}`;
  const title = document.getElementById('wpp-tpl-title').value.trim();
  const trigger = document.getElementById('wpp-tpl-trigger').value;
  const active = document.getElementById('wpp-tpl-active').value === 'true';
  const text = document.getElementById('wpp-tpl-text').value.trim();

  const existingIdx = whatsappTemplates.findIndex(t => t.id === id);
  if (existingIdx > -1) {
    whatsappTemplates[existingIdx] = { id, title, trigger, active, text };
    showToast(`Modelo "${title}" atualizado!`, 'success');
  } else {
    whatsappTemplates.push({ id, title, trigger, active, text });
    showToast(`Modelo "${title}" criado!`, 'success');
  }

  saveAllToLocalStorage();
  closeModal('modal-whatsapp-template');
  renderWhatsAppTemplatesList();
}

function renderWhatsAppTemplatesList() {
  const container = document.getElementById('whatsapp-templates-container');
  if (!container) return;

  container.innerHTML = whatsappTemplates.map(tpl => `
    <div class="p-3.5 rounded-2xl bg-brand-lightCard dark:bg-brand-darkBg border border-brand-lightBorder dark:border-brand-darkBorder space-y-1.5">
      <div class="flex items-center justify-between">
        <h5 class="text-xs font-bold text-slate-900 dark:text-white">${tpl.title}</h5>
        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold ${tpl.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'}">
          ${tpl.active ? 'Robô Ativo' : 'Pausado'}
        </span>
      </div>
      <span class="text-[10px] text-brand-gold font-mono block">Gatilho: Status = ${tpl.trigger}</span>
      <p class="text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap line-clamp-2">${tpl.text}</p>
      <div class="flex justify-end gap-2 pt-1 border-t border-brand-lightBorder/50 dark:border-brand-darkBorder/50">
        <button onclick="openNewWhatsAppTemplateModal('${tpl.id}')" class="text-xs text-brand-violet hover:underline font-bold">Editar</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

/* ========================================================
 * EXPORTAÇÃO EXCEL (.XLSX) COM ESTILOS
 * ======================================================== */
function handleGenerateMultiSheetExcel(event) {
  event.preventDefault();
  if (typeof XLSX === 'undefined') {
    showToast('Biblioteca SheetJS ainda carregando.', 'warning');
    return;
  }

  const startDateStr = document.getElementById('export-sheet-start-date').value;
  const endDateStr = document.getElementById('export-sheet-end-date').value;
  const startDate = new Date(startDateStr + 'T00:00:00');
  const endDate = new Date(endDateStr + 'T00:00:00');

  if (startDate > endDate) {
    showToast('A data inicial não pode ser maior que a final!', 'error');
    return;
  }

  const workbook = XLSX.utils.book_new();
  const slots = generate15MinSlots();
  const weekDaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let currentDate = new Date(startDate);
  let sheetsCreated = 0;

  const borderSolid = {
    top: { style: 'thin', color: { rgb: '2D2D2D' } },
    bottom: { style: 'thin', color: { rgb: '2D2D2D' } },
    left: { style: 'thin', color: { rgb: '2D2D2D' } },
    right: { style: 'thin', color: { rgb: '2D2D2D' } }
  };

  while (currentDate <= endDate) {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayWeek = weekDaysShort[currentDate.getDay()];
    const sheetName = `${d}-${m} ${dayWeek}`;

    const dayApps = appointmentsList.filter(a => a.date === dateStr && a.status !== 'Cancelado');

    let maxSlotsUsed = 2;
    slots.forEach(time => {
      const count = dayApps.filter(a => a.time === time).length;
      if (count > maxSlotsUsed) maxSlotsUsed = count;
    });

    const totalCols = 1 + maxSlotsUsed * 2;
    const sheetData = [];

    const titleRow = new Array(totalCols).fill('');
    titleRow[0] = `DEPILCLEAR WOMEN & MEN - MURAL DA RECEPÇÃO - ${d}/${m}/${y} (${dayWeek})`;
    sheetData.push(titleRow);
    sheetData.push(new Array(totalCols).fill(''));

    const headerRow = ['HR'];
    for (let i = 1; i <= maxSlotsUsed; i++) {
      headerRow.push(i === 1 ? 'NOME' : `NOME ${i}`);
      headerRow.push(i === 1 ? 'ÁREA / SERVIÇO' : `ÁREA / SERVIÇO ${i}`);
    }
    sheetData.push(headerRow);

    const rowArrivedFlags = [];

    slots.forEach(time => {
      const appsAtTime = dayApps.filter(a => a.time === time);
      const rowData = [time];
      const arrivedFlags = [];

      for (let i = 0; i < maxSlotsUsed; i++) {
        const app = appsAtTime[i];
        if (app) {
          const nameText = app.isFirstTime ? `${app.clientName} (1° vez)` : app.clientName;
          const servicesSortedText = formatServicesShortTextSorted(app.services, app.professional);
          rowData.push(nameText);
          rowData.push(servicesSortedText);
          arrivedFlags.push(Boolean(app.arrivedAtReception));
        } else {
          rowData.push('');
          rowData.push('');
          arrivedFlags.push(false);
        }
      }
      sheetData.push(rowData);
      rowArrivedFlags.push(arrivedFlags);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    const colWidths = [{ wch: 10 }];
    for (let i = 0; i < maxSlotsUsed; i++) {
      colWidths.push({ wch: 28 });
      colWidths.push({ wch: 34 });
    }
    worksheet['!cols'] = colWidths;
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

    const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (worksheet[titleRef]) {
      worksheet[titleRef].s = {
        font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E1135' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 2, c });
      if (!worksheet[cellRef]) worksheet[cellRef] = { t: 's', v: '' };
      worksheet[cellRef].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } },
        fill: { fgColor: { rgb: 'E2E8F0' } },
        alignment: { horizontal: c === 0 ? 'center' : 'left', vertical: 'center' },
        border: borderSolid
      };
    }

    slots.forEach((time, slotIdx) => {
      const r = 3 + slotIdx;
      const arrivedFlags = rowArrivedFlags[slotIdx] || [];

      const hrRef = XLSX.utils.encode_cell({ r, c: 0 });
      if (!worksheet[hrRef]) worksheet[hrRef] = { t: 's', v: time };
      worksheet[hrRef].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderSolid
      };

      for (let i = 0; i < maxSlotsUsed; i++) {
        const isArrived = arrivedFlags[i];
        const nameCol = 1 + i * 2;
        const areaCol = 2 + i * 2;

        const nameRef = XLSX.utils.encode_cell({ r, c: nameCol });
        const areaRef = XLSX.utils.encode_cell({ r, c: areaCol });

        if (!worksheet[nameRef]) worksheet[nameRef] = { t: 's', v: '' };
        if (!worksheet[areaRef]) worksheet[areaRef] = { t: 's', v: '' };

        const clientStyle = {
          font: { name: 'Arial', sz: 10, bold: isArrived, color: { rgb: isArrived ? '064E3B' : '1E293B' } },
          fill: { fgColor: { rgb: isArrived ? 'A7F3D0' : 'FFFFFF' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: borderSolid
        };

        worksheet[nameRef].s = clientStyle;
        worksheet[areaRef].s = clientStyle;
      }
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    sheetsCreated++;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const fileName = `DepilClear_Planilha_${startDateStr}_a_${endDateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  closeModal('modal-export-spreadsheet');
  showToast(`Planilha gerada com sucesso (${sheetsCreated} abas)!`, 'success');
}

function openExportSpreadsheetModal() {
  document.getElementById('export-sheet-start-date').value = currentSelectedDate;
  const future = new Date();
  future.setDate(future.getDate() + 6);
  document.getElementById('export-sheet-end-date').value = future.toISOString().split('T')[0];
  document.getElementById('modal-export-spreadsheet').classList.remove('hidden');
  lucide.createIcons();
}

function toggleTimeSliceInputs() {
  const mode = document.getElementById('wpp-img-range-mode')?.value;
  const inputs = document.getElementById('wpp-time-slice-inputs');
  if (inputs) {
    if (mode === 'CUSTOM') inputs.classList.remove('hidden');
    else inputs.classList.add('hidden');
  }
}

function generateWhatsAppSheetImage(action) {
  const canvas = document.getElementById('hidden-render-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const mode = document.getElementById('wpp-img-range-mode')?.value;
  const startTime = mode === 'CUSTOM' ? document.getElementById('wpp-img-start-time')?.value || '08:00' : '08:00';
  const endTime = mode === 'CUSTOM' ? document.getElementById('wpp-img-end-time')?.value || '18:00' : '18:00';

  let slots = generate15MinSlots();
  if (mode === 'CUSTOM') slots = slots.filter(s => s >= startTime && s <= endTime);

  const [y, m, d] = currentSelectedDate.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const daysApps = appointmentsList.filter(a => a.date === currentSelectedDate && a.status !== 'Cancelado');

  let maxColsPairs = 2;
  slots.forEach(time => {
    const count = daysApps.filter(a => a.time === time).length;
    if (count > maxColsPairs) maxColsPairs = count;
  });

  const rowHeight = 28;
  const headerHeight = 70;
  const colWidths = [70];
  for (let i = 0; i < maxColsPairs; i++) {
    colWidths.push(220);
    colWidths.push(240);
  }

  canvas.width = colWidths.reduce((a, b) => a + b, 0);
  canvas.height = headerHeight + (slots.length + 1) * rowHeight + 30;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e1135';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`DEPILCLEAR WOMEN & MEN - MURAL DA RECEPÇÃO`, 15, 30);
  ctx.font = 'bold 13px Arial';
  ctx.fillText(`DATA: ${dateFormatted} • HORÁRIO: ${slots[0] || '08:00'} às ${slots[slots.length - 1] || '18:00'}`, 15, 52);

  let curY = headerHeight;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, curY, canvas.width, rowHeight);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px Arial';

  const headers = ['HR'];
  for (let i = 1; i <= maxColsPairs; i++) {
    headers.push(i === 1 ? 'NOME' : `NOME ${i}`);
    headers.push(i === 1 ? 'ÁREA / SERVIÇO' : `ÁREA / SERVIÇO ${i}`);
  }

  let curX = 0;
  headers.forEach((h, idx) => {
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(curX, curY, colWidths[idx], rowHeight);
    ctx.fillText(h, curX + 10, curY + 18);
    curX += colWidths[idx];
  });

  slots.forEach(time => {
    curY += rowHeight;
    curX = 0;
    const appsAtTime = daysApps.filter(a => a.time === time);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(curX, curY, colWidths[0], rowHeight);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(curX, curY, colWidths[0], rowHeight);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(time, curX + 18, curY + 18);
    curX += colWidths[0];

    for (let i = 0; i < maxColsPairs; i++) {
      const app = appsAtTime[i] || null;
      const nameColWidth = colWidths[1 + i * 2];
      const areaColWidth = colWidths[2 + i * 2];
      const isArrived = app && app.arrivedAtReception;
      const bg = isArrived ? '#a7f3d0' : '#ffffff';

      ctx.fillStyle = bg;
      ctx.fillRect(curX, curY, nameColWidth, rowHeight);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(curX, curY, nameColWidth, rowHeight);
      if (app) {
        ctx.fillStyle = isArrived ? '#064e3b' : '#0f172a';
        ctx.font = 'bold 11px Arial';
        const nameText = app.isFirstTime ? `${app.clientName} (1° vez)` : app.clientName;
        ctx.fillText(nameText.substring(0, 26), curX + 8, curY + 18);
      }
      curX += nameColWidth;

      ctx.fillStyle = bg;
      ctx.fillRect(curX, curY, areaColWidth, rowHeight);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(curX, curY, areaColWidth, rowHeight);
      if (app) {
        ctx.fillStyle = isArrived ? '#064e3b' : '#0f172a';
        ctx.font = '11px Arial';
        const srvText = formatServicesShortTextSorted(app.services, app.professional);
        ctx.fillText(srvText.substring(0, 30), curX + 8, curY + 18);
      }
      curX += areaColWidth;
    }
  });

  if (action === 'download') {
    const a = document.createElement('a');
    a.download = `Mural_DepilClear_${currentSelectedDate}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('Imagem PNG baixada com sucesso!', 'success');
  } else {
    canvas.toBlob(blob => {
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          showToast('Imagem copiada! Cole no WhatsApp Web com Ctrl+V.', 'success');
        });
      } catch (err) {
        const a = document.createElement('a');
        a.download = `Mural_DepilClear_${currentSelectedDate}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Imagem baixada para envio no WhatsApp!', 'info');
      }
    });
  }
}

/* ========================================================
 * INICIALIZAÇÃO E SINCRONIZAÇÃO GERAL
 * ======================================================== */
function renderAllViews() {
  const todayApps = appointmentsList.filter(a => a.date === currentSelectedDate && a.status !== 'Cancelado');
  const metricToday = document.getElementById('dash-metric-today');
  if (metricToday) metricToday.innerText = todayApps.length;
  
  const metricCompleted = document.getElementById('dash-metric-completed');
  if (metricCompleted) metricCompleted.innerText = appointmentsList.filter(a => a.status === 'Finalizado').length;

  const metricReschedule = document.getElementById('dash-metric-reschedule');
  if (metricReschedule) metricReschedule.innerText = appointmentsList.filter(a => a.status === 'Reagendar').length;

  const metricClients = document.getElementById('dash-metric-clients');
  if (metricClients) metricClients.innerText = clientsList.length;

  const badgeAppCount = document.getElementById('badge-agendamentos-count');
  if (badgeAppCount) badgeAppCount.innerText = appointmentsList.filter(a => a.status !== 'Cancelado').length;

  renderAgendaView();
  renderPhysicalReceptionSheet();
  renderClientsView();
  renderServicesView();
  renderCategoriesView();
  renderProfessionalsView();
  renderWhatsAppTemplatesList();
}

window.addEventListener('online', () => {
  const badge = document.getElementById('connection-indicator-desktop');
  if (badge) {
    badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold';
    document.getElementById('connection-text').innerText = 'Online';
  }
  showToast('Conexão com a internet restabelecida!', 'success');
});

window.addEventListener('offline', () => {
  const badge = document.getElementById('connection-indicator-desktop');
  if (badge) {
    badge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold';
    document.getElementById('connection-text').innerText = 'Modo Offline (Gravando no PC)';
  }
  showToast('Você está offline. O sistema continua gravando normalmente no disco local.', 'warning');
});

window.onload = function() {
  loadAllFromLocalStorage();

  // Aplica o tema guardado
  if (localStorage.getItem('depilclear_theme') === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Verifica se o utilizador está autenticado ou se deve mostrar o login
  checkUserSession();
  lucide.createIcons();
};