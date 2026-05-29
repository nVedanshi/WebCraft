# Supabase Project Kaise Change Karein

Naya Supabase project use karne ke liye **2 files** update karni hain.

---

## 1. Naye project ki values kaise nikalein

1. [Supabase Dashboard](https://app.supabase.com) open karo.
2. **Naya project** select karo (ya naya project banao).
3. Left sidebar → **Project Settings** (gear icon) → **API** (ya **API Keys**).
4. **Important – "Invalid API key" avoid karne ke liye:**  
   **Legacy API Keys** tab open karo (Publishable key mat use karo; supabase-js abhi JWT keys expect karta hai).
5. Wahan se ye copy karo:
   - **Project URL** → `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - **anon** key (JWT, `eyJ...` se start) → `VITE_SUPABASE_ANON_KEY` (sirf frontend)
   - **service_role** key (JWT) → `SUPABASE_SERVICE_ROLE_KEY` (sirf backend)

---

## 2. Frontend – root `.env`

Project root mein `.env` file kholo aur ye 3 values **naye project** ki se replace karo:

```env
VITE_SUPABASE_PROJECT_ID="your_new_project_ref"
VITE_SUPABASE_ANON_KEY="your_new_anon_key_here"
VITE_SUPABASE_URL="https://your_new_project_ref.supabase.co"
```

- `your_new_project_ref` = Project URL mein jo ref hai (e.g. `xyzabc123` from `https://xyzabc123.supabase.co`).

---

## 3. Backend – `backend/.env`

`backend/.env` mein ye 2 values **naye project** ki se replace karo:

```env
SUPABASE_URL=https://your_new_project_ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
```

⚠️ **Service role key** secret hoti hai – ye sirf backend mein use karo, frontend ya public code mein mat dalna.

---

## 4. Restart karo

- **Frontend:** `npm run dev` band karke dubara chalao.
- **Backend:** `npm run dev` (backend folder mein) band karke dubara chalao.

Env change ke baad restart zaroori hai.

---

## Summary

| File           | Variables to change |
|----------------|---------------------|
| `.env` (root)  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PROJECT_ID` |
| `backend/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

Don’t commit real keys to Git. `.env` files already gitignore mein honi chahiye.
