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
├── index.html / app.js        # Agenda, mural, clientes, fidelidade, relatórios
├── caixa.html / caixa.js      # Frente de Caixa (PDV)
├── security.js                # Escape (XSS), HMAC de integridade, validação de sessão
├── tailwind.css               # CSS compilado (gere com: npm run build:css)
├── tailwind.config.js / tailwind.input.css   # Configuração do Tailwind
├── style.css / caixa.css      # Estilos
├── sw.js                      # Service Worker (offline) — cache v5
├── privacidade.html           # Política de Privacidade (LGPD)
├── manifest.webmanifest       # Instalação como app (tablet/celular)
├── logo.webp / icon-*.webp    # Imagens em WebP
├── vercel.json                # CSP e cabeçalhos de segurança
├── tools/generate-sri.mjs     # Gera os hashes SRI dos scripts de CDN (precisa de internet)
├── api/
│   ├── _auth.js               # CORS restrito, JWT HS256, papéis
│   ├── _ratelimit.js          # Rate limit (Upstash ou memória)
│   ├── me.js                  # GET /api/me (valida a sessão)
│   ├── login.js               # POST /api/login
│   ├── whatsapp.js            # POST /api/whatsapp (exige login)
│   └── fidelidade.js          # GET/POST/DELETE /api/fidelidade
├── SEGURANCA.md               # Relatório de segurança e checklist de testes
├── AUDITORIA.md               # Auditoria de qualidade (responsivo, acessibilidade, desempenho, LGPD)
└── README.md
```

## ⚙️ Variáveis de ambiente (Vercel)

| Variável | Uso |
|---|---|
| `JWT_SECRET` | Assinatura/validação do token (obrigatória) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Usuários e fidelidade (obrigatórias; sem elas as rotas falham fechadas) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit compartilhado (recomendado) |
| `ADMIN_ROLES` | Papéis que escrevem em `/api/fidelidade` (padrão: `admin`) |
| `EXTRA_ALLOWED_ORIGINS` | Domínios extras permitidos no CORS (separados por vírgula) |
| `WPP_API_URL` / `WPP_API_TOKEN` / `WPP_INSTANCE` | Gateway de WhatsApp (sem elas o envio é simulado) |
