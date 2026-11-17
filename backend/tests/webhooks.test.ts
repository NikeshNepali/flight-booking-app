import { describe, expect, it, vi } from 'vitest';
import { verifyDuffelSignature } from '../src/modules/webhooks/webhookSignature.js';
import {
  createWebhooksService,
  parseDuffelEvent,
} from '../src/modules/webhooks/webhooks.service.js';
import { hmacSha256Hex } from '../src/utils/crypto.js';
import { createMemoryRepository } from './helpers.js';

const SECRET = 'whsec_test';

function sign(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${hmacSha256Hex(SECRET, `${timestamp}.${body}`)}`;
}

describe('verifyDuffelSignature', () => {
  const body = '{"id":"wev_1"}';

  it('accepts a correct signature', () => {
    expect(verifyDuffelSignature(Buffer.from(body), sign(body), SECRET)).toBe(true);
  });
  it('rejects a tampered body, wrong secret or missing header', () => {
    expect(verifyDuffelSignature(Buffer.from(`${body} `), sign(body), SECRET)).toBe(false);
    expect(verifyDuffelSignature(Buffer.from(body), sign(body), 'other')).toBe(false);
    expect(verifyDuffelSignature(Buffer.from(body), undefined, SECRET)).toBe(false);
  });
  it('rejects old timestamps (replay protection)', () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(verifyDuffelSignature(Buffer.from(body), sign(body, old), SECRET)).toBe(false);
  });
});

describe('parseDuffelEvent', () => {
  it('reads order ids from wrapped and unwrapped payloads', () => {
    const event = {
      id: 'wev_1',
      type: 'order.updated',
      live_mode: false,
      data: { object: { id: 'ord_1' } },
    };
    expect(parseDuffelEvent(event)).toMatchObject({ id: 'wev_1', orderId: 'ord_1' });
    expect(
      parseDuffelEvent({ data: { id: 'wev_2', type: 'order.created', object: { id: 'ord_2' } } }),
    ).toMatchObject({
      id: 'wev_2',
      orderId: 'ord_2',
    });
  });
});

describe('webhooks service', () => {
  it('processes each event only once', async () => {
    const repository = createMemoryRepository();
    const syncOrder = vi.fn().mockResolvedValue(null);
    const service = createWebhooksService({
      secret: SECRET,
      expectedLiveMode: false,
      repository,
      bookings: { syncOrder },
    });
    const body = JSON.stringify({
      id: 'wev_9',
      type: 'order.updated',
      live_mode: false,
      data: { object: { id: 'ord_9' } },
    });

    await expect(service.handleDuffel(Buffer.from(body), sign(body))).resolves.toEqual({
      received: true,
    });
    await expect(service.handleDuffel(Buffer.from(body), sign(body))).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(syncOrder).toHaveBeenCalledTimes(1);
    expect(repository.events).toHaveLength(1);
  });

  it('rejects invalid signatures', async () => {
    const service = createWebhooksService({
      secret: SECRET,
      expectedLiveMode: false,
      repository: createMemoryRepository(),
      bookings: { syncOrder: vi.fn() },
    });
    await expect(service.handleDuffel(Buffer.from('{}'), 't=1,v1=abc')).rejects.toMatchObject({
      code: 'INVALID_SIGNATURE',
    });
  });
});
