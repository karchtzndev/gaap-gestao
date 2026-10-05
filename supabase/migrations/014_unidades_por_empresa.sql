-- 014: lista de unidades de cada contratante (config.contratantes[emp].unidades, uma por linha) também para o funcionário
do $$ begin
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $a$'corte', coalesce(public.num_ou_nulo(v->>'corte'), 0))$a$,
    $b$'corte', coalesce(public.num_ou_nulo(v->>'corte'), 0), 'unidades', coalesce(v->>'unidades', ''))$b$);
end $$;
