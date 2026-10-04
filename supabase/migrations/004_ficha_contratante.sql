-- Ficha da contratante: exigir nº da OS (validado no servidor) e dia de corte para o funcionário.

-- Funcionário recebe só exigirOS e dia de corte de cada contratante (sem dados financeiros)
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
      'extraPct', c->'extraPct', 'feriadoPct', c->'feriadoPct', 'profissionais', c->'profissionais',
      'unidades', c->'unidades', 'empresas', c->'empresas', 'contratante', c->'contratante',
      'contratantes', ct,
      'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}'))),
    'fechados', coalesce((select jsonb_agg(jsonb_build_object('de', data->>'de', 'ate', data->>'ate',
      'empresa', coalesce(data->>'empresa',''), 'numero', data->>'numero')) from public.fechamentos), '[]'::jsonb),
    'orcs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'numero', data->>'numero', 'titulo', data->>'titulo',
      'cliente', data#>>'{cliente,nome}')) from public.orcamentos where data->>'status' in ('aprovado','concluido')), '[]'::jsonb),
    'eu', (select nome from public.perfis where user_id = auth.uid()));
end $$;

create or replace function public.exige_os(p_emp text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (data->'contratantes'->p_emp->>'exigirOS')::boolean from public.config where id = 'main'), false)
$$;
revoke execute on function public.exige_os(text) from public, anon, authenticated;

do $$ begin
  execute replace(pg_get_functiondef('public.func_salvar_os(text, jsonb)'::regprocedure),
    $x$  v_f := public.periodo_fechado(p_data->>'data', v_emp);$x$,
    $x$  if public.exige_os(v_emp) and btrim(coalesce(p_data->>'os','')) = '' then raise exception 'OS_OBRIGATORIA'; end if;
  v_f := public.periodo_fechado(p_data->>'data', v_emp);$x$);
end $$;
