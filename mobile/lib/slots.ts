interface SlotGroup {
  providerId: string;
  slots: string[];
}

/**
 * Slots to offer. A chosen provider gets only their own slots (never another
 * provider's). With no provider chosen ("let the care team assign"), every
 * provider's slots are merged, de-duplicated and sorted.
 */
export function slotsForSelection(groups: SlotGroup[] | undefined, providerId: string): string[] {
  const list = groups ?? [];
  if (providerId) return list.find((g) => g.providerId === providerId)?.slots ?? [];
  return [...new Set(list.flatMap((g) => g.slots))].sort();
}

const FIRST_HOUR = 8;
const LAST_HOUR = 17;

/**
 * Requested times for when no provider has a schedule configured (the web portal
 * accepts any date/time; the care team confirms afterwards). Local hourly times
 * 08:00–17:00 on `dateStr` (YYYY-MM-DD), excluding any that have already passed.
 */
export function fallbackSlots(dateStr: string, now: Date = new Date()): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const out: string[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    const t = new Date(y, m - 1, d, h, 0, 0, 0);
    if (t.getTime() > now.getTime()) out.push(t.toISOString());
  }
  return out;
}
