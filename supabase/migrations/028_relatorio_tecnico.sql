-- 028: relatório técnico da OS
-- O técnico (ou o responsável) conta o que fez por toques ou por voz; o app monta o texto profissional, o PDF com fotos
-- e um código de autenticidade (QR) que qualquer pessoa confere em /verificar.

-- (a) saneamento do relatório enviado pelo funcionário
create or replace function public.limpar_lista(p jsonb, n integer, maxlen integer) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce((select jsonb_agg(left(btrim(x), maxlen) order by i) from (
      select x, i from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality t(x, i)
      where btrim(x) <> '' order by i limit n) s), '[]'::jsonb)
$$;

create or replace function public.limpar_relatorio(p jsonb) returns jsonb
language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'object' then jsonb_strip_nulls(jsonb_build_object(
    'v', 1,
    'texto', public.txt(p,'texto',6000), 'corpo', public.txt(p,'corpo',6000), 'relato', public.txt(p,'relato',3000), 'equip', public.txt(p,'equip',200),
    'textoManual', case when coalesce(p->>'textoManual','') = 'true' then true end, 'incluirRelato', case when coalesce(p->>'incluirRelato','') = 'false' then false end,
    'achados', public.limpar_lista(p->'achados', 30, 60), 'pecas', public.limpar_lista(p->'pecas', 30, 60),
    'causas', public.limpar_lista(p->'causas', 15, 80), 'acoes', public.limpar_lista(p->'acoes', 30, 80),
    'recs', public.limpar_lista(p->'recs', 12, 300),
    'materiais', public.txt(p,'materiais',1500), 'resultado', public.txt(p,'resultado',120), 'em', public.txt(p,'em',40),
    'codigo', case when coalesce(p->>'codigo','') ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' then p->>'codigo' end,
    'horas', case when jsonb_typeof(p->'horas') = 'object' then jsonb_strip_nulls(jsonb_build_object(
        'min', case when jsonb_typeof(p->'horas'->'min') = 'number' then least(greatest((p->'horas'->>'min')::numeric, 0), 1000000) end,
        'dias', case when jsonb_typeof(p->'horas'->'dias') = 'number' then least(greatest((p->'horas'->>'dias')::numeric, 0), 10000) end,
        'tecnicos', public.limpar_lista(p->'horas'->'tecnicos', 20, 80))) end,
    'fotos', (select jsonb_agg(jsonb_build_object('id', f->>'id', 'tipo', case when f->>'tipo' in ('antes','durante','depois') then f->>'tipo' else 'durante' end) order by i)
        from (select f, i from jsonb_array_elements(case when jsonb_typeof(p->'fotos') = 'array' then p->'fotos' else '[]'::jsonb end) with ordinality t(f, i)
              where jsonb_typeof(f) = 'object' and coalesce(f->>'id','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$' order by i limit 12) s),
    'assin', case when coalesce(p->'assin'->>'foto','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$'
        then jsonb_build_object('foto', p->'assin'->>'foto', 'nome', left(btrim(coalesce(p->'assin'->>'nome','')), 120), 'em', left(coalesce(p->'assin'->>'em',''), 40)) end
  )) end
$$;

create or replace function public.limpar_ordem(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'os', public.txt(p,'os',40), 'tracos', public.txt(p,'tracos',40), 'titulo', public.txt(p,'titulo',300),
    'unidade', public.txt(p,'unidade',120), 'empresa', public.txt(p,'empresa',120),
    'nota', case when coalesce(p->>'nota','') ~ '^[0-9]{1,14}$' then p->>'nota' end,
    'vencimento', case when coalesce(p->>'vencimento','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then p->>'vencimento' end,
    'prioridade', public.txt(p,'prioridade',40), 'categoria', public.txt(p,'categoria',80), 'obs', public.txt(p,'obs',500),
    'foto', case when coalesce(p->>'foto','') ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp|gif)$' then p->>'foto' end,
    'concluida', case when coalesce(p->>'concluida','') = 'true' then true end,
    'concluidaEm', public.txt(p,'concluidaEm',40), 'atualizadoEm', public.txt(p,'atualizadoEm',40),
    'relatorio', public.limpar_relatorio(p->'relatorio')))
$$;

-- (b) funcionário: cria o relatório da OS; só quem escreveu pode corrigir (o código de autenticidade nunca muda).
--     Fotos e assinatura só da pasta dele (ou as que já estavam no relatório).
create or replace function public.func_salvar_ordem(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_at timestamptz; d jsonb; k text; r jsonb; v_uid text := auth.uid()::text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'ID_INVALIDO'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or coalesce(btrim(p_data->>'os'), '') = '' then raise exception 'DADOS_INVALIDOS'; end if;
  select data, atualizado_em into v_old, v_at from public.ordens where id = p_id for update;
  if v_old is not null and coalesce(p_data->>'_v', '') <> ''
     and date_trunc('milliseconds', v_at) <> date_trunc('milliseconds', (p_data->>'_v')::timestamptz) then raise exception 'CONFLITO'; end if;
  d := public.limpar_ordem(p_data) - 'concluida' - 'concluidaEm' - 'atualizadoEm' - 'relatorio';
  r := public.limpar_relatorio(p_data->'relatorio');
  if d ? 'foto' and split_part(d->>'foto', '/', 1) <> v_uid then d := d - 'foto'; end if;
  if v_old is not null then
    for k in select jsonb_object_keys(d) loop
      if coalesce(v_old->>k, '') <> '' then d := d - k; end if;
    end loop;
    d := v_old || d || jsonb_build_object('atualizadoEm', now()::text);
  else
    d := d || jsonb_build_object('recebidaPor', v_nome, 'recebidaEm', now()::text, 'atualizadoEm', now()::text);
  end if;
  if r is not null and (v_old is null or not (v_old ? 'relatorio') or v_old->'relatorio'->>'porId' = v_uid) then
    r := r || jsonb_build_object('fotos', coalesce((select jsonb_agg(f order by i) from jsonb_array_elements(coalesce(r->'fotos', '[]'::jsonb)) with ordinality t(f, i)
            where split_part(f->>'id', '/', 1) = v_uid
               or coalesce(v_old->'relatorio'->'fotos', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id', f->>'id'))), '[]'::jsonb));
    if r ? 'assin' and split_part(r->'assin'->>'foto', '/', 1) <> v_uid
       and (r->'assin'->>'foto') is distinct from (v_old->'relatorio'->'assin'->>'foto') then r := r - 'assin'; end if;
    r := r || jsonb_build_object('por', v_nome, 'porId', v_uid);
    if coalesce(v_old->'relatorio'->>'codigo', '') <> '' then r := r || jsonb_build_object('codigo', v_old->'relatorio'->'codigo'); end if;
    d := d || jsonb_build_object('relatorio', r);
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

-- (c) um código de autenticidade por relatório; busca rápida das fotos do relatório
create unique index if not exists ordens_rel_codigo_idx on public.ordens ((data->'relatorio'->>'codigo')) where (data->'relatorio'->>'codigo') is not null;
create index if not exists ordens_rel_fotos_idx on public.ordens using gin ((data->'relatorio'->'fotos') jsonb_path_ops);

-- (d) qualquer técnico vê as fotos e a assinatura dos relatórios da carteira
create or replace function public.pode_ver_foto(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_dono()
    or (public.meu_papel() = 'funcionario' and (
         split_part(p_name, '/', 1) = auth.uid()::text
         or exists (select 1 from public.apontamentos a join public.perfis p on p.user_id = auth.uid()
                    where a.profissional = p.nome and a.data->'fotos' ? p_name)
         or exists (select 1 from public.ordens o where o.data->>'foto' = p_name)
         or exists (select 1 from public.ordens o where o.data->'relatorio'->'fotos' @> jsonb_build_array(jsonb_build_object('id', p_name)))
         or exists (select 1 from public.ordens o where o.data->'relatorio'->'assin'->>'foto' = p_name)))
$$;

-- (e) verificação pública (sem login): quem tem o código vê o relatório (sem valores)
create or replace function public.verificar_relatorio(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o jsonb; c jsonb; r jsonb;
begin
  if coalesce(upper(btrim(p_codigo)), '') !~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' then return null; end if;
  select data into o from public.ordens where data->'relatorio'->>'codigo' = upper(btrim(p_codigo)) limit 1;
  if o is null then return null; end if;
  select data into c from public.config where id = 'main';
  r := o->'relatorio';
  return jsonb_strip_nulls(jsonb_build_object(
    'prestador', c#>>'{empresa,nome}', 'cnpj', c#>>'{empresa,cnpj}', 'telefone', c#>>'{empresa,telefone}', 'cidade', c#>>'{empresa,cidade}',
    'cliente', o->>'empresa', 'os', o->>'os', 'tracos', o->>'tracos', 'titulo', o->>'titulo', 'unidade', o->>'unidade',
    'recebida_em', o->>'recebidaEm', 'concluida_em', o->>'concluidaEm',
    'codigo', r->>'codigo', 'em', r->>'em', 'por', r->>'por', 'equip', r->>'equip', 'texto', r->>'texto',
    'achados', r->'achados', 'pecas', r->'pecas', 'causas', r->'causas', 'acoes', r->'acoes', 'recs', r->'recs',
    'materiais', r->>'materiais', 'resultado', r->>'resultado', 'horas', r->'horas',
    'assinado_por', r->'assin'->>'nome', 'assinado_em', r->'assin'->>'em',
    'n_fotos', jsonb_array_length(coalesce(r->'fotos', '[]'::jsonb))));
end $$;

revoke execute on function public.limpar_lista(jsonb, integer, integer), public.limpar_relatorio(jsonb) from public, anon;
revoke execute on function public.verificar_relatorio(text) from public;
grant execute on function public.verificar_relatorio(text) to anon, authenticated;
