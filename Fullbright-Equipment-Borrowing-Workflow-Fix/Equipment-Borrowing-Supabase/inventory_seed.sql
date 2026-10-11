-- Fullbright College Equipment Borrowing System: inventory seed
-- Safe to re-run: adds only enough units to reach each suggested target quantity.
-- These are suggested inventory quantities; adjust them to match actual school stock.
-- Run this file in Supabase SQL Editor after applying supabase_schema.sql and supabase_upgrade.sql.
begin;

insert into public.equipment_categories(category_name, description) values
('Classroom and Office', 'Reusable equipment and tools for classroom and office.'),
('Computer Accessories and Storage', 'Reusable equipment and tools for computer accessories and storage.'),
('Electronics and Soldering', 'Reusable equipment and tools for electronics and soldering.'),
('Hand Tools and Workshop', 'Reusable equipment and tools for hand tools and workshop.'),
('Networking', 'Reusable equipment and tools for networking.'),
('Presentation and Audio', 'Reusable equipment and tools for presentation and audio.')
on conflict (category_name) do nothing;

-- Repair identity sequences in case existing rows were inserted with explicit IDs.
-- This prevents duplicate primary-key errors such as equipment_id = 1 already exists.
do $$
declare seq_name text;
begin
  seq_name := pg_get_serial_sequence('public.equipment_categories', 'category_id');
  if seq_name is not null then
    perform setval(seq_name, greatest(coalesce((select max(category_id) from public.equipment_categories), 0), 1),
                   coalesce((select max(category_id) from public.equipment_categories), 0) > 0);
  end if;
  seq_name := pg_get_serial_sequence('public.equipment', 'equipment_id');
  if seq_name is not null then
    perform setval(seq_name, greatest(coalesce((select max(equipment_id) from public.equipment), 0), 1),
                   coalesce((select max(equipment_id) from public.equipment), 0) > 0);
  end if;
  seq_name := pg_get_serial_sequence('public.equipment_units', 'unit_id');
  if seq_name is not null then
    perform setval(seq_name, greatest(coalesce((select max(unit_id) from public.equipment_units), 0), 1),
                   coalesce((select max(unit_id) from public.equipment_units), 0) > 0);
  end if;
end $$;

do $$
declare
  item record;
  cat_id bigint;
  eq_id bigint;
  current_qty integer;
  add_qty integer;
  n integer;
  tag_prefix text;
begin
  for item in select * from (values
    ('Computer Accessories and Storage'::text, 'External hard drive or SSD'::text, 5::integer),
    ('Computer Accessories and Storage'::text, 'USB hub'::text, 8::integer),
    ('Computer Accessories and Storage'::text, 'USB-C adapter'::text, 8::integer),
    ('Computer Accessories and Storage'::text, 'HDMI adapter'::text, 10::integer),
    ('Computer Accessories and Storage'::text, 'HDMI cable'::text, 15::integer),
    ('Networking'::text, 'Network switch'::text, 8::integer),
    ('Networking'::text, 'Router'::text, 6::integer),
    ('Networking'::text, 'Wireless access point'::text, 4::integer),
    ('Networking'::text, 'Ethernet cables (Cat5e/Cat6)'::text, 30::integer),
    ('Networking'::text, 'RJ45 crimping tool'::text, 10::integer),
    ('Networking'::text, 'Cable stripper and cutter'::text, 8::integer),
    ('Networking'::text, 'Network cable tester'::text, 8::integer),
    ('Networking'::text, 'Punch-down tool'::text, 6::integer),
    ('Electronics and Soldering'::text, 'Soldering station'::text, 8::integer),
    ('Electronics and Soldering'::text, 'Soldering iron stand'::text, 10::integer),
    ('Electronics and Soldering'::text, 'Electronic component kit'::text, 15::integer),
    ('Electronics and Soldering'::text, 'Wire stripper'::text, 10::integer),
    ('Electronics and Soldering'::text, 'Heat gun'::text, 3::integer),
    ('Hand Tools and Workshop'::text, 'Precision screwdriver set'::text, 10::integer),
    ('Hand Tools and Workshop'::text, 'Screwdriver set'::text, 10::integer),
    ('Hand Tools and Workshop'::text, 'Pliers set'::text, 8::integer),
    ('Hand Tools and Workshop'::text, 'Clamps'::text, 12::integer),
    ('Hand Tools and Workshop'::text, 'Hot glue gun'::text, 8::integer),
    ('Hand Tools and Workshop'::text, 'Hand drill'::text, 3::integer),
    ('Hand Tools and Workshop'::text, 'Measuring tools'::text, 10::integer),
    ('Classroom and Office'::text, 'Whiteboard'::text, 4::integer),
    ('Classroom and Office'::text, 'Stapler'::text, 6::integer),
    ('Classroom and Office'::text, 'Folding table'::text, 8::integer),
    ('Classroom and Office'::text, 'Bulletin board'::text, 3::integer),
    ('Classroom and Office'::text, 'Portable chairs'::text, 30::integer),
    ('Classroom and Office'::text, 'Paper cutter'::text, 3::integer),
    ('Classroom and Office'::text, 'Extension cord'::text, 12::integer),
    ('Presentation and Audio'::text, 'Projector'::text, 4::integer),
    ('Presentation and Audio'::text, 'Portable projection screen'::text, 3::integer),
    ('Presentation and Audio'::text, 'Wireless microphone'::text, 4::integer),
    ('Presentation and Audio'::text, 'Wired microphone'::text, 6::integer),
    ('Presentation and Audio'::text, 'Portable speaker'::text, 4::integer)
  ) as v(category_name, equipment_name, target_qty) loop
    select category_id into cat_id from public.equipment_categories where category_name=item.category_name;
    select equipment_id into eq_id from public.equipment where lower(btrim(equipment_name))=lower(btrim(item.equipment_name)) order by equipment_id limit 1;
    if eq_id is null then
      insert into public.equipment(category_id, equipment_name, brand, model, description, replacement_cost)
      values(cat_id, item.equipment_name, null, null, 'Reusable inventory item', 0) returning equipment_id into eq_id;
    end if;
    select count(*) into current_qty
      from public.equipment_units eu join public.equipment e on e.equipment_id=eu.equipment_id
      where lower(btrim(e.equipment_name))=lower(btrim(item.equipment_name));
    add_qty := greatest(item.target_qty-current_qty, 0);
    tag_prefix := upper(regexp_replace(item.equipment_name, '[^A-Za-z0-9]+', '-', 'g'));
    for n in 1..add_qty loop
      insert into public.equipment_units(equipment_id, asset_tag, condition_status, availability_status)
      values(eq_id, 'FC-' || left(tag_prefix, 24) || '-' || lpad((current_qty+n)::text, 3, '0'), 'Good', 'Available')
      on conflict (asset_tag) do nothing;
    end loop;
  end loop;
end $$;

commit;

-- Inventory list: 37 equipment types, 320 suggested units (not including existing items beyond targets).
