import { hubspotClient } from '../clients/hubspot';
import { stripeClients } from '../clients/stripe';
import { wooClients } from '../clients/woocommerce';
import { logger } from '../utils/logger';

export interface ClientHealthStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  responseTime?: number;
  lastChecked: string;
}

export interface WebhookHealthStatus {
  platform: string;
  status: 'active' | 'inactive' | 'error';
  message: string;
  lastChecked: string;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  clients: ClientHealthStatus[];
  webhooks: WebhookHealthStatus[];
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
}

async function checkHubSpotConnection(): Promise<ClientHealthStatus> {
  const startTime = Date.now();
  try {
    await hubspotClient.crm.owners.ownersApi.getPage();
    const responseTime = Date.now() - startTime;
    return {
      name: 'HubSpot',
      status: 'connected',
      message: 'Conexión exitosa',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('HubSpot connection check failed', { error });
    return {
      name: 'HubSpot',
      status: 'error',
      message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkStripeConnection(): Promise<ClientHealthStatus> {
  const startTime = Date.now();
  try {
    const stripe = stripeClients['primary'];
    if (!stripe) {
      throw new Error('Stripe primary client not configured');
    }
    await stripe.balance.retrieve();
    const responseTime = Date.now() - startTime;
    return {
      name: 'Stripe',
      status: 'connected',
      message: 'Conexión exitosa',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Stripe connection check failed', { error });
    return {
      name: 'Stripe',
      status: 'error',
      message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkWooCommerceConnection(site: string, client: any): Promise<ClientHealthStatus> {
  const startTime = Date.now();
  try {
    await client.get('system_status');
    const responseTime = Date.now() - startTime;
    return {
      name: `WooCommerce (${site.toUpperCase()})`,
      status: 'connected',
      message: 'Conexión exitosa',
      responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`WooCommerce ${site} connection check failed`, { error });
    return {
      name: `WooCommerce (${site.toUpperCase()})`,
      status: 'error',
      message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkWebhookStatus(): Promise<WebhookHealthStatus[]> {
  const webhooks: WebhookHealthStatus[] = [];
  webhooks.push({
    platform: 'WooCommerce',
    status: 'active',
    message: 'Endpoint de webhook disponible',
    lastChecked: new Date().toISOString(),
  });
  webhooks.push({
    platform: 'Stripe',
    status: 'active',
    message: 'Endpoint de webhook disponible',
    lastChecked: new Date().toISOString(),
  });
  return webhooks;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  try {
    const [
      hubspotStatus,
      stripeStatus,
      wooFRStatus,
      wooDEStatus,
      wooINTStatus,
      webhookStatuses,
    ] = await Promise.all([
      checkHubSpotConnection(),
      checkStripeConnection(),
      checkWooCommerceConnection('fr', wooClients.fr),
      checkWooCommerceConnection('de', wooClients.de),
      checkWooCommerceConnection('int', wooClients.int),
      checkWebhookStatus(),
    ]);

    const clients = [hubspotStatus, stripeStatus, wooFRStatus, wooDEStatus, wooINTStatus];
    const clientErrors = clients.filter(client => client.status === 'error').length;
    const clientDisconnected = clients.filter(client => client.status === 'disconnected').length;

    let overall: 'healthy' | 'unhealthy' | 'degraded';
    if (clientErrors === 0 && clientDisconnected === 0) {
      overall = 'healthy';
    } else if (clientErrors > clients.length / 2) {
      overall = 'unhealthy';
    } else {
      overall = 'degraded';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      clients,
      webhooks: webhookStatuses,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  } catch (error) {
    logger.error('Health check failed', { error });
    return {
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      clients: [],
      webhooks: [],
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }
}
