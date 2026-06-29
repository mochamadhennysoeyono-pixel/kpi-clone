// src/lib/kpi-utils.ts
import { parse, isWithinInterval, lastDayOfMonth } from 'date-fns';
import type { KpiSetup, EmployeeLike } from '@/types';

// Re-export main types to be used by this utility
export type { KpiSetup } from '@/types';

function norm(v?: string | null): string {
  return (v ?? '').toString().trim().toLowerCase();
}

function inRange(dateStr: string, fromStr: string, toStr: string): boolean {
  try {
    const targetDate = parse(dateStr, 'yyyy-MM', new Date());
    const startDate = parse(fromStr, 'yyyy-MM', new Date());
    const endDate = lastDayOfMonth(parse(toStr, 'yyyy-MM', new Date()));
    return isWithinInterval(targetDate, { start: startDate, end: endDate });
  } catch (e) {
    return false;
  }
}

/**
 * findKpiSetup
 * - setups: array of KpiSetup
 * - employee: employee-like object (company, department, position, level)
 * - targetPeriod: string ('yyyy-MM') — the period date (used to check validFrom/validTo)
 *
 * Matching priority (most strict -> fallback):
 * 1) exact match on company+department+position+level within date range
 * 2) match on company+department+position (ignore level) within date range
 */
export function findKpiSetup(
  setups: KpiSetup[] = [],
  employee: EmployeeLike = {},
  targetPeriod?: string | null
): KpiSetup | null {
  if (!targetPeriod) return null;

  const c = norm(employee.company);
  const dpt = norm(employee.department);
  const pos = norm(employee.position);
  const lvl = norm(employee.level);

  const predicate = (s: KpiSetup, checkLevel: boolean) => {
    if (!s.validFrom || !s.validTo || !inRange(targetPeriod, s.validFrom, s.validTo)) {
      return false;
    }
    if (c !== norm(s.company)) return false;
    if (pos !== norm(s.position)) return false;
    if (dpt !== norm(s.department)) return false;
    
    if (checkLevel) {
      if (lvl && norm(s.level) !== lvl) return false;
    }
    
    return true;
  };
  
  // 1) strict: company+department+position+level
  const strictMatch = setups.find(s => predicate(s, true));
  if (strictMatch) return strictMatch;

  // 2) relaxed: company+department+position (ignore level)
  const relaxedMatch = setups.find(s => predicate(s, false));
  if (relaxedMatch) return relaxedMatch;

  return null;
}
