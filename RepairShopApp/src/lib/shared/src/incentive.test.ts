import { calculateEqualIncentiveSplit } from './incentive';

describe('calculateEqualIncentiveSplit', () => {
  it('returns empty array when total incentive is 0 or negative', () => {
    expect(calculateEqualIncentiveSplit(0, ['tech-1', 'tech-2'])).toEqual([]);
    expect(calculateEqualIncentiveSplit(-50, ['tech-1'])).toEqual([]);
  });

  it('returns empty array when no active technicians are provided', () => {
    expect(calculateEqualIncentiveSplit(300, [])).toEqual([]);
    expect(
      calculateEqualIncentiveSplit(300, [
        { technician_id: 'tech-1', removed_at: '2026-08-20T10:00:00Z' },
      ])
    ).toEqual([]);
  });

  it('allocates 100% to a single assigned technician', () => {
    const res = calculateEqualIncentiveSplit(250, ['tech-1']);
    expect(res).toEqual([{ technician_id: 'tech-1', amount: 250 }]);
  });

  it('splits equally across 2 technicians', () => {
    const res = calculateEqualIncentiveSplit(300, ['tech-1', 'tech-2']);
    expect(res).toEqual([
      { technician_id: 'tech-1', amount: 150 },
      { technician_id: 'tech-2', amount: 150 },
    ]);
  });

  it('handles odd numbers / rounding without losing paise across 3 technicians', () => {
    // 100 / 3 = 33.33 + 33.33 + 33.34 = 100.00
    const res = calculateEqualIncentiveSplit(100, ['tech-1', 'tech-2', 'tech-3']);
    expect(res.length).toBe(3);
    const sum = res.reduce((acc, curr) => acc + curr.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
    expect(res[0].amount).toBe(33.34);
    expect(res[1].amount).toBe(33.33);
    expect(res[2].amount).toBe(33.33);
  });

  it('filters out removed technicians and deduplicates IDs', () => {
    const res = calculateEqualIncentiveSplit(500, [
      { technician_id: 'tech-1', removed_at: null },
      { technician_id: 'tech-2', removed_at: '2026-08-21T00:00:00Z' }, // removed
      { technician_id: 'tech-3', removed_at: null },
      { technician_id: 'tech-1', removed_at: null }, // duplicate
    ]);
    expect(res).toEqual([
      { technician_id: 'tech-1', amount: 250 },
      { technician_id: 'tech-3', amount: 250 },
    ]);
  });
});

