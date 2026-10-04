-- Histórico de alterações (gatilho em todas as tabelas) e lixeira para restaurar.

create table if not exists public.historico (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null,
  antes jsonb,
  depois jsonb,
  quem uuid default auth.uid(),
  quem_nome text,
  quando timestamptz not null default now()
);
create index if not exists historico_registro on public.historico (tabela, registro_id, quando desc);
create index if not exists historico_acao on public.historico (acao, quando desc);
alter table public.historico enable row level security;
-- sem policies: leitura só pelas funções do responsável

create or replace function public.registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  select coalesce(nome, email) into v_nome from public.perfis where user_id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.historico (tabela, registro_id, acao, depois, quem_nome) values (tg_table_name, new.id, 'insert', new.data, coalesce(v_nome, 'sistema'));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.data is distinct from old.data then
      insert into public.historico (tabela, registro_id, acao, antes, depois, quem_nome)
        values (tg_table_name, new.id, case when (new.data->>'excluido')::boolean is true and coalesce((old.data->>'excluido')::boolean, false) = false then 'excluido' else 'update' end, old.data, new.data, coalesce(v_nome, 'sistema'));
    end if;
    return new;
  else
    insert into public.historico (tabela, registro_id, acao, antes, quem_nome) values (tg_table_name, old.id, 'delete', old.data, coalesce(v_nome, 'sistema'));
    return old;
  end if;
end $$;
revoke execute on function public.registrar_historico() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['apontamentos','orcamentos','recebimentos','fechamentos','despesas','config'] loop
    execute format('create trigger historico after insert or update or delete on public.%I for each row execute function public.registrar_historico()', t);
  end loop;
end $$;

create or replace function public.historico_de(p_tabela text, p_id text)
returns table(id bigint, acao text, antes jsonb, depois jsonb, quem_nome text, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select h.id, h.acao, h.antes, h.depois, h.quem_nome, h.quando from public.historico h
  where public.is_dono() and h.tabela = p_tabela and h.registro_id = p_id order by h.quando desc limit 50
$$;

-- itens apagados (pelo responsável) ou excluídos (pelo funcionário) que ainda não voltaram
create or replace function public.lixeira(p_dias integer default 90)
returns table(tabela text, registro_id text, dados jsonb, quem_nome text, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (h.tabela, h.registro_id) h.tabela, h.registro_id, coalesce(h.antes, h.depois), h.quem_nome, h.quando
  from public.historico h
  where public.is_dono() and h.acao in ('delete','excluido') and h.tabela <> 'config' and h.quando > now() - make_interval(days => p_dias)
    and case h.tabela
      when 'apontamentos' then not exists (select 1 from public.apontamentos a where a.id = h.registro_id and coalesce((a.data->>'excluido')::boolean,false) = false)
      when 'orcamentos' then not exists (select 1 from public.orcamentos x where x.id = h.registro_id)
      when 'recebimentos' then not exists (select 1 from public.recebimentos x where x.id = h.registro_id)
      when 'fechamentos' then not exists (select 1 from public.fechamentos x where x.id = h.registro_id)
      when 'despesas' then not exists (select 1 from public.despesas x where x.id = h.registro_id)
      else false end
  order by h.tabela, h.registro_id, h.quando desc
$$;
revoke execute on function public.historico_de(text, text), public.lixeira(integer) from public, anon;
grant execute on function public.historico_de(text, text), public.lixeira(integer) to authenticated;
