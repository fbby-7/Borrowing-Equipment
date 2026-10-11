-- FULLBRIGHT COLLEGE - EQUIPMENT BORROWING SYSTEM UPGRADE
-- Run this ONCE in the existing equipment-borrowing Supabase project.
-- This is non-destructive: it keeps your existing users/equipment/borrowings.

-- 1) Student profile fields
alter table public.users add column if not exists course_program text;
alter table public.users add column if not exists year_level text;

-- 2) Equipment location. Quantity is represented by equipment_units rows;
-- available quantity is calculated from availability_status.
alter table public.equipment_units add column if not exists location text;

-- 3) Fullbright College departments
insert into public.departments(department_name,location) values
('EDUC','Fullbright College'),
('ECT','Fullbright College'),
('BHT','Fullbright College'),
('CRIM','Fullbright College')
on conflict (department_name) do nothing;

-- 4) Automatic asset/equipment unit IDs.
-- Existing asset tags are kept. New units receive EQ-000001, EQ-000002, ...
create sequence if not exists public.equipment_asset_seq start 1;
create or replace function public.set_automatic_asset_tag()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if new.asset_tag is null or btrim(new.asset_tag)='' then
    new.asset_tag := 'EQ-' || lpad(nextval('public.equipment_asset_seq')::text,6,'0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_automatic_asset_tag on public.equipment_units;
create trigger trg_automatic_asset_tag
before insert on public.equipment_units
for each row execute procedure public.set_automatic_asset_tag();

-- 5) Replace the Auth profile trigger so signup saves all requested fields.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
  student_role bigint;
  dept_id bigint;
  candidate_id text;
begin
  select role_id into student_role from public.roles where role_name='Student' limit 1;
  select department_id into dept_id from public.departments where department_name = new.raw_user_meta_data->>'department_name' limit 1;
  candidate_id := nullif(btrim(new.raw_user_meta_data->>'employee_no'),'');
  if candidate_id is null then
    candidate_id := 'USR-' || upper(substr(replace(new.id::text,'-',''),1,8));
  end if;
  if exists(select 1 from public.users where employee_no=candidate_id) then
    candidate_id := 'USR-' || upper(substr(replace(new.id::text,'-',''),1,8));
  end if;
  insert into public.users(auth_user_id,role_id,department_id,employee_no,first_name,last_name,email,course_program,year_level)
  values(new.id,student_role,dept_id,candidate_id,
         coalesce(nullif(new.raw_user_meta_data->>'first_name',''),'User'),
         coalesce(new.raw_user_meta_data->>'last_name',''),
         coalesce(new.email,''),
         nullif(new.raw_user_meta_data->>'course_program',''),
         nullif(new.raw_user_meta_data->>'year_level',''))
  on conflict (auth_user_id) do update set
    first_name=excluded.first_name,last_name=excluded.last_name,email=excluded.email,
    department_id=excluded.department_id,course_program=excluded.course_program,year_level=excluded.year_level;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 6) Repair/create a missing profile for the currently signed-in browser.
create or replace function public.ensure_my_profile()
returns bigint language plpgsql security definer set search_path=public
as $$
declare
  u auth.users;
  student_role bigint;
  dept_id bigint;
  new_id bigint;
  candidate_id text;
begin
  select * into u from auth.users where id=auth.uid();
  if u.id is null then raise exception 'No authenticated user'; end if;
  if exists(select 1 from public.users where auth_user_id=u.id) then
    select user_id into new_id from public.users where auth_user_id=u.id;
    return new_id;
  end if;
  select role_id into student_role from public.roles where role_name='Student' limit 1;
  select department_id into dept_id from public.departments where department_name=u.raw_user_meta_data->>'department_name' limit 1;
  candidate_id := nullif(btrim(u.raw_user_meta_data->>'employee_no'),'');
  if candidate_id is null or exists(select 1 from public.users where employee_no=candidate_id) then
    candidate_id := 'USR-' || upper(substr(replace(u.id::text,'-',''),1,8));
  end if;
  insert into public.users(auth_user_id,role_id,department_id,employee_no,first_name,last_name,email,course_program,year_level)
  values(u.id,student_role,dept_id,candidate_id,
         coalesce(nullif(u.raw_user_meta_data->>'first_name',''),'User'),coalesce(u.raw_user_meta_data->>'last_name',''),coalesce(u.email,''),
         nullif(u.raw_user_meta_data->>'course_program',''),nullif(u.raw_user_meta_data->>'year_level',''))
  returning user_id into new_id;
  return new_id;
