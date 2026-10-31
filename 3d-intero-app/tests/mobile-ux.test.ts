import { describe, expect, it } from 'vitest';
import { dockItems } from '../src/components/mobile/MobileShell';

describe('dock mobile v2', () => {
  it('awal tanpa pilihan menampilkan alat umum', () => {
    expect(dockItems(false, false)).toEqual(['ai', 'komponen', 'ukur', 'lapisan', 'global', 'tampilan']);
    expect(dockItems(true, false)).toEqual(['komponen']);
  });

  it('objek terpilih menampilkan alat objek', () => {
    expect(dockItems(false, true)).toEqual(['ukuran', 'material', 'geser', 'putar', 'duplikat', 'hapus', 'lainnya']);
    expect(dockItems(true, true)).toEqual(['ukuran', 'material', 'hapus']);
  });

  it('mengedit ukuran ada di dock saat objek dipilih', () => {
    expect(dockItems(false, true)).toContain('ukuran');
    expect(dockItems(true, true)).toContain('ukuran');
    expect(dockItems(false, false)).not.toContain('ukuran');
  });
});
