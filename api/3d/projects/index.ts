import { handleList, handleSave, kitchenResult, kitchenStoreOrNull, kitchenUserId } from "../../_lib/kitchenHttp.ts";

export const config = { maxDuration: 30 };

function storeAndUser(request: Request) {
  const store = kitchenStoreOrNull();
  if (!store) return { error: Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 }) };
  const userId = kitchenUserId(request);
  if (!userId) return { error: Response.json({ error: "Masuk dulu untuk memakai proyek akun" }, { status: 401 }) };
  return { store, userId };
}

export async function GET(request: Request) {
  const ctx = storeAndUser(request);
  if ("error" in ctx) return ctx.error;
  return kitchenResult(await handleList(ctx.store, ctx.userId));
}

export async function POST(request: Request) {
  const ctx = storeAndUser(request);
  if ("error" in ctx) return ctx.error;
  return kitchenResult(await handleSave(ctx.store, ctx.userId, request));
}
