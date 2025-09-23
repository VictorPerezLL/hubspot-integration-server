import { Router, Request, Response } from 'express';
import { env } from '../env';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

router.get('/detailed', (_req: Request, res: Response) => {
  const healthCheck = {
    success: true,
    message: 'Detailed health check',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    version: process.version,
    platform: process.platform,
  };

  res.json(healthCheck);
});

export const healthRoutes = router;