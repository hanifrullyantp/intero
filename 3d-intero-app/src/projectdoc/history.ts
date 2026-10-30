import { z } from 'zod';
import { commandSchema, type Command } from './commands';
import { projectDocSchema, type ProjectDoc } from './schema';

export interface HistoryEntry {
  commands: Command[];
  before: ProjectDoc;
  after: ProjectDoc;
}

export interface CommandLog {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

const entrySchema = z.object({
  commands: z.array(commandSchema),
  before: projectDocSchema,
  after: projectDocSchema,
});

export const commandLogSchema = z.object({
  past: z.array(entrySchema),
  future: z.array(entrySchema),
});

export function emptyLog(): CommandLog {
  return { past: [], future: [] };
}

export function pushLog(log: CommandLog, entry: HistoryEntry, cap = 50): CommandLog {
  return { past: [...log.past, entry].slice(-cap), future: [] };
}

export function undoLog(log: CommandLog): { log: CommandLog; doc: ProjectDoc } | null {
  const entry = log.past[log.past.length - 1];
  if (!entry) return null;
  return {
    doc: entry.before,
    log: { past: log.past.slice(0, -1), future: [entry, ...log.future].slice(0, 50) },
  };
}

export function redoLog(log: CommandLog): { log: CommandLog; doc: ProjectDoc } | null {
  const entry = log.future[0];
  if (!entry) return null;
  return {
    doc: entry.after,
    log: { past: [...log.past, entry].slice(-50), future: log.future.slice(1) },
  };
}

export function serializeCommandLog(log: CommandLog): string {
  return JSON.stringify(commandLogSchema.parse(log));
}

export function deserializeCommandLog(json: string): CommandLog {
  return commandLogSchema.parse(JSON.parse(json));
}
