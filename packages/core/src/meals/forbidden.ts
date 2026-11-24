import { LEVEL_TITLE } from '../rules/levels';
import type { DayPlan, ForbiddenMap, Settings } from '../types';
import { DIETS, FORBID } from './data';

/** Categories not allowed today, with their source (rule, diet or allergy). Allergy wins over diet over rule. */
export function forbiddenFor(plan: Pick<DayPlan, 'level'>, s: Pick<Settings, 'diets' | 'allergies'>): ForbiddenMap {
  const f: ForbiddenMap = {};
  for (const cat of FORBID[plan.level]) f[cat] = { src: 'pravilo', label: LEVEL_TITLE[plan.level].toLowerCase() };
  for (const key of Object.keys(DIETS) as (keyof typeof DIETS)[]) {
    if (!s.diets[key]) continue;
    for (const cat of DIETS[key].cats) {
      if (!f[cat]) f[cat] = { src: 'dijeta', label: `${DIETS[key].name.toLowerCase()} dijeta` };
    }
  }
  for (const a of s.allergies) f[a] = { src: 'alergija', label: 'tvoja lista alergija' };
  return f;
}
