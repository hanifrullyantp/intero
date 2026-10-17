import type { Project } from '../models/types';
import { DEFAULT_CONFIG } from '../config/library';
import { DEFAULT_MATERIALS } from '../engine/layoutEngine';
import { interoFileBody, interoFilename, parseInteroPayload } from './interoFile';

export function downloadBlob(filename: string, data: Blob | string, mime = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeName(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'project';
}

export function saveProjectFile(project: Project) {
  downloadBlob(interoFilename(project.name), interoFileBody(project), 'application/json');
}

/** Normalise and validate a loaded project */
export function normalizeProject(raw: unknown): Project {
  const obj = raw as { project?: Project } & Project;
  const p = (obj.project ?? obj) as Project;
  if (!p || !Array.isArray(p.items) || !p.room) throw new Error('Not a valid 3D Intero project file');
  p.materials = { ...DEFAULT_MATERIALS, ...(p.materials ?? {}) };
  const defaultSettings: Project['settings'] = { kerf: 3, laborRate: 1500000, markup: 20, unit: 'cm', gridSize: 1 };
  p.settings = Object.assign(defaultSettings, p.settings ?? {});
  p.items = p.items.map((i) => {
    const cfg = Object.assign({}, DEFAULT_CONFIG, i.config ?? {});
    cfg.materials = Object.assign({ useDefault: true }, i.config?.materials ?? {});
    return { ...i, config: cfg };
  });
  return p;
}

export function openProjectFile(): Promise<Project> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.intero,.json,.i3d.json,application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseInteroPayload(JSON.parse(String(reader.result))));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(f);
    };
    input.click();
  });
}
