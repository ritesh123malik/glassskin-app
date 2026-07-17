-- Social auth users are regular auth.users rows mirrored into public.users.
-- This verifies the profile table has the role column expected by OAuth/admin flows.

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name in ('id', 'email', 'full_name', 'role')
order by column_name;
