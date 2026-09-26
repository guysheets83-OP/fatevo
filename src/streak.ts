/** Pure daily-streak logic. No React Native dependencies — unit-testable. */

export interface StreakState {
  count: number;
  /** Local YYYY-MM-DD of the last day a roll happened, or null if never. */
  lastRollDate: string | null;
}

export interface Milestone {
  days: number;
  title: string;
}

export const MILESTONES: Milestone[] = [
  { days: 7, title: 'Fate Apprentice' },
  { days: 30, title: 'Fate Whisperer' },
  { days: 100, title: 'Fate Master' },
];

export interface RollStreakResult {
  /** Streak count after this roll. */
  streak: number;
  /** Milestone earned by THIS roll, if any. */
  milestone: Milestone | null;
  /** True when this was the first roll of the day (streak advanced or started). */
  isFirstRollToday: boolean;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return toDateString(now);
}

/** Shift a YYYY-MM-DD string by n days on the local calendar. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0); // noon sidesteps DST transitions
  dt.setDate(dt.getDate() + n);
  return toDateString(dt);
}

/**
 * Pure streak transition: given the stored state and today's date,
 * compute the new state and what the UI should show.
 * - First roll ever, or first roll after a missed day -> streak restarts at 1.
 * - Roll on the day after the last roll -> streak + 1.
 * - Additional rolls on the same day -> no change.
 */
export function computeRoll(
  prev: StreakState,
  today: string
): { next: StreakState; result: RollStreakResult } {
  if (prev.lastRollDate === today) {
    return {
      next: prev,
      result: { streak: prev.count, milestone: null, isFirstRollToday: false },
    };
  }
  const continued = prev.lastRollDate !== null && prev.lastRollDate === addDays(today, -1);
  const nextCount = continued ? prev.count + 1 : 1;
  const milestone = MILESTONES.find((m) => m.days === nextCount) ?? null;
  return {
    next: { count: nextCount, lastRollDate: today },
    result: { streak: nextCount, milestone, isFirstRollToday: true },
  };
}

/** Highest milestone title earned for a streak count (for display). */
export function titleForStreak(count: number): string | null {
  let title: string | null = null;
  for (const m of MILESTONES) {
    if (count >= m.days) title = m.title;
  }
  return title;
}
