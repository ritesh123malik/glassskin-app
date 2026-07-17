-- Admin RLS smoke checks.
-- Run against a local Supabase database after migrations are applied.

select has_function_privilege('authenticated', 'public.is_admin()', 'execute') as authenticated_can_call_is_admin;

select policyname
from pg_policies
where schemaname = 'public'
  and policyname ilike 'Admins can%'
order by tablename, policyname;
