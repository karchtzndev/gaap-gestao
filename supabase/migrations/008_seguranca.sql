-- Revisão de segurança:
-- * ids só com letras, números, _ e - (impede código malicioso no id)
-- * func_salvar_os aceita só campos conhecidos, com tipo e tamanho conferidos
-- * fotos do funcionário só da própria pasta (ou já existentes na OS)
-- * empresa sem diferença de maiúsculas/espaços no período fechado
-- * funcionário bloqueado não vê nem apaga fotos; ninguém além do dono apaga foto de período fechado
-- * funcionário não recebe percentuais de adicional
do $$ declare t text; begin
  foreach t in array array['apontamentos','orcamentos','recebimentos','fechamentos','despesas'] loop
    execute format('alter table public.%I add constraint %I check (id ~ ''^[A-Za-z0-9_-]{1,64}$'')', t, t || '_id_seguro');
  end loop;
end $$;

create or replace function public.chave_empresa(p text) returns text
language sql immutable set search_path = public as $$ select lower(btrim(coalesce(p, ''))) $$;

create or replace function public.empresa_canonica(p text) returns text
language sql stable security definer set search_path = public as $$
  with c as (select coalesce((select data from public.config where id = 'main'), '{}'::jsonb) d),
  nomes as (select btrim(x) n from c, unnest(string_to_array(coalesce(d->>'empresas',''), E'\n')) x
            union all select btrim(d->>'contratante') from c)
  select coalesce((select n from nomes where n <> '' and public.chave_empresa(n) = public.chave_empresa(p) limit 1), btrim(coalesce(p,'')))
$$;

create or replace function public.periodo_fechado(p_dia text, p_empresa text) returns text
language sql stable security definer set search_path = public as $$
  select data->>'numero' from public.fechamentos
  where p_dia between data->>'de' and data->>'ate'
    and (coalesce(data->>'empresa','') = '' or public.chave_empresa(data->>'empresa') = public.chave_empresa(p_empresa))
  limit 1
$$;

create or replace function public.txt(p jsonb, k text, maxlen int) returns text
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p->k) in ('string','number') then left(btrim(p->>k), maxlen) end
$$;

