import { z } from 'zod';
import { applyCommand } from '../projectdoc/apply';
import { commandSchema, type Command } from '../projectdoc/commands';
import { allocateItemId, itemKindSchema, projectDocSchema, type ProjectDoc } from '../projectdoc/schema';

export type AiTier = 'T0' | 'T1' | 'T2' | 'T3';

export interface AiPreview {
  lines: string[];
  violations: string[];
  beforeCount: number;
  afterCount: number;
}

export interface AiGatewayResult {
  tier: AiTier;
  message: string;
  commands: Command[];
  preview: AiPreview;
  model: string | null;
}

export interface AiModels {
  T1: string;
  T2: string;
  T3: string;
}

export interface AiGatewayEnv {
  apiKey: string | null;
  models: AiModels;
  fetchImpl?: typeof fetch;
}

const DEFAULT_MODELS: AiModels = {
  T1: 'google/gemini-2.5-flash',
  T2: 'google/gemini-2.5-flash',
  T3: 'google/gemini-2.5-pro',
};

const hits = new Map<string, number[]>();

export function clearAiSlots() {
  hits.clear();
}

export function takeAiSlot(key: string, now = Date.now(), limit = 20, windowMs = 60_000): boolean {
  const prev = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (prev.length >= limit) {
    hits.set(key, prev);
    return false;
  }
  prev.push(now);
  hits.set(key, prev);
  return true;
}

export function routeTier(utterance: string): AiTier {
  const text = utterance.toLowerCase();
  if (/(buat(?:kan)?\s+dapur|desain(?:kan)?\s+(?:ulang|dapur)|dari\s+awal|tata\s+ulang\s+semua)/.test(text) || text.length > 400) return 'T3';
  if (/(semua\s+kabinet|atas\s+dan\s+bawah|kabinet\s+atas\s+dan\s+bawah)/.test(text)) return 'T2';
  if (t0Kind(text)) return 'T0';
  return 'T1';
}

function t0Kind(text: string): 'height' | 'remove' | 'duplicate' | 'move' | 'shape' | 'template' | 'summary' | null {
  if (/(tinggi\s+total|tinggi\s+plafon|plafon\s+\d)/.test(text)) return 'height';
  if (/(hapus|delete)\b/.test(text) && /(dipilih|kabinet\s+ini|item\s+ini|[a-z]{2,}[_-][a-z0-9_-]+)/i.test(text)) return 'remove';
  if (/(duplikat|salin)\b/.test(text) && /(dipilih|kabinet\s+ini|item\s+ini)/.test(text)) return 'duplicate';
  if (/(geser|pindahkan)\b/.test(text) && /\d/.test(text)) return 'move';
  if (/(?:bentuk|jadi)\s+(i|l|u|island|pulau)\b/.test(text)) return 'shape';
  if (/(template|base_60|wall_60|corner_base_l)/.test(text) || /pasang\s+lemari\s+(bawah|atas)\s+60/.test(text)) return 'template';
  if (/(ringkasan|berapa\s+(?:jumlah|kabinet)|jumlah\s+kabinet)/.test(text)) return 'summary';
  return null;
}

