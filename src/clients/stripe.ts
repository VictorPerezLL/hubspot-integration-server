import Stripe from 'stripe';
import { env } from '../env';

// Tipos de Stripe
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeCharge = Stripe.Charge;
export type StripeInvoice = Stripe.Invoice;
export type StripeTransfer = Stripe.Transfer;

// Configuración de múltiples cuentas de Stripe
export const stripeClients: Record<string, Stripe> = {
  primary: new Stripe(env.STRIPE_SECRET_KEY),
};

// Agregar cuentas adicionales si están configuradas
// if (env.STRIPE_TEST_SECRET_KEY) {
//   stripeClients.secondary = new Stripe(env.STRIPE_TEST_SECRET_KEY);
// }

// if (env.STRIPE_SECRET_KEY_3) {
//   stripeClients.tertiary = new Stripe(env.STRIPE_SECRET_KEY_3);
// }

// Cliente por defecto
export const stripe = stripeClients['primary'];
export const testStripe = stripeClients['secondary'];

// Tipos para los webhooks
export interface StripeWebhookEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string;
    idempotency_key: string | null;
  };
  type: string;
}