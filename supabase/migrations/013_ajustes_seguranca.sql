-- 013: o Supabase dá EXECUTE ao anon em funções novas por padrão; criar_aprovacao é só do responsável logado.
revoke execute on function public.criar_aprovacao(text) from anon;
-- a função de lembretes busca as inscrições por usuário
create index if not exists push_inscricoes_user_id on public.push_inscricoes (user_id);
