-- GAAP Gestão de Serviços — estrutura do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor de um projeto Supabase NOVO.
-- Regras: a primeira conta criada vira "dono" (responsável); as seguintes ficam
-- "pendente" até o responsável liberar. Funcionário só grava/lê as próprias OS
-- por funções seguras, sem nunca receber valores financeiros.

-- 1) Perfis de acesso ------------------------------------------------------
create table public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  papel text not null default 'pendente' check (papel in ('dono','funcionario','pendente','bloqueado')),
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where user_id = auth.uid()
$$;
create or replace function public.is_dono() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'dono' from public.perfis where user_id = auth.uid()), false)
$$;

create policy "ver o proprio perfil ou dono ve todos" on public.perfis for select to authenticated
  using (user_id = (select auth.uid()) or public.is_dono());
create policy "dono altera perfis" on public.perfis for update to authenticated
  using (public.is_dono()) with check (public.is_dono());
create policy "dono remove perfis de outros" on public.perfis for delete to authenticated
  using (public.is_dono() and user_id <> (select auth.uid()));

create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (user_id, email, papel)
  values (new.id, new.email,
    case when exists (select 1 from public.perfis where papel = 'dono') then 'pendente' else 'dono' end);
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();
revoke execute on function public.novo_usuario() from public, anon, authenticated;

-- 2) Documentos do sistema (somente o responsável acessa direto) ------------
create table public.config (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create table public.apontamentos (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null,
  autor uuid default auth.uid() references auth.users(id) on delete set null,
  dia text generated always as (data->>'data') stored,
  profissional text generated always as (data->>'profissional') stored,
  atualizado_em timestamptz not null default now()
);
create index apontamentos_dia on public.apontamentos (dia);
create index apontamentos_profissional on public.apontamentos (profissional);
create index apontamentos_autor on public.apontamentos (autor);
create table public.orcamentos (id text primary key default gen_random_uuid()::text, data jsonb not null, atualizado_em timestamptz not null default now());
create table public.recebimentos (id text primary key default gen_random_uuid()::text, data jsonb not null, atualizado_em timestamptz not null default now());
create table public.fechamentos (id text primary key default gen_random_uuid()::text, data jsonb not null, atualizado_em timestamptz not null default now());

create or replace function public.tocar_atualizado() returns trigger
language plpgsql set search_path = public as $$
begin new.atualizado_em := now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['config','apontamentos','orcamentos','recebimentos','fechamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "somente o responsavel" on public.%I for all to authenticated using (public.is_dono()) with check (public.is_dono())', t);
    execute format('create trigger atualizado before update on public.%I for each row execute function public.tocar_atualizado()', t);
  end loop;
end $$;

-- 3) Funções do funcionário -----------------------------------------------
create or replace function public.empresa_padrao() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select data->>'contratante' from public.config where id = 'main'), '')
$$;

create or replace function public.periodo_fechado(p_dia text, p_empresa text) returns text
language sql stable security definer set search_path = public as $$
  select data->>'numero' from public.fechamentos
  where p_dia between data->>'de' and data->>'ate'
    and (coalesce(data->>'empresa','') = '' or data->>'empresa' = p_empresa)
  limit 1
$$;

-- Configuração SEM valores financeiros (o que o funcionário pode ver)
create or replace function public.pub_config() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c jsonb;
begin
  if coalesce(public.meu_papel(), '') not in ('dono','funcionario') then return null; end if;
  select data into c from public.config where id = 'main';
  c := coalesce(c, '{}'::jsonb);
  return jsonb_build_object(
    'cfg', jsonb_strip_nulls(jsonb_build_object(
      'jornada', c->'jornada', 'almoco', c->'almoco', 'tolerancia', c->'tolerancia', 'feriados', c->'feriados',
      'extraPct', c->'extraPct', 'feriadoPct', c->'feriadoPct', 'profissionais', c->'profissionais',
      'unidades', c->'unidades', 'empresas', c->'empresas', 'contratante', c->'contratante',
      'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}'))),
    'fechados', coalesce((select jsonb_agg(jsonb_build_object('de', data->>'de', 'ate', data->>'ate',
      'empresa', coalesce(data->>'empresa',''), 'numero', data->>'numero')) from public.fechamentos), '[]'::jsonb),
    'orcs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'numero', data->>'numero', 'titulo', data->>'titulo',
      'cliente', data#>>'{cliente,nome}')) from public.orcamentos where data->>'status' in ('aprovado','concluido')), '[]'::jsonb),
    'eu', (select nome from public.perfis where user_id = auth.uid()));
