# Borrowing and Returns Reliability Update

This website update builds on the existing reliability fixes while preserving the current project structure and Supabase configuration.

## Frontend changes in `assets/app.js`
- Prevents duplicate borrowing submissions while a request is in progress.
- Validates selected quantities and unique unit IDs before calling `create_borrowing`.
- Validates due dates using local calendar dates.
- Prevents repeated approve, reject, cancel, and return actions in the same browser session and displays errors.
- **Supports partial returns in the interface:** Equipment Officers can enter specific asset tags separated by commas, or type `ALL` to return all currently borrowed units in the request. Only selected units are sent to `receive_borrowing_return` for inspection.
- Shows how many units were recorded as returned and reminds officers that remaining units stay borrowed.
- Removes `Staff` from the client-side borrowing-role allow-list, consistent with the request to remove the Staff role from the website.

## Important Supabase note
The frontend expects the existing `public.receive_borrowing_return(bigint,text,jsonb)` function to support partial returns and update the borrowing status to `Partially Returned` until all units are resolved. This ZIP does not modify the live database and does not include a database migration. Keep the already-installed function and test it before deployment.

True concurrency protection, role enforcement, atomic unit reservation/release, and duplicate-return prevention must remain enforced inside the Supabase database functions and RLS policies. Do not run an unreviewed schema reset or destructive SQL against the live database.

## Suggested tests
1. Submit a request containing at least two units and verify the units are no longer available to another request.
2. Reject or cancel a pending request and verify its units become available again.
3. Approve a request with at least two units, return only one asset tag, and verify the request becomes `Partially Returned` while the other unit remains borrowed.
4. Return the remaining unit and verify the request becomes `Completed`.
5. Return a unit with condition `Damaged` or `For Repair` and verify its availability becomes `Maintenance`.
6. Try repeating the same return action and verify already-returned units cannot be returned twice.
