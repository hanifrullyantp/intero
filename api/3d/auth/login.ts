export const config = { maxDuration: 20 };

export async function POST(request: Request) {
  try {
    const mod = await import("../../_lib/kitchenHttp.js");
    const store = mod.kitchenStoreOrNull();
    if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
    return mod.kitchenResult(await mod.handleLogin(store, request));
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : "Gagal masuk";
    return Response.json({ error: message }, { status: 500 });
  }
}
