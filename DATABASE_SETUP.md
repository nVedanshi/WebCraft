# Why data is not stored & how to fix it

## Why data is not stored

The app saves data to Supabase in these tables:

- **workspaces** – generated projects and blueprints  
- **workspace_messages** – chat messages per workspace  
- **generation_history** – history of generations (with `workspace_id`)

Your **new Supabase project (e.g. "lov")** was empty: it had **no these tables**.  
The code was trying to insert into tables that don’t exist, so nothing was stored (and the backend may have returned 500 or “relation does not exist” errors).

---

## Fix: create the tables in Supabase

You need to run the project’s migrations on your Supabase project so that `workspaces`, `workspace_messages`, and (if needed) `generation_history.workspace_id` exist.

### Option A – Supabase Dashboard (recommended)

1. Open [Supabase Dashboard](https://app.supabase.com) and select your project (e.g. **lov**).
2. Go to **SQL Editor**.
3. Run the migrations in order:
   - First: open `supabase/migrations/20260130093644_fb5fffcc-4b67-4af3-96ba-58f92253da18.sql`, copy all its content, paste into the SQL Editor, and click **Run**.
   - Then: open `supabase/migrations/20260218120000_workspaces_and_messages.sql`, copy all its content, paste into the SQL Editor, and click **Run**.

If you already ran the first migration when you set up Auth (profiles, generation_history), run **only** the second file (`20260218120000_workspaces_and_messages.sql`).

### Option B – Supabase CLI

From the project root:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Use the project ref from your Supabase URL (e.g. `cfcqyvrgywkcygcfhxsm`).

---

## After running the migrations

- **workspaces** and **workspace_messages** will exist.  
- The backend (and frontend, where it writes to Supabase) will be able to store and load data.  
- Restart the backend if it’s running, then try generating again; data should be stored in the database.
