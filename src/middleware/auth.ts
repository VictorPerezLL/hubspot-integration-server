import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';
import { env } from '../env';

// Configuración de whitelist de IPs
const IP_CONFIG = {
  // IPs permitidas para webhooks
  allowedWebhookIPs: env.ALLOWED_WEBHOOK_IPS?.split(',') || [],
  // IPs permitidas para endpoints administrativos
  allowedAdminIPs: env.ALLOWED_ADMIN_IPS?.split(',') || [],
  // IPs confiables (sin rate limiting)
  trustedIPs: env.TRUSTED_IPS?.split(',') || [],
} as const;

// Middleware de whitelist de IPs para webhooks
export const requireWebhookIP = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Si no hay IPs configuradas, permitir todas (para desarrollo)
    if (IP_CONFIG.allowedWebhookIPs.length === 0) {
      logger.debug('No webhook IP whitelist configured, allowing all IPs');
      return next();
    }

    const clientIP = req.ip ;
    
    if (!clientIP) {
      logger.warn('Unable to determine client IP for webhook validation');
      throw createError('Unable to verify client IP', 400);
    }

    // Verificar si la IP está en la whitelist
    const isAllowed = IP_CONFIG.allowedWebhookIPs.some(allowedIP => {
      // Soporte para rangos CIDR básicos
      if (allowedIP.includes('/')) {
        const cidrBase = allowedIP.split('/')[0];
        return cidrBase && clientIP.startsWith(cidrBase);
      }
      return clientIP === allowedIP;
    });

    if (!isAllowed) {
      logger.warn('Webhook request from unauthorized IP', {
        clientIP,
        allowedIPs: IP_CONFIG.allowedWebhookIPs,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      throw createError('Unauthorized IP address', 403);
    }

    logger.debug('Webhook IP validation successful', { clientIP });
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware de whitelist de IPs para endpoints administrativos
export const requireAdminIP = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Si no hay IPs configuradas, permitir todas (para desarrollo)
    if (IP_CONFIG.allowedAdminIPs.length === 0) {
      logger.debug('No admin IP whitelist configured, allowing all IPs');
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP) {
      logger.warn('Unable to determine client IP for admin validation');
      throw createError('Unable to verify client IP', 400);
    }

    // Verificar si la IP está en la whitelist
    const isAllowed = IP_CONFIG.allowedAdminIPs.some(allowedIP => {
      // Soporte para rangos CIDR básicos
      if (allowedIP.includes('/')) {
        const cidrBase = allowedIP.split('/')[0];
        return cidrBase && clientIP.startsWith(cidrBase);
      }
      return clientIP === allowedIP;
    });

    if (!isAllowed) {
      logger.warn('Admin request from unauthorized IP', {
        clientIP,
        allowedIPs: IP_CONFIG.allowedAdminIPs,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      throw createError('Unauthorized IP address', 403);
    }

    logger.debug('Admin IP validation successful', { clientIP });
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para verificar si una IP es confiable (sin rate limiting)
export const isTrustedIP = (req: Request): boolean => {
  const clientIP = req.ip ;
  
  if (!clientIP || IP_CONFIG.trustedIPs.length === 0) {
    return false;
  }

  return IP_CONFIG.trustedIPs.some(trustedIP => {
    if (trustedIP.includes('/')) {
      const cidrBase = trustedIP.split('/')[0];
      return cidrBase && clientIP.startsWith(cidrBase);
    }
    return clientIP === trustedIP;
  });
};
