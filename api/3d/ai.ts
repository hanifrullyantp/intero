import { handleAiBody, modelsFromEnv } from "../../3d-intero-app/src/ai/gateway.ts";

export const config = { maxDuration: 30 };

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const result = await handleAiBody(body, {
    apiKey: process.env.OPENROUTER_API_KEY || null,
    models: modelsFromEnv(process.env),
    ip: forwarded?.split(",")[0]?.trim() || "vercel",
  });
  if (result.log) {
    console.info(JSON.stringify({ ai: result.log.tier, commands: result.log.commandCount, ok: result.log.ok }));
  }
  return Response.json(result.body, { status: result.status });
}
