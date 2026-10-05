-- Controle de versão: quem salva por cima de uma alteração mais nova recebe CONFLITO.
-- Também: gravação do dono por RPC, empresa padrão no servidor, marca de backup baixado,
-- cópia antes de importar e exclusões desde uma data (para a atualização incremental).

-- dono: grava um documento conferindo a versão (p_versao = atualizado_em lido; null = novo/sem conferência)
create or replace function public.salvar_doc(p_tabela text, p_id text, p_data jsonb, p_versao timestamptz default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_atual timestamptz; v_novo timestamptz;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_tabela not in ('apontamentos','orcamentos','recebimentos','fechamentos','despesas','config') then raise exception 'DADOS_INVALIDOS'; end if;
  if p_id !~ '^[A-Za-z0-9_-]{1,64}$' or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'DADOS_INVALIDOS'; end if;
  execute format('select atualizado_em from public.%I where id = $1 for update', p_tabela) into v_atual using p_id;
  if v_atual is not null and p_versao is not null and date_trunc('milliseconds', v_atual) <> date_trunc('milliseconds', p_versao) then
    raise exception 'CONFLITO';
  end if;
  if v_atual is null and p_versao is not null then raise exception 'CONFLITO'; end if; -- excluído em outro aparelho
  if v_atual is null then
    execute format('insert into public.%I (id, data) values ($1, $2) returning atualizado_em', p_tabela) into v_novo using p_id, p_data;
  else
    execute format('update public.%I set data = $2 where id = $1 returning atualizado_em', p_tabela) into v_novo using p_id, p_data;
  end if;
  return v_novo;
end $$;

-- funcionário: minhas_os devolve a versão dentro do registro (_v)
create or replace function public.minhas_os() returns table(id text, data jsonb)
language sql stable security definer set search_path = public as $$
  select a.id, (a.data - 'valorHora' - 'extraPct' - 'feriadoPct') || jsonb_build_object('_v', a.atualizado_em)
  from public.apontamentos a
  join public.perfis p on p.user_id = auth.uid()
  where p.papel = 'funcionario' and p.nome is not null and a.profissional = p.nome
    and coalesce((a.data->>'excluido')::boolean, false) = false
$$;

-- funcionário: confere a versão (_v) e devolve "id|nova_versao"
do $$ begin
  execute replace(replace(pg_get_functiondef('public.func_salvar_os(text, jsonb)'::regprocedure),
    $x$    if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;$x$,
    $x$    if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;
    if p_data ? '_v' and coalesce(p_data->>'_v','') <> '' and date_trunc('milliseconds', (select atualizado_em from public.apontamentos where id = p_id)) <> date_trunc('milliseconds', (p_data->>'_v')::timestamptz) then raise exception 'CONFLITO'; end if;$x$),
    $x$    update public.apontamentos set data = d where id = p_id;
    return p_id;$x$,
    $x$    update public.apontamentos set data = d where id = p_id;
    return p_id || '|' || (select atualizado_em from public.apontamentos where id = p_id)::text;$x$);
end $$;

-- empresa padrão aplicada no servidor (não regrava OS a partir de cópia velha)
create or replace function public.aplicar_empresa_padrao(p_emp text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.apontamentos set data = data || jsonb_build_object('empresa', p_emp)
    where coalesce(data->>'empresa','') = '' and coalesce((data->>'excluido')::boolean, false) = false;
  get diagnostics n = row_count; return n;
end $$;

-- marca só o campo de backup baixado
create or replace function public.marcar_backup_baixado() returns timestamptz
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.config set data = jsonb_set(data, '{backupBaixadoEm}', to_jsonb(now()::text)) where id = 'main';
  return now();
end $$;

-- exclusões desde uma data (para a atualização incremental do app)
create or replace function public.excluidos_desde(p_desde timestamptz)
returns table(tabela text, registro_id text) language sql stable security definer set search_path = public as $$
  select distinct h.tabela, h.registro_id from public.historico h
  where public.is_dono() and h.acao = 'delete' and h.quando > p_desde
$$;

-- cópia antes de importar: posição própria (não é sobrescrita pelas manuais)
do $$ begin
  execute replace(pg_get_functiondef('public.fazer_backup(text)'::regprocedure),
    $x$  if p_origem = 'automatico' then v_slot := (extract(doy from now())::integer % 30);$x$,
    $x$  if p_origem = 'automatico' then v_slot := (extract(doy from now())::integer % 30);
  elsif p_origem = 'pre-importacao' then v_slot := 99;$x$);
end $$;

revoke execute on function public.salvar_doc(text, text, jsonb, timestamptz), public.aplicar_empresa_padrao(text),
  public.marcar_backup_baixado(), public.excluidos_desde(timestamptz) from public, anon;
grant execute on function public.salvar_doc(text, text, jsonb, timestamptz), public.aplicar_empresa_padrao(text),
  public.marcar_backup_baixado(), public.excluidos_desde(timestamptz) to authenticated;

-- relógio real (clock_timestamp) para a versão mudar a cada gravação
create or replace function public.tocar_atualizado() returns trigger
language plpgsql set search_path = public as $$
begin new.atualizado_em := clock_timestamp(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['config','apontamentos','orcamentos','recebimentos','fechamentos','despesas'] loop
    execute format('alter table public.%I alter column atualizado_em set default clock_timestamp()', t);
  end loop;
end $$;
