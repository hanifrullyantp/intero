#!/usr/bin/env node
/**
 * Salin env Supabase dari .env.local ke Vercel (Production + Preview).
 * Prasyarat: vercel login && vercel link (project intero).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    const key = s.slice(0, i).trim();
    let val = s.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function vercel(args, input) {
  const r = spawnSync("npx", ["--yes", "vercel@latest", ...args], {
    cwd: root,
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "vercel failed").trim());
  }
  return (r.stdout || "").trim();
}

const KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_3D_PUBLIC_ORIGIN",
  "JWT_SECRET",
];

const env = parseEnv(envPath);
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local dulu.");
  process.exit(1);
}

try {
  execFileSync("npx", ["--yes", "vercel@latest", "whoami"], { cwd: root, stdio: "pipe" });
} catch {
  console.error("Belum login Vercel. Jalankan: npx vercel login");
  process.exit(1);
}

const targets = ["production", "preview"];
for (const key of KEYS) {
  const value = env[key];
  if (!value) continue;
  for (const target of targets) {
    try {
      vercel(["env", "add", key, target, "--force", "--yes"], `${value}\n`);
      console.log(`OK ${key} → ${target}`);
    } catch (e) {
      console.error(`Gagal ${key} → ${target}:`, e.message);
      process.exit(1);
    }
  }
}

console.log("Selesai. Redeploy: git commit --allow-empty -m redeploy && git push");
