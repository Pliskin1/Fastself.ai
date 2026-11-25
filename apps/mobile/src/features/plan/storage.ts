import { RULE_PACK_VERSION, RecipeSchema } from '@fastself/core';
import { newId } from '@/db/ids';
import { getDb } from '@/db';
import { enqueue } from '@/db/outbox';
import type { StoredDay } from './model';

// meal_plans is syncable (outbox, only with consent and a signed-in user); shopping_checks is local only.
// Same pattern as src/db/repo/dayMarks.ts and fastingSessions.ts. docs/DATABASE.md §1.

export interface StoredMealPlan {
  id: string;
  weekStart: string;
  days: StoredDay[];
}

interface Row {
  id: string;
  week_start: string;
  days: string;
}

const MEALS = ['rucak', 'vecera', 'iftar', 'sehur'];

function parseDays(json: string): StoredDay[] | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return null;
    const days: StoredDay[] = [];
    for (const day of raw as { date?: unknown; items?: unknown }[]) {
      if (typeof day?.date !== 'string' || !Array.isArray(day.items)) return null;
      const items: StoredDay['items'] = [];
      for (const item of day.items as { meal?: unknown; recipe?: unknown }[]) {
        const recipe = RecipeSchema.safeParse(item?.recipe);
        if (!recipe.success || typeof item.meal !== 'string' || !MEALS.includes(item.meal)) continue;
        items.push({ meal: item.meal as StoredDay['items'][number]['meal'], recipe: recipe.data });
      }
      days.push({ date: day.date, items });
    }
    return days;
  } catch {
    return null;
  }
}

/** The newest plan that is not deleted, or null. An unreadable row counts as no plan. */
export function loadMealPlan(): StoredMealPlan | null {
  const row = getDb().first<Row>(
    'SELECT id, week_start, days FROM meal_plans WHERE deleted = 0 ORDER BY created_at DESC LIMIT 1',
  );
  if (!row) return null;
  const days = parseDays(row.days);
  return days ? { id: row.id, weekStart: row.week_start, days } : null;
}

/** Saves the new plan, soft-deletes the old ones and clears the shopping ticks, in one transaction. */
export function saveMealPlan(weekStart: string, days: StoredDay[]): StoredMealPlan {
  const db = getDb();
  return db.transaction(() => {
    const now = Date.now();
    for (const old of db.all<{ id: string }>('SELECT id FROM meal_plans WHERE deleted = 0')) {
      db.run('UPDATE meal_plans SET deleted = 1, updated_at = ? WHERE id = ?', [now, old.id]);
      enqueue(db, 'meal_plans', old.id);
    }
    const id = newId();
    db.run(
      'INSERT INTO meal_plans (id, week_start, rule_pack_version, days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, weekStart, RULE_PACK_VERSION, JSON.stringify(days), now, now],
    );
    enqueue(db, 'meal_plans', id);
    db.run('DELETE FROM shopping_checks');
    return { id, weekStart, days };
  });
}

export function loadChecks(): Set<string> {
  const rows = getDb().all<{ item: string }>('SELECT item FROM shopping_checks WHERE checked = 1');
  return new Set(rows.map((r) => r.item));
}

export function setCheck(item: string, checked: boolean): void {
  getDb().run('INSERT INTO shopping_checks (item, checked) VALUES (?, ?) ON CONFLICT(item) DO UPDATE SET checked = ?', [
    item,
    checked ? 1 : 0,
    checked ? 1 : 0,
  ]);
}
