-- 023: nota SAP lida do título da OS do TracOS (ex.: 000200186907), também nas OS lançadas pelos funcionários
do $$ begin
  execute replace(pg_get_functiondef('public.limpar_os(jsonb,jsonb)'::regprocedure),
    $a$'tracos', public.txt(p,'tracos',40),$a$,
    $b$'tracos', public.txt(p,'tracos',40), 'nota', case when coalesce(p->>'nota','') ~ '^[0-9]{1,14}$' then p->>'nota' end,$b$);
end $$;
