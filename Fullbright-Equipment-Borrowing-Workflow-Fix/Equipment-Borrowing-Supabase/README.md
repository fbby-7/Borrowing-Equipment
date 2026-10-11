# Equipment Borrowing System — Supabase Version

This is the online version of the Equipment Borrowing System converted from the original PHP/MySQL project to a **Supabase PostgreSQL + JavaScript** application.

## What is included
- Supabase PostgreSQL database schema
- Supabase Auth sign-in/sign-up
- Dashboard
- Equipment inventory and search
- Borrowing requests
- Staff approval
- Return processing
- Maintenance records
- User list for administrators/officers
- Basic reports
- Row Level Security (RLS)
- Secure PostgreSQL RPC for creating borrowing transactions
- Responsive UI for phone and desktop

Supabase provides the managed Postgres database and APIs; the HTML/CSS/JS frontend can be hosted on Vercel, Netlify, GitHub Pages, Cloudflare Pages, or another static host.

## 1. Create your Supabase project
1. Open https://supabase.com/
2. Create a project.
3. Open **SQL Editor**.
4. Copy everything from `supabase_schema.sql`.
5. Paste it into SQL Editor and click **Run**.

The schema is PostgreSQL because Supabase projects use Postgres.

## 2. Create your first account
Open **Authentication → Users** or simply use the app's **Create Account** screen after the website is connected.

The SQL trigger automatically creates a row in `public.users` when a Supabase Auth account is created.

### Make yourself Administrator
After creating your account:
1. Open **Table Editor → users**.
2. Find your account.
3. Set `role_id` to `1` (Administrator).
4. Optionally set your department and employee number.

Role IDs:
- 1 = Administrator
- 2 = Equipment Officer
- Faculty role is not offered in the updated website; existing database records are not automatically deleted.
- 4 = Staff
- 5 = Student

## 3. Connect the website
Open `assets/app.js` and replace:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_PUBLISHABLE_KEY = 'YOUR_SUPABASE_PUBLISHABLE_KEY';
```

Get these from your Supabase project's **Connect / API** settings. Use the browser-safe **publishable key**. Never put a secret/service-role key in this file.

## 4. Test locally
You can open the folder with a local web server. Do not rely on opening `index.html` directly with `file://` if the browser blocks scripts.

Easy option with VS Code: install Live Server and open `index.html` with Live Server.

## 5. Put it online 24/7
Upload the project folder to a static host such as Vercel, Netlify, GitHub Pages, or Cloudflare Pages. Your classmates can then use the public website while Supabase keeps the database online.

## Important security note
The browser uses the Supabase publishable key. This is intended for frontend applications when Row Level Security policies are correctly configured. **Never expose a Supabase secret/service-role key in frontend JavaScript.**

## Original database conversion
The original project was MySQL. This version converts MySQL-specific features such as `AUTO_INCREMENT`, `ENUM`, MySQL triggers/procedures, and MySQL date/query syntax into PostgreSQL/Supabase equivalents.

## Files
- `index.html` — main application
- `assets/app.js` — Supabase connection + application logic
- `assets/style.css` — responsive UI
- `supabase_schema.sql` — database, relationships, indexes, RLS, trigger, RPC, views

## Add the suggested equipment inventory

1. Open your Supabase project and go to **SQL Editor**.
2. Open `inventory_seed.sql` from this project folder and copy its full contents into a new SQL query.
3. Click **Run**. This adds the 37 reusable equipment types from the inventory list and creates only the number of units needed to reach each suggested quantity. Existing inventory is preserved.
4. Refresh the website's Equipment and Borrow Equipment pages. The equipment is read from Supabase, so it will appear after the SQL runs successfully.

The quantities are sample targets, not a verified count of the college's actual stock. Review and edit `inventory_seed.sql` before running if your real inventory differs. The removed consumables (USB flash drives, RJ45 connectors, jumper wires, and resistor/capacitor kits) are not included.


### Inventory seed duplicate-ID fix
If `inventory_seed.sql` previously failed with `duplicate key value violates unique constraint equipment_pkey`, use this updated version. It synchronizes the database identity sequences with the current maximum IDs before adding inventory. Run the full updated `inventory_seed.sql` in Supabase SQL Editor. It does not delete existing equipment.


Faculty role removal note
- The signup form no longer shows “Graduate / Faculty”; it shows “Graduate” instead.
- Faculty is hidden from the Admin User Management role selector and removed from the website borrower-role allowlist.
- Existing user accounts and database records are not deleted. If an existing Faculty user needs access, an administrator can assign an appropriate remaining role (Staff or Student) in User Management.
- For an existing Supabase database, do not rerun the full schema just to apply this UI change. Deploy the updated website files.
