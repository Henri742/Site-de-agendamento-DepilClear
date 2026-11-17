# Auditoria de qualidade — Sistema de Agendamentos DepilClear

Escopo: somente o que se aplica a um **sistema interno** (agenda, mural, clientes, caixa). Itens de site público (Google/IAs, SEO, sitemap, dados estruturados, vídeo, fotos de banco de imagem) estão em "Não se aplica".
Método: leitura do código + testes automáticos em Chromium (desktop e celular). **Nada abaixo foi presumido**: o que não pude medir está como *Não verificado*.

## Resultado por item

| # | Item | Resultado | Evidência | Gravidade se falhar |
|---|---|---|---|---|
| 1 | Layout responsivo (celular, tablet, notebook, desktop) | ✅ Aprovado | Sem rolagem horizontal em 360, 768, 1024 e 1440 px nas 10 abas; caixa sem rolagem em 360 px. Barra superior com menu no celular (antes não havia). Tabelas rolam dentro do próprio quadro. Zoom liberado (antes bloqueado). | — |
| 1b | Teste em aparelhos reais / Safari iOS | ❓ Não verificado | Só testei em Chromium. | Médio |
| 2 | Acessibilidade — nomes e rótulos | ✅ Aprovado | 0 botões e 0 campos sem nome acessível (eram 18 e 9); 0 imagens sem `alt`; 0 ids duplicados; `lang="pt-BR"`. | — |
| 2b | Acessibilidade — modais e teclado | ✅ Aprovado | 12/12 modais com `role="dialog"`, Esc fecha o de cima, foco entra e volta, Tab preso dentro. Foco visível (anel dourado). `prefers-reduced-motion` respeitado. | — |
| 2c | Contraste de cores (tema claro) | ✅ Corrigido | Dourado, cinzas e verdes usados como texto falhavam (2,1:1 a 3,5:1). Escurecidos para ≥ 4,5:1. Restam só 2 falsos positivos da ferramenta (item de menu com gradiente e o separador "\|"). | — |
| 2d | Contraste no tema escuro | ✅ Corrigido (17/11/2026) | Medido nas 10 abas: 7 falhas corrigidas em `style.css`; resultado 0 falhas. | — |
| 2e | Itens clicáveis que não são botões (células do mural, cartões, linhas) | ✅ Corrigido (17/11/2026) | `makeClickablesFocusable()` em `security.js`: entram no Tab e respondem a Enter/Espaço (testado: 82 células do mural, linhas de clientes). | — |
| 2f | Leitor de tela real (NVDA/VoiceOver) | ❓ Não verificado | — | Médio |
| 3 | Velocidade — código e requisições | ✅ Aprovado (com ressalvas) | Removido o compilador Tailwind em tempo de execução (~300 KB de JS) e trocado por `tailwind.css` (**44 KB, 8 KB gzip**). Biblioteca de planilhas (`xlsx`) só baixa ao exportar. Logo 243 KB → 37 KB. JS próprio: `app.js` 45 KB gzip + `security.js` 8 KB gzip. | — |
| 3b | `app.js` sem minificar (190 KB; ~45 KB gzip) | ⚠️ Aceito | Funciona bem com gzip/brotli da Vercel. Minificar pouparia ~20 KB gzip. | Baixo |
| 3c | Fontes do Google carregam muitas famílias/pesos; Lucide vem de CDN | ⚠️ Aceito | Dependem de terceiros; o Service Worker guarda cópia para uso offline. | Baixo |
| 3c2 | Exportar planilha (.xlsx) com a política de segurança (CSP) em produção | ❓ Não verificado | A biblioteca é baixada sob demanda; não consegui baixá-la aqui para testar. Se o console (F12) acusar `unsafe-eval` ao exportar, acrescente `'unsafe-eval'` ao `script-src` em `vercel.json`. | Médio |
| 3d | Nota Lighthouse / Core Web Vitals em produção | ❓ Não verificado | Sem acesso à rede para medir o site publicado. Rode o Lighthouse no Chrome (F12 → Lighthouse). | Médio |
| 4 | Imagens em WebP e < 300 KB | ✅ Aprovado | `logo.webp` 37 KB, `icon-192.webp` 4 KB, `icon-512.webp` 13 KB. Uploads de logo/foto são convertidos para WebP e limitados a 300 KB (teste: PNG 1600×1200 → 75 KB e 16 KB); SVG é recusado. | — |
| 4b | Ícone para iPhone (apple-touch-icon) | ⚠️ Não incluído | O iOS só aceita PNG ali; o ícone de tela inicial no iPhone ficará genérico. | Baixo |
| 5 | Política de privacidade (LGPD) | ✅ Corrigido | O sistema coleta CPF, telefone, e-mail, nascimento e endereço **sem** política. Criada `privacidade.html`, links no login, rodapé do menu, cadastro e caixa, e cadastro novo só salva com a confirmação "cliente informada" (grava data/hora em `privacyConsentAt`). | — |
| 5b | Dados da responsável na política | ❌ **Pendente (você)** | Falta CNPJ/CPF e e-mail de contato (há um aviso amarelo na página). Recomendo revisão jurídica. | Alto (legal) |
| 6 | HTTPS e SSL | ❓ Não verificado em produção | Sem rede para inspecionar. No código: login recusa HTTP fora de `localhost` (testado), HSTS no `vercel.json`. Domínios `*.vercel.app` já têm SSL e redirecionamento automáticos. | Médio |
| 6b | Domínio próprio | ➖ Opcional | O sistema usa `agendamentodepil.vercel.app`; domínio próprio é só estética/confiança. | Baixo |
| 7 | Funciona como app no tablet/celular | ✅ Aprovado | `manifest.webmanifest` + Service Worker v5 (tudo, inclusive CSS, em cache offline). Instalação em aparelho real: ❓ não verificada. | — |
| 8 | Privacidade contra indexação | ✅ Aprovado | `noindex, nofollow` (meta) + `X-Robots-Tag` no `vercel.json`. | — |

