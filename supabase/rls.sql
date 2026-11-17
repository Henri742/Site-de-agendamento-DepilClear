-- RLS: o navegador NUNCA fala direto com o Supabase; só as rotas /api (service role, que ignora RLS).
-- Portanto: RLS ligado e NENHUMA política para anon/authenticated = acesso público negado.
alter table public.usuarios enable row level security;
alter table public.fidelidade_pontos enable row level security;
revoke all on public.usuarios from anon, authenticated;
revoke all on public.fidelidade_pontos from anon, authenticated;
