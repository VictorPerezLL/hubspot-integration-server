import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { env } from '../env';

// Configuración del cliente de WooCommerce por defecto
export const wooClientFR = new WooCommerceRestApi({
  url: env.FR_WOO_BASE_URL,
  consumerKey: env.FR_WOO_CONSUMER_KEY,
  consumerSecret: env.FR_WOO_CONSUMER_SECRET,
  version: 'wc/v3', // Versión de la API REST de WooCommerce
  queryStringAuth: true, // Usar autenticación en query string para mayor compatibilidad
});

export const wooClientDE = new WooCommerceRestApi({
  url: env.DE_WOO_BASE_URL,
  consumerKey: env.DE_WOO_CONSUMER_KEY,
  consumerSecret: env.DE_WOO_CONSUMER_SECRET,
  version: 'wc/v3', // Versión de la API REST de WooCommerce
  queryStringAuth: true, // Usar autenticación en query string para mayor compatibilidad
});

export const wooClientINT = new WooCommerceRestApi({
  url: env.INT_WOO_BASE_URL,
  consumerKey: env.INT_WOO_CONSUMER_KEY,
  consumerSecret: env.INT_WOO_CONSUMER_SECRET,
  version: 'wc/v3', // Versión de la API REST de WooCommerce
  queryStringAuth: true, // Usar autenticación en query string para mayor compatibilidad
});

// Factory function para crear clientes de WooCommerce para diferentes sitios
export function createWooClient(config: {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: 'wc/v3' | 'wc/v2' | 'wc/v1';
  queryStringAuth?: boolean;
}) {
  return new WooCommerceRestApi({
    url: config.url,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    version: config.version || 'wc/v3',
    queryStringAuth: config.queryStringAuth !== false, // Por defecto true
  });
}

// Cliente para múltiples sitios (si tienes varias tiendas)
export const wooClients = {
  fr: wooClientFR,
  de: wooClientDE,
  int: wooClientINT,
  // Puedes agregar más clientes aquí:
  // store1: createWooClient({
  //   url: 'https://store1.com',
  //   consumerKey: 'ck_store1_key',
  //   consumerSecret: 'cs_store1_secret'
  // }),
  // store2: createWooClient({
  //   url: 'https://store2.com', 
  //   consumerKey: 'ck_store2_key',
  //   consumerSecret: 'cs_store2_secret'
  // })
};

// Interfaces deducidas de las respuestas completas de la API REST de WooCommerce

export interface WooProductFull {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  brands: any[];
  tags: any[];
  images: Array<{
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: any[];
  default_attributes: any[];
  variations: any[];
  grouped_products: any[];
  menu_order: number;
  price_html: string;
  related_ids: number[];
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
  stock_status: string;
  has_options: boolean;
  post_password: string;
  global_unique_id: string;
  _links: {
    self: Array<{
      href: string;
      targetHints?: {
        allow: string[];
      };
    }>;
    collection: Array<{ href: string }>;
  };
}

export interface WooOrderFull {
  id: number;
  parent_id: number;
  status: string;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone?: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_paid: string | null;
  cart_hash: string;
  number: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: any[];
    meta_data: any[];
    sku: string;
    price: number;
    image?: {
      id: string;
      src: string;
    };
    parent_name?: string | null;
  }>;
  tax_lines: any[];
  shipping_lines: any[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  payment_url: string;
  is_editable: boolean;
  needs_payment: boolean;
  needs_processing: boolean;
  date_created_gmt: string;
  date_modified_gmt: string;
  date_completed_gmt: string | null;
  date_paid_gmt: string | null;
  currency_symbol: string;
  _links: {
    self: Array<{
      href: string;
      targetHints?: {
        allow: string[];
      };
    }>;
    collection: Array<{ href: string }>;
    email_templates?: Array<{ embeddable: boolean; href: string }>;
    customer?: Array<{ href: string }>;
  };
}

export interface WooCategoryFull {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: null | {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  };
  menu_order: number;
  count: number;
  _links: {
    self: Array<{
      href: string;
      targetHints?: {
        allow: string[];
      };
    }>;
    collection: Array<{ href: string }>;
  };
}

// Tipos básicos para WooCommerce
export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  images: WooImage[];
  categories: WooCategory[];
  tags: WooTag[];
  attributes: WooAttribute[];
  variations: number[];
  menu_order: number;
  meta_data: WooMetaData[];
}

export interface WooOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: WooAddress;
  shipping: WooAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string;
  date_completed: string;
  cart_hash: string;
  meta_data: WooMetaData[];
  line_items: WooLineItem[];
  tax_lines: WooTaxLine[];
  shipping_lines: WooShippingLine[];
  fee_lines: WooFeeLine[];
  coupon_lines: WooCouponLine[];
  refunds: WooRefund[];
}

export interface WooCustomer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooAddress;
  shipping: WooAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: WooMetaData[];
}

export interface WooImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: WooImage | null;
  menu_order: number;
  count: number;
}

export interface WooTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface WooAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooMetaData {
  id: number;
  key: string;
  value: any;
}

export interface WooAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: WooMetaData[];
  sku: string;
  price: number;
}

export interface WooTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data: WooMetaData[];
}

export interface WooShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: WooMetaData[];
}

export interface WooFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: WooMetaData[];
}

export interface WooCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: WooMetaData[];
}

export interface WooRefund {
  id: number;
  reason: string;
  total: string;
}
