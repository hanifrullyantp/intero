import type { Project } from '../models/types';
import { normalizeProject, safeName } from './projectManager';

export const INTERO_FORMAT = 'intero' as const;
export const INTERO_FORMAT_VERSION = 1;

export interface InteroEnvelope {
  format: typeof INTERO_FORMAT;
  formatVersion: number;
  app: '3D Intero';
  exportedAt: string;
  project: Project;
}

export function wrapInteroProject(project: Project): InteroEnvelope {
  return {
    format: INTERO_FORMAT,
    formatVersion: INTERO_FORMAT_VERSION,
    app: '3D Intero',
    exportedAt: new Date().toISOString(),
    project,
  };
}

export function interoFileBody(project: Project, pretty = true): string {
  const body = wrapInteroProject(project);
  return pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body);
}

export function interoFilename(projectName: string) {
  return `${safeName(projectName)}.intero`;
}

/** Accept legacy `.i3d.json` and bare `{ project }` payloads. */
export function parseInteroPayload(raw: unknown): Project {
  const obj = raw as Partial<InteroEnvelope> & { project?: Project; version?: number };
  if (obj && obj.format === INTERO_FORMAT && obj.project) {
    return normalizeProject(obj);
  }
  return normalizeProject(raw);
}
