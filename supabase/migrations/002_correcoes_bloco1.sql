-- Correções: OS sem duplicar, tipo travado e valor da hora gravado no servidor para o funcionário,
-- fotos visíveis só para quem tem direito, renomear funcionário, contratante Brejeiro.

create or replace function public.num_ou_nulo(v text) returns numeric
language sql immutable set search_path = public as $$
  select case when btrim(coalesce(v,'')) ~ '^-?[0-9]+([.][0-9]+)?$' then btrim(v)::numeric end
$$;

create or replace function public.taxa_empresa(p_emp text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'valorHora', coalesce(public.num_ou_nulo(c->'taxas'->p_emp->>'valorHora'), public.num_ou_nulo(c->>'valorHora'), 60),
    'extraPct', coalesce(public.num_ou_nulo(c->'taxas'->p_emp->>'extraPct'), public.num_ou_nulo(c->>'extraPct'), 50),
    'feriadoPct', coalesce(public.num_ou_nulo(c->'taxas'->p_emp->>'feriadoPct'), public.num_ou_nulo(c->>'feriadoPct'), 100))
  from (select coalesce((select data from public.config where id = 'main'), '{}'::jsonb) as c) x
$$;

create or replace function public.func_salvar_os(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_f text; v_id text; v_emp text; v_old_emp text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if coalesce(p_data->>'data','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'DATA_INVALIDA'; end if;
  p_data := (p_data - 'valorHora' - 'extraPct' - 'feriadoPct' - 'excluido' - 'tipo')
            || jsonb_build_object('profissional', v_nome, 'lancadoPor', 'funcionario', 'tipo', 'auto');
  v_emp := coalesce(nullif(p_data->>'empresa',''), public.empresa_padrao());
  v_f := public.periodo_fechado(p_data->>'data', v_emp);
  if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
  if p_id is not null then
    select data into v_old from public.apontamentos where id = p_id;
    if found then
      if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;
      v_old_emp := coalesce(nullif(v_old->>'empresa',''), public.empresa_padrao());
      v_f := public.periodo_fechado(v_old->>'data', v_old_emp);
      if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
      if v_old ? 'valorHora' and v_old_emp = v_emp then
        p_data := p_data || jsonb_strip_nulls(jsonb_build_object('valorHora', v_old->'valorHora', 'extraPct', v_old->'extraPct', 'feriadoPct', v_old->'feriadoPct'));
      else
        p_data := p_data || public.taxa_empresa(v_emp);
      end if;
      update public.apontamentos set data = p_data where id = p_id;
      return p_id;
    end if;
  end if;
  p_data := p_data || public.taxa_empresa(v_emp);
  insert into public.apontamentos (id, data, autor) values (coalesce(p_id, gen_random_uuid()::text), p_data, auth.uid())
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.pode_ver_foto(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_dono()
    or split_part(p_name, '/', 1) = auth.uid()::text
    or exists (select 1 from public.apontamentos a join public.perfis p on p.user_id = auth.uid() and p.papel = 'funcionario'
               where a.profissional = p.nome and a.data->'fotos' ? p_name)
$$;
alter policy "fotos: ver" on storage.objects using (bucket_id = 'fotos' and public.pode_ver_foto(name));

create or replace function public.renomear_profissional(p_antigo text, p_novo text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer; c jsonb; lst text;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  p_novo := btrim(coalesce(p_novo,''));
  if p_novo = '' or p_antigo is null then raise exception 'NOME_VAZIO'; end if;
  update public.apontamentos set data = jsonb_set(data, '{profissional}', to_jsonb(p_novo)) where data->>'profissional' = p_antigo;
  get diagnostics n = row_count;
  update public.perfis set nome = p_novo where nome = p_antigo;
  select data into c from public.config where id = 'main';
  if c is not null then
    select string_agg(case when btrim(l) = p_antigo then p_novo else l end, E'\n') into lst
      from unnest(string_to_array(coalesce(c->>'profissionais',''), E'\n')) as l;
    c := jsonb_set(c, '{profissionais}', to_jsonb(coalesce(lst,'')));
    if coalesce(c->'custos','{}'::jsonb) ? p_antigo then
      c := jsonb_set(c, array['custos', p_novo], c->'custos'->p_antigo) #- array['custos', p_antigo];
    end if;
    update public.config set data = c where id = 'main';
  end if;
  return n;
end $$;

revoke execute on function public.num_ou_nulo(text), public.taxa_empresa(text), public.pode_ver_foto(text), public.renomear_profissional(text, text) from public, anon;
revoke execute on function public.num_ou_nulo(text), public.taxa_empresa(text) from authenticated;
grant execute on function public.pode_ver_foto(text), public.renomear_profissional(text, text) to authenticated;

insert into public.config (id, data) values ('main', '{"contratante":"Brejeiro","empresas":"Brejeiro","tolerancia":5}'::jsonb)
on conflict (id) do nothing;
