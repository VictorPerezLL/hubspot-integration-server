import { z } from "zod";
import dotenv from 'dotenv';

dotenv.config();

if (typeof window != "undefined") {
  throw new Error("This module should only be imported on the server");
}

const envSchema = z.object({
  HS_BASE_URL: z.url(),
  HS_PRIVATE_APP_KEY: z.string(),
  HS_TEST_PRIVATE_APP_KEY: z.string(),
  // Stripe configuration
  STRIPE_TEST_SECRET_KEY: z.string(),
  STRIPE_TEST_WEBHOOK_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY_2: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_2: z.string().optional(),
  STRIPE_SECRET_KEY_3: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_3: z.string().optional(),
  //WooCommerce
  FR_WOO_CONSUMER_KEY: z.string(),
  FR_WOO_CONSUMER_SECRET: z.string(),
  FR_WOO_BASE_URL: z.url(),

  DE_WOO_CONSUMER_KEY: z.string(),
  DE_WOO_CONSUMER_SECRET: z.string(),
  DE_WOO_BASE_URL: z.url(),

  INT_WOO_CONSUMER_KEY: z.string(),
  INT_WOO_CONSUMER_SECRET: z.string(),
  INT_WOO_BASE_URL: z.url(),
  // Server configuration
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  // Security configuration - IP Whitelist
  ALLOWED_WEBHOOK_IPS: z.string().optional(),
  ALLOWED_ADMIN_IPS: z.string().optional(),
  TRUSTED_IPS: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
});

const result = envSchema.safeParse(process.env as Record<string, string>);

if (!result.success) {
  throw new Error("Invalid environment variables");
}

const env = result.data;
export { env };