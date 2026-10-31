import { describe, expect, it } from 'vitest';
import { contextChips } from '../src/ai/context';

describe('konteks klik', () => {
  const items = [
    { id: 'cab_base_0001', name: 'Base Cabinet 60' },
    { id: 'cab_wall_0001', name: 'Wall Cabinet 60' },
  ];

  it('mengubah id terpilih menjadi chip berlabel', () => {
    expect(contextChips(items, ['cab_wall_0001', 'hilang', 'cab_base_0001'])).toEqual([
      { id: 'cab_wall_0001', label: 'Wall Cabinet 60' },
      { id: 'cab_base_0001', label: 'Base Cabinet 60' },
    ]);
  });

  it('kosong bila tidak ada yang diklik', () => {
    expect(contextChips(items, [])).toEqual([]);
  });
});
