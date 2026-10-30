import { db } from "./db.ts";
import type { KitchenProjectMeta, KitchenStore } from "../api/_lib/kitchenStore.ts";

function meta(row: { id: string; name: string; updated_at: string }): KitchenProjectMeta {
  return { id: row.id, name: row.name, updatedAt: row.updated_at };
}

export const sqliteKitchenStore: KitchenStore = {
  async createUser(input) {
    const existing = db.prepare(`SELECT id FROM kitchen_users WHERE email = ?`).get(input.email);
    if (existing) return "exists";
    db.prepare(`INSERT INTO kitchen_users (id, email, name, password_hash) VALUES (?, ?, ?, ?)`).run(input.id, input.email, input.name, input.passwordHash);
    return "ok";
  },
  async userByEmail(email) {
    const row = db.prepare(`SELECT id, email, name, password_hash FROM kitchen_users WHERE email = ?`).get(email) as { id: string; email: string; name: string; password_hash: string } | undefined;
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name, passwordHash: row.password_hash };
  },
  async listProjects(userId) {
    const rows = db.prepare(`SELECT id, name, updated_at FROM kitchen_projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`).all(userId) as { id: string; name: string; updated_at: string }[];
    return rows.map(meta);
  },
  async getProject(userId, id) {
    const row = db.prepare(`SELECT id, name, updated_at, payload FROM kitchen_projects WHERE user_id = ? AND id = ?`).get(userId, id) as { id: string; name: string; updated_at: string; payload: string } | undefined;
    if (!row) return null;
    return { ...meta(row), payload: JSON.parse(row.payload) };
  },
  async saveProject(userId, input) {
    const now = new Date().toISOString();
    if (input.id) {
      const existing = db.prepare(`SELECT id FROM kitchen_projects WHERE id = ? AND user_id = ?`).get(input.id, userId);
      if (!existing) throw new Error("Proyek tidak ditemukan di akun ini");
      db.prepare(`UPDATE kitchen_projects SET name = ?, payload = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(input.name, JSON.stringify(input.payload), now, input.id, userId);
      return { id: input.id, name: input.name, updatedAt: now };
    }
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO kitchen_projects (id, user_id, name, payload, updated_at) VALUES (?, ?, ?, ?, ?)`).run(id, userId, input.name, JSON.stringify(input.payload), now);
    return { id, name: input.name, updatedAt: now };
  },
  async deleteProject(userId, id) {
    const info = db.prepare(`DELETE FROM kitchen_projects WHERE id = ? AND user_id = ?`).run(id, userId);
    return info.changes > 0;
  },
};
