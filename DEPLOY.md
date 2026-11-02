# Deploying Plotworks to Vercel with Supabase

This puts the MVP online at a `https://<name>.vercel.app` address you can share.
Supabase is only the Postgres database. Logins stay with the app's own Auth.js
(do **not** use Supabase Auth or Supabase Storage).

Allow about 45 minutes the first time. All commands are run in **PowerShell**, inside
the project folder (`C:\Users\HP\Documents\real estate`).

---

## Before you start

- A Supabase account and a Vercel account (free plans are fine for a demo).
- Node.js is already installed on this PC.
- Decide on three **new** passwords and keep them in a password manager. Use only
  letters and digits (no `@ : / ? # %`) so they work inside connection URLs without escaping.
  1. **Database password** – Supabase asks for it when you create the project.
  2. **App role password** – for the restricted `plotworks_app` database user.
  3. **Demo login password** – what the client types on the sign-in page.

> Never reuse the dev values from `.env.example` (`plotworks_app_dev`, `Plotworks-dev-2026`).
> They are in the code, so anyone could read them.

---

## Part A – Create the Supabase database

1. Go to supabase.com → **New project**.
   - Name: `plotworks`
   - Database password: password **1**
   - Region: the one closest to your client (note it – Vercel should match it in step 13).
2. Wait for the project to finish provisioning.
3. **Turn off the Data API.** Go to **Project Settings → Data API** and disable it.
   The app doesn't use it, and leaving it on would publish tables that rely on the app
   (not row-level security) for protection – including the `User` table with password hashes.
4. Click **Connect** (top of the dashboard) and open the connection strings. You need the
   **Session pooler** string. It looks like:

   ```
   postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   Note your `<project-ref>` and `<region>` – you'll build the second URL from them.
   Don't use the "Direct connection" string: it is IPv6-only and fails on most home internet.

You now have two URLs:

| Name | Used for | Value |
|---|---|---|
| `DATABASE_URL` | Setting up tables (from this PC) | `postgresql://postgres.<project-ref>:<password 1>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| `APP_DATABASE_URL` | The live app (on Vercel) | `postgresql://plotworks_app.<project-ref>:<password 2>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |

Note the differences in the second one: user `plotworks_app.<ref>`, port **6543**
(transaction pooler), and `?pgbouncer=true&connection_limit=1` on the end.

---

## Part B – Set up the tables, security rules and demo data (from this PC)

5. Open PowerShell in the project folder and point this window (only) at Supabase.
   These override `.env` for this window and disappear when you close it:

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres.<project-ref>:<password 1>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   $env:SEED_PASSWORD = "<password 3>"
   ```

6. Create the tables, the restricted app role, the row-level security policies and the ledger triggers:

   ```powershell
   npm run db:deploy
   ```

   You should see "All migrations have been successfully applied" and "Script executed successfully".

7. In Supabase → **SQL Editor**, replace the app role's dev password with password **2**:

   ```sql
   ALTER ROLE plotworks_app PASSWORD '<password 2>';
   ```

8. Load the demo accounts and projects (run this **once** – a second run fails on duplicate emails, which is harmless):

   ```powershell
   npm run db:seed
   ```

9. Close this PowerShell window so the Supabase settings don't linger.

---

## Part C – Deploy to Vercel

The quickest route uses the Vercel CLI (no GitHub needed). `.vercelignore` stops `.env`
and local build files from being uploaded.

10. Sign in and create the Vercel project:

    ```powershell
    npx vercel login
    npx vercel link
    ```

    For `link`: choose your account, answer **No** to "link to existing project", name it
    (e.g. `plotworks`), directory `./`, and accept the detected Next.js settings.

11. Make an auth secret (copy the output):

    ```powershell
    $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
    ```

12. In the Vercel dashboard → your project → **Settings → Environment Variables**, add these
    for **Production** and **Preview**:

    | Key | Value |
    |---|---|
    | `DATABASE_URL` | the session-pooler URL from Part A (port 5432) |
    | `APP_DATABASE_URL` | the transaction-pooler URL for `plotworks_app` (port 6543, with `?pgbouncer=true&connection_limit=1`) |
    | `AUTH_SECRET` | the value from step 11 |
    | `AUTH_TRUST_HOST` | `true` |
    | `ANTHROPIC_API_KEY` | optional – leave it out and the AI panel shows "summary not available" |

    Don't add `SEED_PASSWORD` – it's only used by the seed script.

13. **Settings → Functions → Function Region**: pick the region closest to your Supabase
    region (every page talks to the database, so this matters for speed).

14. Deploy:

    ```powershell
    npx vercel --prod
    ```

    When it finishes it prints the live URL.

---

## Part D – Check it, then share it

15. Open the URL and sign in with password **3**:
    - `tendai@moyo.test` → should see 2 projects (Acacia Rise, Hillside cottage), not Harbor Road.
    - `admin@plotworks.test` → back office with 3 projects; open a ledger.
16. Send the client:
    - the URL,
    - one client login (e.g. `tendai@moyo.test`) and, if useful, `admin@plotworks.test`,
    - the password **separately** (e.g. by phone or a different message).
17. Tell them what's demo-only:
    - all names, plots and figures are sample data;
    - receipt links say storage isn't configured (file uploads aren't built yet);
    - the AI summary only appears if you added `ANTHROPIC_API_KEY`.

**Who can see it?** The production URL is public; the sign-in page is the only gate, so
keep password 3 strong. Vercel's site-wide password ("Password Protection") needs a paid plan.

---

## Updating the live site later

- Code change: run `npx vercel --prod` again.
- If the change includes a database migration: repeat step 5 (only `DATABASE_URL`), then
  `npm run db:deploy`, then deploy.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Can't reach database server` when running step 6 | Used the "Direct connection" URL | Use the Session pooler URL (port 5432, `pooler.supabase.com`) |
| `password authentication failed` | Wrong password, or a special character in it | Re-check; avoid `@ : / ? # %` or URL-encode them |
| Build fails mentioning `APP_DATABASE_URL` | Variable not set for that environment | Add it under Production **and** Preview, redeploy |
| `prepared statement "s0" already exists` in Vercel logs | `?pgbouncer=true` missing | Fix `APP_DATABASE_URL`, redeploy |
| Sign-in shows a "Configuration" error | `AUTH_SECRET` missing | Add it, redeploy |
| Signed in but pages error / no projects | `APP_DATABASE_URL` user or password doesn't match step 7 | Check it's `plotworks_app.<ref>` with password 2 |
| `Unique constraint failed` on `db:seed` | Already seeded | Nothing to do |

Vercel logs: project → **Deployments** → latest → **Logs**.
