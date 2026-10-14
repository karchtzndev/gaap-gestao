-- Orçamento online: o cliente abre um link, confere a proposta e aprova (ou recusa) com nome e assinatura.
-- O link guarda uma cópia (snap) do que foi enviado: o cliente vê exatamente a proposta que recebeu.
create table if not exists public.orc_links (
  token text primary key,
  orc_id text not null,
  snap jsonb not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '90 days',
  resposta jsonb,
  respondido_em timestamptz
);
create index if not exists orc_links_orc on public.orc_links (orc_id);
alter table public.orc_links enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orc_links' and policyname = 'dono ve links de orcamento') then
    create policy "dono ve links de orcamento" on public.orc_links for select to authenticated using ((select public.is_dono()));
  end if;
end $$;

-- o responsável gera (ou atualiza) o link do orçamento; enquanto não for respondido, o link continua o mesmo
create or replace function public.link_orcamento(p_orc text, p_snap jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if not exists (select 1 from public.orcamentos where id = p_orc) then raise exception 'DADOS_INVALIDOS'; end if;
  if jsonb_typeof(p_snap) is distinct from 'object' or length(p_snap::text) > 200000 then raise exception 'DADOS_INVALIDOS'; end if;
  select token into v from public.orc_links where orc_id = p_orc and respondido_em is null and expira_em > now() order by criado_em desc limit 1;
  if v is null then
    v := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.orc_links (token, orc_id, snap) values (v, p_orc, p_snap);
  else
    update public.orc_links set snap = p_snap, expira_em = now() + interval '90 days' where token = v;
  end if;
  return v;
end $$;

-- o cliente lê a proposta pelo link
create or replace function public.ler_orcamento(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a record; c jsonb;
begin
  select * into a from public.orc_links where token = p_token and expira_em > now();
  if not found then return null; end if;
  select data into c from public.config where id = 'main';
  return jsonb_build_object('proposta', a.snap,
    'empresa', jsonb_build_object('nome', c#>>'{empresa,nome}', 'cnpj', c#>>'{empresa,cnpj}', 'telefone', c#>>'{empresa,telefone}',
      'email', c#>>'{empresa,email}', 'cidade', c#>>'{empresa,cidade}', 'responsavel', c#>>'{empresa,responsavel}'),
    'resposta', case when a.resposta is null then null else a.resposta - 'assinatura' end, 'respondido_em', a.respondido_em);
end $$;

-- o cliente aprova (escolhendo a opção, quando houver duas) ou recusa; o orçamento muda de status sozinho
create or replace function public.responder_orcamento(p_token text, p_resposta jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare a record; r jsonb; ok boolean; op text; ass text;
begin
  select * into a from public.orc_links where token = p_token and expira_em > now() for update;
  if not found or a.respondido_em is not null then return false; end if;
  if jsonb_typeof(p_resposta) is distinct from 'object' then return false; end if;
  ok := coalesce(p_resposta->>'aprovado','') = 'true';
  op := case when p_resposta->>'opcao' in ('A','B') then p_resposta->>'opcao' else '' end;
  ass := coalesce(p_resposta->>'assinatura','');
  if ass !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$' or length(ass) > 300000 then ass := ''; end if;
  if ok and left(coalesce(p_resposta->>'nome',''), 80) = '' then return false; end if;
  r := jsonb_build_object('aprovado', ok, 'opcao', op,
    'nome', left(coalesce(p_resposta->>'nome',''), 80), 'documento', left(coalesce(p_resposta->>'documento',''), 30),
    'obs', left(coalesce(p_resposta->>'obs',''), 1000), 'assinatura', ass, 'em', now()::text);
  update public.orc_links set resposta = r, respondido_em = now() where token = p_token;
  update public.orcamentos set data = data
      || jsonb_build_object('status', case when ok then 'aprovado' else 'recusado' end, 'respostaCliente', r)
      || case when ok and op = 'B' then jsonb_build_object('matCliente', true, 'opcaoB', false) else '{}'::jsonb end
      || case when ok and op = 'A' then jsonb_build_object('opcaoB', false) else '{}'::jsonb end
    where id = a.orc_id;
  return true;
end $$;

revoke execute on function public.link_orcamento(text, jsonb), public.ler_orcamento(text), public.responder_orcamento(text, jsonb) from public, anon;
grant execute on function public.link_orcamento(text, jsonb) to authenticated;
grant execute on function public.ler_orcamento(text), public.responder_orcamento(text, jsonb) to anon, authenticated;

-- avisa o responsável no celular quando o cliente responde
create or replace function public.avisar_orcamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.respondido_em is null and new.respondido_em is not null then
    perform net.http_post(
      url := 'https://pxuzidkfwbjscpkegsno.supabase.co/functions/v1/lembretes',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select valor from public.segredos where chave = 'cron_token')),
      body := jsonb_build_object('orcamento', new.token));
  end if;
  return new;
end $$;
revoke execute on function public.avisar_orcamento() from public, anon, authenticated;
create or replace trigger orc_links_avisar after update on public.orc_links for each row execute function public.avisar_orcamento();
