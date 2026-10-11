-- 029: relatório técnico — revisão
-- (a) datas do relatório e da assinatura só no formato de data (texto livre não chega ao portal da contratante)
create or replace function public.limpar_relatorio(p jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'object' then jsonb_strip_nulls(jsonb_build_object(
    'v', 1,
    'texto', public.txt(p,'texto',6000), 'corpo', public.txt(p,'corpo',6000), 'relato', public.txt(p,'relato',3000), 'equip', public.txt(p,'equip',200),
    'textoManual', case when coalesce(p->>'textoManual','') = 'true' then true end, 'incluirRelato', case when coalesce(p->>'incluirRelato','') = 'false' then false end,
    'achados', public.limpar_lista(p->'achados', 30, 60), 'pecas', public.limpar_lista(p->'pecas', 30, 60),
    'causas', public.limpar_lista(p->'causas', 15, 80), 'acoes', public.limpar_lista(p->'acoes', 30, 80),
    'recs', public.limpar_lista(p->'recs', 12, 300),
    'materiais', public.txt(p,'materiais',1500), 'resultado', public.txt(p,'resultado',120),
    'em', case when coalesce(p->>'em','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.]+(Z|[+-][0-9:]+)?)?$' then left(p->>'em', 40) end,
    'codigo', case when coalesce(p->>'codigo','') ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' then p->>'codigo' end,
    'horas', case when jsonb_typeof(p->'horas') = 'object' then jsonb_strip_nulls(jsonb_build_object(
        'min', case when jsonb_typeof(p->'horas'->'min') = 'number' then least(greatest((p->'horas'->>'min')::numeric, 0), 1000000) end,
        'dias', case when jsonb_typeof(p->'horas'->'dias') = 'number' then least(greatest((p->'horas'->>'dias')::numeric, 0), 10000) end,
        'tecnicos', public.limpar_lista(p->'horas'->'tecnicos', 20, 80))) end,
    'fotos', (select jsonb_agg(jsonb_build_object('id', f->>'id', 'tipo', case when f->>'tipo' in ('antes','durante','depois') then f->>'tipo' else 'durante' end) order by i)
        from (select f, i from jsonb_array_elements(case when jsonb_typeof(p->'fotos') = 'array' then p->'fotos' else '[]'::jsonb end) with ordinality t(f, i)
              where jsonb_typeof(f) = 'object' and coalesce(f->>'id','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$' order by i limit 12) s),
    'assin', case when coalesce(p->'assin'->>'foto','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$'
        then jsonb_strip_nulls(jsonb_build_object('foto', p->'assin'->>'foto', 'nome', left(btrim(coalesce(p->'assin'->>'nome','')), 120),
          'em', case when coalesce(p->'assin'->>'em','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9:.]+(Z|[+-][0-9:]+)?)?$' then left(p->'assin'->>'em', 40) end)) end
  )) end
$$;
revoke execute on function public.limpar_relatorio(jsonb) from public, anon;

-- (b) o PDF feito pelo funcionário usa os dados da empresa de Ajustes (CNPJ, contato, cidade), não os do código
do $$ begin
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $x$'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}')$x$,
    $x$'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}', 'cnpj', c#>>'{empresa,cnpj}', 'email', c#>>'{empresa,email}', 'telefone', c#>>'{empresa,telefone}', 'cidade', c#>>'{empresa,cidade}', 'responsavel', c#>>'{empresa,responsavel}')$x$);
end $$;
