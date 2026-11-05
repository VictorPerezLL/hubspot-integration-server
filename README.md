# HubSpot Integration Server

Node.js server that receives webhooks from ecommerce and payment platforms (like WooCommerce, Stripe, etc.) and syncs them with HubSpot CRM in real-time.

## 🚀 Features

- **Multi-platform Webhook Support**: Handles webhooks from WooCommerce and Stripe
- **Real-time CRM Integration**: Automatically creates/updates contacts, deals, and companies in HubSpot
- **Secure Webhook Processing**: Signature validation for webhook security
- **Comprehensive Logging**: Structured logging with Winston
- **Error Handling**: Robust error handling and recovery
- **Health Monitoring**: Built-in health check endpoints
- **Rate Limiting**: Protection against abuse
- **TypeScript**: Full TypeScript support with strict typing

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- HubSpot API key
- (Optional) Stripe and WooCommerce webhook secrets

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hubspot-integration-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   # HubSpot Configuration
   HS_PRIVATE_APP_KEY=your_hubspot_private_app_key
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 📡 API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information

### Webhooks
- `POST /webhooks?platform=woocommerce` - Generic webhook endpoint
- `POST /webhooks/woocommerce` - WooCommerce specific endpoint
- `POST /webhooks/stripe` - Stripe specific endpoint
- `GET /webhooks/status` - Webhook endpoint status

## 🔎 HubSpot: buscar un contacto por email (incluye borrados/archivados)

Este repo incluye un script de consola para localizar un contacto por email. Es útil cuando el contacto está **archivado (borrado)** y el endpoint de búsqueda estándar no lo devuelve.

### Requisitos

- `HS_PRIVATE_APP_KEY` (token de Private App de HubSpot) en tu `.env`

### Ejemplo

```bash
# Contacto activo
npm run hubspot:find-contact -- --email gabmarion@gmail.com

# Incluir contactos archivados/borrados y traer todas las propiedades
npm run hubspot:find-contact -- --email gabmarion@gmail.com --include-archived --all-properties
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `LOG_LEVEL` | Logging level | No | info |
| `HS_PRIVATE_APP_KEY` | HubSpot API key | Yes | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | No | - |
| `WOOCOMMERCE_WEBHOOK_SECRET` | WooCommerce webhook secret | No | - |

### Webhook Configuration

#### WooCommerce
Configure webhooks in your WooCommerce admin:
- **Topic**: `order.created`, `order.updated`, `customer.created`, `customer.updated`
- **Delivery URL**: `https://your-domain.com/webhooks/woocommerce`

#### Stripe
Configure webhooks in your Stripe dashboard:
- **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.payment_succeeded`
- **Endpoint URL**: `https://your-domain.com/webhooks/stripe`

## 🏗️ Architecture

```
src/
├── index.ts                 # Server entry point
├── middleware/              # Express middleware
│   ├── errorHandler.ts      # Error handling
│   └── webhookValidation.ts # Webhook security
├── routes/                  # API routes
│   ├── health.ts           # Health check endpoints
│   └── webhooks.ts         # Webhook endpoints
├── services/               # Business logic
│   ├── hubspot.ts          # HubSpot CRM integration
│   └── webhooks/           # Platform-specific handlers
│       ├── woocommerce.ts  # WooCommerce webhook handler
│       └── stripe.ts       # Stripe webhook handler
└── utils/                  # Utilities
    └── logger.ts           # Logging configuration
```

## 🔒 Security

- **Webhook Signature Validation**: Validates webhook signatures for security
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **Helmet**: Security headers for Express
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Joi schema validation for webhook data

## 📊 Monitoring

The server includes comprehensive logging and monitoring:

- **Structured Logging**: JSON format logs with timestamps
- **Error Tracking**: Detailed error logging with stack traces
- **Health Checks**: Built-in health monitoring endpoints
- **Performance Metrics**: Request timing and system metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📝 Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project has no license specified.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the logs for error details
- Ensure all environment variables are properly configured
- Verify webhook endpoints are accessible from external services

## 🔄 Roadmap

- [ ] Add support for more ecommerce platforms
- [ ] Add database for webhook event tracking
- [ ] Create admin dashboard for monitoring
- [ ] Add support for custom HubSpot properties mapping
- [ ] Implement webhook event filtering