## Não se aplica (sistema interno, por decisão sua)
SEO/crawlability, sitemap, dados estruturados, GEO (conteúdo para IAs), vídeos WebM, fotos "autênticas", copy de marketing, design de página de vendas.

## Correções prioritárias que ainda faltam
1. **(Você, alto)** Preencher CNPJ/CPF e e-mail em `privacidade.html` e revisar o texto com um profissional de direito.
2. **(Médio)** Tornar as células do mural e cartões acessíveis por teclado (`role="button"`, `tabindex="0"`, Enter/Espaço).
3. **(Médio)** Rodar o Lighthouse no site publicado e testar em um celular/tablet real (Android e iPhone).
4. **(Baixo)** Minificar `app.js`; reduzir pesos das fontes; auditar contraste do tema escuro.

## Como manter o CSS
O Tailwind agora é compilado (`tailwind.css`). Quando alguém criar uma classe nova no HTML/JS, rode `npm install` (uma vez) e `npm run build:css`, e envie o `tailwind.css` novo. Sem isso, classes novas ficam sem estilo.

## Rodada de 17/11/2026

| Item | O que mudou | Medição |
|---|---|---|
| Velocidade ao trocar de aba | Só a aba visível é redesenhada; ícones Lucide agrupados e só os novos são desenhados; índice de "última visita" por cliente; scripts com `defer` e início em `DOMContentLoaded` | Com 1.500 clientes e 4.000 agendamentos: **~1.050 ms → 1–120 ms** por aba |
| Login | Rótulos ligados aos campos, autopreenchimento do navegador, botão "Entrando…" sem duplo envio, erro na própria tela, aviso de Caps Lock, olho da senha com rótulo | Testado com senha certa/errada |
| Animações | Só `transform`/`opacity` (GPU): troca de aba, abertura de modal, cartão de login; respeitam "reduzir movimento" | — |
| Celular | Botão de ação fixo (Novo agendamento / Nova cliente / …) por aba; avisos sobem acima dele; linhas da tabela 170 px → 69 px | 375 px sem rolagem horizontal |
| Erros | `404.html` (Vercel usa sozinha) e variações `?e=403`, `?e=500`, `?e=offline` | — |
| LGPD | Política: dados sensíveis/menores, medidas de proteção, encarregado, leis aplicáveis. Novo `termos.html` (Termos de Uso da equipe) | — |
| Banco (RLS) | `supabase/rls.sql`: RLS ligado e acesso `anon`/`authenticated` revogado | ❌ **Pendente**: o banco estava hibernado e não respondeu; rodar o SQL no painel do Supabase |
| Botões | Clique automático em todos os botões das 10 abas, menu, modais e caixa | 112 + 73 + 45 cliques, 0 erros; corrigido "copiar mural" que falhava em silêncio |