-- monta o registro do funcionário só com campos permitidos
create or replace function public.limpar_os(p jsonb, p_old jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d jsonb; v_and boolean; v_fim text; v_fotos jsonb; v_meta jsonb; v_ac jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'DADOS_INVALIDOS'; end if;
  if coalesce(p->>'data','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'DATA_INVALIDA'; end if;
  if coalesce(p->>'inicio','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'HORA_INVALIDA'; end if;
  v_and := coalesce(p->>'andamento','') = 'true';
  v_fim := coalesce(p->>'fim','');
  if not ((v_and and v_fim = '') or v_fim ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'HORA_INVALIDA'; end if;
  -- fotos: só da própria pasta ou que já estavam na OS
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_fotos
    from jsonb_array_elements_text(case when jsonb_typeof(p->'fotos') = 'array' then p->'fotos' else '[]'::jsonb end) x
    where x ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$'
      and (split_part(x, '/', 1) = auth.uid()::text or coalesce(p_old->'fotos','[]'::jsonb) ? x);
  select coalesce(jsonb_object_agg(k, jsonb_strip_nulls(jsonb_build_object(
      'tipo', case when v->>'tipo' in ('antes','durante','depois') then v->>'tipo' end,
      'em', public.txt(v, 'em', 40)))), '{}'::jsonb) into v_meta
    from jsonb_each(case when jsonb_typeof(p->'fotoMeta') = 'object' then p->'fotoMeta' else '{}'::jsonb end) e(k, v)
    where v_fotos ? k and jsonb_typeof(v) = 'object';
  if jsonb_typeof(p->'acion') = 'object' then
    v_ac := jsonb_strip_nulls(jsonb_build_object('por', public.txt(p->'acion','por',80),
      'as', case when coalesce(p->'acion'->>'as','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p->'acion'->>'as' end,
      'meio', public.txt(p->'acion','meio',20), 'motivo', public.txt(p->'acion','motivo',200)));
  end if;
  d := jsonb_strip_nulls(jsonb_build_object(
    'data', p->>'data', 'inicio', p->>'inicio', 'fim', v_fim,
    'os', public.txt(p,'os',40), 'descricao', public.txt(p,'descricao',500), 'cliente', public.txt(p,'cliente',120),
    'empresa', public.empresa_canonica(public.txt(p,'empresa',120)), 'obs', public.txt(p,'obs',1000),
    'emergencia', coalesce(p->>'emergencia','') = 'true', 'noAlmoco', coalesce(p->>'noAlmoco','') = 'true',
    'andamento', case when v_and then true end,
    'orcId', case when coalesce(p->>'orcId','') ~ '^[A-Za-z0-9_-]{1,64}$' then p->>'orcId' end,
    'fotos', v_fotos, 'fotoMeta', v_meta, 'acion', v_ac,
    'criadoEm', public.txt(p,'criadoEm',40), 'atualizadoEm', public.txt(p,'atualizadoEm',40)));
  return d;
end $$;

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
    v_old_emp := coalesce(nullif(v_old->>'empresa',''), public.empresa_padrao());
    v_f := public.periodo_fechado(v_old->>'data', v_old_emp);
    if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
    if v_old ? 'valorHora' and public.chave_empresa(v_old_emp) = public.chave_empresa(v_emp) then
      d := d || jsonb_strip_nulls(jsonb_build_object('valorHora', v_old->'valorHora', 'extraPct', v_old->'extraPct', 'feriadoPct', v_old->'feriadoPct'));
    else
      d := d || public.taxa_empresa(v_emp);
    end if;
    update public.apontamentos set data = d where id = p_id;
    return p_id;
  end if;
  d := d || public.taxa_empresa(v_emp);
  insert into public.apontamentos (id, data, autor) values (coalesce(p_id, gen_random_uuid()::text), d, auth.uid())
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.foto_em_periodo_fechado(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.apontamentos a where a.data->'fotos' ? p_name
    and public.periodo_fechado(a.data->>'data', coalesce(nullif(a.data->>'empresa',''), public.empresa_padrao())) is not null)
$$;

create or replace function public.pode_ver_foto(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_dono()
    or (public.meu_papel() = 'funcionario' and (
         split_part(p_name, '/', 1) = auth.uid()::text
         or exists (select 1 from public.apontamentos a join public.perfis p on p.user_id = auth.uid()
                    where a.profissional = p.nome and a.data->'fotos' ? p_name)))
$$;
alter policy "fotos: apagar" on storage.objects using (bucket_id = 'fotos' and (public.is_dono()
  or (owner_id = (select auth.uid())::text and public.meu_papel() = 'funcionario' and not public.foto_em_periodo_fechado(name))));

-- funcionário não recebe percentuais de adicional
create or replace function public.pub_config() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c jsonb; ct jsonb;
begin
  if coalesce(public.meu_papel(), '') not in ('dono','funcionario') then return null; end if;
  select data into c from public.config where id = 'main';
  c := coalesce(c, '{}'::jsonb);
  select coalesce(jsonb_object_agg(k, jsonb_build_object('exigirOS', coalesce((v->>'exigirOS')::boolean, false), 'corte', coalesce(public.num_ou_nulo(v->>'corte'), 0))), '{}'::jsonb)
    into ct from jsonb_each(coalesce(c->'contratantes', '{}'::jsonb)) as e(k, v);
  return jsonb_build_object(
    'cfg', jsonb_strip_nulls(jsonb_build_object(
      'jornada', c->'jornada', 'almoco', c->'almoco', 'tolerancia', c->'tolerancia', 'feriados', c->'feriados',
      'profissionais', c->'profissionais', 'unidades', c->'unidades', 'empresas', c->'empresas', 'contratante', c->'contratante',
      'contratantes', ct, 'carimbo', c->'carimbo',
      'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}'))),
    'fechados', coalesce((select jsonb_agg(jsonb_build_object('de', data->>'de', 'ate', data->>'ate',
      'empresa', coalesce(data->>'empresa',''), 'numero', data->>'numero')) from public.fechamentos), '[]'::jsonb),
    'orcs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'numero', data->>'numero', 'titulo', data->>'titulo',
      'cliente', data#>>'{cliente,nome}')) from public.orcamentos where data->>'status' in ('aprovado','concluido')), '[]'::jsonb),
    'eu', (select nome from public.perfis where user_id = auth.uid()));
end $$;

revoke execute on function public.chave_empresa(text), public.empresa_canonica(text), public.txt(jsonb, text, int),
  public.limpar_os(jsonb, jsonb) from public, anon, authenticated;
-- usada na policy de storage: precisa poder ser executada pelo usuário logado
revoke execute on function public.foto_em_periodo_fechado(text) from public, anon;
grant execute on function public.foto_em_periodo_fechado(text) to authenticated;
