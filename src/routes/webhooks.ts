import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { 
  validateWebhookSignature, 
  validateStripeWebhook, 
  validateWooCommerceWebhook, 
  validatePayPalWebhook 
} from '../middleware/webhookValidation';
import { requireWebhookIP, requireAdminIP } from '../middleware/auth';
import { webhookRateLimit, adminRateLimit } from '../middleware/rateLimiting';
import { webhookRegistry, registerWebhook } from '../services/webhooks/registry';
import { handleWooCommerceWebhook } from '../services/webhooks/woocommerce';
import { handleStripeWebhook } from '../services/webhooks/stripe';
import { handlePayPalWebhook } from '../services/webhooks/paypal';

const router = Router();

// Registrar handlers de webhooks
registerWebhook({
  platform: 'woocommerce',
  version: 'v1',
  handle: handleWooCommerceWebhook,
  supportedEvents: ['order.created', 'order.updated', 'customer.created', 'customer.updated'],
});

registerWebhook({
  platform: 'stripe',
  version: 'v1',
  handle: handleStripeWebhook,
  supportedEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'invoice.payment_succeeded',
    'customer.created',
    'customer.updated'
  ],
});

registerWebhook({
  platform: 'paypal',
  version: 'v1',
  handle: handlePayPalWebhook,
  supportedEvents: [
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.DENIED',
    'PAYMENT.CAPTURE.REFUNDED',
    'BILLING.SUBSCRIPTION.CREATED',
    'BILLING.SUBSCRIPTION.ACTIVATED',
    'BILLING.SUBSCRIPTION.CANCELLED'
  ],
});

// Endpoint genérico con detección automática de plataforma
router.post('/', webhookRateLimit, requireWebhookIP, validateWebhookSignature, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = (req as any).webhookPlatform;
    
    if (!platform) {
      throw createError('Unable to detect webhook platform', 400);
    }

    logger.info(`Received webhook from platform: ${platform}`, {
      platform,
      body: req.body,
      headers: req.headers,
    });

    // Obtener handler del registro
    const handler = webhookRegistry.getHandler(platform);
    
    if (!handler) {
      throw createError(`No handler found for platform: ${platform}`, 400);
    }

    // Ejecutar handler
    await handler.handle(req, res);
  } catch (error) {
    next(error);
  }
});

// Endpoints específicos por plataforma con validación dedicada
router.post('/woocommerce', webhookRateLimit, requireWebhookIP, validateWooCommerceWebhook, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handleWooCommerceWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/stripe', webhookRateLimit, requireWebhookIP, validateStripeWebhook, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handleStripeWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/paypal', webhookRateLimit, requireWebhookIP, validatePayPalWebhook, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handlePayPalWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

// Endpoint de estado mejorado (requiere IP whitelist)
router.get('/status', adminRateLimit, requireAdminIP, (_req: Request, res: Response) => {
  const status = webhookRegistry.getStatus();
  
  res.json({
    success: true,
    message: 'Webhook system is active',
    timestamp: new Date().toISOString(),
    ...status,
  });
});

// Endpoint para obtener información de una plataforma específica (requiere IP whitelist)
router.get('/status/:platform', adminRateLimit, requireAdminIP, (req: Request, res: Response): void => {
  const { platform } = req.params;
  
  if (!platform) {
    res.status(400).json({
      success: false,
      message: 'Platform parameter is required',
    });
    return;
  }
  
  const handlers = webhookRegistry.getPlatformHandlers(platform);
  const config = webhookRegistry.getConfig(platform);
  
  if (handlers.length === 0) {
    res.status(404).json({
      success: false,
      message: `Platform ${platform} not found`,
    });
    return;
  }
  
  res.json({
    success: true,
    platform,
    handlers: handlers.map(handler => ({
      version: handler.version,
      supportedEvents: handler.supportedEvents,
    })),
    config: config ? {
      endpoint: config.endpoint,
      enabled: config.enabled,
      retryAttempts: config.retryAttempts,
      timeout: config.timeout,
    } : null,
    timestamp: new Date().toISOString(),
  });
});

export const webhookRoutes = router; 