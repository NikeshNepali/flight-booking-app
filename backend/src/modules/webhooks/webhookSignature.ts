import { hmacSha256Hex, safeEqualHex } from '../../utils/crypto.js';

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Duffel webhook signature.
 * Header format: "X-Duffel-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>",
 * where the HMAC is computed with the webhook secret over "<t>.<raw request body>".
 * Docs: https://duffel.com/docs/guides/receiving-webhooks
 */
export function verifyDuffelSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  if (!header || !secret) return false;
  const parts = new Map(
    header.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key ?? '', rest.join('=')] as const;
    }),
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!timestamp || !signature || !/^\d+$/.test(timestamp) || !/^[0-9a-f]+$/i.test(signature))
    return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) return false;

  const expected = hmacSha256Hex(secret, Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]));
  return safeEqualHex(expected, signature.toLowerCase());
}
