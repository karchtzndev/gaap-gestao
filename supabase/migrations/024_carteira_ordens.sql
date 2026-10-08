-- 024: carteira de OS recebidas (o papel/tela do TracOS vira uma OS "recebida" antes de qualquer lançamento).
-- Responsável: tudo pela salvar_doc. Funcionário: vê a carteira e cadastra/conclui pelas funções abaixo (não apaga).
create table if not exists public.ordens (id text primary key default gen_random_uuid()::text check (id ~ '^[A-Za-z0-9_-]{1,64}$'), data jsonb not null, atualizado_em timestamptz not null default clock_timestamp());
alter table public.ordens enable row level security;
create policy "somente o responsavel" on public.ordens for all to authenticated using ((select public.is_dono())) with check ((select public.is_dono()));
create trigger atualizado before update on public.ordens for each row execute function public.tocar_atualizado();
create trigger historico after insert or update or delete on public.ordens for each row execute function public.registrar_historico();

do $$ begin
  execute replace(pg_get_functiondef('public.salvar_doc(text, text, jsonb, timestamptz)'::regprocedure),
    $x$'pagamentos','equipamentos','documentos')$x$, $x$'pagamentos','equipamentos','documentos','ordens')$x$);
  execute replace(pg_get_functiondef('public.fazer_backup(text)'::regprocedure),
    $x$'pagamentos','equipamentos','documentos']$x$, $x$'pagamentos','equipamentos','documentos','ordens']$x$);
end $$;

-- campos aceitos de uma OS da carteira
create or replace function public.limpar_ordem(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'os', public.txt(p,'os',40), 'tracos', public.txt(p,'tracos',40), 'titulo', public.txt(p,'titulo',300),
    'unidade', public.txt(p,'unidade',120), 'empresa', public.txt(p,'empresa',120),
    'nota', case when coalesce(p->>'nota','') ~ '^[0-9]{1,14}$' then p->>'nota' end,
    'vencimento', case when coalesce(p->>'vencimento','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then p->>'vencimento' end,
    'prioridade', public.txt(p,'prioridade',40), 'categoria', public.txt(p,'categoria',80), 'obs', public.txt(p,'obs',500),
    'foto', case when coalesce(p->>'foto','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$' then p->>'foto' end,
    'concluida', case when coalesce(p->>'concluida','') = 'true' then true end,
    'concluidaEm', public.txt(p,'concluidaEm',40), 'atualizadoEm', public.txt(p,'atualizadoEm',40)))
$$;

create or replace function public.minhas_ordens() returns table(id text, data jsonb, atualizado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.data, o.atualizado_em from public.ordens o
  where coalesce(public.meu_papel(), '') in ('dono','funcionario') and coalesce((o.data->>'arquivada')::boolean, false) = false
  order by o.atualizado_em desc limit 3000
$$;

create or replace function public.func_salvar_ordem(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; d jsonb;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'ID_INVALIDO'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or coalesce(btrim(p_data->>'os'), '') = '' then raise exception 'DADOS_INVALIDOS'; end if;
  select data into v_old from public.ordens where id = p_id;
  d := public.limpar_ordem(p_data);
  -- a foto só pode ser da pasta do próprio funcionário (ou a que já estava)
  if d ? 'foto' and split_part(d->>'foto', '/', 1) <> auth.uid()::text and d->>'foto' is distinct from v_old->>'foto' then d := d - 'foto'; end if;
  if v_old is not null then
    d := v_old || d || jsonb_build_object('recebidaPor', v_old->'recebidaPor', 'recebidaEm', v_old->'recebidaEm');
    if coalesce(p_data->>'concluida','') <> 'true' then d := d - 'concluida' - 'concluidaEm'; else d := d || jsonb_build_object('concluidaPor', v_nome); end if;
    update public.ordens set data = jsonb_strip_nulls(d) where id = p_id;
  else
    d := d || jsonb_build_object('recebidaPor', v_nome, 'recebidaEm', now()::text);
    insert into public.ordens (id, data) values (p_id, d);
  end if;
  return p_id || '|' || (select atualizado_em from public.ordens where id = p_id)::text;
end $$;

revoke execute on function public.limpar_ordem(jsonb), public.minhas_ordens(), public.func_salvar_ordem(text, jsonb) from public, anon;
grant execute on function public.minhas_ordens(), public.func_salvar_ordem(text, jsonb) to authenticated;
