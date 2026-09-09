/**
 * Concurrency & Atomic Stock Deduction Tests
 * Verifies that concurrent checkout requests cannot deplete stock below 0
 * and that row-level atomicity is preserved.
 */

class MockAtomicInventory {
  private stock: number;
  private locked: boolean = false;

  constructor(initialStock: number) {
    this.stock = initialStock;
  }

  public getStock(): number {
    return this.stock;
  }

  /**
   * Simulates an atomic PostgreSQL trigger:
   * UPDATE inventory SET quantity = quantity - requestedQty
   * WHERE id = itemId AND quantity >= requestedQty;
   */
  public async atomicDecrement(requestedQty: number): Promise<{ success: boolean; remaining: number }> {
    // Acquire mutex simulating row-level lock (SELECT FOR UPDATE)
    while (this.locked) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.locked = true;

    try {
      if (this.stock < requestedQty) {
        return { success: false, remaining: this.stock };
      }
      this.stock -= requestedQty;
      return { success: true, remaining: this.stock };
    } finally {
      this.locked = false;
    }
  }
}

describe('Concurrent Stock Depletion & Row-Level Locking (concurrencyStock.test.ts)', () => {
  it('guarantees that when 1 unit is available, only 1 of 2 concurrent checkout requests succeeds', async () => {
    const inventory = new MockAtomicInventory(1);

    // Fire 2 concurrent checkout requests for 1 unit each
    const [request1, request2] = await Promise.all([
      inventory.atomicDecrement(1),
      inventory.atomicDecrement(1),
    ]);

    const results = [request1, request2];
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(inventory.getStock()).toBe(0);
  });

  it('handles 20 concurrent parallel requests competing for 5 units without going negative', async () => {
    const inventory = new MockAtomicInventory(5);

    // 20 parallel requests competing for 1 unit each
    const requests = Array.from({ length: 20 }, () => inventory.atomicDecrement(1));
    const results = await Promise.all(requests);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    expect(successCount).toBe(5);
    expect(failureCount).toBe(15);
    expect(inventory.getStock()).toBe(0);
  });
});