end $$;

-- OS do próprio funcionário, sem valores
create or replace function public.minhas_os() returns table(id text, data jsonb)
language sql stable security definer set search_path = public as $$
  select a.id, a.data - 'valorHora' - 'extraPct' - 'feriadoPct'
  from public.apontamentos a
  join public.perfis p on p.user_id = auth.uid()
  where p.papel = 'funcionario' and p.nome is not null and a.profissional = p.nome
    and coalesce((a.data->>'excluido')::boolean, false) = false
$$;

-- Funcionário grava a própria OS (nome forçado, valores removidos, período fechado bloqueado)
create or replace function public.func_salvar_os(p_id text, p_data jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_f text; v_id text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if coalesce(p_data->>'data','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'DATA_INVALIDA'; end if;
  p_data := (p_data - 'valorHora' - 'extraPct' - 'feriadoPct' - 'excluido') || jsonb_build_object('profissional', v_nome, 'lancadoPor', 'funcionario');
  v_f := public.periodo_fechado(p_data->>'data', coalesce(nullif(p_data->>'empresa',''), public.empresa_padrao()));
  if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
  if p_id is not null then
    select data into v_old from public.apontamentos where id = p_id;
    if found then
      if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;
      v_f := public.periodo_fechado(v_old->>'data', coalesce(nullif(v_old->>'empresa',''), public.empresa_padrao()));
      if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
      update public.apontamentos
        set data = p_data || jsonb_strip_nulls(jsonb_build_object('valorHora', v_old->'valorHora', 'extraPct', v_old->'extraPct', 'feriadoPct', v_old->'feriadoPct'))
        where id = p_id;
      return p_id;
    end if;
  end if;
  insert into public.apontamentos (id, data, autor) values (coalesce(p_id, gen_random_uuid()::text), p_data, auth.uid())
    returning id into v_id;
  return v_id;
end $$;

-- Funcionário exclui a própria OS (exclusão lógica)
create or replace function public.func_excluir_os(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v_nome text; v_old jsonb; v_f text;
begin
  select nome into v_nome from public.perfis where user_id = auth.uid() and papel = 'funcionario';
  if v_nome is null then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  select data into v_old from public.apontamentos where id = p_id;
  if not found then return; end if;
  if v_old->>'profissional' is distinct from v_nome then raise exception 'NAO_E_SEU' using errcode = '42501'; end if;
  v_f := public.periodo_fechado(v_old->>'data', coalesce(nullif(v_old->>'empresa',''), public.empresa_padrao()));
  if v_f is not null then raise exception 'PERIODO_FECHADO:%', v_f; end if;
  update public.apontamentos
    set data = data || jsonb_build_object('excluido', true, 'excluidoEm', now()::text, 'excluidoPor', v_nome)
    where id = p_id;
end $$;

-- Permissões das funções
revoke execute on function public.empresa_padrao(), public.periodo_fechado(text, text),
  public.pub_config(), public.minhas_os(), public.func_salvar_os(text, jsonb), public.func_excluir_os(text),
  public.meu_papel(), public.is_dono()
  from public, anon;
revoke execute on function public.empresa_padrao(), public.periodo_fechado(text, text) from authenticated;
grant execute on function public.pub_config(), public.minhas_os(), public.func_salvar_os(text, jsonb),
  public.func_excluir_os(text), public.meu_papel(), public.is_dono() to authenticated;

-- 4) Fotos dos serviços (Storage privado) ----------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "fotos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.meu_papel() in ('dono','funcionario'));
create policy "fotos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.meu_papel() in ('dono','funcionario'));
create policy "fotos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (public.is_dono() or owner_id = (select auth.uid())::text));
