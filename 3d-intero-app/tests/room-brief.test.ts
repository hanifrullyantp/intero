import { describe, expect, it } from 'vitest';
import { briefToWizardInput, describeRoomBrief, parseRoomBrief } from '../src/ai/room-brief';
import { startIndonesianSpeech, type SpeechRecognizer } from '../src/ai/speech';
import { generateLayout } from '../src/engine/layout-generator';
import { DEFAULT_SETTINGS } from '../src/lib/constants';

describe('popup awal', () => {
  it('membaca bentuk L dan dua panjang dalam cm', () => {
    const brief = parseRoomBrief('dapur L 360 cm dan 240 cm, ada kulkas dan island');
    expect(brief.shape).toBe('L');
    expect(brief.lengthsCm.back).toBe(360);
    expect(brief.lengthsCm.left).toBe(240);
    expect(brief.island).toBe(true);
    expect(brief.fridge).toBe(true);
    expect(describeRoomBrief(brief)).toContain('360 cm');
  });

  it('mengubah meter menjadi cm untuk bentuk U', () => {
    const brief = parseRoomBrief('bentuk U 2.4 m, 3 m, dan 2 m, plafon 2.6 m');
    expect(brief.shape).toBe('U');
    expect(brief.lengthsCm).toMatchObject({ back: 240, left: 300, right: 200 });
    expect(brief.ceilingCm).toBe(260);
  });

  it('mematikan bagian yang disebut tanpa', () => {
    const brief = parseRoomBrief('dapur lurus 3 meter tanpa kompor');
    expect(brief.shape).toBe('I');
    expect(brief.lengthsCm.back).toBe(300);
    expect(brief.cooktop).toBe(false);
  });

  it('menghasilkan layout dari brief', () => {
    const input = briefToWizardInput(parseRoomBrief('dapur L 300 cm dan 240 cm'));
    const out = generateLayout(input, DEFAULT_SETTINGS);
    expect(out.walls.map((wall) => wall.id)).toEqual(['left', 'back']);
    expect(out.items.length).toBeGreaterThan(3);
  });

  it('memakai bahasa id-ID dan menolak browser tanpa mikrofon', () => {
    let heard = '';
    let lang = '';
    class Fake implements SpeechRecognizer {
      lang = '';
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        lang = this.lang;
        this.onresult?.({ results: [[{ transcript: 'dapur L 3 meter' }]] });
      }
    }
    const started = startIndonesianSpeech({ SpeechRecognition: Fake }, {
      onText: (text) => { heard = text; },
      onUnsupported: () => { heard = 'tidak'; },
      onError: () => { heard = 'gagal'; },
    });
    expect(started).toBe(true);
    expect(lang).toBe('id-ID');
    expect(heard).toBe('dapur L 3 meter');
    let unsupported = false;
    expect(startIndonesianSpeech({}, {
      onText: () => {},
      onUnsupported: () => { unsupported = true; },
      onError: () => {},
    })).toBe(false);
    expect(unsupported).toBe(true);
  });
});
