\# DepilClear Women & Men - Sandra Ramos



Sistema web integrado para gerenciamento operacional de atendimentos, recepção e agendamentos da clínica **DepilClear Women & Men - Sandra Ramos**.



Desenvolvido para oferecer controle de horários em intervalos de 15 minutos, mural visual de presença na recepção com autoajuste de capacidade, exportação avançada em planilhas multi-abas e persistência resiliente local com suporte offline.



---



\## 📌 Funcionalidades Principais



* **Mural Físico da Recepção (Planilha Interativa):**

 * Grade diária das 08:00 às 18:00 com autoajuste dinâmico de colunas para comportar múltiplos clientes simultâneos no mesmo horário.

 * Marcação visual de presença em 1 clique (destaque em verde suave).

 * Classificação e ordenação prioritária de procedimentos por categoria (Epilação e Estética corporal).

* **Gestão de Agendamentos & Calendário:**

 * Calendário integrado mensal com visão de ocupação por slot.

 * Busca inteligente e tolerante a digitação no histórico completo de clientes.

 * Filtros avançados combinados por status, gênero, clientes inativas (>3 meses) e período de datas (Data Inicial e Final).

 * Identificação de primeiro atendimento com tag "1ª vez".

* **Exportação Profissional (.xlsx & Imagem):**

 * Geração de planilhas Excel (`.xlsx`) com estilos nativos, cores e bordas contínuas utilizando `xlsx-js-style`, divididas em abas diárias individuais.

 * Renderização direta do mural em imagem de alta definição para envio rápido via WhatsApp Web ou download em PNG.

* **Resiliência e Operação Offline:**

 * Persistência de dados consolidada diretamente no disco local via `localStorage`.

 * Detecção dinâmica de status de rede (`Online` / `Modo Offline`).

 * Preservação integral dos dados mesmo mediante oscilações de conexão ou desligamento repentino.

* **Automação & Customização:**

 * Gerenciador de templates de mensagens de WhatsApp com variáveis dinâmicas (`{nome}`, `{data}`, `{horario}`, `{servico}`, etc.).

 * Cadastro de equipe de profissionais com avatar personalizado.

 * Paleta de 20 tons pastéis para harmonização de categorias no mural.

 * Alternância entre Modo Claro (Light) e Modo Escuro (Dark).



---



\## 🛠️ Tecnologias Utilizadas



* **HTML5:** Estrutura semântica e acessível.

* **CSS3 & Tailwind CSS (CDN):** Estilização utilitária, responsiva e suporte a tema escuro.

* **JavaScript (ES6+):** Lógica reativa modular, persistência local e renderização em Canvas.

* **Lucide Icons:** Conjunto de ícones vetoriais modernos.

* **SheetJS (xlsx-js-style):** Motor de geração e estilização de arquivos de planilhas.



---



\## 📂 Estrutura de Arquivos

```text
depilclear-sistema/
├── index.html         # Sistema de agendamentos (agenda, mural, clientes, fidelidade)
├── app.js             # Lógica principal, persistência e utilitários
├── style.css          # Estilos gerais, mural e impressão
├── caixa.html         # Frente de Caixa (PDV)
├── caixa.js           # Lógica do PDV (multi-pagamento, fidelidade, fechamento)
├── caixa.css          # Estilos do PDV e cupom 80mm
├── sw.js              # Service Worker (modo offline)
├── logo.png           # Logotipo oficial
├── package.json       # Dependências das funções serverless
├── api/               # Funções serverless da Vercel
│   ├── _auth.js       # CORS restrito + validação do token JWT (não vira rota)
│   ├── login.js       # POST /api/login
│   ├── whatsapp.js    # POST /api/whatsapp (exige login)
│   └── fidelidade.js  # GET/POST/DELETE /api/fidelidade (exige login)
└── README.md
```

## ⚙️ Variáveis de ambiente (Vercel)

| Variável | Uso |
|---|---|
| `JWT_SECRET` | Assinatura/validação do token de login (obrigatória) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Banco de usuários e fidelidade |
| `WPP_API_URL` / `WPP_API_TOKEN` / `WPP_INSTANCE` | Gateway de WhatsApp (sem elas, o envio é apenas simulado) |
