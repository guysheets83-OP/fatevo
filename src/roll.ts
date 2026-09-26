/** Pure weighted-random selection logic. No React Native dependencies — unit-testable. */

export interface WeightedItem {
  id: number;
  weight: number;
}

/**
 * Pick one item with probability proportional to its weight.
 * Algorithm: sum weights -> random number in [0, total) -> walk down,
 * subtracting each weight; the item that drives the number below zero wins.
 */
export function pickWinner<T extends WeightedItem>(
  items: T[],
  rng: () => number = Math.random
): T {
  if (items.length === 0) {
    throw new Error('pickWinner: no items to choose from');
  }
  const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
  if (total <= 0) {
    throw new Error('pickWinner: total weight must be positive');
  }
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r < 0) return it;
  }
  // Float-rounding safety net: rng() < 1 always, so we should never land here,
  // but never return undefined.
  return items[items.length - 1];
}

export interface NoRepeatResult<T> {
  winner: T;
  /** True when every option had already won and the deck was reshuffled. */
  poolWasReset: boolean;
}

/**
 * No-repeat ("deck draw") mode: each option wins once before any repeats,
 * like drawing cards from a deck. `drawnIds` are the ids already drawn.
 */
export function pickNoRepeat<T extends WeightedItem>(
  items: T[],
  drawnIds: ReadonlySet<number> | number[],
  rng: () => number = Math.random
): NoRepeatResult<T> {
  const drawn = drawnIds instanceof Set ? drawnIds : new Set(drawnIds);
  let pool = items.filter((it) => !drawn.has(it.id));
  let poolWasReset = false;
  if (pool.length === 0) {
    pool = [...items];
    poolWasReset = true;
  }
  return { winner: pickWinner(pool, rng), poolWasReset };
}
