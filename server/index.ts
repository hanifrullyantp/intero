import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { db, getSettings, saveSettings } from "./db.ts";
import {
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  type AuthedRequest,
} from "./auth.ts";
import type { SiteSettings } from "../src/types/site-settings.ts";
import { notifyLeadCreated } from "./notify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, safe.slice(0, 200));
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const app = express();
const PORT = Number(process.env.PORT || 8787);

/** Set TRUST_PROXY=1 di belakang Nginx/Caddy agar req.secure / cookie Secure benar */
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.use("/uploads", express.static(uploadsDir));

app.get("/api/public/settings", (_req, res) => {
  res.json(getSettings());
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  const expectUser = process.env.ADMIN_USERNAME || "admin";
  if (username !== expectUser) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await verifyPassword(password);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(username);
  setAuthCookie(res, token);
  res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: (req as AuthedRequest).adminUser });
});

app.get("/api/admin/settings", requireAuth, (_req, res) => {
  res.json(getSettings());
});

app.put("/api/admin/settings", requireAuth, (req, res) => {
  const body = req.body as SiteSettings;
  if (!body || body.version !== 1) {
    res.status(400).json({ error: "Invalid settings body" });
    return;
  }
  saveSettings(body);
  res.json({ ok: true });
});

app.post(
  "/api/admin/upload",
  requireAuth,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file" });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  },
);

app.get("/api/admin/leads", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 500").all();
  res.json(rows);
});

app.patch("/api/admin/leads/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const allowed = [
    "crm_status",
    "crm_category",
    "admin_notes",
    "last_follow_up_key",
    "follow_up_count",
  ] as const;
  const updates: string[] = [];
  const vals: unknown[] = [];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      updates.push(`${k} = ?`);
      vals.push(body[k]);
    }
  }
  if (updates.length === 0) {
    res.status(400).json({ error: "Tidak ada field yang diizinkan untuk diubah" });
    return;
  }
  updates.push("updated_at = datetime('now')");
  vals.push(id);
  const sql = `UPDATE leads SET ${updates.join(", ")} WHERE id = ?`;
  const r = db.prepare(sql).run(...vals);
  if (r.changes === 0) {
    res.status(404).json({ error: "Lead tidak ditemukan" });
    return;
  }
  res.json({ ok: true });
});

app.delete("/api/admin/leads/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
  res.json({ ok: true });
});

/** Input lead manual dari panel admin (JSON). */
app.post("/api/admin/leads", requireAuth, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const name = String(b.name || "").trim();
  const whatsapp = String(b.whatsapp || "").trim();
  const city = String(b.city || "").trim();
  const needType = String(b.need_type || b.needType || "").trim();
  if (!name || !whatsapp || !city || !needType) {
    res.status(400).json({ error: "Nama, WhatsApp, kota, dan jenis kebutuhan wajib diisi." });
    return;
  }
  const sizeEstimate = String(b.size_estimate || b.sizeEstimate || "").trim() || null;
  const budgetRange = String(b.budget_range || b.budgetRange || "").trim() || null;
  const notes = String(b.notes || "").trim() || null;
  const crmStatus = String(b.crm_status || "baru").trim() || "baru";
  const crmCategory = String(b.crm_category || "").trim();

  const info = db
    .prepare(
      `INSERT INTO leads (name, whatsapp, city, need_type, size_estimate, budget_range, notes, reference_path, user_agent, crm_status, crm_category, admin_notes, follow_up_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, '', 0, datetime('now'))`,
    )
    .run(
      name,
      whatsapp,
      city,
      needType,
      sizeEstimate,
      budgetRange,
      notes,
      "admin-manual",
      crmStatus,
      crmCategory,
    );

  void notifyLeadCreated({
    name,
    whatsapp,
    city,
    needType,
    sizeEstimate: sizeEstimate || undefined,
    budgetRange: budgetRange || undefined,
    notes: notes || undefined,
  });

  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});

app.post("/api/leads", upload.single("reference"), (req, res) => {
  const body = req.body as Record<string, string>;
  const name = String(body.name || "").trim();
  const whatsapp = String(body.whatsapp || "").trim();
  const city = String(body.city || "").trim();
  const needType = String(body.need_type || body.needType || "").trim();
  if (!name || !whatsapp || !city || !needType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const sizeEstimate = String(body.size_estimate || body.sizeEstimate || "").trim() || null;
  const budgetRange = String(body.budget_range || body.budgetRange || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const referencePath = req.file ? `/uploads/${req.file.filename}` : null;
  const ua = req.get("user-agent") || null;

  db.prepare(
    `INSERT INTO leads (name, whatsapp, city, need_type, size_estimate, budget_range, notes, reference_path, user_agent, crm_status, crm_category, admin_notes, follow_up_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'baru', '', '', 0, datetime('now'))`,
  ).run(
    name,
    whatsapp,
    city,
    needType,
    sizeEstimate,
    budgetRange,
    notes,
    referencePath,
    ua,
  );

  void notifyLeadCreated({
    name,
    whatsapp,
    city,
    needType,
    sizeEstimate: sizeEstimate || undefined,
    budgetRange: budgetRange || undefined,
    notes: notes || undefined,
  });

  res.json({ ok: true });
});

const distDir = path.join(rootDir, "dist");

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  const index = path.join(distDir, "index.html");
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(404).send("Build the client first (npm run build)");
  }
});

app.listen(PORT, () => {
  console.log(`API + static server http://localhost:${PORT}`);
});
