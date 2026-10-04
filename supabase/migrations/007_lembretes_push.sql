-- Lembretes por notificação (Web Push): inscrições dos aparelhos, segredos do servidor,
-- controle de envio e agendamento a cada 15 min (a função decide a hora certa pela jornada).
create extension if not exists pg_net;

create table if not exists public.push_inscricoes (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sub jsonb not null,
  aparelho text,
  criado_em timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
create policy "ver as proprias inscricoes" on public.push_inscricoes for select to authenticated using (user_id = (select auth.uid()));
create policy "criar a propria inscricao" on public.push_inscricoes for insert to authenticated with check (user_id = (select auth.uid()) and public.meu_papel() in ('dono','funcionario'));
create policy "atualizar a propria inscricao" on public.push_inscricoes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "remover a propria inscricao" on public.push_inscricoes for delete to authenticated using (user_id = (select auth.uid()));

-- segredos lidos só pela função do servidor (sem policies)
create table if not exists public.segredos (chave text primary key, valor text not null);
alter table public.segredos enable row level security;
insert into public.segredos (chave, valor) values ('cron_token', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (chave) do nothing;
-- As chaves VAPID ('vapid_publica', 'vapid_privada') são inseridas à parte e não ficam no repositório.

create table if not exists public.lembretes_enviados (
  dia text not null, user_id uuid not null, tipo text not null, enviado_em timestamptz not null default now(),
  primary key (dia, user_id, tipo)
);
alter table public.lembretes_enviados enable row level security;

select cron.schedule('gaap-lembretes', '*/15 13-23 * * 1-6', $$
  select net.http_post(
    url := 'https://pxuzidkfwbjscpkegsno.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select valor from public.segredos where chave = 'cron_token')),
    body := '{}'::jsonb)
$$);
ALTER FUNCTION public.ping() SET search_path = public;
