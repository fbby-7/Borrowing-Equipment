-- Fullbright College: safer borrowing workflow
-- Apply in Supabase SQL Editor after taking a database backup.
-- Does not drop tables or delete existing records.

CREATE OR REPLACE FUNCTION public.create_borrowing(
    p_unit_ids bigint[],
    p_expected_return_date date,
    p_purpose text,
    p_remarks text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_user_id bigint;
    v_borrowing_id bigint;
    v_unit_count integer;
    v_available_count integer;
BEGIN
    SELECT u.user_id INTO v_user_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.user_status = 'Active';
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Active user profile not found'; END IF;
    IF p_unit_ids IS NULL OR cardinality(p_unit_ids) = 0 THEN RAISE EXCEPTION 'Select at least one equipment unit'; END IF;
    IF array_position(p_unit_ids, NULL) IS NOT NULL THEN RAISE EXCEPTION 'Equipment IDs cannot contain NULL'; END IF;
    IF cardinality(p_unit_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_unit_ids) AS t(x)) THEN RAISE EXCEPTION 'Duplicate equipment units are not allowed'; END IF;
    IF p_purpose IS NULL OR btrim(p_purpose) = '' THEN RAISE EXCEPTION 'Purpose is required'; END IF;
    IF p_expected_return_date IS NULL OR p_expected_return_date < current_date THEN RAISE EXCEPTION 'Return date cannot be in the past'; END IF;
    IF p_expected_return_date > current_date + 7 THEN RAISE EXCEPTION 'Maximum borrowing period is 7 days'; END IF;

    PERFORM eu.unit_id FROM public.equipment_units eu
    WHERE eu.unit_id = ANY(p_unit_ids) ORDER BY eu.unit_id FOR UPDATE;
    SELECT count(*) INTO v_unit_count FROM public.equipment_units eu WHERE eu.unit_id = ANY(p_unit_ids);
    IF v_unit_count <> cardinality(p_unit_ids) THEN RAISE EXCEPTION 'One or more equipment units do not exist'; END IF;
    SELECT count(*) INTO v_available_count FROM public.equipment_units eu
    WHERE eu.unit_id = ANY(p_unit_ids) AND eu.availability_status = 'Available';
    IF v_available_count <> cardinality(p_unit_ids) THEN RAISE EXCEPTION 'One or more selected units are not available'; END IF;

    INSERT INTO public.borrowings(borrower_id, expected_return_date, purpose, status, remarks)
    VALUES(v_user_id, p_expected_return_date, btrim(p_purpose), 'Pending', p_remarks)
    RETURNING borrowing_id INTO v_borrowing_id;

    INSERT INTO public.borrowing_items(borrowing_id, unit_id, item_condition_out, item_status)
    SELECT v_borrowing_id, eu.unit_id, eu.condition_status, 'Borrowed'
    FROM public.equipment_units eu WHERE eu.unit_id = ANY(p_unit_ids);

    -- Pending requests reserve units so they cannot be double-booked.
    UPDATE public.equipment_units SET availability_status = 'Borrowed'
    WHERE unit_id = ANY(p_unit_ids);
    RETURN v_borrowing_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_borrowing(p_borrowing_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_approver_id bigint; v_status text;
BEGIN
  IF public.current_app_role() NOT IN ('Administrator','Equipment Officer') THEN RAISE EXCEPTION 'Not authorized to approve borrowing requests'; END IF;
  SELECT user_id INTO v_approver_id FROM public.users WHERE auth_user_id = auth.uid() AND user_status = 'Active';
  IF v_approver_id IS NULL THEN RAISE EXCEPTION 'Active staff profile not found'; END IF;
  SELECT status INTO v_status FROM public.borrowings WHERE borrowing_id = p_borrowing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Borrowing request not found'; END IF;
  IF v_status <> 'Pending' THEN RAISE EXCEPTION 'Only pending requests can be approved'; END IF;
  UPDATE public.borrowings SET status = 'Active', approved_by = v_approver_id WHERE borrowing_id = p_borrowing_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_borrowing(p_borrowing_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_status text;
BEGIN
  IF public.current_app_role() NOT IN ('Administrator','Equipment Officer') THEN RAISE EXCEPTION 'Not authorized to reject borrowing requests'; END IF;
  SELECT status INTO v_status FROM public.borrowings WHERE borrowing_id = p_borrowing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Borrowing request not found'; END IF;
  IF v_status <> 'Pending' THEN RAISE EXCEPTION 'Only pending requests can be rejected'; END IF;
  PERFORM eu.unit_id FROM public.equipment_units eu JOIN public.borrowing_items bi ON bi.unit_id = eu.unit_id WHERE bi.borrowing_id = p_borrowing_id ORDER BY eu.unit_id FOR UPDATE OF eu;
  UPDATE public.equipment_units eu SET availability_status = 'Available'
  WHERE EXISTS (SELECT 1 FROM public.borrowing_items bi WHERE bi.borrowing_id = p_borrowing_id AND bi.unit_id = eu.unit_id)
    AND eu.availability_status = 'Borrowed'
    AND NOT EXISTS (SELECT 1 FROM public.borrowing_items bi JOIN public.borrowings b ON b.borrowing_id = bi.borrowing_id WHERE bi.unit_id = eu.unit_id AND b.borrowing_id <> p_borrowing_id AND b.status IN ('Pending','Approved','Active','Partially Returned') AND bi.item_status = 'Borrowed');
  UPDATE public.borrowings SET status = 'Rejected' WHERE borrowing_id = p_borrowing_id;
  UPDATE public.borrowing_items SET item_status = 'Returned' WHERE borrowing_id = p_borrowing_id AND item_status = 'Borrowed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.receive_borrowing_return(p_borrowing_id bigint, p_remarks text DEFAULT 'Returned through web app')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_receiver_id bigint; v_status text; v_return_id bigint; v_item record;
BEGIN
  IF public.current_app_role() NOT IN ('Administrator','Equipment Officer') THEN RAISE EXCEPTION 'Not authorized to receive equipment returns'; END IF;
  SELECT user_id INTO v_receiver_id FROM public.users WHERE auth_user_id = auth.uid() AND user_status = 'Active';
  IF v_receiver_id IS NULL THEN RAISE EXCEPTION 'Active staff profile not found'; END IF;
  SELECT status INTO v_status FROM public.borrowings WHERE borrowing_id = p_borrowing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Borrowing request not found'; END IF;
  IF v_status NOT IN ('Active','Approved','Partially Returned') THEN RAISE EXCEPTION 'Only active borrowings can be returned'; END IF;
  PERFORM eu.unit_id FROM public.equipment_units eu JOIN public.borrowing_items bi ON bi.unit_id = eu.unit_id WHERE bi.borrowing_id = p_borrowing_id AND bi.item_status = 'Borrowed' ORDER BY eu.unit_id FOR UPDATE OF eu;
  IF NOT EXISTS (SELECT 1 FROM public.borrowing_items WHERE borrowing_id = p_borrowing_id AND item_status = 'Borrowed') THEN RAISE EXCEPTION 'No borrowed items found'; END IF;
  INSERT INTO public.returns(borrowing_id, received_by, remarks) VALUES(p_borrowing_id, v_receiver_id, p_remarks) RETURNING return_id INTO v_return_id;
  FOR v_item IN SELECT bi.borrowing_item_id, bi.unit_id, bi.item_condition_out FROM public.borrowing_items bi WHERE bi.borrowing_id = p_borrowing_id AND bi.item_status = 'Borrowed' ORDER BY bi.unit_id LOOP
    INSERT INTO public.return_items(return_id, borrowing_item_id, condition_in) VALUES(v_return_id, v_item.borrowing_item_id, v_item.item_condition_out);
    UPDATE public.borrowing_items SET item_status = 'Returned' WHERE borrowing_item_id = v_item.borrowing_item_id;
    UPDATE public.equipment_units SET availability_status = 'Available' WHERE unit_id = v_item.unit_id;
  END LOOP;
  UPDATE public.borrowings SET status = 'Completed' WHERE borrowing_id = p_borrowing_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_borrowing(bigint[], date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_borrowing(bigint[], date, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_borrowing(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_borrowing(bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_borrowing(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_borrowing(bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.receive_borrowing_return(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_borrowing_return(bigint, text) TO authenticated;
