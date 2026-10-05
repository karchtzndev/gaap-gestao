-- Desempenho e backup incremental de fotos.
-- * políticas chamam is_dono() uma vez por consulta (select ...), não por linha
-- * histórico de fechamentos não guarda a cópia congelada (snap) a cada cobrança
-- * uso do Storage e marca de até quando as fotos já foram copiadas
do $$ declare t text; begin
  foreach t in array array['config','apontamentos','orcamentos','recebimentos','fechamentos','despesas'] loop
    execute format('alter policy "somente o responsavel" on public.%I using ((select public.is_dono())) with check ((select public.is_dono()))', t);
  end loop;
end $$;
alter policy "fotos: enviar" on storage.objects with check (bucket_id = 'fotos' and (select public.meu_papel()) in ('dono','funcionario'));

create or replace function public.registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_new jsonb;
begin
  select coalesce(nome, email) into v_nome from public.perfis where user_id = auth.uid();
  if tg_table_name = 'fechamentos' then
    v_old := case when tg_op <> 'INSERT' then old.data - 'snap' end; v_new := case when tg_op <> 'DELETE' then new.data - 'snap' end;
  else
    v_old := case when tg_op <> 'INSERT' then old.data end; v_new := case when tg_op <> 'DELETE' then new.data end;
  end if;
  if tg_op = 'INSERT' then
    insert into public.historico (tabela, registro_id, acao, depois, quem_nome) values (tg_table_name, new.id, 'insert', v_new, coalesce(v_nome, 'sistema'));
    return new;
  elsif tg_op = 'UPDATE' then
    if v_new is distinct from v_old then
      insert into public.historico (tabela, registro_id, acao, antes, depois, quem_nome)
        values (tg_table_name, new.id, case when (new.data->>'excluido')::boolean is true and coalesce((old.data->>'excluido')::boolean, false) = false then 'excluido' else 'update' end, v_old, v_new, coalesce(v_nome, 'sistema'));
    end if;
    return new;
  else
    insert into public.historico (tabela, registro_id, acao, antes, quem_nome) values (tg_table_name, old.id, 'delete', case when tg_table_name = 'fechamentos' then old.data else v_old end, coalesce(v_nome, 'sistema'));
    return old;
  end if;
end $$;

create or replace function public.uso_storage() returns jsonb
language sql stable security definer set search_path = public, storage as $$
  select case when public.is_dono() then jsonb_build_object('arquivos', count(*), 'bytes', coalesce(sum((metadata->>'size')::bigint), 0)) end
  from storage.objects where bucket_id = 'fotos'
$$;

create or replace function public.marcar_fotos_ate(p_ate timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.config set data = jsonb_set(data, '{fotosAte}', to_jsonb(p_ate::text)) where id = 'main';
end $$;

revoke execute on function public.uso_storage(), public.marcar_fotos_ate(timestamptz) from public, anon;
grant execute on function public.uso_storage(), public.marcar_fotos_ate(timestamptz) to authenticated;