end;
$$;
grant execute on function public.ensure_my_profile() to authenticated;

-- 7) Maximum borrowing period: 7 days.
create or replace function public.create_borrowing(p_unit_ids bigint[], p_expected_return_date date, p_purpose text, p_remarks text default null)
returns bigint language plpgsql security definer set search_path=public
as $$
declare v_uid bigint; v_bid bigint; v_unit_id bigint;
begin
  -- Use variable names that cannot be confused with table columns.
  select u.user_id into v_uid
  from public.users u
  where u.auth_user_id=auth.uid() and u.user_status='Active';

  if v_uid is null then raise exception 'Active user profile not found'; end if;
  if coalesce(array_length(p_unit_ids,1),0)=0 then raise exception 'Select at least one equipment unit'; end if;
  if p_expected_return_date < current_date then raise exception 'Return date cannot be in the past'; end if;
  if p_expected_return_date > current_date + 7 then raise exception 'Maximum borrowing period is 7 days'; end if;
  if exists(select 1 from public.equipment_units eu where eu.unit_id=any(p_unit_ids) and eu.availability_status <> 'Available') then
    raise exception 'One or more selected units are not available';
  end if;

  insert into public.borrowings(borrower_id,expected_return_date,purpose,status,remarks)
  values(v_uid,p_expected_return_date,p_purpose,'Pending',p_remarks)
  returning borrowing_id into v_bid;

  foreach v_unit_id in array p_unit_ids loop
    insert into public.borrowing_items(borrowing_id,unit_id,item_condition_out,item_status)
      select v_bid,eu.unit_id,eu.condition_status,'Borrowed'
      from public.equipment_units eu
      where eu.unit_id=v_unit_id;

    update public.equipment_units eu
    set availability_status='Borrowed'
    where eu.unit_id=v_unit_id;
  end loop;

  return v_bid;
end;
$$;
grant execute on function public.create_borrowing(bigint[],date,text,text) to authenticated;

-- 8) Inventory view used by the website. Includes equipment ID, cost and location.
-- Drop first because PostgreSQL cannot reorder/rename existing view columns with CREATE OR REPLACE VIEW.
drop view if exists public.v_equipment_inventory;
create view public.v_equipment_inventory as
select eu.unit_id, eu.equipment_id, eu.asset_tag, eu.serial_number, eu.condition_status,
       eu.availability_status, eu.location, e.equipment_name, e.brand, e.model,
       e.replacement_cost, ec.category_name
from public.equipment_units eu
join public.equipment e on e.equipment_id=eu.equipment_id
join public.equipment_categories ec on ec.category_id=e.category_id;

-- 9) RLS fixes for admin user management.
drop policy if exists users_admin_update_all on public.users;
create policy users_admin_update_all on public.users for update to authenticated
using (public.current_app_role()='Administrator')
with check (public.current_app_role()='Administrator');

-- Allow admins to insert manually-created application profile rows if needed.
drop policy if exists users_admin_insert on public.users;
create policy users_admin_insert on public.users for insert to authenticated
with check (public.current_app_role()='Administrator');

-- 10) Keep the current app-role helper secure.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path=public
as $$
  select r.role_name from public.users u join public.roles r on r.role_id=u.role_id
  where u.auth_user_id=auth.uid() limit 1;
$$;
