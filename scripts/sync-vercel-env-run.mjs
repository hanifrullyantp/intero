import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const vc = process.env.VERCEL_BIN || "/Users/user/Library/Caches/com.vercel.cli/native/65.9.0/darwin-x64/vercel";

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i <= 0) continue;
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  return out;
}

const env = parseEnv(path.join(root, ".env.local"));
const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VITE_3D_PUBLIC_ORIGIN"];
const targets = ["production", "preview", "development"];

for (const key of keys) {
  const val = env[key];
  if (!val) {
    console.log("skip", key);
    continue;
  }
  const sensitive = !key.startsWith("VITE_");
  for (const target of targets) {
    const args = ["env", "add", key, target, "--force", "--yes"];
    if (sensitive) args.push("--sensitive");
    else args.push("--no-sensitive");
    const r = spawnSync(vc, args, {
      cwd: root,
      input: `${val}\n`,
      encoding: "utf8",
      env: process.env,
    });
    const msg = `${(r.stdout || "")}${(r.stderr || "")}`.trim().slice(0, 240);
    if (r.status !== 0) {
      console.error(`${key} -> ${target} FAIL`, msg);
      process.exit(1);
    }
    console.log(`${key} -> ${target} OK`);
  }
}
