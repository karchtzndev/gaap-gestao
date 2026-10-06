-- 019: backup diário no Google Drive (via App da Web do Google Apps Script do responsável).
-- A URL (com a chave) fica em segredos, que só o servidor lê.
create or replace function public.drive_config(p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if coalesce(p_url, '') <> '' and p_url !~ '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec\?k=[0-9a-f]{16,}$' then raise exception 'URL_INVALIDA'; end if;
  insert into public.segredos (chave, valor) values ('drive_url', coalesce(p_url, ''))
    on conflict (chave) do update set valor = excluded.valor;
end $$;

create or replace function public.drive_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_dono() then jsonb_build_object(
    'configurado', coalesce((select valor from public.segredos where chave = 'drive_url'), '') <> '',
    'ultimo', (select valor from public.segredos where chave = 'drive_ultimo')) end
$$;

revoke execute on function public.drive_config(text), public.drive_status() from public, anon;
grant execute on function public.drive_config(text), public.drive_status() to authenticated;

select cron.schedule('gaap-backup-drive', '30 6 * * *', $$
  select net.http_post(
    url := 'https://pxuzidkfwbjscpkegsno.supabase.co/functions/v1/backup-drive',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', (select valor from public.segredos where chave = 'cron_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
$$);
