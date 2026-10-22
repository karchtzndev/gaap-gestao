-- 031: entrar com usuário e senha (e-mail opcional) e com Face ID / digital (passkeys)
-- Quem não informa e-mail recebe um endereço interno <usuario>@usuarios.gaap-gestao.app (nenhum e-mail é enviado para ele).
create table if not exists public.usuarios_login (
  usuario text primary key check (usuario ~ '^[a-z0-9._-]{3,30}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.usuarios_login enable row level security;
create policy "dono vê usuários" on public.usuarios_login for select to authenticated using ((select public.is_dono()) or user_id = (select auth.uid()));

-- chaves de acesso (passkeys) para entrar com Face ID / digital mesmo depois de sair da conta.
-- Só a função do servidor (service role) lê e grava; o app nunca acessa direto.
create table if not exists public.passkeys (
  cred_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,
  contador bigint not null default 0,
  aparelho text,
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);
alter table public.passkeys enable row level security;
create index if not exists passkeys_user on public.passkeys (user_id);
create table if not exists public.passkey_desafios (
  id text primary key,
  desafio text not null,
  user_id uuid,
  criado_em timestamptz not null default now()
);
alter table public.passkey_desafios enable row level security;
