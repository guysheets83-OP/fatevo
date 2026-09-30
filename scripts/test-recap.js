const path = require('path');
const modPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : '/tmp/fatevo-test/recap.js';
const { computeMonthStats, monthBounds, crownLine, monthLabel } = require(modPath);

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; }
  else { console.log('ok:', msg); }
}

function mkRolls(entries) {
  // entries: [name, emoji, count, year, month, day]
  const out = [];
  for (const [name, emoji, count, y, mo, d] of entries) {
    for (let i = 0; i < count; i++) {
      out.push({ setName: name, setEmoji: emoji, rolledAt: new Date(y, mo, d, 12).getTime() });
    }
  }
  return out;
}

// 1. Basic top-3 with percentages
{
  const rolls = mkRolls([
    ['Dinner', '🍕', 6, 2026, 8, 5],
    ['Movies', '🎬', 3, 2026, 8, 10],
    ['Games', '🎮', 1, 2026, 8, 15],
  ]);
  const s = computeMonthStats(rolls, 2026, 8);
  assert(s.total === 10, `total is 10 (got ${s.total})`);
  assert(s.top.length === 3, 'top 3 returned');
  assert(s.top[0].name === 'Dinner' && s.top[0].pct === 60, `Dinner first at 60% (got ${s.top[0].pct})`);
  assert(s.top[1].name === 'Movies' && s.top[1].pct === 30, 'Movies second at 30%');
  assert(s.top[2].name === 'Games' && s.top[2].pct === 10, 'Games third at 10%');
  assert(s.monthLabel === 'September', `month label September (got ${s.monthLabel})`);
  assert(s.shareTitle === 'My September with Fatevo', `share title ok (got ${s.shareTitle})`);
}

// 2. Rolls outside the month are excluded
{
  const rolls = mkRolls([
    ['Dinner', '🍕', 4, 2026, 8, 20],
    ['Dinner', '🍕', 2, 2026, 7, 25], // August — excluded
    ['Dinner', '🍕', 1, 2026, 9, 1],  // October — excluded
  ]);
  const s = computeMonthStats(rolls, 2026, 8);
  assert(s.total === 4 && s.top[0].pct === 100, 'only September rolls counted');
}

// 3. Fewer than 3 categories -> show what exists
{
  const rolls = mkRolls([['Dinner', '🍕', 2, 2026, 8, 3]]);
  const s = computeMonthStats(rolls, 2026, 8);
  assert(s.total === 2 && s.top.length === 1, 'single category shown alone');
  assert(s.top[0].pct === 100, 'single category is 100%');
}

// 4. Empty month -> friendly empty stats
{
  const s = computeMonthStats([], 2026, 8);
  assert(s.total === 0 && s.top.length === 0, 'empty month yields zero stats');
}

// 5. Ties break alphabetically (stable order)
{
  const rolls = mkRolls([
    ['Zebra', '🦓', 2, 2026, 8, 3],
    ['Apple', '🍎', 2, 2026, 8, 4],
  ]);
  const s = computeMonthStats(rolls, 2026, 8);
  assert(s.top[0].name === 'Apple' && s.top[1].name === 'Zebra', 'ties break alphabetically');
}

// 6. Crown line is deterministic per month and mentions the category
{
  const a = crownLine('Dinner', 2026, 8);
  const b = crownLine('Dinner', 2026, 8);
  const c = crownLine('Dinner', 2026, 9);
  assert(a === b && a.includes('Dinner'), 'crown line deterministic and names the category');
  assert(typeof c === 'string' && c.includes('Dinner'), 'crown line works for other months');
}

// 7. Month boundaries: first ms of month included, last ms of previous excluded
{
  const { start, end } = monthBounds(2026, 8);
  assert(new Date(start).getDate() === 1 && new Date(start).getMonth() === 8, 'start is Sep 1');
  assert(end - start > 27 * 86400000 && end - start < 32 * 86400000, 'end is ~30 days later');
  const edge = [
    { setName: 'Edge', setEmoji: '🧪', rolledAt: start },       // in
    { setName: 'Edge', setEmoji: '🧪', rolledAt: start - 1 },   // out
    { setName: 'Edge', setEmoji: '🧪', rolledAt: end - 1 },     // in
    { setName: 'Edge', setEmoji: '🧪', rolledAt: end },         // out
  ];
  const s = computeMonthStats(edge, 2026, 8);
  assert(s.total === 2, `boundary ms handled correctly (got ${s.total})`);
}

// 8. Roll counts cap at top 3 even with many categories
{
  const rolls = mkRolls([
    ['A', '1️⃣', 5, 2026, 8, 1],
    ['B', '2️⃣', 4, 2026, 8, 2],
    ['C', '3️⃣', 3, 2026, 8, 3],
    ['D', '4️⃣', 2, 2026, 8, 4],
    ['E', '5️⃣', 1, 2026, 8, 5],
  ]);
  const s = computeMonthStats(rolls, 2026, 8);
  assert(s.total === 15 && s.top.length === 3, 'top 3 of 5 categories');
  assert(s.top[0].name === 'A' && s.top[2].name === 'C', 'ordered best-first');
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
