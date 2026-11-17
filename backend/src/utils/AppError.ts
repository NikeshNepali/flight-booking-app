/** An error that is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFIG_ERROR: 'CONFIG_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  PRICE_CHANGED: 'PRICE_CHANGED',
  INVALID_PASSENGERS: 'INVALID_PASSENGERS',
  BOOKING_FAILED: 'BOOKING_FAILED',
  BOOKING_IN_PROGRESS: 'BOOKING_IN_PROGRESS',
  BOOKINGS_DISABLED: 'BOOKINGS_DISABLED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
