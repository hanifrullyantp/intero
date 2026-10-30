import { handleDelete, handleRead, kitchenResult, kitchenStoreOrNull, kitchenUserId } from "../../_lib/kitchenHttp.ts";

export const config = { maxDuration: 30 };

async function projectId(request: Request, context?: { params?: { id?: string } | Promise<{ id?: string }> }): Promise<string> {
  try {
    const params = context?.params ? await context.params : undefined;
    if (params?.id) return params.id;
  } catch { /* pathname fallback */ }
  const part = new URL(request.url).pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(part);
}

export async function GET(request: Request, context?: { params?: { id?: string } | Promise<{ id?: string }> }) {
  try {
    const store = kitchenStoreOrNull();
    if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
    const userId = kitchenUserId(request);
    if (!userId) return Response.json({ error: "Masuk dulu untuk memakai proyek akun" }, { status: 401 });
    return kitchenResult(await handleRead(store, userId, await projectId(request, context)));
  } catch (error) {
    return Response.json({ error: (error as Error).message || "Gagal membuka proyek" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context?: { params?: { id?: string } | Promise<{ id?: string }> }) {
  try {
    const store = kitchenStoreOrNull();
    if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
    const userId = kitchenUserId(request);
    if (!userId) return Response.json({ error: "Masuk dulu untuk memakai proyek akun" }, { status: 401 });
    return kitchenResult(await handleDelete(store, userId, await projectId(request, context)));
  } catch (error) {
    return Response.json({ error: (error as Error).message || "Gagal menghapus" }, { status: 500 });
  }
}
