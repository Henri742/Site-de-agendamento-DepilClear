# DepilClear: dados na nuvem, offline, mural ao vivo, painel de usuários

## Por quê
O sistema vai substituir o SGBR (depois de dezembro). Hoje tudo fica só no navegador de cada computador,
então não há dados compartilhados nem backup. Uso real: 2–3 computadores + 2–3 celulares vendo os mesmos dados ao mesmo tempo,
mais de 1000 clientes vindos do SGBR.

## Objetivos
- Dados compartilhados entre todos os aparelhos, atualizados ao vivo (menos de 1 s).
- Funciona offline: grava no aparelho, mostra "Offline · N pendentes" e envia quando a conexão volta.
- Painel de usuários (só administradora): criar, editar, desativar e trocar senha. As mudanças valem na hora.
- Mural ao vivo para depiladoras (só leitura).
- Importar clientes do SGBR ou de qualquer planilha (CSV/XLSX).
- Backup diário automático (06:00) e backup manual para baixar.
- Visual novo, sem perder nenhuma função.

## Fora do escopo agora
- Instalador `.exe` (Tauri/Electron). O app instalado pelo Edge/Chrome já é o "software": ícone, janela própria, offline,
  e se atualiza sozinho de graça a cada publicação.
- Google Drive (o backup fica no Supabase Storage e também pode ser baixado).

## Abordagens consideradas
1. **Tabela única de documentos + camada de sincronização (escolhida).** Cada item (cliente, agendamento, venda…) vira uma linha
   `registros(colecao, id, dados jsonb)`. O app continua usando as mesmas listas; um `sync.js` detecta o que mudou,
   guarda numa fila e envia. Recebe as mudanças dos outros aparelhos pelo Supabase Realtime. Mantém as 4400 linhas de lógica que já funcionam.
2. Reescrever com tabelas normalizadas e consultas diretas. Mais "certinho", mas reescreve todo o app e atrasa a troca de sistema.
3. Banco local + arquivo no Drive. Não atende vários aparelhos ao mesmo tempo.

## Desenho
- **Login:** Supabase Auth (senhas com bcrypt, gerenciadas pelo Supabase). A sessão fica salva no aparelho para abrir offline.
  Os usuários atuais são migrados com o mesmo hash, então as senhas continuam as mesmas.
- **Perfis:** `perfis(user_id, nome, funcao: admin|recepcao|depiladora, ativo)`. RLS: só perfis ativos leem;
  só admin e recepção gravam; depiladora lê apenas o que o mural usa.
- **Gravação:** RPC `sincronizar(lote)`. Grava somente se `alterado_em` do aparelho for mais novo (a última edição vence, por item).
  Exclusão = marca `excluido`.
- **Leitura:** carga incremental por `atualizado_em` e, depois, Realtime.
- **Fila offline:** salva no aparelho, enviada em lotes de 500.
- **Usuários:** `/api/usuarios`, com chave de serviço, aceito só para admin. Ao desativar: bloqueia no Auth e marca `ativo=false`
  (o Realtime desconecta a pessoa).
- **Mural:** a depiladora entra direto no mural, em tela cheia e sem edição.
- **Importação:** reconhece automaticamente as colunas (nome, celular, telefone, CPF, nascimento, e-mail, endereço…), mostra uma prévia
  e ignora duplicadas por telefone ou CPF.
- **Backup:** cron da Vercel chama `/api/backup` e grava o JSON no bucket privado `backups`. Mantém 30 dias.

## Limites conhecidos
- Cópia local em localStorage (~5 MB). Com muitos anos de histórico, o próximo passo é IndexedDB.
- Duas pessoas editando a MESMA cliente offline: fica a edição mais recente.
