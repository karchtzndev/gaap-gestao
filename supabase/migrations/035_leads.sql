-- 035: contatos do site (leads do formulário de orçamento) — nenhum pedido se perde
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text,
  servico text,
  descricao text,
  telefone text,
  origem text default 'site',
  visto boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists leads_criado_idx on public.leads (criado_em desc);
alter table public.leads enable row level security;
-- sem policies: só as funções security definer abaixo acessam (visitante anônimo insere via RPC)

-- visitante do site grava o contato (anônimo pode chamar)
create or replace function public.registrar_lead(p_nome text, p_servico text, p_descricao text, p_telefone text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.leads (nome, servico, descricao, telefone, origem)
  values (left(coalesce(p_nome,''),120), left(coalesce(p_servico,''),80), left(coalesce(p_descricao,''),2000),
          left(regexp_replace(coalesce(p_telefone,''),'[^0-9+() -]','','g'),40), 'site');
end $$;
revoke execute on function public.registrar_lead(text,text,text,text) from public;
grant execute on function public.registrar_lead(text,text,text,text) to anon, authenticated;

-- a equipe (responsável) lê os contatos
create or replace function public.leads_recentes(p_dias int default 90)
returns setof public.leads language sql stable security definer set search_path = public as $$
  select * from public.leads
  where public.is_dono() and criado_em > now() - make_interval(days => least(greatest(p_dias,1),365))
  order by criado_em desc limit 500
$$;
revoke execute on function public.leads_recentes(int) from public, anon;
grant execute on function public.leads_recentes(int) to authenticated;

-- marcar um contato como visto / atendido
create or replace function public.lead_visto(p_id uuid, p_visto boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then return; end if;
  update public.leads set visto = coalesce(p_visto, true) where id = p_id;
end $$;
revoke execute on function public.lead_visto(uuid, boolean) from public, anon;
grant execute on function public.lead_visto(uuid, boolean) to authenticated;
