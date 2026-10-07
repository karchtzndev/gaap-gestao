-- 021: portal da contratante (link só de leitura, com token), chamados de emergência e assinatura na OS.

-- assinatura do responsável da unidade: guardada como foto do tipo "assinatura" com o nome de quem assinou
do $$ begin
  execute replace(replace(pg_get_functiondef('public.limpar_os(jsonb,jsonb)'::regprocedure),
    $a$when v->>'tipo' in ('antes','durante','depois') then$a$, $b$when v->>'tipo' in ('antes','durante','depois','assinatura') then$b$),
    $a$'em', public.txt(v, 'em', 40)$a$, $b$'em', public.txt(v, 'em', 40), 'nome', public.txt(v, 'nome', 80)$b$);
end $$;

-- portal: uma linha por contratante; o responsável publica o retrato da medição (calculado no app, igual ao PDF)
create table if not exists public.portais (
  token text primary key,
  empresa text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  snap jsonb,
  snap_em timestamptz
);
alter table public.portais enable row level security;
create policy "dono ve portais" on public.portais for select to authenticated using ((select public.is_dono()));

create or replace function public.criar_portal(p_emp text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if coalesce(btrim(p_emp), '') = '' then raise exception 'DADOS_INVALIDOS'; end if;
  select token into v from public.portais where empresa = p_emp and ativo limit 1;
  if v is null then
    v := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.portais (token, empresa) values (v, p_emp);
  end if;
  return v;
end $$;

-- gera um link novo (o antigo para de funcionar)
create or replace function public.trocar_portal(p_emp text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.portais set ativo = false where empresa = p_emp;
  return public.criar_portal(p_emp);
end $$;

create or replace function public.desligar_portal(p_emp text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.portais set ativo = false where empresa = p_emp;
end $$;

create or replace function public.publicar_portal(p_emp text, p_snap jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if jsonb_typeof(p_snap) is distinct from 'object' or octet_length(p_snap::text) > 600000 then raise exception 'DADOS_INVALIDOS'; end if;
  update public.portais set snap = p_snap, snap_em = now() where empresa = p_emp and ativo;
end $$;

-- chamados de emergência abertos pela contratante no portal
create table if not exists public.chamados (
  id text primary key default gen_random_uuid()::text,
  empresa text not null,
  token text,
  criado_em timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  status text not null default 'aberto' check (status in ('aberto','atendido','cancelado')),
  atendido_em timestamptz,
  atendido_por text,
  os text
);
alter table public.chamados enable row level security;
create policy "equipe ve chamados" on public.chamados for select to authenticated using ((select coalesce(public.meu_papel(), '')) in ('dono','funcionario'));
create index if not exists chamados_empresa_idx on public.chamados (empresa, criado_em desc);

create or replace function public.ler_portal(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; c jsonb;
begin
  select * into p from public.portais where token = p_token and ativo;
  if not found then return null; end if;
  select data into c from public.config where id = 'main';
  return jsonb_build_object('prestador', c#>>'{empresa,nome}', 'cnpj', c#>>'{empresa,cnpj}', 'telefone', c#>>'{empresa,telefone}',
    'empresa', p.empresa, 'snap', p.snap, 'snap_em', p.snap_em,
    'unidades', coalesce(c->'contratantes'->p.empresa->>'unidades', ''),
    'chamados', coalesce((select jsonb_agg(jsonb_build_object('id', ch.id, 'criado_em', ch.criado_em, 'status', ch.status, 'atendido_em', ch.atendido_em,
        'atendido_por', ch.atendido_por, 'os', ch.os, 'unidade', ch.data->>'unidade', 'equipamento', ch.data->>'equipamento', 'descricao', ch.data->>'descricao',
        'nome', ch.data->>'nome') order by ch.criado_em desc)
      from (select * from public.chamados where empresa = p.empresa and criado_em > now() - interval '40 days' order by criado_em desc limit 50) ch), '[]'::jsonb));
end $$;

create or replace function public.abrir_chamado(p_token text, p_dados jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare p record; v text;
begin
  select * into p from public.portais where token = p_token and ativo;
  if not found then raise exception 'LINK_INVALIDO'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' or coalesce(btrim(p_dados->>'descricao'), '') = '' then raise exception 'DADOS_INVALIDOS'; end if;
  if (select count(*) from public.chamados where token = p_token and criado_em > now() - interval '1 hour') >= 10 then raise exception 'MUITOS_CHAMADOS'; end if;
  insert into public.chamados (empresa, token, data) values (p.empresa, p_token, jsonb_strip_nulls(jsonb_build_object(
    'unidade', left(btrim(coalesce(p_dados->>'unidade','')), 120), 'equipamento', left(btrim(coalesce(p_dados->>'equipamento','')), 120),
    'descricao', left(btrim(p_dados->>'descricao'), 1000), 'nome', left(btrim(coalesce(p_dados->>'nome','')), 80),
    'fone', left(btrim(coalesce(p_dados->>'fone','')), 30), 'parada', coalesce(p_dados->>'parada','') = 'true'))) returning id into v;
  return v;
end $$;

-- técnico ou responsável assume o chamado (vira OS de emergência no app)
create or replace function public.atender_chamado(p_id text, p_os text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if coalesce(public.meu_papel(), '') not in ('dono','funcionario') then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  select coalesce(nullif(nome, ''), 'Responsável') into v_nome from public.perfis where user_id = auth.uid();
  update public.chamados set status = 'atendido', atendido_em = now(), atendido_por = v_nome, os = left(coalesce(p_os, ''), 40)
    where id = p_id and status = 'aberto';
  return found;
end $$;

create or replace function public.cancelar_chamado(p_id text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  update public.chamados set status = 'cancelado' where id = p_id and status = 'aberto';
  return found;
end $$;

-- avisa a equipe no celular assim que o chamado é aberto
create or replace function public.avisar_chamado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://pxuzidkfwbjscpkegsno.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select valor from public.segredos where chave = 'cron_token')),
    body := jsonb_build_object('chamado', new.id));
  return new;
end $$;
create or replace trigger chamados_avisar after insert on public.chamados for each row execute function public.avisar_chamado();

revoke execute on function public.criar_portal(text), public.trocar_portal(text), public.desligar_portal(text), public.publicar_portal(text, jsonb),
  public.ler_portal(text), public.abrir_chamado(text, jsonb), public.atender_chamado(text, text), public.cancelar_chamado(text), public.avisar_chamado() from public, anon;
grant execute on function public.criar_portal(text), public.trocar_portal(text), public.desligar_portal(text), public.publicar_portal(text, jsonb),
  public.atender_chamado(text, text), public.cancelar_chamado(text) to authenticated;
grant execute on function public.ler_portal(text), public.abrir_chamado(text, jsonb) to anon, authenticated;
