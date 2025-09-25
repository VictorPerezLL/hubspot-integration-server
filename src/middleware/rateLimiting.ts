import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { env } from '../env';

// Configuración de rate limiting
const RATE_LIMIT_CONFIG = {
  // Rate limit general (más restrictivo)
  general: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '50'), // 50 requests por ventana
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Rate limit para webhooks (más permisivo)
  webhooks: {
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 webhooks por minuto
    message: {
      success: false,
      message: 'Webhook rate limit exceeded',
      retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting para IPs confiables
    skip: (req: Request) => {
      const { isTrustedIP } = require('./auth');
      return isTrustedIP(req);
    },
  },
  
  // Rate limit para health checks (muy restrictivo)
  health: {
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 health checks por minuto
    message: {
      success: false,
      message: 'Health check rate limit exceeded',
      retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Rate limit para endpoints administrativos (muy restrictivo)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // 20 requests por 15 minutos
    message: {
      success: false,
      message: 'Admin endpoint rate limit exceeded',
      retryAfter: 900,
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
} as const;

// Función helper para logging de rate limiting
const logRateLimit = (req: Request, res: Response, limitType: string) => {
  logger.warn(`Rate limit exceeded for ${limitType}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    limitType,
    limit: res.get('X-RateLimit-Limit'),
    remaining: res.get('X-RateLimit-Remaining'),
    reset: res.get('X-RateLimit-Reset'),
  });
};

// Rate limiter general
export const generalRateLimit = rateLimit({
  ...RATE_LIMIT_CONFIG.general,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, res, 'general');
    res.status(429).json(RATE_LIMIT_CONFIG.general.message);
  },
});

// Rate limiter para webhooks
export const webhookRateLimit = rateLimit({
  ...RATE_LIMIT_CONFIG.webhooks,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, res, 'webhook');
    res.status(429).json(RATE_LIMIT_CONFIG.webhooks.message);
  },
});

// Rate limiter para health checks
export const healthRateLimit = rateLimit({
  ...RATE_LIMIT_CONFIG.health,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, res, 'health');
    res.status(429).json(RATE_LIMIT_CONFIG.health.message);
  },
});

// Rate limiter para endpoints administrativos
export const adminRateLimit = rateLimit({
  ...RATE_LIMIT_CONFIG.admin,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, res, 'admin');
    res.status(429).json(RATE_LIMIT_CONFIG.admin.message);
  },
});

// Rate limiter estricto para endpoints sensibles
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 requests por minuto
  message: {
    success: false,
    message: 'Strict rate limit exceeded',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimit(req, res, 'strict');
    res.status(429).json({
      success: false,
      message: 'Strict rate limit exceeded',
      retryAfter: 60,
    });
  },
});

// Rate limiter por IP específica (para casos especiales)
export const createIPRateLimit = (ip: string, max: number, windowMs: number) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      return clientIP === ip ? ip : 'default';
    },
    message: {
      success: false,
      message: 'IP-specific rate limit exceeded',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
