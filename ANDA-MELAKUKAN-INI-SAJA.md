# Hanya ini yang harus Anda lakukan (~5 menit)

Sisanya (kode, SQL, seed konten, bundel setup) sudah ada di repo.

## 1. Supabase (akun Anda)

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → tempel **seluruh** isi file **[`supabase/SUPABASE_FULL_SETUP.sql`](supabase/SUPABASE_FULL_SETUP.sql)** → **Run** (satu kali).
3. **Authentication** → **Users** → **Add user** (email + password Anda).
4. Pada user itu → edit **User Metadata** (raw JSON):

```json
{ "role": "admin" }
```

5. (Disarankan) Matikan pendaftaran publik: **Authentication** → **Providers** → Email → nonaktifkan “Sign up” jika hanya Anda yang admin.

## 2. Vercel (akun Anda)

1. Import repo ini ke Vercel (preset **Vite**).
2. **Settings → Environment Variables** tambahkan:

| Name | Nilai (dari Supabase → Settings → API) |
|------|------------------------------------------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key |

3. **Deploy** (atau redeploy setelah menambah env).

## 3. Selesai

- Situs: URL Vercel Anda.  
- Admin: `…/admin/login` dengan **email + password** user Supabase tadi.

---

**Jika Anda mengubah konten default di kode** (`getDefaultSiteSettings` di TypeScript), jalankan di mesin lokal:

`npm run generate:supabase-seed`

lalu commit file `supabase/seed_site_default.sql` dan `supabase/SUPABASE_FULL_SETUP.sql` yang terbaru, atau jalankan SQL seed saja di Supabase.

**Lokal tanpa Supabase:** jangan set `VITE_SUPABASE_*`, pakai `npm run dev` (Express + SQLite seperti biasa).

Detail tambahan: [SUPABASE.md](SUPABASE.md) · [DEPLOY.md](DEPLOY.md)
