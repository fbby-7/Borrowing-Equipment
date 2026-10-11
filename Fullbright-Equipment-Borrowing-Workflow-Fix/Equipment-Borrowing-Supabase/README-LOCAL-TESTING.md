# Local development guide (VS Code)

Use this setup to edit and test the Fullbright College Equipment Borrowing System on your computer. You do not need to upload to Netlify after every edit. Netlify is only needed when you want to publish a change for other people to use.

## 1. Open the project in VS Code

1. Extract this ZIP to a normal folder, for example `Documents/Fullbright-Equipment-Borrowing-System`.
2. Open Visual Studio Code.
3. Select **File → Open Folder...** and choose the extracted `Equipment-Borrowing-Supabase` folder (the folder that contains `index.html`).
4. If VS Code recommends the **Live Server** extension, install it. You can also find it by searching Extensions for `Live Server` by Ritwick Dey.

## 2. Connect Supabase once

Open `assets/app.js` and replace these placeholder values at the top with your own Supabase project's URL and browser-safe publishable key:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_PUBLISHABLE_KEY = 'YOUR_SUPABASE_PUBLISHABLE_KEY';
```

Find the values in your Supabase project's **Connect** or **API Keys** settings. Never use a `service_role` key or a secret key in browser JavaScript.

Save the file. You normally only need to do this once for your local copy.

## 3. Allow the local address in Supabase Auth

In the Supabase Dashboard, open **Authentication → URL Configuration**. Add these to **Redirect URLs**:

- `http://127.0.0.1:5500/**`
- `http://localhost:5500/**`

Keep your real deployed website URL configured too if you already use one. If your Supabase dashboard shows a different label for redirect URLs, use the allowed redirect URL list.

## 4. Start the website locally

### Option A — Live Server (recommended)

1. In VS Code, open `index.html`.
2. Right-click inside the file and choose **Open with Live Server**. Alternatively, click **Go Live** in the bottom status bar.
3. Your browser opens a local address, usually `http://127.0.0.1:5500`.
4. Edit and save HTML, CSS, or JavaScript. Live Server refreshes the page automatically in most cases.

### Option B — Start script (Windows)

Double-click `start-local.bat`. It uses Python's built-in HTTP server if Python is installed. Keep the command window open while testing. Press **Ctrl+C** in that window to stop the server.

## 5. Test safely

- Local testing still connects to your real Supabase project. Actions like creating accounts, adding equipment, or submitting borrowing requests can change real database records.
- Use a separate Supabase test project if you want to experiment without affecting your real data.
- Test login, signup, page navigation, equipment loading, borrowing requests, and each role with appropriate test accounts.
- If the page is blank, open browser Developer Tools with **F12 → Console** and read the first red error.
- If login/confirmation redirects fail, double-check the local URL in Supabase Authentication URL Configuration.

## 6. Publish only when ready

Keep editing and testing locally. When you are satisfied, deploy the same project folder to Netlify. You do not need to upload it after every save—only when you want the public site updated.

## Project files

- `index.html` — app structure
- `assets/style.css` — styles and responsive layout
- `assets/app.js` — application logic and Supabase connection
- `assets/fullbright-logo.jpg` — Fullbright College logo
- `supabase_schema.sql`, `supabase_upgrade.sql`, `fix_borrow_request.sql` — database scripts; do not rerun schema scripts on a populated database without reviewing them first

## Equipment images in the borrowing picker
The Borrow Equipment page now shows visual equipment cards with locally stored illustrations. The picker chooses a suitable illustration based on equipment/category words (laptop/computer, projector/display, camera/video, speaker/audio), with a generic fallback for other items. These are illustrative thumbnails, not photographs of the exact physical units. No database migration is required for this UI enhancement.
