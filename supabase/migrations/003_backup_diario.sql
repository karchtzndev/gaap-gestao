-- Backup diário automático (pg_cron, 03:00 de Brasília) guardado em 30 posições + 10 manuais.
-- ping() é chamado pelo GitHub Actions para o projeto gratuito não pausar.

create extension if not exists pg_cron;

create table if not exists public.backups (
  slot integer primary key,
  criado_em timestamptz not null default now(),
  origem text not null,
  registros integer not null default 0,
  dados jsonb not null
);
alter table public.backups enable row level security;
-- sem policies: só as funções abaixo leem/gravam

create or replace function public.fazer_backup(p_origem text default 'automatico') returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v jsonb; n integer; v_slot integer; t text; v_rows jsonb;
begin
  if auth.uid() is not null and not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  v := jsonb_build_object('sistema', 'GAAP Gestão de Serviços', 'versao', 2, 'exportadoEm', now(), 'origem', p_origem);
  n := 0;
  foreach t in array array['config','apontamentos','orcamentos','recebimentos','fechamentos'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(data || jsonb_build_object(''id'', id) order by id), ''[]''::jsonb) from public.%I', t) into v_rows;
      if t = 'config' then
        v := v || jsonb_build_object('config', coalesce((select data from public.config where id = 'main'), '{}'::jsonb));
      else
        v := v || jsonb_build_object(t, v_rows); n := n + jsonb_array_length(v_rows);
      end if;
    end if;
  end loop;
  v := v || jsonb_build_object('perfis', coalesce((select jsonb_agg(to_jsonb(p) order by criado_em) from public.perfis p), '[]'::jsonb));
  v := v || jsonb_build_object('fotos', coalesce((select jsonb_agg(name order by name) from storage.objects where bucket_id = 'fotos'), '[]'::jsonb));
  -- 30 posições (uma por dia) + 10 posições para backups manuais
  if p_origem = 'automatico' then v_slot := (extract(doy from now())::integer % 30);
  else v_slot := 100 + (extract(epoch from now())::bigint / 60 % 10)::integer; end if;
  insert into public.backups (slot, criado_em, origem, registros, dados) values (v_slot, now(), p_origem, n, v)
    on conflict (slot) do update set criado_em = excluded.criado_em, origem = excluded.origem, registros = excluded.registros, dados = excluded.dados;
  return now();
end $$;

create or replace function public.listar_backups() returns table(slot integer, criado_em timestamptz, origem text, registros integer, tamanho integer)
language sql stable security definer set search_path = public as $$
  select b.slot, b.criado_em, b.origem, b.registros, octet_length(b.dados::text) from public.backups b
  where public.is_dono() order by b.criado_em desc
$$;

create or replace function public.ler_backup(p_slot integer) returns jsonb
language sql stable security definer set search_path = public as $$
  select b.dados from public.backups b where b.slot = p_slot and public.is_dono()
$$;

create or replace function public.ping() returns text language sql stable as $$ select 'ok'::text $$;

revoke execute on function public.fazer_backup(text), public.listar_backups(), public.ler_backup(integer), public.ping() from public, anon;
grant execute on function public.fazer_backup(text), public.listar_backups(), public.ler_backup(integer) to authenticated;
grant execute on function public.ping() to anon, authenticated;

select cron.schedule('gaap-backup-diario', '0 6 * * *', $$select public.fazer_backup('automatico')$$);
select public.fazer_backup('automatico');
