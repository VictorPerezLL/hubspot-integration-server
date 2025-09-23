import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { validateWebhookSignature } from '../middleware/webhookValidation';
import { WooCommerceWebhookHandler } from '../services/webhooks/woocommerce';
import { StripeWebhookHandler } from '../services/webhooks/stripe';
import { HubSpotService } from '../services/hubspot';

const router = Router();

// Initialize services
const hubspotService = new HubSpotService();
const wooCommerceHandler = new WooCommerceWebhookHandler(hubspotService);
const stripeHandler = new StripeWebhookHandler(hubspotService);

// Generic webhook handler
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.query;
    
    if (!platform) {
      throw createError('Platform parameter is required', 400);
    }

    logger.info(`Received webhook from platform: ${platform}`, {
      platform,
      body: req.body,
      headers: req.headers,
    });

    // Route to appropriate handler based on platform
    switch (platform) {
      case 'woocommerce':
        await wooCommerceHandler.handleWebhook(req, res);
        break;
      case 'stripe':
        await stripeHandler.handleWebhook(req, res);
        break;
      default:
        throw createError(`Unsupported platform: ${platform}`, 400);
    }
  } catch (error) {
    next(error);
  }
});

// WooCommerce specific webhook endpoint
router.post('/woocommerce', validateWebhookSignature, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await wooCommerceHandler.handleWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

// Stripe specific webhook endpoint
router.post('/stripe', validateWebhookSignature, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await stripeHandler.handleWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

// Webhook status endpoint
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is active',
    supportedPlatforms: ['woocommerce', 'stripe'],
    timestamp: new Date().toISOString(),
  });
});

export const webhookRoutes = router; 