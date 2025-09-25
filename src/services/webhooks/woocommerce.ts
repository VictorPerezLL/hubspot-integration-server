import { Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { createOrUpdateContact, createDeal, ContactData, DealData } from '../hubspot';

export async function handleWooCommerceWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { topic, resource } = req.body;
      
      logger.info('Processing WooCommerce webhook', { topic, resource });

      switch (topic) {
        case 'order.created':
        case 'order.updated':
          await handleWooOrderEvent(req.body);
          break;
        case 'customer.created':
        case 'customer.updated':
          await handleWooCustomerEvent(req.body);
          break;
        default:
          logger.warn('Unsupported WooCommerce webhook topic', { topic });
      }

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Error processing WooCommerce webhook', { error, body: req.body });
      res.status(500).json({ success: false, message: 'Error processing webhook' });
    }
}

async function handleWooOrderEvent(orderData: any): Promise<void> {
    try {
      const { id, billing, total, status, line_items } = orderData;
      
      logger.info('Processing WooCommerce order', { orderId: id, status, total });

      // Create or update contact from billing information
      const contactData: ContactData = {
        email: billing.email,
        firstname: billing.first_name,
        lastname: billing.last_name,
        phone: billing.phone,
        company: billing.company,
      };

      const contact = await createOrUpdateContact(contactData);

      // Create deal for the order
      const dealData: DealData = {
        dealname: `Order #${id} - ${billing.first_name} ${billing.last_name}`,
        amount: total,
        pipeline: 'default',
        dealstage: mapOrderStatusToDealStage(status),
        closedate: new Date().toISOString(),
      };

      await createDeal(dealData, contact.id);

      logger.info('WooCommerce order processed successfully', { 
        orderId: id, 
        contactId: contact.id 
      });
    } catch (error) {
      logger.error('Error processing WooCommerce order', { error, orderData });
      throw error;
    }
}

async function handleWooCustomerEvent(customerData: any): Promise<void> {
    try {
      const { id, email, first_name, last_name, billing } = customerData;
      
      logger.info('Processing WooCommerce customer', { customerId: id, email });

      const contactData: ContactData = {
        email,
        firstname: first_name,
        lastname: last_name,
        phone: billing?.phone,
        company: billing?.company,
      };

      await createOrUpdateContact(contactData);

      logger.info('WooCommerce customer processed successfully', { customerId: id });
    } catch (error) {
      logger.error('Error processing WooCommerce customer', { error, customerData });
      throw error;
    }
}

function mapOrderStatusToDealStage(status: string): string {
  const statusMapping: { [key: string]: string } = {
    'pending': 'appointmentscheduled',
    'processing': 'qualifiedtobuy',
    'on-hold': 'presentationscheduled',
    'completed': 'closedwon',
    'cancelled': 'closedlost',
    'refunded': 'closedlost',
    'failed': 'closedlost',
  };

  return statusMapping[status] || 'appointmentscheduled';
}