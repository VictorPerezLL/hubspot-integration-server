import { Client } from '@hubspot/api-client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { env } from '../env';

export interface ContactData {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  [key: string]: any;
}

export interface DealData {
  dealname: string;
  amount: string;
  pipeline: string;
  dealstage: string;
  closedate?: string;
  [key: string]: any;
}

export interface CompanyData {
  name: string;
  domain?: string;
  phone?: string;
  [key: string]: any;
}

export class HubSpotService {
  private client: Client;

  constructor() {
    const apiKey = env.HS_PRIVATE_APP_KEY || 'test-key-for-development';
    if (!apiKey) {
      throw new Error('HS_PRIVATE_APP_KEY environment variable is required');
    }
    
    this.client = new Client({ accessToken: apiKey });
  }

  async createOrUpdateContact(contactData: ContactData): Promise<any> {
    try {
      logger.info('Creating/updating contact in HubSpot', { email: contactData.email });
      
      const properties = {
        email: contactData.email,
        firstname: contactData.firstname,
        lastname: contactData.lastname,
        phone: contactData.phone,
        company: contactData.company,
      };

      const response = await this.client.crm.contacts.basicApi.create({ properties });
      
      logger.info('Contact created/updated successfully', { 
        contactId: response.id,
        email: contactData.email 
      });
      
      return response;
    } catch (error) {
      logger.error('Error creating/updating contact', { error, contactData });
      throw createError('Failed to create/update contact in HubSpot', 500);
    }
  }

  async createDeal(dealData: DealData, contactId?: string): Promise<any> {
    try {
      logger.info('Creating deal in HubSpot', { dealname: dealData.dealname });
      
      const properties = {
        dealname: dealData.dealname,
        amount: dealData.amount,
        pipeline: dealData.pipeline,
        dealstage: dealData.dealstage,
        closedate: dealData.closedate || new Date().toISOString(),
      };

      const response = await this.client.crm.deals.basicApi.create({ properties });
      
      // Associate deal with contact if contactId is provided
      if (contactId) {
        await this.associateDealWithContact(response.id, contactId);
      }
      
      logger.info('Deal created successfully', { 
        dealId: response.id,
        dealname: dealData.dealname 
      });
      
      return response;
    } catch (error) {
      logger.error('Error creating deal', { error, dealData });
      throw createError('Failed to create deal in HubSpot', 500);
    }
  }

  async createOrUpdateCompany(companyData: CompanyData): Promise<any> {
    try {
      logger.info('Creating/updating company in HubSpot', { name: companyData.name });
      
      const properties = {
        name: companyData.name,
        domain: companyData.domain,
        phone: companyData.phone,
      };

      const response = await this.client.crm.companies.basicApi.create({ properties });
      
      logger.info('Company created/updated successfully', { 
        companyId: response.id,
        name: companyData.name 
      });
      
      return response;
    } catch (error) {
      logger.error('Error creating/updating company', { error, companyData });
      throw createError('Failed to create/update company in HubSpot', 500);
    }
  }

  private async associateDealWithContact(dealId: string, contactId: string): Promise<void> {
    try {
      await this.client.crm.deals.associationsApi.create(
        dealId,
        'contacts',
        contactId,
        'deal_to_contact'
      );
      
      logger.info('Deal associated with contact', { dealId, contactId });
    } catch (error) {
      logger.error('Error associating deal with contact', { error, dealId, contactId });
      // Don't throw error here as the deal was created successfully
    }
  }

  async getContactByEmail(email: string): Promise<any | null> {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email,
          }],
        }],
        properties: ['email', 'firstname', 'lastname', 'phone', 'company'],
        limit: 1,
      });

      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      logger.error('Error searching for contact', { error, email });
      return null;
    }
  }

  async updateDealStage(dealId: string, stage: string): Promise<void> {
    try {
      await this.client.crm.deals.basicApi.update(dealId, {
        properties: { dealstage: stage },
      });
      
      logger.info('Deal stage updated', { dealId, stage });
    } catch (error) {
      logger.error('Error updating deal stage', { error, dealId, stage });
      throw createError('Failed to update deal stage', 500);
    }
  }
} 