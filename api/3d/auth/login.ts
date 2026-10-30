import { handleLogin, kitchenResult, kitchenStoreOrNull } from "../../_lib/kitchenHttp.ts";

export const config = { maxDuration: 20 };

export async function POST(request: Request) {
  const store = kitchenStoreOrNull();
  if (!store) return Response.json({ error: "Database akun belum dikonfigurasi" }, { status: 503 });
  return kitchenResult(await handleLogin(store, request));
}
