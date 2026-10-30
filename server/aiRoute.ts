import type { Express } from "express";
import { handleAiBody, modelsFromEnv } from "../3d-intero-app/src/ai/gateway.ts";
import { db } from "./db.ts";

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.ip || "local";
}

export function registerAiRoute(app: Express) {
  app.post("/api/3d/ai", async (req, res) => {
    const result = await handleAiBody(req.body, {
      apiKey: process.env.OPENROUTER_API_KEY || null,
      models: modelsFromEnv(process.env),
      ip: clientIp(req),
    });
    if (result.log) {
      try {
        db.prepare(
          "INSERT INTO ai_requests (tier, model, utterance, command_count, ok) VALUES (?, ?, ?, ?, ?)",
        ).run(result.log.tier, result.log.model, result.log.utterance, result.log.commandCount, result.log.ok ? 1 : 0);
      } catch (error) {
        console.error("ai_requests", (error as Error).message);
      }
    }
    res.status(result.status).json(result.body);
  });
}
