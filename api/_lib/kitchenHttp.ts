import { readKitchenToken } from "./kitchenAuth.js";
import { kitchenSupabaseEnabled, supabaseKitchenStore } from "./kitchenSupabase.js";
import { listAccountProjects, loginAccount, readAccountProject, registerAccount, removeAccountProject, saveAccountProject, type ServiceResult } from "./kitchenService.js";
import type { KitchenStore } from "./kitchenStore.js";

export function kitchenResult(result: ServiceResult): Response {
  return Response.json(result.body, { status: result.status });
}

export function kitchenStoreOrNull(): KitchenStore | null {
  return kitchenSupabaseEnabled() ? supabaseKitchenStore : null;
}

export function kitchenUserId(request: Request): string | null {
  return readKitchenToken(request.headers.get("authorization"))?.sub ?? null;
}

export async function handleRegister(store: KitchenStore, request: Request): Promise<ServiceResult> {
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown; password?: unknown };
  return registerAccount(store, body);
}

export async function handleLogin(store: KitchenStore, request: Request): Promise<ServiceResult> {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  return loginAccount(store, body);
}

export async function handleList(store: KitchenStore, userId: string): Promise<ServiceResult> {
  return listAccountProjects(store, userId);
}

export async function handleRead(store: KitchenStore, userId: string, id: string): Promise<ServiceResult> {
  return readAccountProject(store, userId, id);
}

export async function handleSave(store: KitchenStore, userId: string, request: Request): Promise<ServiceResult> {
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; name?: unknown; project?: unknown };
  return saveAccountProject(store, userId, body);
}

export async function handleDelete(store: KitchenStore, userId: string, id: string): Promise<ServiceResult> {
  return removeAccountProject(store, userId, id);
}
