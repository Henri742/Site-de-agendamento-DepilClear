\# DepilClear Women \& Men - Sandra Ramos



Sistema web integrado para gerenciamento operacional de atendimentos, recepção e agendamentos da clínica \*\*DepilClear Women \& Men - Sandra Ramos\*\*.



Desenvolvido para oferecer controle de horários em intervalos de 15 minutos, mural visual de presença na recepção com autoajuste de capacidade, exportação avançada em planilhas multi-abas e persistência resiliente local com suporte offline.



\---



\## 📌 Funcionalidades Principais



\* \*\*Mural Físico da Recepção (Planilha Interativa):\*\*

&#x20; \* Grade diária das 08:00 às 18:00 com autoajuste dinâmico de colunas para comportar múltiplos clientes simultâneos no mesmo horário.

&#x20; \* Marcação visual de presença em 1 clique (destaque em verde suave).

&#x20; \* Classificação e ordenação prioritária de procedimentos por categoria (Epilação e Estética corporal).

\* \*\*Gestão de Agendamentos \& Calendário:\*\*

&#x20; \* Calendário integrado mensal com visão de ocupação por slot.

&#x20; \* Busca inteligente e tolerante a digitação no histórico completo de clientes.

&#x20; \* Filtros avançados combinados por status, gênero, clientes inativas (>3 meses) e período de datas (Data Inicial e Final).

&#x20; \* Identificação de primeiro atendimento com tag "1ª vez".

\* \*\*Exportação Profissional (.xlsx \& Imagem):\*\*

&#x20; \* Geração de planilhas Excel (`.xlsx`) com estilos nativos, cores e bordas contínuas utilizando `xlsx-js-style`, divididas em abas diárias individuais.

&#x20; \* Renderização direta do mural em imagem de alta definição para envio rápido via WhatsApp Web ou download em PNG.

\* \*\*Resiliência e Operação Offline:\*\*

&#x20; \* Persistência de dados consolidada diretamente no disco local via `localStorage`.

&#x20; \* Detecção dinâmica de status de rede (`Online` / `Modo Offline`).

&#x20; \* Preservação integral dos dados mesmo mediante oscilações de conexão ou desligamento repentino.

\* \*\*Automação \& Customização:\*\*

&#x20; \* Gerenciador de templates de mensagens de WhatsApp com variáveis dinâmicas (`{nome}`, `{data}`, `{horario}`, `{servico}`, etc.).

&#x20; \* Cadastro de equipe de profissionais com avatar personalizado.

&#x20; \* Paleta de 20 tons pastéis para harmonização de categorias no mural.

&#x20; \* Alternância entre Modo Claro (Light) e Modo Escuro (Dark).



\---



\## 🛠️ Tecnologias Utilizadas



\* \*\*HTML5:\*\* Estrutura semântica e acessível.

\* \*\*CSS3 \& Tailwind CSS (CDN):\*\* Estilização utilitária, responsiva e suporte a tema escuro.

\* \*\*JavaScript (ES6+):\*\* Lógica reativa modular, persistência local e renderização em Canvas.

\* \*\*Lucide Icons:\*\* Conjunto de ícones vetoriais modernos.

\* \*\*SheetJS (xlsx-js-style):\*\* Motor de geração e estilização de arquivos de planilhas.



\---



\## 📂 Estrutura de Arquivos



```text

depilclear-sistema/

├── index.html         # Estrutura principal da interface e modais

├── style.css          # Estilização visual, grid do mural e impressão

├── app.js             # Lógica de negócio, persistência e controladores

├── logo.png           # Logotipo oficial da marca DepilClear

├── LICENSE            # Termos de direitos autorais e uso proprietário

├── CONTRIBUTING.md    # Diretrizes de manutenção interna

└── README.md          # Documentação geral do repositório

