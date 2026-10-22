-- 033: avaliação do cliente depois do serviço (link público) e galeria de obras no site (bucket público "site").
create table if not exists public.avaliacoes (
  token text primary key,
  criado_em timestamptz not null default now(),
  ref jsonb not null default '{}'::jsonb,
  nota int check (nota between 1 and 5),
  comentario text,
  nome text,
  respondido_em timestamptz,
  publicar boolean not null default false
);
alter table public.avaliacoes enable row level security;
create policy "avaliacoes: responsavel" on public.avaliacoes for all to authenticated using ((select public.is_dono())) with check ((select public.is_dono()));

create or replace function public.criar_avaliacao(p_ref jsonb) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v text;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  v := encode(extensions.gen_random_bytes(12), 'hex');
  insert into public.avaliacoes (token, ref) values (v, coalesce(p_ref, '{}'::jsonb));
  return v;
end $$;

create or replace function public.ler_avaliacao(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('empresa', (select data#>>'{empresa,nome}' from public.config where id = 'main'),
    'servico', a.ref->>'servico', 'cliente', a.ref->>'cliente', 'data', a.ref->>'data', 'respondida', a.nota is not null)
  from public.avaliacoes a where a.token = p_token
$$;

create or replace function public.responder_avaliacao(p_token text, p_nota int, p_comentario text, p_nome text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_nota is null or p_nota < 1 or p_nota > 5 then raise exception 'NOTA_INVALIDA'; end if;
  update public.avaliacoes set nota = p_nota, comentario = left(btrim(coalesce(p_comentario, '')), 600), nome = left(btrim(coalesce(p_nome, '')), 60), respondido_em = now()
    where token = p_token and nota is null;
  return found;
end $$;

create or replace function public.avaliacoes_site() returns table(nome text, nota int, comentario text, quando timestamptz)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(nome, ''), 'Cliente'), nota, comentario, respondido_em from public.avaliacoes
  where publicar and nota is not null order by respondido_em desc limit 12
$$;

revoke execute on function public.criar_avaliacao(jsonb), public.ler_avaliacao(text), public.responder_avaliacao(text, int, text, text), public.avaliacoes_site() from public;
grant execute on function public.criar_avaliacao(jsonb) to authenticated;
grant execute on function public.ler_avaliacao(text), public.responder_avaliacao(text, int, text, text), public.avaliacoes_site() to anon, authenticated;

create table if not exists public.site_obras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  fotos text[] not null default '{}',
  criado_em timestamptz not null default now()
);
alter table public.site_obras enable row level security;
create policy "site_obras: todos veem" on public.site_obras for select to anon, authenticated using (true);
create policy "site_obras: responsavel altera" on public.site_obras for all to authenticated using ((select public.is_dono())) with check ((select public.is_dono()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "site: responsavel envia" on storage.objects for insert to authenticated with check (bucket_id = 'site' and (select public.is_dono()));
create policy "site: responsavel apaga" on storage.objects for delete to authenticated using (bucket_id = 'site' and (select public.is_dono()));
