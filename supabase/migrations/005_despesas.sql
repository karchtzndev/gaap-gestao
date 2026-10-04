-- Despesas e deslocamento (km) por OS/orçamento; incluídas no backup diário.
create table if not exists public.despesas (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.despesas enable row level security;
create policy "somente o responsavel" on public.despesas for all to authenticated using (public.is_dono()) with check (public.is_dono());
create trigger atualizado before update on public.despesas for each row execute function public.tocar_atualizado();

do $$ begin
  execute replace(pg_get_functiondef('public.fazer_backup(text)'::regprocedure),
    $x$array['config','apontamentos','orcamentos','recebimentos','fechamentos']$x$,
    $x$array['config','apontamentos','orcamentos','recebimentos','fechamentos','despesas']$x$);
end $$;
