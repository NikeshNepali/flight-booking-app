import express, { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../utils/http.js';
import type { WebhooksService } from './webhooks.service.js';

export function createWebhooksRouter(service: WebhooksService) {
  const router = Router();
  // Signature verification needs the exact raw bytes, so this route uses express.raw().
  router.post(
    '/webhooks/duffel',
    express.raw({ type: 'application/json', limit: '1mb' }),
    asyncHandler(async (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const result = await service.handleDuffel(rawBody, req.header('x-duffel-signature'));
      sendSuccess(res, result);
    }),
  );
  return router;
}
