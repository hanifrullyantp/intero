import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import type { SiteSettings } from "../src/types/site-settings.ts";
import {
  getDefaultSiteSettings,
  normalizeSiteSettings,
} from "../src/types/site-settings.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "intero.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    city TEXT NOT NULL,
    need_type TEXT NOT NULL,
    size_estimate TEXT,
    budget_range TEXT,
    notes TEXT,
    reference_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    user_agent TEXT
  );
`);

function ensureLeadColumn(name: string, sql: string) {
  const cols = db.prepare("PRAGMA table_info(leads)").all() as { name: string }[];
  if (cols.some((c) => c.name === name)) return;
  db.exec(sql);
}

ensureLeadColumn("crm_status", "ALTER TABLE leads ADD COLUMN crm_status TEXT DEFAULT 'baru'");
ensureLeadColumn("crm_category", "ALTER TABLE leads ADD COLUMN crm_category TEXT DEFAULT ''");
ensureLeadColumn("admin_notes", "ALTER TABLE leads ADD COLUMN admin_notes TEXT DEFAULT ''");
ensureLeadColumn("last_follow_up_key", "ALTER TABLE leads ADD COLUMN last_follow_up_key TEXT");
ensureLeadColumn("follow_up_count", "ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0");
ensureLeadColumn("updated_at", "ALTER TABLE leads ADD COLUMN updated_at TEXT");

const SETTINGS_KEY = "site";

export function getSettings(): SiteSettings {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(SETTINGS_KEY) as { value: string } | undefined;
  if (!row) {
    const defaults = getDefaultSiteSettings();
    saveSettings(defaults);
    return defaults;
  }
  try {
    return normalizeSiteSettings(JSON.parse(row.value));
  } catch {
    const defaults = getDefaultSiteSettings();
    saveSettings(defaults);
    return defaults;
  }
}

export function saveSettings(s: SiteSettings): void {
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
  ).run(SETTINGS_KEY, JSON.stringify(s));
}
