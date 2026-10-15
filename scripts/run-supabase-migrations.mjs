#!/usr/bin/env node
/**
 * Jalankan migrasi Instant 3D via Supabase Management API.
 * Butuh SUPABASE_ACCESS_TOKEN + project ref di .env.local
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

loadEnv(".env.local");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = "fctrxjanqegjmhoklnje";

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN missing in .env.local");
  process.exit(1);
}

const files = [
  "supabase/migrations/20250415100000_instant3d_shares.sql",
  "supabase/migrations/20250416100000_instant3d_saas.sql",
];

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return text;
}

for (const rel of files) {
  const sql = fs.readFileSync(path.join(root, rel), "utf8");
  console.log(`Running ${rel}…`);
  try {
    const out = await runQuery(sql);
    console.log(`  OK ${rel}`, out.slice(0, 120));
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`  Skip (already applied): ${rel}`);
    } else {
      console.error(`  FAIL ${rel}:`, msg);
      process.exit(1);
    }
  }
}

console.log("Done.");
