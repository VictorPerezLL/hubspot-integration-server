import { Client } from '@hubspot/api-client';
import { env } from '../env';

export const hubspotClient = new Client({ accessToken: env.HS_PRIVATE_APP_KEY });
