-- 015: adicional noturno (horas entre 22h e 5h) por contratante: config.taxas[emp].noturnoPct (ex.: Brejeiro 20%)
create or replace function public.taxa_empresa(p_emp text, p_dia text) returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (select coalesce((select data from public.config where id = 'main'), '{}'::jsonb) as c),
  t as (
    select c.c, c.c->'taxas'->p_emp as atual, coalesce(
      (select h from jsonb_array_elements(case when jsonb_typeof(c.c->'taxas'->p_emp->'historico')='array' then c.c->'taxas'->p_emp->'historico' else '[]'::jsonb end) h
        where p_dia is not null and coalesce(c.c->'taxas'->p_emp->>'desde','') <> '' and p_dia < c.c->'taxas'->p_emp->>'desde' and p_dia < h->>'ate'
        order by h->>'ate' limit 1),
      c.c->'taxas'->p_emp, '{}'::jsonb) as t
    from c)
  select jsonb_build_object(
    'valorHora', coalesce(public.num_ou_nulo(t->>'valorHora'), public.num_ou_nulo(c->>'valorHora'), 60),
    'extraPct', coalesce(public.num_ou_nulo(t->>'extraPct'), public.num_ou_nulo(c->>'extraPct'), 50),
    'feriadoPct', coalesce(public.num_ou_nulo(t->>'feriadoPct'), public.num_ou_nulo(c->>'feriadoPct'), 100),
    'noturnoPct', coalesce(public.num_ou_nulo(t->>'noturnoPct'), public.num_ou_nulo(atual->>'noturnoPct'), public.num_ou_nulo(c->>'noturnoPct'), 0))
  from t
$$;
-- ao editar uma OS do funcionário sem mudar empresa/data, mantém também o adicional noturno da época
do $$ begin
  execute replace(pg_get_functiondef('public.func_salvar_os(text,jsonb)'::regprocedure),
    $a$'feriadoPct', v_old->'feriadoPct'))$a$,
    $b$'feriadoPct', v_old->'feriadoPct', 'noturnoPct', v_old->'noturnoPct'))$b$);
end $$;
