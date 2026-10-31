/**
 * Test Suite: Unified Push Notification Dispatcher & Payload Builders
 */

describe('Unified Push Notification Infrastructure', () => {
  // 1. Token Validation Logic
  describe('isValidExpoPushToken', () => {
    function isValidExpoPushToken(token?: string | null): boolean {
      if (!token || typeof token !== 'string') return false;
      const trimmed = token.trim();
      return (
        /^(Expo|Exponent)PushToken\[[a-zA-Z0-9_\-\.]+\]$/.test(trimmed) ||
        trimmed.startsWith('ExpoPushToken[') ||
        trimmed.startsWith('ExponentPushToken[')
      );
    }

    it('validates standard modern Expo push tokens', () => {
      expect(isValidExpoPushToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
      expect(isValidExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
      expect(isValidExpoPushToken('ExpoPushToken[AbC_123.xyz-99]')).toBe(true);
    });

    it('rejects invalid or empty tokens', () => {
      expect(isValidExpoPushToken('')).toBe(false);
      expect(isValidExpoPushToken(null)).toBe(false);
      expect(isValidExpoPushToken(undefined)).toBe(false);
      expect(isValidExpoPushToken('fcm_device_token_raw_string')).toBe(false);
      expect(isValidExpoPushToken('InvalidPrefix[123]')).toBe(false);
    });
  });

  // 2. Base64URL Key Converter for Web Push
  describe('urlBase64ToUint8Array', () => {
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = Buffer.from(base64, 'base64').toString('binary');
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    it('properly converts base64url VAPID public key into Uint8Array', () => {
      const vapidPublic = 'BJti9LStmps1ap93J9kfIs4l-_IHMFo51ZawFtUdvFBCvTngCuM8x3lESXu3Au7yRD-8_BDl8GL4p3SAqIPglbg';
      const arr = urlBase64ToUint8Array(vapidPublic);
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBe(65); // Standard NIST P-256 uncompressed public key length (0x04 + 64 bytes)
      expect(arr[0]).toBe(4); // 0x04 uncompressed prefix
    });
  });

  // 3. Android / Native Payload Builder
  describe('Expo Native Payload Builder', () => {
    function buildExpoPayload({
      to,
      title,
      body,
      jobId,
      data,
    }: {
      to: string;
      title: string;
      body: string;
      jobId?: string;
      data?: Record<string, any>;
    }) {
      return {
        to: to.trim(),
        sound: 'default',
        priority: 'high',
        title: title || 'RepairShop',
        body,
        data: { jobId: jobId || null, ...(data || {}) },
        channelId: 'default',
      };
    }

    it('builds a compliant Expo push payload with channelId and priority', () => {
      const payload = buildExpoPayload({
        to: 'ExpoPushToken[1234567890abcdef]',
        title: 'New Job Assigned',
        body: 'Job DS-2026-0074 has been assigned to you.',
        jobId: 'job-uuid-123',
        data: { priority: 'Urgent', screen: 'UpdateWork' },
      });

      expect(payload.to).toBe('ExpoPushToken[1234567890abcdef]');
      expect(payload.priority).toBe('high');
      expect(payload.channelId).toBe('default');
      expect(payload.sound).toBe('default');
      expect(payload.data.jobId).toBe('job-uuid-123');
      expect(payload.data.screen).toBe('UpdateWork');
    });
  });

  // 4. Web Push Payload Builder
  describe('Web Push Payload Builder', () => {
    function buildWebPushPayload({
      title,
      body,
      jobId,
      data,
    }: {
      title: string;
      body: string;
      jobId?: string;
      data?: Record<string, any>;
    }) {
      return JSON.stringify({
        title: title || 'Digital Solution',
        body,
        icon: '/assets/icon.png',
        badge: '/assets/icon.png',
        data: {
          jobId: jobId || null,
          url: jobId ? `/jobs/${jobId}` : '/',
          ...(data || {}),
        },
      });
    }

    it('constructs valid Web Push JSON payload for Safari/Chrome', () => {
      const raw = buildWebPushPayload({
        title: 'Urgent Repair',
        body: 'Job DS-2026-0074 status changed to In Progress.',
        jobId: 'job-uuid-0074',
      });

      const parsed = JSON.parse(raw);
      expect(parsed.title).toBe('Urgent Repair');
      expect(parsed.body).toContain('DS-2026-0074');
      expect(parsed.icon).toBe('/assets/icon.png');
      expect(parsed.data.url).toBe('/jobs/job-uuid-0074');
    });
  });

  // 5. Dead Token Pruning Logic
  describe('Token Pruning Logic', () => {
    function shouldPruneToken(providerError: string | number): boolean {
      if (typeof providerError === 'number') {
        return providerError === 404 || providerError === 410;
      }
      return providerError === 'DeviceNotRegistered' || providerError === 'InvalidCredentials';
    }

    it('identifies dead tokens from Expo and Web Push errors', () => {
      expect(shouldPruneToken('DeviceNotRegistered')).toBe(true);
      expect(shouldPruneToken(410)).toBe(true); // HTTP 410 Gone
      expect(shouldPruneToken(404)).toBe(true); // HTTP 404 Not Found
      expect(shouldPruneToken('MessageTooBig')).toBe(false);
      expect(shouldPruneToken(500)).toBe(false);
    });
  });
});

