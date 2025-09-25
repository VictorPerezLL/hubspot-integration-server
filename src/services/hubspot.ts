// import { logger } from '../utils/logger';
// import { createError } from '../middleware/errorHandler';
// import { hubspotClient } from '../clients/hubspot';

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




