import type { Express, Request, Response } from "express";
import { handleDelete, handleList, handleLogin, handleRead, handleRegister, handleSave } from "../api/_lib/kitchenHttp.ts";
import { readKitchenToken } from "../api/_lib/kitchenAuth.ts";
import { kitchenSupabaseEnabled, supabaseKitchenStore } from "../api/_lib/kitchenSupabase.ts";
import type { KitchenStore } from "../api/_lib/kitchenStore.ts";
import type { ServiceResult } from "../api/_lib/kitchenService.ts";
import { sqliteKitchenStore } from "./kitchenSqlite.ts";

function store(): KitchenStore {
  return kitchenSupabaseEnabled() ? supabaseKitchenStore : sqliteKitchenStore;
}

function send(res: Response, result: ServiceResult) {
  res.status(result.status).json(result.body);
}

function asRequest(req: Request): globalThis.Request {
  const headers = new Headers();
  const auth = req.headers.authorization;
  if (typeof auth === "string") headers.set("authorization", auth);
  const withBody = req.method !== "GET" && req.method !== "DELETE";
  return new Request("http://127.0.0.1" + req.originalUrl, {
    method: req.method,
    headers,
    body: withBody ? JSON.stringify(req.body ?? {}) : undefined,
  });
}

function userId(req: Request): string | null {
  const auth = req.headers.authorization;
  return readKitchenToken(typeof auth === "string" ? auth : null)?.sub ?? null;
}

export function registerKitchenRoutes(app: Express) {
  app.post("/api/3d/auth/register", async (req, res) => {
    try { send(res, await handleRegister(store(), asRequest(req))); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal daftar" }); }
  });
  app.post("/api/3d/auth/login", async (req, res) => {
    try { send(res, await handleLogin(store(), asRequest(req))); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal masuk" }); }
  });
  app.get("/api/3d/projects", async (req, res) => {
    const id = userId(req);
    if (!id) { res.status(401).json({ error: "Masuk dulu untuk memakai proyek akun" }); return; }
    try { send(res, await handleList(store(), id)); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal memuat daftar" }); }
  });
  app.post("/api/3d/projects", async (req, res) => {
    const id = userId(req);
    if (!id) { res.status(401).json({ error: "Masuk dulu untuk memakai proyek akun" }); return; }
    try { send(res, await handleSave(store(), id, asRequest(req))); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal menyimpan" }); }
  });
  app.get("/api/3d/projects/:id", async (req, res) => {
    const id = userId(req);
    if (!id) { res.status(401).json({ error: "Masuk dulu untuk memakai proyek akun" }); return; }
    try { send(res, await handleRead(store(), id, String(req.params.id || ""))); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal membuka proyek" }); }
  });
  app.delete("/api/3d/projects/:id", async (req, res) => {
    const id = userId(req);
    if (!id) { res.status(401).json({ error: "Masuk dulu untuk memakai proyek akun" }); return; }
    try { send(res, await handleDelete(store(), id, String(req.params.id || ""))); }
    catch (error) { res.status(500).json({ error: (error as Error).message || "Gagal menghapus" }); }
  });
}
