
-- Role enum + user_roles table
create type public.app_role as enum ('teacher', 'student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Update signup trigger to also assign a role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  role_value text;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  );
  role_value := coalesce(new.raw_user_meta_data->>'role', 'teacher');
  if role_value not in ('teacher', 'student') then
    role_value := 'teacher';
  end if;
  insert into public.user_roles (user_id, role)
  values (new.id, role_value::public.app_role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users as teachers
insert into public.user_roles (user_id, role)
select id, 'teacher'::public.app_role from auth.users
on conflict do nothing;

-- Link submissions to signed-in students
alter table public.submissions
  add column if not exists student_id uuid references auth.users(id) on delete set null;

create index if not exists idx_submissions_student_id on public.submissions(student_id);

create policy "Students view own submissions" on public.submissions
  for select to authenticated
  using (student_id = auth.uid());
