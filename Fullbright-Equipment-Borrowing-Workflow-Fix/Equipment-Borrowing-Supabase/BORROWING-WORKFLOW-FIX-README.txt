FULLBRIGHT COLLEGE — BORROWING WORKFLOW FIX

IMPORTANT: Back up your Supabase database before applying this migration.

1. In Supabase SQL Editor, run borrowing_workflow_fix.sql as one complete script.
2. Confirm it reports Success.
3. Deploy this folder to your existing Netlify site.
4. Test with a test student and test equipment before using real requests.

What changed:
- create_borrowing locks units and validates IDs before reserving them. Pending requests reserve units to prevent double-booking.
- Approval is now performed by a database function restricted to Administrator/Equipment Officer roles.
- Rejection releases units only when no other active request references them.
- Return processing is atomic: return records, item statuses, unit availability, and borrowing status update together.
- The transactions page now offers Reject for pending requests.

This migration does not delete existing users, equipment, or borrowing records. It assumes the existing table and column names in this project. Test the workflow in a staging project first if possible.
