# Deploy Intero (Vite + Node + SQLite)

## Ringkasan

Aplikasi ini satu proses Node: **API**, **upload**, dan **file statis** (`dist/`). Database SQLite dan file upload harus **persisten** (volume Docker atau folder di VPS).

## Persiapan

1. Salin `.env.example` ke `.env`.
2. Set minimal: `ADMIN_USERNAME`, `ADMIN_PASSWORD` atau `ADMIN_PASSWORD_HASH`, `JWT_SECRET` (≥16 karakter).
3. Di production, akses admin **hanya lewat HTTPS** agar cookie login (`Secure`) terkirim.

## Opsi A: Docker Compose (disarankan)

Di server (Linux dengan Docker):

```bash
docker compose up -d --build
```

- Port default **8787**. Ubah di `.env` host: `PORT=8787` mematuhi mapping `docker-compose.yml`.
- Data tersimpan di volume `intero-sqlite` dan `intero-uploads`.

Di belakang **Nginx / Caddy** dengan TLS, set di `.env`:

```env
TRUST_PROXY=1
```

agar Express mengenali `X-Forwarded-Proto` dan cookie aman.

### Contoh Caddy (reverse proxy)

```caddyfile
intero.example.com {
    reverse_proxy localhost:8787
}
```

## Opsi B: Tanpa Docker (VPS)

```bash
npm ci
npm run build
NODE_ENV=production PORT=8787 node ./node_modules/.bin/tsx server/index.ts
```

Gunakan **systemd**, **pm2**, atau **forever** agar proses tetap jalan. Backup rutin folder `server/data/` dan `server/uploads/`.

## Opsi C: Build gambar saja

```bash
docker build -t intero-web .
docker run -d -p 8787:8787 --env-file .env \
  -v intero-data:/app/server/data \
  -v intero-up:/app/server/uploads \
  intero-web
```

## Pengecekan

- Buka `https://domain-anda/` → landing memuat dari API.
- Buka `https://domain-anda/admin/login` → CMS.
- Pastikan route client (`/admin`, `/privacy`) tidak 404: server sudah mengembalikan `index.html` untuk SPA.

## Opsi D: Vercel + Supabase (tanpa server Node)

Frontend saja di **Vercel**, data di **Supabase** (Postgres + Storage + Auth). Tidak perlu Docker/Express.

1. Ikuti langkah penuh di [SUPABASE.md](SUPABASE.md) (migrasi SQL, user admin, env `VITE_SUPABASE_*`).
2. Di Vercel: build `npm run build`, output `dist`, set env seperti di SUPABASE.md.
3. `vercel.json` memastikan `/admin` dan `/privacy` tidak 404.

Tanpa Supabase, hosting statis murni **tidak** bisa form lead/CMS (lihat paragraf di bawah).

## Hosting statis saja (tanpa Supabase & tanpa Node)

Tanpa Node dan tanpa Supabase tidak bisa form lead, CMS, atau penyimpanan. Gunakan **Opsi D** atau Docker/Opsi B.
