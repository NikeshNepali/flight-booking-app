import { AppError, ErrorCodes } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import type { BookingsRepository } from '../bookings/bookings.repository.js';
import type { BookingsService } from '../bookings/bookings.service.js';
import { verifyDuffelSignature } from './webhookSignature.js';

interface ParsedEvent {
  id: string;
  type: string;
  liveMode: boolean | null;
  orderId: string | null;
}

/** Extracts the fields we need, tolerating the event being wrapped in "data" or not. */
export function parseDuffelEvent(body: unknown): ParsedEvent | null {
  const root = body as Record<string, unknown> | null;
  const event = (
    root && typeof root.data === 'object' && root.data && 'type' in (root.data as object)
      ? root.data
      : root
  ) as Record<string, unknown> | null;
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') return null;

  const object = (event.object ?? (event.data as Record<string, unknown> | undefined)?.object) as
    Record<string, unknown> | undefined;
  let orderId: string | null = null;
  if (typeof object?.order_id === 'string') orderId = object.order_id;
  else if (typeof object?.id === 'string' && object.id.startsWith('ord_')) orderId = object.id;

  return {
    id: event.id,
    type: event.type,
    liveMode: typeof event.live_mode === 'boolean' ? event.live_mode : null,
    orderId,
  };
}

export function createWebhooksService(deps: {
  secret: string;
  expectedLiveMode: boolean;
  repository: Pick<BookingsRepository, 'hasEvent' | 'recordEvent'>;
  bookings: Pick<BookingsService, 'syncOrder'>;
}) {
  return {
    async handleDuffel(rawBody: Buffer, signature: string | undefined) {
      if (!deps.secret) {
        throw new AppError(
          503,
          ErrorCodes.CONFIG_ERROR,
          'DUFFEL_WEBHOOK_SECRET is not configured.',
        );
      }
      if (!verifyDuffelSignature(rawBody, signature, deps.secret)) {
        throw new AppError(401, ErrorCodes.INVALID_SIGNATURE, 'Invalid webhook signature.');
      }

      let body: unknown;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Webhook body is not valid JSON.');
      }
      const event = parseDuffelEvent(body);
      if (!event)
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Unrecognised webhook payload.');

      if (event.liveMode !== null && event.liveMode !== deps.expectedLiveMode) {
        logger.warn('Ignoring webhook from other mode', { eventId: event.id, type: event.type });
        return { received: true, ignored: 'mode_mismatch' };
      }
      if (await deps.repository.hasEvent(event.id)) {
        return { received: true, duplicate: true };
      }

      // Re-fetch the order rather than trusting the payload: the provider is the source of truth,
      // and syncing is idempotent, so a retried delivery is harmless.
      let bookingId: string | null = null;
      if (event.orderId && (event.type.startsWith('order.') || event.type.startsWith('order_'))) {
        bookingId = await deps.bookings.syncOrder(event.orderId);
      }
      await deps.repository.recordEvent(event.id, event.type, bookingId);
      logger.info('Webhook processed', {
        eventId: event.id,
        type: event.type,
        matched: Boolean(bookingId),
      });
      return { received: true };
    },
  };
}

export type WebhooksService = ReturnType<typeof createWebhooksService>;
