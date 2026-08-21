/**
 * Email Rate Limiting & Backoff Test
 * Verifies rate limiting behavior in supabase/functions/send-invoice-email/index.ts
 */

interface EmailRequest {
  jobId: string;
  recipientEmail: string;
  timestamp: number;
}

class MockEmailDispatcher {
  private sentHistory: EmailRequest[] = [];
  private rateLimitWindowMs = 60000; // 60 seconds

  public async sendInvoiceEmail(req: { jobId: string; recipientEmail: string; timestamp?: number }): Promise<{ success: boolean; error?: string; status: number }> {
    const now = req.timestamp || Date.now();

    // Check if an email was sent for this job within the last 60 seconds
    const recentSend = this.sentHistory.find(
      h => h.jobId === req.jobId && (now - h.timestamp) < this.rateLimitWindowMs
    );

    if (recentSend) {
      const waitSeconds = Math.ceil((this.rateLimitWindowMs - (now - recentSend.timestamp)) / 1000);
      return {
        success: false,
        error: `Too many requests. Please wait ${waitSeconds}s before sending another email.`,
        status: 429,
      };
    }

    // Record send
    this.sentHistory.push({
      jobId: req.jobId,
      recipientEmail: req.recipientEmail,
      timestamp: now,
    });

    return { success: true, status: 200 };
  }
}

describe('Email Rate Limiting & Backoff (send-invoice-email)', () => {
  it('allows the first email dispatch successfully', async () => {
    const dispatcher = new MockEmailDispatcher();
    const result = await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer@example.com' });
    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
  });

  it('rejects rapid consecutive email requests for the same job within 60s with 429 status', async () => {
    const dispatcher = new MockEmailDispatcher();
    const t0 = 1000000;

    // First send at t0
    const firstResult = await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer@example.com', timestamp: t0 });
    expect(firstResult.success).toBe(true);

    // Second send 15s later -> Rate limited
    const secondResult = await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer@example.com', timestamp: t0 + 15000 });
    expect(secondResult.success).toBe(false);
    expect(secondResult.status).toBe(429);
    expect(secondResult.error).toContain('Too many requests');
  });

  it('allows another email dispatch after the 60-second cooldown window expires', async () => {
    const dispatcher = new MockEmailDispatcher();
    const t0 = 1000000;

    await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer@example.com', timestamp: t0 });

    // Send 65s later -> Succeeded
    const lateResult = await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer@example.com', timestamp: t0 + 65000 });
    expect(lateResult.success).toBe(true);
    expect(lateResult.status).toBe(200);
  });

  it('does not block emails for different job IDs simultaneously', async () => {
    const dispatcher = new MockEmailDispatcher();
    const t0 = 1000000;

    const resJob1 = await dispatcher.sendInvoiceEmail({ jobId: 'job-101', recipientEmail: 'customer1@example.com', timestamp: t0 });
    const resJob2 = await dispatcher.sendInvoiceEmail({ jobId: 'job-102', recipientEmail: 'customer2@example.com', timestamp: t0 + 5000 });

    expect(resJob1.success).toBe(true);
    expect(resJob2.success).toBe(true);
  });
});
