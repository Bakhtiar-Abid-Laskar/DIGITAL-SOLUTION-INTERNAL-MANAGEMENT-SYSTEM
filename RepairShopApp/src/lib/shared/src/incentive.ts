import { roundMoney } from './billing';

export interface TechnicianIncentiveAllocation {
  technician_id: string;
  amount: number;
}

/**
 * Calculates equal incentive division among all active technicians assigned to a job.
 * Handles rounding safely to two decimal places without losing pennies/paise.
 *
 * @param totalIncentive Total snapshot incentive for the job
 * @param technicians Array of active technician IDs or technician records
 * @returns Array of allocations with technician_id and exact allocated amount
 */
export function calculateEqualIncentiveSplit(
  totalIncentive: number,
  technicians: Array<string | { technician_id: string; removed_at?: string | null }>
): TechnicianIncentiveAllocation[] {
  const total = Number(totalIncentive) || 0;
  if (total <= 0) return [];

  // Filter for active technicians
  const activeTechIds: string[] = technicians
    .map(t => (typeof t === 'string' ? t : !t.removed_at ? t.technician_id : null))
    .filter((id): id is string => Boolean(id && id.trim()));

  // Deduplicate technician IDs
  const uniqueTechIds = Array.from(new Set(activeTechIds));

  if (uniqueTechIds.length === 0) {
    return [];
  }

  const count = uniqueTechIds.length;
  const splitBase = Math.floor((total / count) * 100) / 100;
  let remainingCents = Math.round((total - splitBase * count) * 100);

  return uniqueTechIds.map((id, index) => {
    // Distribute remainder cent-by-cent to preserve the exact total sum
    let allocated = splitBase;
    if (remainingCents > 0) {
      allocated = roundMoney(allocated + 0.01);
      remainingCents -= 1;
    }
    return {
      technician_id: id,
      amount: allocated,
    };
  });
}

