import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';
import { env } from '../env';

// Tipos para validación de webhooks
interface ValidationResult {
  isValid: boolean;
  error?: string | undefined;
  platform?: string | undefined;
}

// Configuración de validación por plataforma
const VALIDATION_CONFIG = {
  stripe: {
    header: 'stripe-signature',
    algorithm: 'sha256',
    tolerance: 300, // 5 minutos
  },
  woocommerce: {
    header: 'x-wc-webhook-signature',
    algorithm: 'sha256',
  },
  paypal: {
    header: 'paypal-transmission-id',
    algorithm: 'sha256',
  },
} as const;

// Función principal de validación
export const validateWebhookSignature = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const platform = detectPlatform(req);
    
    if (!platform) {
      logger.warn('Unable to detect webhook platform', {
        headers: req.headers,
        url: req.url,
      });
      throw createError('Unable to detect webhook platform', 400);
    }

    // En desarrollo, saltar validación si está configurado
    if (env.NODE_ENV === 'development') {
      logger.info('Skipping webhook signature validation in development mode', { platform });
      return next();
    }

    const validationResult = validatePlatformSignature(req, platform);
    
    if (!validationResult.isValid) {
      logger.warn('Invalid webhook signature', {
        platform,
        error: validationResult.error,
        signature: req.headers[VALIDATION_CONFIG[platform as keyof typeof VALIDATION_CONFIG]?.header],
        url: req.url,
        ip: req.ip,
      });
      throw createError(`Invalid webhook signature: ${validationResult.error}`, 401);
    }

    // Agregar información de la plataforma al request
    (req as any).webhookPlatform = platform;
    logger.info('Webhook signature validated successfully', { platform });
    
    next();
  } catch (error) {
    next(error);
  }
};
function detectSiteName(url: string): string {
  if (url.includes('/fr')) return 'FR';
  if (url.includes('/de')) return 'DE';
  if (url.includes('/int')) return 'INT';
  return 'unknown';
}
// Detectar plataforma basada en headers y URL
function detectPlatform(req: Request): string | null {
  const url = req.url.toLowerCase();
  const headers = req.headers;
  
  // Detectar por URL específica
  if (url.includes('/stripe')) return 'stripe';
  if (url.includes('/woocommerce')) return 'woocommerce';
  if (url.includes('/paypal')) return 'paypal';
  
  // Detectar por headers característicos
  if (headers['stripe-signature']) return 'stripe';
  if (headers['x-wc-webhook-signature']) return 'woocommerce';
  if (headers['paypal-transmission-id']) return 'paypal';
  
  // Detectar por query parameter
  const platform = req.query['platform'] as string;
  if (platform && ['stripe', 'woocommerce', 'paypal'].includes(platform)) {
    return platform;
  }
  
  return null;
}

// Validar firma específica de plataforma
function validatePlatformSignature(req: Request, platform: string): ValidationResult {
  const config = VALIDATION_CONFIG[platform as keyof typeof VALIDATION_CONFIG];
  
  if (!config) {
    return { isValid: false, error: `Unsupported platform: ${platform}` };
  }

  const signature = req.headers[config.header] as string;
  if (!signature) {
    return { isValid: false, error: `Missing ${config.header} header` };
  }

  const body = getRawBody(req);
  if (!body) {
    return { isValid: false, error: 'Unable to get request body' };
  }

  switch (platform) {
    case 'stripe':
      return validateStripeSignature(body, signature);
    case 'woocommerce':
      const siteName = detectSiteName(req.url);
      return validateWooCommerceSignature(body, signature, siteName);
    // case 'paypal':
    //   return validatePayPalSignature(body, signature, req);
    default:
      return { isValid: false, error: `Unknown platform: ${platform}` };
  }
}

// Obtener body raw para validación
function getRawBody(req: Request): string | null {
  try {
    return JSON.stringify(req.body);
  } catch (error) {
    logger.error('Error getting raw body for webhook validation', { error });
    return null;
  }
}

// Validación específica de Stripe
function validateStripeSignature(body: string, signature: string): ValidationResult {
  try {
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { isValid: false, error: 'Stripe webhook secret not configured' };
    }

    const elements = signature.split(',');
    const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
    const v1 = elements.find(el => el.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !v1) {
      return { isValid: false, error: 'Invalid Stripe signature format' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(timestamp + '.' + body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return { isValid, error: isValid ? undefined : 'Invalid Stripe signature' };
  } catch (error) {
    return { isValid: false, error: `Stripe validation error: ${error}` };
  }
}

// Validación específica de WooCommerce
function validateWooCommerceSignature(body: string, signature: string, siteName: string): ValidationResult {
  let webhookSecret: string | undefined;
  switch (siteName) {
    case 'FR':
      webhookSecret = env.FR_WOO_CONSUMER_SECRET;
      break;
    case 'DE':
      webhookSecret = env.DE_WOO_CONSUMER_SECRET;
      break;
    case 'INT':
      webhookSecret = env.INT_WOO_CONSUMER_SECRET;
      break;
    default:
      siteName = 'unknown';
      return { isValid: false, error: `WooCommerce ${siteName} webhook secret not configured` };
    }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return { 
      isValid, 
      error: isValid ? undefined : `Invalid WooCommerce ${siteName} signature` 
    };
  } catch (error) {
    return { isValid: false, error: `WooCommerce validation error: ${error}` };
  }
}

// Validación específica de PayPal
// function validatePayPalSignature(body: string, signature: string, req: Request): ValidationResult {
//   try {
//     const webhookSecret = env.PAYPAL_WEBHOOK_SECRET;
//     if (!webhookSecret) {
//       return { isValid: false, error: 'PayPal webhook secret not configured' };
//     }

//     // PayPal usa un sistema de validación más complejo
//     // que incluye verificación de certificados
//     const transmissionId = req.headers['paypal-transmission-id'] as string;
//     const certId = req.headers['paypal-cert-id'] as string;
//     const authAlgo = req.headers['paypal-auth-algo'] as string;
//     const transmissionSig = req.headers['paypal-transmission-sig'] as string;
//     const transmissionTime = req.headers['paypal-transmission-time'] as string;

//     if (!transmissionId || !certId || !authAlgo || !transmissionSig || !transmissionTime) {
//       return { isValid: false, error: 'Missing required PayPal headers' };
//     }

//     // En un entorno de producción, aquí verificarías el certificado
//     // y la firma usando la API de PayPal
//     // Por ahora, validación básica
//     const expectedSignature = crypto
//       .createHmac('sha256', webhookSecret)
//       .update(body + transmissionId + transmissionTime)
//       .digest('hex');

//     const isValid = crypto.timingSafeEqual(
//       Buffer.from(transmissionSig, 'hex'),
//       Buffer.from(expectedSignature, 'hex')
//     );

//     return { isValid, error: isValid ? undefined : 'Invalid PayPal signature' };
//   } catch (error) {
//     return { isValid: false, error: `PayPal validation error: ${error}` };
//   }
// }

// Middleware específico para cada plataforma
export const validateStripeWebhook = (req: Request, res: Response, next: NextFunction) => {
  (req as any).webhookPlatform = 'stripe';
  validateWebhookSignature(req, res, next);
};

export const validateWooCommerceWebhook = (req: Request, res: Response, next: NextFunction) => {
  (req as any).webhookPlatform = 'woocommerce';
  validateWebhookSignature(req, res, next);
};

export const validatePayPalWebhook = (req: Request, res: Response, next: NextFunction) => {
  (req as any).webhookPlatform = 'paypal';
  validateWebhookSignature(req, res, next);
};