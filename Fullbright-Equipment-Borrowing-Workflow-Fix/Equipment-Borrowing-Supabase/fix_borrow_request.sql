-- FULLBRIGHT COLLEGE - FIX BORROW REQUEST ERROR
-- Run this once in Supabase SQL Editor.
-- Fixes: column reference "unit_id" is ambiguous

create or replace function public.create_borrowing(
  p_unit_ids bigint[],
  p_expected_return_date date,
  p_purpose text,
  p_remarks text default null
)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid bigint;
  v_bid bigint;
  v_unit_id bigint;
begin
  select u.user_id into v_uid
  from public.users u
  where u.auth_user_id=auth.uid()
    and u.user_status='Active';

  if v_uid is null then
    raise exception 'Active user profile not found';
  end if;

  if coalesce(array_length(p_unit_ids,1),0)=0 then
    raise exception 'Select at least one equipment unit';
  end if;

  if p_expected_return_date < current_date then
    raise exception 'Return date cannot be in the past';
  end if;

  if p_expected_return_date > current_date + 7 then
    raise exception 'Maximum borrowing period is 7 days';
  end if;

  if exists (
    select 1
    from public.equipment_units eu
    where eu.unit_id=any(p_unit_ids)
      and eu.availability_status <> 'Available'
  ) then
    raise exception 'One or more selected units are not available';
  end if;

  insert into public.borrowings(
    borrower_id, expected_return_date, purpose, status, remarks
  )
  values (
    v_uid, p_expected_return_date, p_purpose, 'Pending', p_remarks
  )
  returning borrowing_id into v_bid;

  foreach v_unit_id in array p_unit_ids loop
    insert into public.borrowing_items(
      borrowing_id, unit_id, item_condition_out, item_status
    )
    select
      v_bid, eu.unit_id, eu.condition_status, 'Borrowed'
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
