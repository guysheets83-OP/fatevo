const path = require('path');
const modPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : '/tmp/fatevo-test/roll.js';
const { pickWinner, pickNoRepeat } = require(modPath);

// Deterministic seeded RNG (LCG) so results are reproducible.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; }
  else { console.log('ok:', msg); }
}

// 1. Equal weights -> roughly uniform over 30k trials (4 options => ~7500 each, tolerance 5%)
{
  const items = [1, 2, 3, 4].map(id => ({ id, weight: 1 }));
  const rng = seeded(42);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let i = 0; i < 30000; i++) counts[pickWinner(items, rng).id]++;
  const vals = Object.values(counts);
  assert(vals.every(c => Math.abs(c - 7500) < 7500 * 0.05),
    `uniform weights distribution ~equal: ${vals.join(',')}`);
}

// 2. Weighted 3:1 -> ratio within 5% of 3.0 over 40k trials
{
  const items = [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }];
  const rng = seeded(7);
  let a = 0, b = 0;
  for (let i = 0; i < 40000; i++) (pickWinner(items, rng).id === 'a' ? a++ : b++);
  const ratio = a / b;
  assert(Math.abs(ratio - 3) < 0.15, `weight 3:1 respected (ratio=${ratio.toFixed(3)}, a=${a}, b=${b})`);
}

// 3. No-repeat: all 3 win exactly once before any repeat; then pool resets
{
  const items = [{ id: 1, weight: 1 }, { id: 2, weight: 1 }, { id: 3, weight: 1 }];
  const rng = seeded(99);
  const drawn = new Set();
  const firstThree = [];
  let resets = 0;
  for (let i = 0; i < 4; i++) {
    const { winner, poolWasReset } = pickNoRepeat(items, drawn, rng);
    if (poolWasReset) { resets++; drawn.clear(); }
    firstThree.push(winner.id);
    drawn.add(winner.id);
  }
  const uniq = new Set(firstThree.slice(0, 3));
  assert(uniq.size === 3, `no-repeat: all 3 won once before repeat (${firstThree.slice(0,3).join(',')})`);
  assert(resets === 1, 'no-repeat: pool reset exactly once after exhaustion');
}

// 4. No-repeat with weights: still exhausts unique ids first
{
  const items = [{ id: 1, weight: 5 }, { id: 2, weight: 1 }];
  const rng = seeded(5);
  const drawn = new Set();
  const w1 = pickNoRepeat(items, drawn, rng).winner; drawn.add(w1.id);
  const r2 = pickNoRepeat(items, drawn, rng);
  assert(r2.winner.id !== w1.id, 'no-repeat: second pick differs from first despite weights');
  assert(!r2.poolWasReset, 'no-repeat: no reset while pool non-empty');
}

// 5. Errors
{
  let threw = false;
  try { pickWinner([]); } catch { threw = true; }
  assert(threw, 'pickWinner throws on empty array');
  threw = false;
  try { pickWinner([{ id: 1, weight: 0 }]); } catch { threw = true; }
  assert(threw, 'pickWinner throws on zero total weight');
  threw = false;
  try { pickNoRepeat([], new Set()); } catch { threw = true; }
  assert(threw, 'pickNoRepeat throws on empty array');
}

// 6. Single item always wins
{
  const w = pickWinner([{ id: 9, weight: 2 }], seeded(1));
  assert(w.id === 9, 'single option always wins');
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
