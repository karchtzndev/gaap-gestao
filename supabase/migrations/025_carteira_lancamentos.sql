-- 025: na carteira do funcionário, quantos lançamentos (de qualquer técnico) a OS já tem → mostra "em execução"
create or replace function public.minhas_ordens() returns table(id text, data jsonb, atualizado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.data || jsonb_build_object('_naps', (select count(*) from public.apontamentos a
      where regexp_replace(coalesce(a.data->>'os',''), '\D', '', 'g') = regexp_replace(coalesce(o.data->>'os',''), '\D', '', 'g')
        and coalesce(o.data->>'os','') <> '' and coalesce((a.data->>'excluido')::boolean, false) = false)), o.atualizado_em
  from public.ordens o
  where coalesce(public.meu_papel(), '') in ('dono','funcionario') and coalesce((o.data->>'arquivada')::boolean, false) = false
  order by o.atualizado_em desc limit 3000
$$;
