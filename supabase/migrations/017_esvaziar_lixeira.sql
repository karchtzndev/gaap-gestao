-- 017: esvaziar a lixeira (só responsável). Apaga de vez o histórico dos registros que estão na lixeira
-- e devolve as fotos deles, para o app apagar do armazenamento as que ninguém mais usa.
create or replace function public.esvaziar_lixeira() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tab text[]; v_ids text[]; v_fotos jsonb; n int;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  select coalesce(array_agg(l.tabela), '{}'), coalesce(array_agg(l.registro_id), '{}'),
         coalesce((select jsonb_agg(distinct f) from public.lixeira(36500) l2,
           jsonb_array_elements_text(case when jsonb_typeof(l2.dados->'fotos') = 'array' then l2.dados->'fotos' else '[]'::jsonb end) f), '[]'::jsonb)
    into v_tab, v_ids, v_fotos
  from public.lixeira(36500) l;
  delete from public.historico h using unnest(v_tab, v_ids) as x(tabela, registro_id)
    where h.tabela = x.tabela and h.registro_id = x.registro_id;
  get diagnostics n = row_count;
  return jsonb_build_object('itens', coalesce(array_length(v_ids, 1), 0), 'registros', n, 'fotos', v_fotos);
end $$;
revoke execute on function public.esvaziar_lixeira() from public, anon;
grant execute on function public.esvaziar_lixeira() to authenticated;
