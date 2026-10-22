-- 034: registro silencioso de acessos ao app (login / abertura), visível só para o responsável
create table if not exists public.acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text,
  usuario text,
  aparelho text,
  quando timestamptz not null default now()
);
create index if not exists acessos_quando_idx on public.acessos (quando desc);
create index if not exists acessos_user_idx on public.acessos (user_id, quando desc);
alter table public.acessos enable row level security;
-- sem policies: só as funções security definer abaixo (e o service role) acessam a tabela

-- grava um acesso da própria pessoa logada (chamado em silêncio pelo app)
create or replace function public.registrar_acesso(p_aparelho text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.acessos (user_id, nome, usuario, aparelho)
  select auth.uid(),
    (select nome from public.perfis where user_id = auth.uid()),
    (select usuario from public.usuarios_login where user_id = auth.uid()),
    left(coalesce(p_aparelho, ''), 120);
end $$;
revoke execute on function public.registrar_acesso(text) from public, anon;
grant execute on function public.registrar_acesso(text) to authenticated;

-- leitura dos acessos: somente o responsável
create or replace function public.acessos_recentes(p_dias int default 60)
returns table(user_id uuid, nome text, usuario text, aparelho text, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select a.user_id, a.nome, a.usuario, a.aparelho, a.quando
  from public.acessos a
  where public.is_dono()
    and a.quando > now() - make_interval(days => least(greatest(p_dias, 1), 365))
  order by a.quando desc limit 1000
$$;
revoke execute on function public.acessos_recentes(int) from public, anon;
grant execute on function public.acessos_recentes(int) to authenticated;
