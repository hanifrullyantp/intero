import { handleDelete, handleRead, kitchenResult, kitchenStoreOrNull, kitchenUserId } from "../../_lib/kitchenHttp.ts";

export const config = { maxDuration: 30 };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const store = kitchenStoreOrNull();
  if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
  const userId = kitchenUserId(request);
  if (!userId) return Response.json({ error: "Masuk dulu untuk memakai proyek akun" }, { status: 401 });
  const { id } = await context.params;
  return kitchenResult(await handleRead(store, userId, id));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const store = kitchenStoreOrNull();
  if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
  const userId = kitchenUserId(request);
  if (!userId) return Response.json({ error: "Masuk dulu untuk memakai proyek akun" }, { status: 401 });
  const { id } = await context.params;
  return kitchenResult(await handleDelete(store, userId, id));
}
