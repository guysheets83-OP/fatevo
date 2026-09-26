import * as SQLite from 'expo-sqlite';
import type { StreakState } from './streak';

export interface OptionSet {
  id: number;
  name: string;
  noRepeat: boolean;
  createdAt: number;
}

export interface SetOption {
  id: number;
  setId: number;
  name: string;
  weight: number;
}

export interface SetSummary extends OptionSet {
  optionCount: number;
}

let db: SQLite.SQLiteDatabase | null = null;

/** Open (or reuse) the on-device database and ensure the schema exists. */
export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('fatevo.db');
    db.execSync('PRAGMA foreign_keys = ON;');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        no_repeat INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS drawn (
        set_id INTEGER NOT NULL,
        option_id INTEGER NOT NULL,
        PRIMARY KEY (set_id, option_id)
      );
      CREATE INDEX IF NOT EXISTS idx_options_set ON options(set_id);
      CREATE TABLE IF NOT EXISTS streak (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        count INTEGER NOT NULL DEFAULT 0,
        last_roll_date TEXT
      );
    `);
  }
  return db;
}

// ---------- sets ----------

export function getSetSummaries(): SetSummary[] {
  const rows = getDb().getAllSync<any>(
    `SELECT s.id, s.name, s.no_repeat, s.created_at,
            (SELECT COUNT(*) FROM options o WHERE o.set_id = s.id) AS option_count
     FROM sets s
     ORDER BY s.created_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    noRepeat: r.no_repeat === 1,
    createdAt: r.created_at,
    optionCount: r.option_count,
  }));
}

export function getSet(id: number): OptionSet | null {
  const row = getDb().getFirstSync<any>(
    `SELECT id, name, no_repeat, created_at FROM sets WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    noRepeat: row.no_repeat === 1,
    createdAt: row.created_at,
  };
}

export function createSet(name: string): number {
  const clean = name.trim();
  if (!clean) throw new Error('Set name cannot be empty');
  const res = getDb().runSync(`INSERT INTO sets (name, created_at) VALUES (?, ?)`, [
    clean,
    Date.now(),
  ]);
  return res.lastInsertRowId;
}

export function renameSet(id: number, name: string): void {
  const clean = name.trim();
  if (!clean) throw new Error('Set name cannot be empty');
  getDb().runSync(`UPDATE sets SET name = ? WHERE id = ?`, [clean, id]);
}

export function deleteSet(id: number): void {
  const d = getDb();
  d.runSync(`DELETE FROM drawn WHERE set_id = ?`, [id]);
  d.runSync(`DELETE FROM options WHERE set_id = ?`, [id]);
  d.runSync(`DELETE FROM sets WHERE id = ?`, [id]);
}

export function setNoRepeat(id: number, enabled: boolean): void {
  const d = getDb();
  d.runSync(`UPDATE sets SET no_repeat = ? WHERE id = ?`, [enabled ? 1 : 0, id]);
  if (!enabled) {
    d.runSync(`DELETE FROM drawn WHERE set_id = ?`, [id]);
  }
}

// ---------- options ----------

export function getOptions(setId: number): SetOption[] {
  const rows = getDb().getAllSync<any>(
    `SELECT id, set_id, name, weight FROM options WHERE set_id = ? ORDER BY id ASC`,
    [setId]
  );
  return rows.map((r) => ({ id: r.id, setId: r.set_id, name: r.name, weight: r.weight }));
}

export function getOption(id: number): SetOption | null {
  const r = getDb().getFirstSync<any>(
    `SELECT id, set_id, name, weight FROM options WHERE id = ?`,
    [id]
  );
  if (!r) return null;
  return { id: r.id, setId: r.set_id, name: r.name, weight: r.weight };
}

function clampWeight(weight: number): number {
  return Math.min(5, Math.max(1, Math.round(weight) || 1));
}

export function addOption(setId: number, name: string, weight: number): number {
  const clean = name.trim();
  if (!clean) throw new Error('Option name cannot be empty');
  const res = getDb().runSync(
    `INSERT INTO options (set_id, name, weight) VALUES (?, ?, ?)`,
    [setId, clean, clampWeight(weight)]
  );
  return res.lastInsertRowId;
}

export function updateOption(id: number, name: string, weight: number): void {
  const clean = name.trim();
  if (!clean) throw new Error('Option name cannot be empty');
  getDb().runSync(`UPDATE options SET name = ?, weight = ? WHERE id = ?`, [
    clean,
    clampWeight(weight),
    id,
  ]);
}

export function deleteOption(id: number): void {
  const d = getDb();
  d.runSync(`DELETE FROM drawn WHERE option_id = ?`, [id]);
  d.runSync(`DELETE FROM options WHERE id = ?`, [id]);
}

// ---------- no-repeat ("deck draw") bookkeeping ----------

export function getDrawnIds(setId: number): number[] {
  const rows = getDb().getAllSync<any>(`SELECT option_id FROM drawn WHERE set_id = ?`, [
    setId,
  ]);
  return rows.map((r) => r.option_id as number);
}

export function markDrawn(setId: number, optionId: number): void {
  getDb().runSync(`INSERT OR IGNORE INTO drawn (set_id, option_id) VALUES (?, ?)`, [
    setId,
    optionId,
  ]);
}

export function resetDrawn(setId: number): void {
  getDb().runSync(`DELETE FROM drawn WHERE set_id = ?`, [setId]);
}

// ---------- daily streak ----------

export function getStreakState(): StreakState {
  const row = getDb().getFirstSync<any>(
    `SELECT count, last_roll_date FROM streak WHERE id = 1`
  );
  if (!row) return { count: 0, lastRollDate: null };
  return {
    count: row.count as number,
    lastRollDate: (row.last_roll_date as string | null) ?? null,
  };
}

export function saveStreakState(state: StreakState): void {
  getDb().runSync(
    `INSERT INTO streak (id, count, last_roll_date) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET count = excluded.count, last_roll_date = excluded.last_roll_date`,
    [state.count, state.lastRollDate]
  );
}
