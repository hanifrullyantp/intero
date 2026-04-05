# Supabase + Intero (Vercel / hosting statis)

**Checklist terpendek untuk Anda:** [ANDA-MELAKUKAN-INI-SAJA.md](ANDA-MELAKUKAN-INI-SAJA.md)

Jika `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` diset, aplikasi memakai **Supabase** untuk:

- **Postgres**: `site_settings` (JSON konten situs), `leads`
- **Storage**: bucket `site-uploads` (logo, favicon, OG, audio toast, referensi lead di folder `refs/`)
- **Auth**: login admin (email + password), dengan **role admin** di metadata

Server Express + SQLite **tidak dipakai** untuk fitur ini saat mode Supabase aktif (cukup deploy frontend).

## 1. Buat proyek Supabase

1. [supabase.com](https://supabase.com) → New project.
2. Catat **Project URL** dan **anon public** key (Settings → API).

## 2. Jalankan SQL (satu kali)

Di **SQL Editor**, tempel **seluruh** isi **[`supabase/SUPABASE_FULL_SETUP.sql`](supabase/SUPABASE_FULL_SETUP.sql)** lalu **Run**.

File itu sudah berisi: tabel, RLS, bucket `site-uploads`, dan **konten situs default** penuh (tidak perlu “Simpan” pertama di CMS).

Alternatif manual: jalankan dulu [`supabase/migrations/20250403120000_intero_cms.sql`](supabase/migrations/20250403120000_intero_cms.sql), lalu [`supabase/seed_site_default.sql`](supabase/seed_site_default.sql).

Regenerasi seed dari kode: `npm run generate:supabase-seed`

## 3. Buat user admin

1. **Authentication** → **Users** → **Add user** → email + password (atau undang).
2. Buka user → **Edit** → bagian **User Metadata** / raw JSON, set:

```json
{
  "role": "admin"
}
```

Tanpa `role: "admin"`, login akan ditolak setelah verifikasi password.

3. Matikan **public sign-up** jika hanya satu admin (Authentication → Providers → Email → disable sign up), agar tidak ada orang lain mendaftar.

## 4. Environment (Vercel / build)

Di **Vercel** → Project → **Settings** → **Environment Variables**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key |

**Penting:** variabel diawali `VITE_` disematkan saat **`npm run build`**. Setelah mengubah env, **redeploy**.

Lokal: tambahkan ke `.env`:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 5. Deploy Vercel

- **Framework Preset:** Vite  
- **Build command:** `npm run build`  
- **Output directory:** `dist`  
- `vercel.json` sudah mengarahkan semua rute ke `index.html` (SPA).

## 6. Pertama kali konten

Jika tabel `site_settings` masih kosong, situs memakai **default bawaan** sampai admin login dan klik **Simpan** di CMS (baris pertama terisi).

## Notifikasi email/Telegram

Tanpa backend Node, hook notifikasi dari server tidak jalan. Opsional: **Database Webhook** Supabase pada tabel `leads` (INSERT) ke Zapier/n8n/Edge Function.

## Dev lokal tanpa Supabase

Hapus / jangan set `VITE_SUPABASE_*`, lalu `npm run dev` — tetap memakai API Express + SQLite seperti sebelumnya.
