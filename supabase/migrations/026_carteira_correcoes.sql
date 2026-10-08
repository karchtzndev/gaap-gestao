-- 026: correções da revisão da carteira de OS
-- (a) funcionário: confere a versão (cópia velha não desfaz o que o responsável mudou), só completa campos vazios
--     de uma OS existente e só conclui/reabre de propósito (concluida true/false explícito); data da conclusão é do servidor
create or replace function public.func_salvar_ordem(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_at timestamptz; d jsonb; k text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'ID_INVALIDO'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or coalesce(btrim(p_data->>'os'), '') = '' then raise exception 'DADOS_INVALIDOS'; end if;
  select data, atualizado_em into v_old, v_at from public.ordens where id = p_id for update;
  if v_old is not null and coalesce(p_data->>'_v', '') <> ''
     and date_trunc('milliseconds', v_at) <> date_trunc('milliseconds', (p_data->>'_v')::timestamptz) then raise exception 'CONFLITO'; end if;
  d := public.limpar_ordem(p_data) - 'concluida' - 'concluidaEm' - 'atualizadoEm';
  if d ? 'foto' and split_part(d->>'foto', '/', 1) <> auth.uid()::text then d := d - 'foto'; end if;
  if v_old is not null then
    for k in select jsonb_object_keys(d) loop
      if coalesce(v_old->>k, '') <> '' then d := d - k; end if;
    end loop;
    d := v_old || d || jsonb_build_object('atualizadoEm', now()::text);
  else
    d := d || jsonb_build_object('recebidaPor', v_nome, 'recebidaEm', now()::text, 'atualizadoEm', now()::text);
  end if;
  if coalesce(p_data->>'concluida', '') = 'true' and coalesce(d->>'concluida', '') <> 'true' then
    d := d || jsonb_build_object('concluida', true, 'concluidaEm', now()::text, 'concluidaPor', v_nome);
  elsif coalesce(p_data->>'concluida', '') = 'false' then
    d := d - 'concluida' - 'concluidaEm' - 'concluidaPor';
  end if;
  if v_old is not null then update public.ordens set data = jsonb_strip_nulls(d) where id = p_id;
  else insert into public.ordens (id, data) values (p_id, jsonb_strip_nulls(d)); end if;
  return p_id || '|' || (select atualizado_em from public.ordens where id = p_id)::text;
end $$;

-- (b) contagem de lançamentos por OS agrupada uma vez (antes: uma varredura por OS)
create or replace function public.minhas_ordens() returns table(id text, data jsonb, atualizado_em timestamptz)
language sql stable security definer set search_path = public as $$
  with n as (
    select regexp_replace(a.data->>'os', '\D', '', 'g') k, count(*) c from public.apontamentos a
    where coalesce(a.data->>'os', '') <> '' and coalesce((a.data->>'excluido')::boolean, false) = false group by 1)
  select o.id, o.data || jsonb_build_object('_naps', coalesce(n.c, 0)), o.atualizado_em
  from public.ordens o left join n on n.k = regexp_replace(coalesce(o.data->>'os', ''), '\D', '', 'g')
  where coalesce(public.meu_papel(), '') in ('dono','funcionario') and coalesce((o.data->>'arquivada')::boolean, false) = false
  order by o.atualizado_em desc limit 3000
$$;

-- (c) lixeira conhece a carteira (e as tabelas de equipe/equipamentos/documentos, que também ficavam de fora)
create or replace function public.lixeira(p_dias integer default 90)
returns table(tabela text, registro_id text, dados jsonb, quem_nome text, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (h.tabela, h.registro_id) h.tabela, h.registro_id, coalesce(h.antes, h.depois), h.quem_nome, h.quando
  from public.historico h
  where public.is_dono() and h.acao in ('delete','excluido') and h.tabela <> 'config' and h.quando > now() - make_interval(days => p_dias)
    and case h.tabela
      when 'apontamentos' then not exists (select 1 from public.apontamentos a where a.id = h.registro_id and coalesce((a.data->>'excluido')::boolean,false) = false)
      when 'orcamentos' then not exists (select 1 from public.orcamentos x where x.id = h.registro_id)
      when 'recebimentos' then not exists (select 1 from public.recebimentos x where x.id = h.registro_id)
      when 'fechamentos' then not exists (select 1 from public.fechamentos x where x.id = h.registro_id)
      when 'despesas' then not exists (select 1 from public.despesas x where x.id = h.registro_id)
      when 'pagamentos' then not exists (select 1 from public.pagamentos x where x.id = h.registro_id)
      when 'equipamentos' then not exists (select 1 from public.equipamentos x where x.id = h.registro_id)
      when 'documentos' then not exists (select 1 from public.documentos x where x.id = h.registro_id)
      when 'ordens' then not exists (select 1 from public.ordens x where x.id = h.registro_id)
      else false end
  order by h.tabela, h.registro_id, h.quando desc
$$;

-- (d) qualquer técnico vê a foto do papel de uma OS da carteira
create index if not exists ordens_foto_idx on public.ordens ((data->>'foto'));
create or replace function public.pode_ver_foto(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_dono()
    or (public.meu_papel() = 'funcionario' and (
         split_part(p_name, '/', 1) = auth.uid()::text
         or exists (select 1 from public.apontamentos a join public.perfis p on p.user_id = auth.uid()
                    where a.profissional = p.nome and a.data->'fotos' ? p_name)
         or exists (select 1 from public.ordens o where o.data->>'foto' = p_name)))
$$;
