-- 020: horário exato do almoço em cada OS (saída e volta), também nas OS lançadas pelos funcionários
do $$ begin
  execute replace(pg_get_functiondef('public.limpar_os(jsonb,jsonb)'::regprocedure),
    $a$'fotos', v_fotos, 'fotoMeta', v_meta, 'acion', v_ac,$a$,
    $b$'fotos', v_fotos, 'fotoMeta', v_meta, 'acion', v_ac,
    'almIni', case when coalesce(p->>'almIni','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and coalesce(p->>'almFim','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p->>'almIni' end,
    'almFim', case when coalesce(p->>'almIni','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and coalesce(p->>'almFim','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p->>'almFim' end,$b$);
end $$;
