-- 022: ID do TracOS (sistema de OS da contratante) em cada OS, também nas lançadas pelos funcionários
do $$ begin
  execute replace(pg_get_functiondef('public.limpar_os(jsonb,jsonb)'::regprocedure),
    $a$'os', public.txt(p,'os',40),$a$,
    $b$'os', public.txt(p,'os',40), 'tracos', public.txt(p,'tracos',40),$b$);
end $$;
