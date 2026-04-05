/**
 * Menghasilkan supabase/seed_site_default.sql dari getDefaultSiteSettings().
 * Jalankan: npx tsx scripts/generate-supabase-seed.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDefaultSiteSettings } from "../src/types/site-settings.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "supabase", "seed_site_default.sql");

const json = JSON.stringify(getDefaultSiteSettings());
const tag = "intero_site_seed";
const q = "$" + tag + "$";

const sql =
  `-- Otomatis dibuat oleh scripts/generate-supabase-seed.ts — jangan edit manual
INSERT INTO public.site_settings (id, data, updated_at)
VALUES (
  'site',
  ` +
  q +
  json +
  q +
  `::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();
`;

fs.writeFileSync(out, sql, "utf8");
console.log("Wrote", out);

const migrationPath = path.join(root, "supabase/migrations/20250403120000_intero_cms.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const fullPath = path.join(root, "supabase/SUPABASE_FULL_SETUP.sql");
const full =
  `-- === Intero: FULL SETUP (schema + RLS + bucket + data default) ===
-- Tempel SELURUH file ini di Supabase → SQL Editor → Run

` +
  migration +
  `

-- --- Seed konten default ---

` +
  sql;
fs.writeFileSync(fullPath, full, "utf8");
console.log("Wrote", fullPath);
