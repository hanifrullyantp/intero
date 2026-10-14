import { db } from "./db.ts";
import { newShareId } from "./shareId.ts";

db.exec(`
  CREATE TABLE IF NOT EXISTS instant3d_shares (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function createShare(name: string, payload: unknown): { id: string } {
  const id = newShareId();
  const body = JSON.stringify({ app: "Instant 3D", version: 1, project: payload });
  db.prepare(
    `INSERT INTO instant3d_shares (id, name, payload) VALUES (?, ?, ?)`,
  ).run(id, name.slice(0, 200), body);
  return { id };
}

export function getShare(id: string): { name: string; payload: string } | null {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  const row = db
    .prepare(`SELECT name, payload FROM instant3d_shares WHERE id = ?`)
    .get(id) as { name: string; payload: string } | undefined;
  return row ?? null;
}
