# Relatório de Segurança — DepilClear

Escopo: `index.html`, `app.js`, `caixa.html`, `caixa.js`, `security.js` (novo), `sw.js`, `vercel.json` (novo) e `/api` (`_auth`, `_ratelimit` (novo), `me` (novo), `login`, `whatsapp`, `fidelidade`).

## (a) Vulnerabilidades e como foram corrigidas

| # | Gravidade | Problema | Correção (arquivo / função) |
|---|---|---|---|
| 1 | Crítico | Bastava criar `depilclear_active_session` no DevTools para entrar | Flag removida. `checkUserSession()` (app.js) e `guardCaixaSession()` (caixa.js) agora são `async` e chamam `validateSession()` (security.js) → `GET /api/me` (api/me.js), que valida assinatura HS256 + `exp`. Falha/401/expirado → limpa a sessão e volta ao login. |
| 1c | Crítico | Offline liberava tudo | Offline só entra se houve validação bem-sucedida nesta aba há < 8 h (`depilclear_session_validated`, gravado só após 200 em `/api/me` ou no login). |
| 2 | Crítico | XSS: ~220 interpolações em `innerHTML` sem escape | `escapeHtml` única em `security.js` (também escapa `` ` ``). Varredura por analisador de JS (todas as template strings em contexto HTML) + revisão manual dos casos especiais. Teste dinâmico com payloads em **todos** os campos nas duas páginas (ver checklist). |
| 2 | Crítico | Dados dentro de `onclick="fn('${x}')"`: `escapeHtml` **não basta** (o navegador decodifica `&#39;` antes de executar o JS) | Strings usam `jsStr()` (tudo fora de `[A-Za-z0-9 _.-]` vira `\xHH`); ids usam `Number()`. |
| 2b | Crítico | `img src` com `logoUrl`/foto aceitava `javascript:` e `data:text/html` | `safeImageSrc()`: só `data:image/(png|jpg|gif|webp);base64`, `https:` e arquivo local simples (SVG em `data:` é rejeitado). Upload de foto: só raster ≤ 2 MB. |
| 2c | Crítico | Cores em `style="background-color:${cor}"` | `safeColor()` aceita só `^#[0-9a-fA-F]{3,8}$`. |
| 3 | Crítico | Vendas e caixa em `localStorage` sem integridade | HMAC-SHA256 por registro + MAC da lista (`safeReadStore` / `safeWriteStore`, security.js; SHA-256 síncrona, validada contra o `crypto` do Node). Registro inválido → quarentena (`<chave>__quarantine`) + aviso visível; nunca entra nos relatórios. Dados antigos (sem assinatura) são aceitos **uma única vez** e assinados. Usado em `depilclear_sales_log`, `depilclear_cash_ops` e `depilclear_fidelity_redeemed_log`. Aviso de UI + `TODO` de migração para o back-end. |
| 4 | Alto | `lucide@latest` (supply chain) | Versão fixa `0.462.0` (arquivo `dist/umd/lucide.min.js`), `crossorigin`. **SRI: ver limitação 1.** |
| 4b | Alto | Sem CSP/cabeçalhos | `vercel.json`: CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, HSTS, COOP; `sw.js` sem cache. |
| 5 | Alto | `fidelidade.js`: qualquer logado escrevia; entradas sem validação; `err.message` vazava | GET qualquer logado; POST/DELETE só `admin` (`ADMIN_ROLES`); `clientId` inteiro, `descricao` ≤ 200, `origem` em enum, `clientName` truncado, `quantidade` 1–10; erros genéricos (detalhe só no log); log de auditoria; rate limit 30/min. |
| 5 | Alto | `login.js`: URL do Supabase fixa e fallback para chave ANON | Removidos; sem env → 500 (falha fechado). |
| 5 | Alto | Rate limit em `Map` inútil no serverless | `_ratelimit.js`: Upstash Redis (REST) se configurado; senão `Map` com TTL e teto de 5.000 entradas (limitação documentada). Login: 5 falhas → bloqueio de 15 min por IP. |
| 5 | Médio | `password.trim()` | Removido (só o e-mail é normalizado); senha limitada a 200 caracteres. |
| 5 | Médio | JWT sem `jti`; verify sem algoritmo | `jwtid: randomUUID()`, `algorithm: 'HS256'` no sign e `algorithms: ['HS256']` no verify. |
| 5 | Médio | CORS refletia a origem "padrão" e enviava `Allow-Credentials` | Origem não listada → **403**; sem `Allow-Credentials` (usamos Bearer). Origens extras via `EXTRA_ALLOWED_ORIGINS`. |
| 5 | Médio | WhatsApp: telefone pouco validado, sem auditoria | `^55\d{10,11}$`; mensagem ≤ 2000; rate limit 30/min; auditoria (usuário, telefone **mascarado**, horário, tamanho — sem o texto). Erro do gateway só no log. |
| 6 | Médio | Credenciais por HTTP | `handleLoginSubmit` exige HTTPS fora de `localhost`. |
| 6 | Médio | 401 não deslogava | `authFetch` intercepta 401 → `handleLogout()`. |
| 6 | Baixo | Cache do SW | `depilclear-offline-v4`; comentário sobre respostas opacas de CDN. |
| 6 | Baixo | Resposta de login com id interno | Retorna só `nome`, `email`, `funcao`. |

## (b) Limitações residuais (leia com atenção)

1. **SRI não foi aplicado com hash real** — este ambiente não tem internet para baixar os arquivos e calcular o SHA-384; inventar um hash faria o navegador **bloquear** o script. As tags estão com versão fixa, `crossorigin` e `data-sri-pending` (e a `xlsx`, em `<meta name="lazy-xlsx">`). Rode uma vez, com internet: `node tools/generate-sri.mjs` (grava o `integrity` real; a URL do Lucide `0.462.0/dist/umd/lucide.min.js` é validada nesse momento — se der 404, ajuste a versão).
2. ~~Tailwind CDN sem SRI~~ **Resolvido**: o CSS agora é compilado (`tailwind.css`, `npm run build:css`) e o host do Tailwind saiu da CSP. A biblioteca `xlsx` é carregada sob demanda; o `tools/generate-sri.mjs` também grava o hash dela.
3. **A CSP ainda precisa de `'unsafe-inline'`** (há ~150 handlers `onclick="..."` e scripts inline). Isso enfraquece a CSP como defesa contra XSS; por isso o escape na saída é a defesa principal. Evolução: trocar handlers por `addEventListener` e usar nonce/hash.
4. **localStorage nunca é seguro contra adulteração determinada.** O segredo do HMAC está no JavaScript: quem lê `security.js` consegue assinar registros falsos. O HMAC barra edição casual/acidental no DevTools, não um adversário com conhecimento. Exclusão/reordenação de registros só gera aviso (MAC da lista). Dados pessoais (CPF, telefone…) continuam em texto puro no navegador.
5. **Validação offline:** sem rede não há como provar a assinatura do token; o marcador de sessão validada é uma barreira de conveniência (quem forjar token + marcador entra *enquanto offline*; assim que houver rede, `/api/me` nega).
6. **Rate limit sem Upstash** é por instância (melhor esforço). Configure `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Limite por IP depende de `x-forwarded-for` da Vercel; atrás de NAT, usuários legítimos compartilham o contador.
7. **Revogação de token:** o `jti` já existe, mas não há lista de revogação; logout limpa só o navegador (o token vale até 8 h).
8. **Lembretes/mensagens agendadas** só rodam com o sistema aberto (não há servidor 24 h).
9. **`ADMIN_ROLES`**: o padrão é `admin`. Se a coluna `funcao` do seu banco usar outro valor, configure a variável, senão POST/DELETE em `/api/fidelidade` retornam 403 (hoje o front não usa essa rota).

## Plano de migração resumido (dados → Supabase)

1. Tabelas: `clientes`, `servicos`, `categorias`, `profissionais`, `agendamentos`, `vendas`, `itens_venda`, `operacoes_caixa`, `fidelidade_pontos`, com RLS (`auth.uid()` / papel).
2. Gravar vendas e caixa **somente por API** (`/api/vendas`, `/api/caixa`) que valida entrada e usa a service role no servidor; o navegador passa a ser só cache de leitura.
3. Migrar com um botão "Enviar dados locais" (lê `safeReadStore`, envia em lote, marca como migrado).
4. Só então remover o HMAC local. Esta mesma migração habilita o **site do tablet** com atualização em tempo real (Supabase Realtime).

## (c) Checklist de testes manuais

**Autenticação**
- [ ] No DevTools: `sessionStorage.setItem('depilclear_active_session','true')` e recarregar → continua no **login**.
- [ ] `sessionStorage.setItem('depilclear_token','aaa.bbb.ccc')` → login (token inválido).
- [ ] Logar, copiar o token, trocar o último trecho da assinatura, recarregar → login (servidor responde 401).
- [ ] Logar normalmente → dashboard; abrir `caixa.html` → abre. Em aba anônima, abrir `caixa.html` direto → vai ao login.
- [ ] Logar, DevTools → Network → Offline, recarregar → continua (validação prévia < 8 h). Em aba nova, só com token colado e Offline → não entra.
- [ ] Acessar o site por `http://` (domínio, não localhost) e tentar logar → recusado com aviso de HTTPS.
- [ ] Fazer uma chamada com token expirado (apague o segredo/altere `exp`) → logout automático com aviso.

**XSS** (cadastre `"><img src=x onerror=alert(1)>` e `<svg onload=alert(1)>` como nome de cliente, serviço, categoria, depiladora, nome da empresa e descrição de modelo)
- [ ] Percorrer Agenda, Mural, Clientes, Serviços, Categorias, Depiladoras, Fidelidade, Relatórios (imprimir/pré-visualizar), menu de clique direito, perfil da cliente → **nenhum alerta**, o texto aparece literal.
- [ ] No caixa: buscar/adicionar o serviço, selecionar a cliente, Histórico de notas, fechamento → nenhum alerta.
- [ ] Depiladora com nome `');alert(1);//` → clicar no card dela no agendamento → nada executa.
- [ ] `companyConfig.logoUrl='javascript:alert(1)'` (console) e recarregar → logo padrão.

**Integridade**
- [ ] No caixa, fechar uma venda. DevTools → Application → `depilclear_sales_log`: mudar `finalTotal`, recarregar o caixa → faixa vermelha de aviso, venda some do histórico/relatório, aparece em `depilclear_sales_log__quarantine`.
- [ ] Acrescentar à mão um registro sem `_sig` → rejeitado.

**API** (substitua `$TOKEN`)
- [ ] `curl -i https://SEU-SITE/api/me` → 401; com `-H "Authorization: Bearer $TOKEN"` → 200.
- [ ] `curl -i -X POST .../api/whatsapp -H "Origin: https://evil.com"` → 403.
- [ ] 6 logins errados seguidos → 429 na 6ª tentativa.
- [ ] `/api/whatsapp` com `phone":"123"` → 400; mais de 30 chamadas em 1 min → 429.
- [ ] `/api/fidelidade` POST com usuário não-admin → 403; `origem":"x"` → 400.
- [ ] Derrubar o Supabase (env errada) e chamar `/api/fidelidade` → resposta genérica, sem texto do banco.

**Cabeçalhos / CSP**
- [ ] Após o deploy, DevTools → Console: nenhum "Refused to load…". Se aparecer, ajuste o host em `vercel.json`. Rollout seguro: troque a chave por `Content-Security-Policy-Report-Only` por alguns dias.
- [ ] `curl -I https://SEU-SITE/` mostra CSP, nosniff, Referrer-Policy, Permissions-Policy.

## Implantação

1. Variáveis na Vercel: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; recomendadas `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; opcionais `ADMIN_ROLES`, `EXTRA_ALLOWED_ORIGINS`, `WPP_*`.
2. `node tools/generate-sri.mjs` (com internet) e versionar os HTMLs.
3. Deploy; recarregar 2× (o Service Worker v4 troca o cache). Quem estiver logado precisa entrar de novo (a flag antiga deixou de valer).
