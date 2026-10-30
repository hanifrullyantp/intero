import { describe, expect, it, beforeEach } from 'vitest';
import { applyCommand } from '../src/projectdoc/apply';
import { createEmptyProjectDoc, type ProjectDoc } from '../src/projectdoc/schema';
import { clearAiSlots, handleAiBody, modelsFromEnv, routeTier, runAiGateway, takeAiSlot, type AiModels } from '../src/ai/gateway';

const models: AiModels = modelsFromEnv({});

function wallDoc(): ProjectDoc {
  const added = applyCommand(createEmptyProjectDoc({ id: 'prj_ai', nama: 'Uji AI', now: '2026-01-01T00:00:00.000Z' }), {
    type: 'add_wall',
    targetIds: ['dinding_kiri'],
    wall: { nama: 'Dinding Kiri', panjangCm: 300, start: { x: 0, z: 0 }, end: { x: 300, z: 0 } },
  });
  const base = applyCommand(added.doc, {
    type: 'add_item',
    targetIds: ['cab_base_0001'],
    item: { type: 'base_cabinet', subtype: 'base', wallId: 'dinding_kiri', offsetCm: 40, dims: { w: 60, h: 85, d: 60 }, label: 'Base 60' },
  });
  expect(base.violations).toEqual([]);
  return base.doc;
}

function env(fetchImpl?: typeof fetch, apiKey: string | null = null) {
  return { apiKey, models, fetchImpl, ip: 'uji', now: 1_000 };
}

beforeEach(() => clearAiSlots());

describe('router AI', () => {
  it('memilih T0, T1, T2, dan T3 tanpa memanggil model', () => {
    expect(routeTier('tinggi total 260 cm')).toBe('T0');
    expect(routeTier('geser kabinet ini 20 cm ke kanan')).toBe('T0');
    expect(routeTier('ubah warna pintu menjadi biru')).toBe('T1');
    expect(routeTier('rapikan semua kabinet atas dan bawah')).toBe('T2');
    expect(routeTier('buat dapur L untuk keluarga empat orang')).toBe('T3');
    expect(routeTier('x'.repeat(401))).toBe('T3');
  });

  it('menerapkan tinggi total lewat dry-run dan menulis baris pratinjau', async () => {
    const doc = createEmptyProjectDoc({ now: '2026-01-01T00:00:00.000Z' });
    const result = await runAiGateway('tinggi total 2.4 m', doc, [], env(() => { throw new Error('tidak boleh fetch'); }));
    expect(result.tier).toBe('T0');
    expect(result.model).toBeNull();
    expect(result.commands).toHaveLength(1);
    const applied = applyCommand(doc, result.commands[0]);
    expect(applied.violations).toEqual([]);
    expect(applied.doc.globals.tinggiTotalCm).toBe(240);
    expect(result.preview.lines[0]).toContain('tinggiTotalCm 240');
  });

  it('menghapus item yang dipilih', async () => {
    const doc = wallDoc();
    const result = await runAiGateway('hapus yang dipilih', doc, ['cab_base_0001'], env());
    expect(result.commands[0]).toMatchObject({ type: 'remove_item', targetIds: ['cab_base_0001'] });
    const applied = applyCommand(doc, result.commands[0]);
    expect(applied.doc.items).toHaveLength(0);
  });

  it('menggeser offset di dinding', async () => {
    const doc = wallDoc();
    const result = await runAiGateway('geser kabinet ini 20 cm ke kanan', doc, ['cab_base_0001'], env());
    expect(result.commands[0]).toMatchObject({ type: 'move_item', offsetCm: 60, wallId: 'dinding_kiri' });
  });

  it('T1 tanpa kunci tidak memanggil OpenRouter', async () => {
    let called = false;
    const result = await runAiGateway('ubah warna pintu menjadi biru', createEmptyProjectDoc(), [], env(() => { called = true; throw new Error('fetch'); }));
    expect(called).toBe(false);
    expect(result.tier).toBe('T1');
    expect(result.commands).toEqual([]);
    expect(result.message).toContain('environment');
  });

  it('memakai kunci environment dan membuang perintah yang gagal', async () => {
    let auth = '';
    const fetchImpl: typeof fetch = async (_url, init) => {
      auth = new Headers(init?.headers).get('Authorization') ?? '';
      const body = JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          message: 'Naikkan plafon lalu geser.',
          commands: [
            { type: 'set_global', targetIds: ['globals'], globals: { tinggiTotalCm: 250 } },
            { type: 'move_item' },
          ],
        }) } }],
      });
      return new Response(body, { status: 200 });
    };
    const result = await handleAiBody({
      utterance: 'naikkan plafon sedikit',
      doc: createEmptyProjectDoc(),
      selectedIds: [],
      apiKey: 'sk-dari-browser',
    }, { ...env(fetchImpl, 'sk-server'), ip: 'model' });
    expect(result.status).toBe(200);
    expect(auth).toBe('Bearer sk-server');
    if (!('commands' in result.body)) throw new Error('bukan hasil gateway');
    expect(result.body.commands).toHaveLength(1);
    expect(result.body.commands[0]).toMatchObject({ type: 'set_global' });
    expect(result.body.preview.violations.length).toBeGreaterThan(0);
    expect(result.body.model).toBe('google/gemini-2.5-flash');
  });

  it('menolak perintah kosong dan membatasi laju', async () => {
    const empty = await handleAiBody({ utterance: '   ', doc: createEmptyProjectDoc() }, env());
    expect(empty.status).toBe(400);
    for (let i = 0; i < 20; i += 1) expect(takeAiSlot('ramai', 5_000)).toBe(true);
    const limited = await handleAiBody({ utterance: 'halo', doc: createEmptyProjectDoc() }, { ...env(), ip: 'ramai', now: 5_000 });
    expect(limited.status).toBe(429);
  });
});
