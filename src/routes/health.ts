import { Router, Request, Response } from 'express';
import { env } from '../env';
import { performHealthCheck } from '../services/healthCheck';
import { logger } from '../utils/logger';
import { requireAdminIP } from '../middleware/auth';
import { healthRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Tipos para respuestas de health
interface BasicHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface DetailedHealthResponse extends BasicHealthResponse {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  pid: number;
  version: string;
  platform: string;
  clients: Array<{
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    message: string;
    responseTime?: number;
    lastChecked: string;
  }>;
  webhooks: Array<{
    platform: string;
    status: 'active' | 'inactive' | 'error';
    message: string;
    lastChecked: string;
  }>;
}

interface ErrorResponse {
  success: false;
  message: string;
  timestamp: string;
  error?: string;
}

// Función helper para manejo de errores
const handleHealthError = (error: unknown, res: Response, context: string): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`Health check error in ${context}`, { error: errorMessage });
  
  const errorResponse: ErrorResponse = {
    success: false,
    message: `Health check failed: ${context}`,
    timestamp: new Date().toISOString(),
    error: errorMessage,
  };
  
  res.status(503).json(errorResponse);
};

// Función helper para determinar mensaje de estado
const getStatusMessage = (overall: 'healthy' | 'unhealthy' | 'degraded'): string => {
  const messages = {
    healthy: 'All systems operational',
    degraded: 'Some systems degraded',
    unhealthy: 'System unhealthy',
  };
  return messages[overall];
};

// Función helper para determinar código de estado HTTP
const getStatusCode = (overall: 'healthy' | 'unhealthy' | 'degraded'): number => {
  return overall === 'unhealthy' ? 503 : 200;
};

// Endpoint básico de health (público pero con rate limiting)
router.get('/', healthRateLimit, (_req: Request, res: Response) => {
  const response: BasicHealthResponse = {
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  };
  
  res.json(response);
});

// Endpoint detallado de health con verificación de conexiones (requiere IP whitelist)
router.get('/detailed', healthRateLimit, requireAdminIP, async (_req: Request, res: Response) => {
  try {
    const healthCheck = await performHealthCheck();
    const statusCode = getStatusCode(healthCheck.overall);
    
    const response: DetailedHealthResponse = {
      success: healthCheck.overall === 'healthy' || healthCheck.overall === 'degraded',
      message: getStatusMessage(healthCheck.overall),
      overall: healthCheck.overall,
      timestamp: healthCheck.timestamp,
      uptime: healthCheck.uptime,
      environment: healthCheck.environment,
      memory: healthCheck.memory,
      cpu: healthCheck.cpu,
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      clients: healthCheck.clients,
      webhooks: healthCheck.webhooks,
    };
    
    res.status(statusCode).json(response);
  } catch (error) {
    handleHealthError(error, res, 'detailed check');
  }
});

// Endpoint específico para verificar solo las conexiones de clientes (requiere IP whitelist)
router.get('/clients', healthRateLimit, requireAdminIP, async (_req: Request, res: Response) => {
  try {
    const healthCheck = await performHealthCheck();
    const allClientsConnected = healthCheck.clients.every(client => client.status === 'connected');
    const statusCode = allClientsConnected ? 200 : 503;
    
    const response = {
      success: allClientsConnected,
      message: allClientsConnected ? 'All clients connected' : 'Some clients have connection issues',
      clients: healthCheck.clients,
      timestamp: healthCheck.timestamp,
    };
    
    res.status(statusCode).json(response);
  } catch (error) {
    handleHealthError(error, res, 'clients check');
  }
});

// Endpoint específico para verificar solo los webhooks (requiere IP whitelist)
router.get('/webhooks', healthRateLimit, requireAdminIP, async (_req: Request, res: Response) => {
  try {
    const healthCheck = await performHealthCheck();
    
    const response = {
      success: true,
      message: 'Webhook status check completed',
      webhooks: healthCheck.webhooks,
      timestamp: healthCheck.timestamp,
    };
    
    res.status(200).json(response);
  } catch (error) {
    handleHealthError(error, res, 'webhooks check');
  }
});

export const healthRoutes = router;