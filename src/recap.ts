/** Pure monthly-recap stats. No React Native dependencies — unit-testable. */

export interface RollEntry {
  /** Display name of the list that was rolled (snapshot at roll time). */
  setName: string;
  /** Emoji of the list (snapshot at roll time). */
  setEmoji: string;
  /** Epoch ms of the roll. */
  rolledAt: number;
}

export interface CategoryStat {
  name: string;
  emoji: string;
  count: number;
  /** Integer percent of the month's rolls. */
  pct: number;
}

export interface MonthStats {
  total: number;
  /** Top categories, best first, at most 3. */
  top: CategoryStat[];
  /** e.g. "September". */
  monthLabel: string;
  /** e.g. "My September with Fatevo" (for share cards). */
  shareTitle: string;
  year: number;
  month: number; // 0-based
}

/** Local-time bounds of a calendar month, [start, end). */
export function monthBounds(
  year: number,
  month: number
): { start: number; end: number } {
  const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();
  return { start, end };
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
}

const CROWN_LINES = [
  '👑 Reigning supreme over',
  '👑 Undisputed champion of',
  '👑 The one true realm:',
  '👑 High decider of',
  '👑 All hail the ruler of',
];

/**
 * Playful crown line for the #1 category. Deterministic per month so it
 * doesn't change between visits.
 */
export function crownLine(name: string, year: number, month: number): string {
  const idx = (year * 12 + month) % CROWN_LINES.length;
  return `${CROWN_LINES[idx]} ${name}`;
}

/**
 * Compute this month's top-3 decision categories from roll records.
 * Ties break alphabetically so the order is stable.
 */
export function computeMonthStats(
  rolls: RollEntry[],
  year: number,
  month: number
): MonthStats {
  const { start, end } = monthBounds(year, month);
  const inMonth = rolls.filter((r) => r.rolledAt >= start && r.rolledAt < end);
  const total = inMonth.length;
  const byName = new Map<string, { emoji: string; count: number }>();
  for (const r of inMonth) {
    const key = r.setName.trim() === '' ? '(unnamed list)' : r.setName;
    const entry = byName.get(key);
    if (entry) entry.count += 1;
    else byName.set(key, { emoji: r.setEmoji || '🎲', count: 1 });
  }
  const top: CategoryStat[] = [...byName.entries()]
    .map(([name, { emoji, count }]) => ({
      name,
      emoji,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 3);
  const label = monthLabel(year, month);
  return {
    total,
    top,
    monthLabel: label,
    shareTitle: `My ${label} with Fatevo`,
    year,
    month,
  };
}
