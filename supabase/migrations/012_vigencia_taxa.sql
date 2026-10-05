-- 012: valor da hora com vigência (reajuste) também nos lançamentos dos funcionários.
-- config.taxas[empresa] = {valorHora, extraPct, feriadoPct, desde, historico:[{ate, valorHora, extraPct, feriadoPct}]}
-- Para um dia anterior a "desde", vale a faixa do histórico com o menor "ate" maior que o dia.
create or replace function public.taxa_empresa(p_emp text, p_dia text) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (select coalesce((select data from public.config where id = 'main'), '{}'::jsonb) as c),
  t as (
    select c.c, coalesce(
      (select h from jsonb_array_elements(case when jsonb_typeof(c.c->'taxas'->p_emp->'historico')='array' then c.c->'taxas'->p_emp->'historico' else '[]'::jsonb end) h
        where p_dia is not null and coalesce(c.c->'taxas'->p_emp->>'desde','') <> '' and p_dia < c.c->'taxas'->p_emp->>'desde' and p_dia < h->>'ate'
        order by h->>'ate' limit 1),
      c.c->'taxas'->p_emp, '{}'::jsonb) as t
    from c)
  select jsonb_build_object(
    'valorHora', coalesce(public.num_ou_nulo(t->>'valorHora'), public.num_ou_nulo(c->>'valorHora'), 60),
    'extraPct', coalesce(public.num_ou_nulo(t->>'extraPct'), public.num_ou_nulo(c->>'extraPct'), 50),
    'feriadoPct', coalesce(public.num_ou_nulo(t->>'feriadoPct'), public.num_ou_nulo(c->>'feriadoPct'), 100))
  from t
$$;
revoke execute on function public.taxa_empresa(text, text) from public, anon, authenticated;

create or replace function public.func_salvar_os(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_f text; v_id text; v_emp text; v_old_emp text; d jsonb;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_id is not null and p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'ID_INVALIDO'; end if;
  if p_id is not null then select data into v_old from public.apontamentos where id = p_id; end if;
  d := public.limpar_os(p_data, v_old) || jsonb_build_object('profissional', v_nome, 'lancadoPor', 'funcionario', 'tipo', 'auto');
  v_emp := coalesce(nullif(d->>'empresa',''), public.empresa_padrao());
  if public.exige_os(v_emp) and btrim(coalesce(d->>'os','')) = '' then raise exception 'OS_OBRIGATORIA'; end if;
  v_f := public.periodo_fechado(d->>'data', v_emp);
  if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
  if v_old is not null then
    if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;
    if p_data ? '_v' and coalesce(p_data->>'_v','') <> '' and date_trunc('milliseconds', (select atualizado_em from public.apontamentos where id = p_id)) <> date_trunc('milliseconds', (p_data->>'_v')::timestamptz) then raise exception 'CONFLITO'; end if;
    v_old_emp := coalesce(nullif(v_old->>'empresa',''), public.empresa_padrao());
    v_f := public.periodo_fechado(v_old->>'data', v_old_emp);
    if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
    if v_old ? 'valorHora' and public.chave_empresa(v_old_emp) = public.chave_empresa(v_emp) and (v_old->>'data') is not distinct from (d->>'data') then
      d := d || jsonb_strip_nulls(jsonb_build_object('valorHora', v_old->'valorHora', 'extraPct', v_old->'extraPct', 'feriadoPct', v_old->'feriadoPct'));
    else
      d := d || public.taxa_empresa(v_emp, d->>'data');
    end if;
    update public.apontamentos set data = d where id = p_id;
    return p_id || '|' || (select atualizado_em from public.apontamentos where id = p_id)::text;
  end if;
  d := d || public.taxa_empresa(v_emp, d->>'data');
  insert into public.apontamentos (id, data, autor) values (coalesce(p_id, gen_random_uuid()::text), d, auth.uid())
    returning id into v_id;
  return v_id;
end $$;