function cmOf(text: string): number | null {
  const meter = text.match(/(\d+(?:[.,]\d+)?)\s*meter\b/i) ?? text.match(/(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (meter && !/cm/i.test(text)) return Math.round(parseFloat(meter[1].replace(',', '.')) * 100);
  const cm = text.match(/(\d+(?:[.,]\d+)?)\s*cm\b/i);
  if (cm) return parseFloat(cm[1].replace(',', '.'));
  const bare = text.match(/(\d+(?:[.,]\d+)?)/);
  return bare ? parseFloat(bare[1].replace(',', '.')) : null;
}

function targetIds(doc: ProjectDoc, utterance: string, selectedIds: string[]): string[] {
  const known = new Set(doc.items.map((item) => item.id));
  const mentioned = utterance.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? [];
  const fromText = mentioned.filter((id) => known.has(id));
  if (fromText.length) return [...new Set(fromText)];
  return selectedIds.filter((id) => known.has(id));
}

function buildT0(utterance: string, doc: ProjectDoc, selectedIds: string[]): { message: string; commands: Command[] } {
  const kind = t0Kind(utterance.toLowerCase());
  const text = utterance.toLowerCase();
  if (kind === 'summary') {
    const counts = doc.items.length;
    return {
      message: `Proyek "${doc.meta.nama}" punya ${counts} item. Tinggi total ${doc.globals.tinggiTotalCm} cm, base ${doc.globals.tinggiBaseCm} cm, celah ${doc.globals.gapBaseWallCm} cm.`,
      commands: [],
    };
  }
  if (kind === 'height') {
    const value = cmOf(utterance);
    if (value == null || value <= 0) return { message: 'Sebutkan tinggi total dalam cm, misalnya 260 cm.', commands: [] };
    return {
      message: `Pratinjau: tinggi total menjadi ${value} cm. Belum diterapkan.`,
      commands: [{ type: 'set_global', targetIds: ['globals'], globals: { tinggiTotalCm: value } }],
    };
  }
  if (kind === 'remove' || kind === 'duplicate') {
    const ids = targetIds(doc, utterance, selectedIds);
    if (!ids.length) return { message: 'Pilih kabinetnya dulu, atau sebutkan id-nya.', commands: [] };
    return {
      message: kind === 'remove' ? `Pratinjau: hapus ${ids.join(', ')}. Belum diterapkan.` : `Pratinjau: duplikat ${ids.join(', ')}. Belum diterapkan.`,
      commands: [{ type: kind === 'remove' ? 'remove_item' : 'duplicate_item', targetIds: ids }],
    };
  }
  if (kind === 'move') {
    const ids = targetIds(doc, utterance, selectedIds);
    const delta = cmOf(utterance);
    if (!ids.length) return { message: 'Pilih kabinet yang digeser.', commands: [] };
    if (delta == null) return { message: 'Sebutkan jarak geser dalam cm.', commands: [] };
    const signed = /kiri/.test(text) ? -Math.abs(delta) : Math.abs(delta);
    const commands: Command[] = [];
    for (const id of ids) {
      const item = doc.items.find((entry) => entry.id === id)!;
      if (item.wallId) commands.push({ type: 'move_item', targetIds: [id], wallId: item.wallId, offsetCm: item.offsetCm + signed });
      else commands.push({ type: 'move_item', targetIds: [id], wallId: null, positionCm: { ...item.positionCm, x: item.positionCm.x + signed } });
    }
    return { message: `Pratinjau: geser ${signed} cm. Belum diterapkan.`, commands };
  }
  if (kind === 'shape') {
    const match = text.match(/(?:bentuk|jadi)\s+(i|l|u|island|pulau)\b/);
    const raw = match?.[1] ?? 'i';
    const roomBentuk = raw === 'pulau' || raw === 'island' ? 'island' : raw.toUpperCase() as 'I' | 'L' | 'U';
    return {
      message: `Pratinjau: bentuk ruangan menjadi ${roomBentuk}. Dinding yang sudah ada tidak dihapus.`,
      commands: [{ type: 'update_room', targetIds: ['room'], room: { bentuk: roomBentuk } }],
    };
  }
  if (kind === 'template') {
    const templateId = /wall_60|lemari\s+atas\s+60/.test(text) ? 'wall_60' : /corner/.test(text) ? 'corner_base_l' : 'base_60';
    const wallId = targetIds(doc, utterance, selectedIds).map((id) => doc.items.find((item) => item.id === id)?.wallId).find(Boolean) ?? doc.room.walls[0]?.id ?? null;
    if (!wallId) return { message: 'Tambah dinding dulu sebelum memasang template.', commands: [] };
    const offset = /offset\s+\d/.test(text) ? cmOf(text.slice(text.indexOf('offset'))) ?? 0 : 0;
    const id = allocateItemId(doc, templateId === 'wall_60' ? 'wall_cabinet' : templateId === 'corner_base_l' ? 'corner_base' : 'base_cabinet');
    return {
      message: `Pratinjau: pasang template ${templateId} pada ${wallId} di offset ${offset} cm.`,
      commands: [{ type: 'apply_template', targetIds: [id], templateId, wallId, offsetCm: offset }],
    };
  }
  return { message: 'Perintah ini perlu model.', commands: [] };
}

function describe(command: Command, doc: ProjectDoc): string {
  const names = command.targetIds.map((id) => doc.items.find((item) => item.id === id)?.label ?? id).join(', ');
  switch (command.type) {
    case 'set_global': {
      const bits = Object.entries(command.globals).map(([key, value]) => `${key} ${value}`);
      if (command.countertop) bits.push('countertop');
      return `Ubah global: ${bits.join(', ') || 'nilai'}`;
    }
    case 'remove_item': return `Hapus ${names}`;
    case 'duplicate_item': return `Duplikat ${names}`;
    case 'move_item': return `Geser ${names}${command.offsetCm != null ? ` ke offset ${command.offsetCm} cm` : ''}`;
    case 'update_item': return `Ubah ${names}`;
    case 'add_item': return `Tambah ${command.item.label ?? command.item.type}`;
    case 'update_room': return `Ubah ruangan${command.room.bentuk ? ` menjadi ${command.room.bentuk}` : ''}`;
    case 'add_wall': return `Tambah dinding ${command.wall.nama}`;
    case 'set_material': return `Ganti material ${command.part ?? ''} pada ${names}`.replace(/\s+/g, ' ').trim();
    case 'group_items': return `Kelompokkan ${names}`;
    case 'apply_template': return `Pasang template ${command.templateId}`;
    default: return 'Perintah';
  }
}

function uniquifyAdd(doc: ProjectDoc, command: unknown): unknown {
  if (!command || typeof command !== 'object') return command;
  const cmd = command as { type?: string; targetIds?: unknown[]; item?: { type?: string } };
  if (cmd.type !== 'add_item' || !Array.isArray(cmd.targetIds)) return command;
  const id = cmd.targetIds[0];
  const kind = itemKindSchema.safeParse(cmd.item?.type);
  if (typeof id === 'string' && !doc.items.some((item) => item.id === id)) return command;
  if (!kind.success) return command;
  return { ...cmd, targetIds: [allocateItemId(doc, kind.data)] };
}

export function previewCommands(doc: ProjectDoc, commands: unknown[]): { commands: Command[]; preview: AiPreview } {
  const accepted: Command[] = [];
  const lines: string[] = [];
  const violations: string[] = [];
  let current = doc;
  for (const command of commands) {
    const prepared = uniquifyAdd(current, command);
    const result = applyCommand(current, prepared);
    if (result.violations.length) {
      violations.push(...result.violations);
      break;
    }
    const parsed = commandSchema.parse(prepared);
    lines.push(describe(parsed, current));
    accepted.push(parsed);
    current = result.doc;
  }
  return {
    commands: accepted,
    preview: { lines, violations, beforeCount: doc.items.length, afterCount: current.items.length },
  };
}

const modelReplySchema = z.object({
  message: z.string().min(1),
  commands: z.array(z.unknown()).max(20).optional(),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

function docBrief(doc: ProjectDoc, selectedIds: string[]): string {
  const items = doc.items.slice(0, 40).map((item) => `${item.id} | ${item.label} | wall=${item.wallId ?? '-'} | offset=${Math.round(item.offsetCm)} | ${item.dims.w}x${item.dims.h}x${item.dims.d}`).join('\n');
  return `Tinggi total ${doc.globals.tinggiTotalCm} cm, base ${doc.globals.tinggiBaseCm} cm, celah ${doc.globals.gapBaseWallCm} cm. Dinding: ${doc.room.walls.map((wall) => wall.id).join(', ') || '-'}. Terpilih: ${selectedIds.join(', ') || '-'}.\n${items}`;
}

const SYSTEM = `Kamu menerjemahkan permintaan desain dapur 3D Intero menjadi JSON.
Balas hanya JSON: {"message":"kalimat Indonesia singkat","commands":[]}.
Satuan cm. Item di dinding memakai offsetCm dari ujung kiri, bukan koordinat dunia.
Jenis perintah: add_item, update_item, move_item, remove_item, duplicate_item, set_global, set_material, add_wall, update_room, group_items, apply_template.
Setiap perintah punya targetIds. Jangan mengarang id item yang sudah ada. Jangan menyertakan kunci API.`;

async function callModel(tier: Exclude<AiTier, 'T0'>, utterance: string, doc: ProjectDoc, selectedIds: string[], env: AiGatewayEnv): Promise<{ message: string; commands: unknown[] }> {
  const fetchImpl = env.fetchImpl ?? fetch;
  const model = env.models[tier];
  const res = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${utterance}\n\n${docBrief(doc, selectedIds)}` },
      ],
    }),
  });
  if (!res.ok) return { message: 'Model tidak menjawab. Coba perintah yang lebih singkat.', commands: [] };
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';
  const parsed = modelReplySchema.safeParse(extractJson(content));
  if (!parsed.success) return { message: content.trim().slice(0, 500) || 'Model tidak mengembalikan perintah.', commands: [] };
  return { message: parsed.data.message, commands: parsed.data.commands ?? [] };
}

export async function runAiGateway(utterance: string, doc: ProjectDoc, selectedIds: string[], env: AiGatewayEnv): Promise<AiGatewayResult> {
  const tier = routeTier(utterance);
  if (tier === 'T0') {
    const built = buildT0(utterance, doc, selectedIds);
    const previewed = previewCommands(doc, built.commands);
    const message = previewed.preview.violations.length
      ? `${built.message} ${previewed.preview.violations[0]}`
      : built.message;
    return { tier, message, commands: previewed.commands, preview: previewed.preview, model: null };
  }
  if (!env.apiKey) {
    return {
      tier,
      message: 'Perintah ini butuh model di server. Kunci OpenRouter belum diatur di environment, dan tidak diambil dari browser.',
      commands: [],
      preview: { lines: [], violations: [], beforeCount: doc.items.length, afterCount: doc.items.length },
      model: null,
    };
  }
  const model = env.models[tier];
  try {
    const answered = await callModel(tier, utterance, doc, selectedIds, env);
    const previewed = previewCommands(doc, answered.commands);
    const message = previewed.preview.violations.length
      ? `${answered.message} ${previewed.preview.violations[0]}`
      : answered.message;
    return { tier, message, commands: previewed.commands, preview: previewed.preview, model };
  } catch {
    return {
      tier,
      message: 'Gateway model gagal dihubungi. Perubahan tidak diterapkan.',
      commands: [],
      preview: { lines: [], violations: [], beforeCount: doc.items.length, afterCount: doc.items.length },
      model,
    };
  }
}

export interface AiHttpResult {
  status: number;
  body: AiGatewayResult | { error: string };
  log?: { tier: AiTier; model: string | null; utterance: string; commandCount: number; ok: boolean };
}

export async function handleAiBody(body: unknown, ctx: AiGatewayEnv & { ip: string; now?: number }): Promise<AiHttpResult> {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const utterance = typeof record.utterance === 'string' ? record.utterance.trim() : '';
  if (!utterance || utterance.length > 2000) return { status: 400, body: { error: 'Perintah kosong atau terlalu panjang.' } };
  if (!takeAiSlot(ctx.ip, ctx.now)) return { status: 429, body: { error: 'Terlalu banyak permintaan AI. Coba lagi sebentar.' } };
  const parsed = projectDocSchema.safeParse(record.doc);
  if (!parsed.success) return { status: 400, body: { error: 'Dokumen proyek tidak valid.' } };
  const selectedIds = Array.isArray(record.selectedIds) ? record.selectedIds.filter((id): id is string => typeof id === 'string').slice(0, 50) : [];
  const result = await runAiGateway(utterance, parsed.data, selectedIds, {
    apiKey: ctx.apiKey,
    models: ctx.models,
    fetchImpl: ctx.fetchImpl,
  });
  return {
    status: 200,
    body: result,
    log: { tier: result.tier, model: result.model, utterance: utterance.slice(0, 500), commandCount: result.commands.length, ok: result.preview.violations.length === 0 },
  };
}

export function modelsFromEnv(env: { OPENROUTER_MODEL_T1?: string; OPENROUTER_MODEL_T2?: string; OPENROUTER_MODEL_T3?: string }): AiModels {
  return {
    T1: env.OPENROUTER_MODEL_T1 || DEFAULT_MODELS.T1,
    T2: env.OPENROUTER_MODEL_T2 || DEFAULT_MODELS.T2,
    T3: env.OPENROUTER_MODEL_T3 || DEFAULT_MODELS.T3,
  };
}
