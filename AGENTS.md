## Cursor Cloud specific instructions

### Project overview

Intero is a full-stack landing page + CMS + lead management system (Indonesian-language). See `README.md` for quick-start commands.

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4 (SPA at port 5173)
- **Backend**: Express.js + SQLite via `better-sqlite3` (API at port 8787)
- **Dev command**: `npm run dev` runs both Vite and Express concurrently

### Environment setup

- Requires Node.js 22 (pre-installed in the VM).
- Copy `.env.example` → `.env` if `.env` doesn't exist. Set `ADMIN_PASSWORD` and `JWT_SECRET` to any dev values. Defaults: `ADMIN_USERNAME=admin`, `PORT=8787`.
- No external databases or services required — SQLite is embedded and auto-created at `server/data/intero.sqlite`.

### Running the dev server

```
npm run dev
```

This starts two concurrent processes (via `concurrently`):
1. Vite dev server on port **5173** (frontend HMR)
2. Express API on port **8787** (backend with `tsx watch`)

Vite proxies `/api` and `/uploads` to Express automatically.

### Build and type checking

- `npm run build` — Vite production build
- `npx tsc --noEmit` — TypeScript type checking (no ESLint configured)

### Admin credentials

Default dev login: username `admin`, password as set in `.env` (`ADMIN_PASSWORD`). Admin panel at `/admin/login`.

### Gotchas

- The project has no ESLint or dedicated lint command — use `npx tsc --noEmit` for static analysis.
- The project has no automated test suite.
- Supabase mode is optional and requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars. Without them, the app runs in local Express + SQLite mode.
- `better-sqlite3` is a native addon compiled during `npm install`. If Node.js major version changes, `node_modules` must be wiped and reinstalled.
