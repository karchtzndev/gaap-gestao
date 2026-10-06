-- 018: localização ao iniciar a OS (funcionário), lista de OS e escala no pub_config, registro de atividade
do $$ begin
  execute replace(pg_get_functiondef('public.limpar_os(jsonb,jsonb)'::regprocedure),
    $a$'fotos', v_fotos, 'fotoMeta', v_meta, 'acion', v_ac,$a$,
    $b$'fotos', v_fotos, 'fotoMeta', v_meta, 'acion', v_ac,
    'geo', case when jsonb_typeof(p->'geo') = 'object' and jsonb_typeof(p->'geo'->'lat') = 'number' and jsonb_typeof(p->'geo'->'lng') = 'number'
      then jsonb_strip_nulls(jsonb_build_object('lat', round((p->'geo'->>'lat')::numeric, 6), 'lng', round((p->'geo'->>'lng')::numeric, 6),
        'acc', case when jsonb_typeof(p->'geo'->'acc') = 'number' then round((p->'geo'->>'acc')::numeric) end, 'em', public.txt(p->'geo','em',40)))
      else coalesce(p_old->'geo', null) end,$b$);
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $a$'unidades', coalesce(v->>'unidades', ''))$a$,
    $b$'unidades', coalesce(v->>'unidades', ''), 'osLista', coalesce(v->>'osLista', ''))$b$);
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $a$'eu', (select nome from public.perfis where user_id = auth.uid())$a$,
    $b$'escala', (select coalesce(jsonb_object_agg(k, v->>(select nome from public.perfis where user_id = auth.uid())), '{}'::jsonb)
        from jsonb_each(coalesce(c->'escala', '{}'::jsonb)) e(k, v) where k >= to_char(current_date, 'YYYY-MM-DD') and v ? (select nome from public.perfis where user_id = auth.uid())),
    'eu', (select nome from public.perfis where user_id = auth.uid())$b$);
end $$;

create or replace function public.atividade_recente(p_dias int default 30) returns table(tabela text, registro_id text, acao text, quem_nome text, quando timestamptz, antes jsonb, depois jsonb)
language sql stable security definer set search_path = public as $$
  select h.tabela, h.registro_id, h.acao, h.quem_nome, h.quando, h.antes, h.depois from public.historico h
  where public.is_dono() and h.quando > now() - make_interval(days => least(greatest(p_dias, 1), 365))
  order by h.quando desc limit 500
$$;
revoke execute on function public.atividade_recente(int) from public, anon;
grant execute on function public.atividade_recente(int) to authenticated;
