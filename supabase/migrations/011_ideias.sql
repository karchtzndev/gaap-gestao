-- Ideias novas: acerto da equipe (pagamentos), equipamentos/preventivas, documentos com validade,
-- link de aprovação da medição pela contratante.
do $$ declare t text; begin
  foreach t in array array['pagamentos','equipamentos','documentos'] loop
    execute format('create table if not exists public.%I (id text primary key default gen_random_uuid()::text check (id ~ ''^[A-Za-z0-9_-]{1,64}$''), data jsonb not null, atualizado_em timestamptz not null default clock_timestamp())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "somente o responsavel" on public.%I for all to authenticated using ((select public.is_dono())) with check ((select public.is_dono()))', t);
    execute format('create trigger atualizado before update on public.%I for each row execute function public.tocar_atualizado()', t);
    execute format('create trigger historico after insert or update or delete on public.%I for each row execute function public.registrar_historico()', t);
  end loop;
end $$;

-- salvar_doc e backup passam a conhecer as tabelas novas
do $$ begin
  execute replace(pg_get_functiondef('public.salvar_doc(text, text, jsonb, timestamptz)'::regprocedure),
    $x$('apontamentos','orcamentos','recebimentos','fechamentos','despesas','config')$x$,
    $x$('apontamentos','orcamentos','recebimentos','fechamentos','despesas','config','pagamentos','equipamentos','documentos')$x$);
  execute replace(pg_get_functiondef('public.fazer_backup(text)'::regprocedure),
    $x$array['config','apontamentos','orcamentos','recebimentos','fechamentos','despesas']$x$,
    $x$array['config','apontamentos','orcamentos','recebimentos','fechamentos','despesas','pagamentos','equipamentos','documentos']$x$);
end $$;

-- bucket de documentos (PDF e imagens), só o dono
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "documentos: dono" on storage.objects for all to authenticated
  using (bucket_id = 'documentos' and (select public.is_dono())) with check (bucket_id = 'documentos' and (select public.is_dono()));

-- funcionário: equipamentos (sem valores) no pub_config; campos equipId/prevId aceitos no lançamento
do $$ begin
  execute replace(pg_get_functiondef('public.pub_config()'::regprocedure),
    $x$'contratantes', ct, 'carimbo', c->'carimbo',$x$,
    $x$'contratantes', ct, 'carimbo', c->'carimbo',
      'equipamentos', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'tag', e.data->>'tag', 'nome', e.data->>'nome', 'unidade', e.data->>'unidade', 'empresa', e.data->>'empresa',
          'plano', (select coalesce(jsonb_agg(jsonb_build_object('id', pl->>'id', 'atividade', pl->>'atividade')), '[]'::jsonb) from jsonb_array_elements(coalesce(e.data->'plano','[]'::jsonb)) pl))
          order by e.data->>'tag'), '[]'::jsonb) from public.equipamentos e where coalesce((e.data->>'inativo')::boolean, false) = false),$x$);
  execute replace(pg_get_functiondef('public.limpar_os(jsonb, jsonb)'::regprocedure),
    $x$    'orcId', case when$x$,
    $x$    'equipId', case when coalesce(p->>'equipId','') ~ '^[A-Za-z0-9_-]{1,64}$' then p->>'equipId' end,
    'prevId', case when coalesce(p->>'prevId','') ~ '^[A-Za-z0-9_-]{1,64}$' then p->>'prevId' end,
    'orcId', case when$x$);
end $$;

-- aprovação da medição pela contratante (link com token, sem login)
create table if not exists public.aprovacoes (
  token text primary key,
  fech_id text not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days',
  resposta jsonb,
  respondido_em timestamptz
);
alter table public.aprovacoes enable row level security;
create policy "dono ve aprovacoes" on public.aprovacoes for select to authenticated using ((select public.is_dono()));

create or replace function public.criar_aprovacao(p_fech text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if not exists (select 1 from public.fechamentos where id = p_fech) then raise exception 'DADOS_INVALIDOS'; end if;
  v := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.aprovacoes (token, fech_id) values (v, p_fech);
  return v;
end $$;

-- o aprovador lê o resumo da medição (período, OS, horas, valor) e responde
create or replace function public.ler_aprovacao(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a record; f jsonb; c jsonb;
begin
  select * into a from public.aprovacoes where token = p_token and expira_em > now();
  if not found then return null; end if;
  select data into f from public.fechamentos where id = a.fech_id;
  if f is null then return null; end if;
  select data into c from public.config where id = 'main';
  return jsonb_build_object(
    'prestador', c#>>'{empresa,nome}', 'cnpj', c#>>'{empresa,cnpj}',
    'numero', f->>'numero', 'de', f->>'de', 'ate', f->>'ate', 'empresa', f->>'empresa',
    'horas', f->'horas', 'valor', f->'valor', 'reemb', f->'reemb',
    'linhas', coalesce((select jsonb_agg(jsonb_build_object('id', x->>'id', 'data', x->>'data', 'os', x->>'os', 'inicio', x->>'inicio', 'fim', x->>'fim',
        'descricao', x->>'descricao', 'unidade', x->>'cliente', 'profissional', x->>'profissional') order by x->>'data', x->>'inicio')
        from jsonb_array_elements(coalesce(f->'snap'->'aps', '[]'::jsonb)) x), '[]'::jsonb),
    'resposta', a.resposta, 'respondido_em', a.respondido_em);
end $$;

create or replace function public.responder_aprovacao(p_token text, p_resposta jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare a record; r jsonb;
begin
  select * into a from public.aprovacoes where token = p_token and expira_em > now() for update;
  if not found or a.respondido_em is not null then return false; end if;
  if jsonb_typeof(p_resposta) is distinct from 'object' then return false; end if;
  r := jsonb_build_object('aprovado', coalesce(p_resposta->>'aprovado','') = 'true',
    'nome', left(coalesce(p_resposta->>'nome',''), 80), 'cargo', left(coalesce(p_resposta->>'cargo',''), 80),
    'obs', left(coalesce(p_resposta->>'obs',''), 1000),
    'contestadas', coalesce((select jsonb_agg(jsonb_build_object('id', left(x->>'id',64), 'motivo', left(coalesce(x->>'motivo',''),300)))
        from jsonb_array_elements(case when jsonb_typeof(p_resposta->'contestadas')='array' then p_resposta->'contestadas' else '[]'::jsonb end) x limit 500), '[]'::jsonb));
  update public.aprovacoes set resposta = r, respondido_em = now() where token = p_token;
  update public.fechamentos set data = data || jsonb_build_object('aprovacao', r || jsonb_build_object('em', now()::text)) where id = a.fech_id;
  return true;
end $$;

revoke execute on function public.criar_aprovacao(text), public.ler_aprovacao(text), public.responder_aprovacao(text, jsonb) from public;
grant execute on function public.criar_aprovacao(text) to authenticated;
grant execute on function public.ler_aprovacao(text), public.responder_aprovacao(text, jsonb) to anon, authenticated;
