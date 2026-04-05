# Panduan singkat admin Intero

**Deploy cloud (Supabase + Vercel) — langkah singkat untuk Anda:** [ANDA-MELAKUKAN-INI-SAJA.md](ANDA-MELAKUKAN-INI-SAJA.md)

## Menjalankan project

1. Salin `.env.example` ke `.env` dan isi `ADMIN_USERNAME`, `ADMIN_PASSWORD` (atau `ADMIN_PASSWORD_HASH`), serta `JWT_SECRET` (minimal 16 karakter untuk production).
2. Development: `npm run dev` — membuka Vite di port 5173 dan API di 8787 (proxy `/api` dan `/uploads`).
3. Production: `npm run build` lalu `npm start` — satu server Node melayani API, upload, dan file statis dari `dist/`.
4. Deploy Docker / VPS: lihat [DEPLOY.md](DEPLOY.md). Di balik reverse proxy HTTPS, set `TRUST_PROXY=1` di `.env`.
5. **Supabase + Vercel:** set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, ikuti [SUPABASE.md](SUPABASE.md). Login admin memakai **email** user Supabase yang punya metadata `role: "admin"`.

## Login CMS

Buka `/admin/login`, masuk dengan kredensial dari `.env`. Setelah login, cookie HTTP-only menjaga sesi beberapa hari.

## Menu dan fungsi

| Menu | Fungsi |
|------|--------|
| Global & merek | Nama situs, domain, palet warna, Google Font (opsional), logo/favicon (upload), tautan navbar |
| Kontak & sosial | WhatsApp (digit tanpa `+`), email, alamat, teks telepon, Instagram, daftar sosial `Label\|URL`, opsi form lead |
| SEO & tracking | Meta title/description, gambar OG, Facebook Pixel on/off + ID, Google Analytics (opsional), nama custom event FB |
| Notifikasi toast | On/off, interval min/max detik, timezone & jam aktif, daftar nama/aksi/produk/kota/template, upload suara, batas per sesi |
| FAQ | Tambah/hapus pertanyaan & jawaban (accordion di landing) |
| Footer & privasi | Tagline, jam kerja, copyright, menu `Label\|URL`, HTML halaman kebijakan privasi (route `/privacy`) |
| Konten landing | JSON besar seluruh section — salin cadangan sebelum edit; klik “Terapkan ke draft” lalu “Simpan perubahan” |
| Leads | Tabel pengiriman form: hapus baris, export CSV |

## Form lead (pengunjung)

Tombol CTA utama membuka popup: data tersimpan di database, event **Lead** ke Facebook Pixel (jika aktif), lalu browser diarahkan ke WhatsApp dengan pesan ringkas. Notifikasi Telegram/email ke admin bersifat opsional (lihat `.env.example`).

## Tips keamanan

- Ganti password default sebelum production.
- Set `JWT_SECRET` kuat dan `NODE_ENV=production` agar cookie `Secure` aktif di HTTPS.
- Jangan unggah `.env` ke repositori publik.
