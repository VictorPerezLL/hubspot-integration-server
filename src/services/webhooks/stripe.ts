import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { HubSpotService, ContactData, DealData } from '../hubspot';

export class StripeWebhookHandler {
  private hubspotService: HubSpotService;

  constructor(hubspotService: HubSpotService) {
    this.hubspotService = hubspotService;
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;
      
      logger.info('Processing Stripe webhook', { type });

      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(data.object);
          break;
        case 'customer.created':
        case 'customer.updated':
          await this.handleCustomerEvent(data.object);
          break;
        default:
          logger.warn('Unsupported Stripe webhook type', { type });
      }

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Error processing Stripe webhook', { error, body: req.body });
      res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    try {
      const { id, amount, currency, customer, metadata } = paymentIntent;
      
      logger.info('Processing successful Stripe payment', { 
        paymentIntentId: id, 
        amount, 
        currency 
      });

      // Get customer details if available
      let contactData: ContactData | null = null;
      if (customer) {
        contactData = await this.getCustomerContactData(customer);
      }

      // Create or update contact
      if (contactData) {
        await this.hubspotService.createOrUpdateContact(contactData);
      }

      // Create deal for the payment
      const dealData: DealData = {
        dealname: `Payment ${id} - ${metadata?.description || 'Stripe Payment'}`,
        amount: (amount / 100).toString(), // Convert from cents
        pipeline: 'default',
        dealstage: 'closedwon',
        closedate: new Date().toISOString(),
      };

      await this.hubspotService.createDeal(dealData);

      logger.info('Stripe payment processed successfully', { paymentIntentId: id });
    } catch (error) {
      logger.error('Error processing Stripe payment', { error, paymentIntent });
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    try {
      const { id, amount, currency, customer, last_payment_error } = paymentIntent;
      
      logger.info('Processing failed Stripe payment', { 
        paymentIntentId: id, 
        amount, 
        currency,
        error: last_payment_error?.message 
      });

      // Get customer details if available
      let contactData: ContactData | null = null;
      if (customer) {
        contactData = await this.getCustomerContactData(customer);
      }

      // Create or update contact
      if (contactData) {
        await this.hubspotService.createOrUpdateContact(contactData);
      }

      // Create deal for the failed payment
      const dealData: DealData = {
        dealname: `Failed Payment ${id}`,
        amount: (amount / 100).toString(),
        pipeline: 'default',
        dealstage: 'closedlost',
        closedate: new Date().toISOString(),
      };

      await this.hubspotService.createDeal(dealData);

      logger.info('Stripe failed payment processed', { paymentIntentId: id });
    } catch (error) {
      logger.error('Error processing Stripe failed payment', { error, paymentIntent });
      throw error;
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    try {
      const { id, amount_paid, currency, customer, subscription } = invoice;
      
      logger.info('Processing successful Stripe invoice payment', { 
        invoiceId: id, 
        amountPaid: amount_paid, 
        currency 
      });

      // Get customer details if available
      let contactData: ContactData | null = null;
      if (customer) {
        contactData = await this.getCustomerContactData(customer);
      }

      // Create or update contact
      if (contactData) {
        await this.hubspotService.createOrUpdateContact(contactData);
      }

      // Create deal for the invoice payment
      const dealData: DealData = {
        dealname: `Invoice ${id} - ${subscription ? 'Subscription Payment' : 'One-time Payment'}`,
        amount: (amount_paid / 100).toString(),
        pipeline: 'default',
        dealstage: 'closedwon',
        closedate: new Date().toISOString(),
      };

      await this.hubspotService.createDeal(dealData);

      logger.info('Stripe invoice payment processed successfully', { invoiceId: id });
    } catch (error) {
      logger.error('Error processing Stripe invoice payment', { error, invoice });
      throw error;
    }
  }

  private async handleCustomerEvent(customer: any): Promise<void> {
    try {
      const { id, email, name, phone } = customer;
      
      logger.info('Processing Stripe customer', { customerId: id, email });

      const contactData: ContactData = {
        email,
        firstname: name?.split(' ')[0] || '',
        lastname: name?.split(' ').slice(1).join(' ') || '',
        phone,
      };

      await this.hubspotService.createOrUpdateContact(contactData);

      logger.info('Stripe customer processed successfully', { customerId: id });
    } catch (error) {
      logger.error('Error processing Stripe customer', { error, customer });
      throw error;
    }
  }

  private async getCustomerContactData(customerId: string): Promise<ContactData | null> {
    try {
      // In a real implementation, you would fetch customer details from Stripe API
      // For now, we'll return null and handle it in the calling methods
      logger.info('Would fetch customer details from Stripe API', { customerId });
      return null;
    } catch (error) {
      logger.error('Error fetching customer details from Stripe', { error, customerId });
      return null;
    }
  }
} 