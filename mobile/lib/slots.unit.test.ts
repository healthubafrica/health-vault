import { fallbackSlots, slotsForSelection } from './slots';

const groups = [
  { providerId: 'p1', providerName: 'A', slots: ['2026-10-12T09:00:00.000Z', '2026-10-12T10:00:00.000Z'] },
  { providerId: 'p2', providerName: 'B', slots: ['2026-10-12T10:00:00.000Z', '2026-10-12T08:00:00.000Z'] },
];

describe('slotsForSelection', () => {
  it('uses only the chosen provider’s slots', () => {
    expect(slotsForSelection(groups, 'p1')).toEqual(['2026-10-12T09:00:00.000Z', '2026-10-12T10:00:00.000Z']);
  });

  it('never falls back to another provider’s slots when the chosen one has none', () => {
    expect(slotsForSelection(groups, 'p3')).toEqual([]);
  });

  it('with no provider chosen, merges every provider’s slots, de-duplicated and sorted', () => {
    expect(slotsForSelection(groups, '')).toEqual([
      '2026-10-12T08:00:00.000Z',
      '2026-10-12T09:00:00.000Z',
      '2026-10-12T10:00:00.000Z',
    ]);
  });

  it('handles no data', () => {
    expect(slotsForSelection(undefined, '')).toEqual([]);
    expect(slotsForSelection([], 'p1')).toEqual([]);
  });
});

describe('fallbackSlots (requested times when no schedule is configured)', () => {
  it('offers hourly times 08:00–17:00 for a future day', () => {
    const now = new Date(2026, 9, 10, 12, 0, 0); // 10 Oct 2026 local
    const slots = fallbackSlots('2026-10-12', now);
    expect(slots).toHaveLength(10);
    expect(new Date(slots[0]).getHours()).toBe(8);
    expect(new Date(slots[9]).getHours()).toBe(17);
  });

  it('drops times that have already passed today', () => {
    const now = new Date(2026, 9, 12, 13, 30, 0);
    const slots = fallbackSlots('2026-10-12', now);
    expect(slots.map((s) => new Date(s).getHours())).toEqual([14, 15, 16, 17]);
  });

  it('is empty for a past day', () => {
    expect(fallbackSlots('2026-10-01', new Date(2026, 9, 10, 12, 0, 0))).toEqual([]);
  });
});
