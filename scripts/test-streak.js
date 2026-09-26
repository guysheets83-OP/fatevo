const path = require('path');
const modPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : '/tmp/fatevo-test/streak.js';
const { MILESTONES, addDays, computeRoll, titleForStreak, todayLocal } = require(modPath);

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; }
  else { console.log('ok:', msg); }
}

const TODAY = '2026-09-25';
const YESTERDAY = '2026-09-24';
const TWO_DAYS_AGO = '2026-09-23';

// 1. First roll ever -> streak starts at 1
{
  const { next, result } = computeRoll({ count: 0, lastRollDate: null }, TODAY);
  assert(next.count === 1 && next.lastRollDate === TODAY, 'first roll starts streak at 1');
  assert(result.streak === 1 && result.isFirstRollToday, 'first roll flags firstRollToday');
  assert(result.milestone === null, 'no milestone on day 1');
}

// 2. Consecutive day -> streak increments
{
  const { next, result } = computeRoll({ count: 4, lastRollDate: YESTERDAY }, TODAY);
  assert(next.count === 5, 'consecutive day increments streak to 5');
  assert(result.isFirstRollToday, 'consecutive day counts as first roll today');
  assert(result.milestone === null, 'no milestone on day 5');
}

// 3. Second roll on the same day -> idempotent
{
  const prev = { count: 5, lastRollDate: TODAY };
  const { next, result } = computeRoll(prev, TODAY);
  assert(next.count === 5 && next.lastRollDate === TODAY, 'same-day roll leaves streak unchanged');
  assert(!result.isFirstRollToday, 'same-day roll is not firstRollToday');
  assert(result.milestone === null, 'no milestone on repeat roll');
}

// 4. Missed a day -> streak resets to 1
{
  const { next, result } = computeRoll({ count: 12, lastRollDate: TWO_DAYS_AGO }, TODAY);
  assert(next.count === 1, 'missed day resets streak to 1');
  assert(result.isFirstRollToday, 'post-gap roll still counts as first roll today');
  assert(result.milestone === null, 'no milestone on reset');
}

// 5. Long gap -> also resets to 1
{
  const { next } = computeRoll({ count: 60, lastRollDate: '2026-01-01' }, TODAY);
  assert(next.count === 1, 'month-long gap resets streak to 1');
}

// 6. Milestones fire on exactly 7 / 30 / 100
{
  const r7 = computeRoll({ count: 6, lastRollDate: YESTERDAY }, TODAY);
  assert(r7.result.milestone?.title === 'Fate Apprentice', 'day 7 -> Fate Apprentice');
  const r30 = computeRoll({ count: 29, lastRollDate: YESTERDAY }, TODAY);
  assert(r30.result.milestone?.title === 'Fate Whisperer', 'day 30 -> Fate Whisperer');
  const r100 = computeRoll({ count: 99, lastRollDate: YESTERDAY }, TODAY);
  assert(r100.result.milestone?.title === 'Fate Master', 'day 100 -> Fate Master');
  const r8 = computeRoll({ count: 7, lastRollDate: YESTERDAY }, TODAY);
  assert(r8.result.milestone === null, 'day 8 -> no milestone');
}

// 7. titleForStreak picks the highest earned title
{
  assert(titleForStreak(0) === null, 'titleForStreak(0) is null');
  assert(titleForStreak(6) === null, 'titleForStreak(6) is null');
  assert(titleForStreak(7) === 'Fate Apprentice', 'titleForStreak(7)');
  assert(titleForStreak(29) === 'Fate Apprentice', 'titleForStreak(29)');
  assert(titleForStreak(30) === 'Fate Whisperer', 'titleForStreak(30)');
  assert(titleForStreak(99) === 'Fate Whisperer', 'titleForStreak(99)');
  assert(titleForStreak(100) === 'Fate Master', 'titleForStreak(100)');
  assert(titleForStreak(365) === 'Fate Master', 'titleForStreak(365) stays Master');
}

// 8. addDays handles month/year/leap boundaries (local calendar)
{
  assert(addDays('2026-03-07', 1) === '2026-03-08', 'addDays +1 across nothing');
  assert(addDays('2026-02-28', 1) === '2026-03-01', 'addDays crosses month end');
  assert(addDays('2024-02-28', 1) === '2024-02-29', 'addDays hits leap day');
  assert(addDays('2025-12-31', 1) === '2026-01-01', 'addDays crosses year end');
  assert(addDays('2026-09-25', -1) === '2026-09-24', 'addDays -1');
  assert(addDays('2026-03-01', -1) === '2026-02-28', 'addDays -1 crosses month start');
}

// 9. MILESTONES table shape
{
  assert(MILESTONES.length === 3, 'three milestones defined');
  assert(MILESTONES[0].days === 7 && MILESTONES[1].days === 30 && MILESTONES[2].days === 100,
    'milestone days are 7/30/100');
}

// 10. todayLocal returns a YYYY-MM-DD string
{
  const t = todayLocal();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(t), `todayLocal format valid (${t})`);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
