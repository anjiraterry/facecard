import { describe, it, expect, vi } from 'vitest';
import { logger, scrubImageData } from '@/lib/logger';

describe('Observability & Zero-Image Scrubber (Step 1.5)', () => {
  it('should scrub data:image/jpeg;base64 payloads from strings', () => {
    const raw = 'Processing upload data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD... for user';
    const scrubbed = scrubImageData(raw);
    expect(scrubbed).not.toContain('data:image/jpeg;base64');
    expect(scrubbed).toContain('[REDACTED_IMAGE_DATA]');
  });

  it('should scrub long base64 blobs exceeding 100 characters', () => {
    const longBase64 = 'A'.repeat(120);
    const scrubbed = scrubImageData(`Found payload: ${longBase64}`);
    expect(scrubbed).not.toContain(longBase64);
    expect(scrubbed).toContain('[REDACTED_IMAGE_BLOB]');
  });

  it('should scrub sensitive keys including PINs, passwords, and tokens in objects', () => {
    const payload = {
      userId: 'usr-123',
      pin: '1234',
      token: 'jwt-super-secret-token',
      imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      profile: {
        pinHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      },
    };

    const scrubbed = scrubImageData(payload);
    expect(scrubbed.pin).toBe('[REDACTED_SECRET]');
    expect(scrubbed.token).toBe('[REDACTED_SECRET]');
    expect(scrubbed.imageBase64).toBe('[REDACTED_IMAGE_DATA]');
    expect(scrubbed.profile.pinHash).toBe('[REDACTED_SECRET]');
    expect(scrubbed.userId).toBe('usr-123');
  });

  it('should emit structured JSON log entries without leaking images in logger output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('Scan request received', {
      userId: 'usr-999',
      imagePayload: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });

    expect(spy).toHaveBeenCalled();
    const logCall = spy.mock.calls[0][0];
    const parsed = JSON.parse(logCall);

    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('Scan request received');
    expect(parsed.context.userId).toBe('usr-999');
    expect(parsed.context.imagePayload).toBe('[REDACTED_IMAGE_DATA]');

    spy.mockRestore();
  });
});
