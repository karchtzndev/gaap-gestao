-- Preventivas desligadas (feitas pelo time interno da contratante): o funcionário não recebe a lista de equipamentos,
-- então o campo "Equipamento / preventiva" some dos lançamentos dele também.
do $$ begin
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $x$from public.equipamentos e where coalesce((e.data->>'inativo')::boolean, false) = false$x$,
    $x$from public.equipamentos e where coalesce((e.data->>'inativo')::boolean, false) = false and coalesce((c->>'preventivas')::boolean, false)$x$);
end $$;
