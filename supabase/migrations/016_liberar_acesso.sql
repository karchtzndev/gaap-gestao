-- 016: liberar acesso em um passo (funcionário ou responsável) e confirmar o e-mail da pessoa,
-- para ela entrar mesmo que o e-mail de confirmação tenha ido para o spam.
create or replace function public.liberar_acesso(p_uid uuid, p_papel text, p_nome text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_dono() then raise exception 'SEM_PERMISSAO' using errcode = '42501'; end if;
  if p_papel not in ('funcionario', 'dono', 'bloqueado') then raise exception 'DADOS_INVALIDOS'; end if;
  if p_uid = auth.uid() then raise exception 'DADOS_INVALIDOS'; end if; -- ninguém muda o próprio acesso
  if p_papel = 'funcionario' and btrim(coalesce(p_nome, '')) = '' then raise exception 'NOME_VAZIO'; end if;
  update public.perfis set papel = p_papel, nome = case when p_papel = 'bloqueado' then nome else nullif(btrim(left(coalesce(p_nome, ''), 80)), '') end
    where user_id = p_uid;
  if not found then raise exception 'DADOS_INVALIDOS'; end if;
  if p_papel <> 'bloqueado' then
    update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_uid;
  end if;
end $$;
revoke execute on function public.liberar_acesso(uuid, text, text) from public, anon;
grant execute on function public.liberar_acesso(uuid, text, text) to authenticated;
