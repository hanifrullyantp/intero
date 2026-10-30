import { handleLogin, kitchenResult, kitchenStoreOrNull } from "../../_lib/kitchenHttp.ts";

export const config = { maxDuration: 20 };

export async function POST(request: Request) {
  try {
    const store = kitchenStoreOrNull();
    if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
    return kitchenResult(await handleLogin(store, request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal masuk";
    return Response.json({ error: message }, { status: 500 });
  }
}
