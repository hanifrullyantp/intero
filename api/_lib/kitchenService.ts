import { checkPassword, hashPassword, signKitchenToken } from "./kitchenAuth.ts";
import { friendlyDbError, type KitchenStore } from "./kitchenStore.ts";

export type ServiceResult = { status: number; body: Record<string, unknown> };

function emailOf(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerAccount(store: KitchenStore, raw: { name?: unknown; email?: unknown; password?: unknown }): Promise<ServiceResult> {
  const email = emailOf(raw.email);
  const name = String(raw.name || "").trim().slice(0, 80);
  const password = String(raw.password || "");
  if (!name) return { status: 400, body: { error: "Nama wajib diisi" } };
  if (!validEmail(email)) return { status: 400, body: { error: "Format email salah" } };
  if (password.length < 6) return { status: 400, body: { error: "Password minimal 6 karakter" } };
  try {
    const id = crypto.randomUUID();
    const created = await store.createUser({ id, email, name, passwordHash: await hashPassword(password) });
    if (created === "exists") return { status: 409, body: { error: "Email sudah terdaftar. Silakan masuk." } };
    return { status: 200, body: { token: signKitchenToken({ id, email, name }), user: { id, email, name } } };
  } catch (error) {
    return { status: 500, body: { error: friendlyDbError(error) } };
  }
}

export async function loginAccount(store: KitchenStore, raw: { email?: unknown; password?: unknown }): Promise<ServiceResult> {
  const email = emailOf(raw.email);
  const password = String(raw.password || "");
  if (!validEmail(email) || !password) return { status: 400, body: { error: "Email dan password wajib diisi" } };
  try {
    const user = await store.userByEmail(email);
    if (!user || !(await checkPassword(password, user.passwordHash))) return { status: 401, body: { error: "Email atau password salah" } };
    return { status: 200, body: { token: signKitchenToken(user), user: { id: user.id, email: user.email, name: user.name } } };
  } catch (error) {
    return { status: 500, body: { error: friendlyDbError(error) } };
  }
}

export async function listAccountProjects(store: KitchenStore, userId: string): Promise<ServiceResult> {
  try {
    return { status: 200, body: { projects: await store.listProjects(userId) } };
  } catch (error) {
    return { status: 500, body: { error: friendlyDbError(error) } };
  }
}

export async function readAccountProject(store: KitchenStore, userId: string, id: string): Promise<ServiceResult> {
  try {
    const row = await store.getProject(userId, id);
    if (!row) return { status: 404, body: { error: "Proyek tidak ditemukan" } };
    return { status: 200, body: { id: row.id, name: row.name, updatedAt: row.updatedAt, project: row.payload } };
  } catch (error) {
    return { status: 500, body: { error: friendlyDbError(error) } };
  }
}

export async function saveAccountProject(store: KitchenStore, userId: string, raw: { id?: unknown; name?: unknown; project?: unknown }): Promise<ServiceResult> {
  const project = raw.project;
  if (!project || typeof project !== "object") return { status: 400, body: { error: "Data proyek kosong" } };
  const name = String(raw.name || (project as { projectName?: string }).projectName || "Proyek").trim().slice(0, 200) || "Proyek";
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  try {
    const saved = await store.saveProject(userId, { id, name, payload: project });
    return { status: 200, body: saved };
  } catch (error) {
    const message = friendlyDbError(error);
    return { status: message.includes("tidak ditemukan") ? 404 : 500, body: { error: message } };
  }
}

export async function removeAccountProject(store: KitchenStore, userId: string, id: string): Promise<ServiceResult> {
  try {
    const ok = await store.deleteProject(userId, id);
    if (!ok) return { status: 404, body: { error: "Proyek tidak ditemukan" } };
    return { status: 200, body: { ok: true } };
  } catch (error) {
    return { status: 500, body: { error: friendlyDbError(error) } };
  }
}
