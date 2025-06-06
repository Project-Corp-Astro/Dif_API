# Corp Astro API

Backend API for the Corp Astro mobile app ecosystem, providing subscription management, real-time chat functionality, horoscope services, report generation, and user profile management.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **User Profiles**: User profile management with avatar uploads
- **Subscription Management**: In-app purchase validation and subscription tracking
- **Real-time Chat**: Socket.IO-based chat with AI responses
- **Horoscope Services**: Daily horoscope generation and retrieval
- **Report Generation**: Asynchronous report generation with BullMQ
- **API Documentation**: OpenAPI specification

## Tech Stack

- **Framework**: Express 5 with TypeScript
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with JWT
- **Caching**: Redis
- **Job Queue**: BullMQ
- **File Storage**: Supabase Storage
- **Real-time**: Socket.IO
- **Documentation**: OpenAPI 3.0

## Getting Started

### Prerequisites

- Node.js 16+
- Redis
- Supabase account
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/corp-astro-api.git
cd corp-astro-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `env.example`:
```bash
cp env.example .env
```

4. Update the `.env` file with your credentials.

5. Run database migrations:
```bash
npm run migrate
```

6. Start the development server:
```bash
npm run dev
```

### Using Docker

You can also use Docker Compose to run the API with all its dependencies:

```bash
docker-compose up
```

## API Documentation

The API is documented using OpenAPI 3.0. You can find the specification at `/src/docs/openapi.yaml`.

## Database Migrations

Database migrations are managed via SQL files in the `src/db/migrations` directory. Run migrations with:

```bash
npm run migrate
```

## Project Structure

```
corp-astro-api/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # HTTP server and Socket.IO setup
│   ├── config/                # Configuration files
│   ├── controllers/           # API controllers
│   ├── db/                    # Database migrations and utilities
│   ├── docs/                  # API documentation
│   ├── middlewares/           # Express middlewares
│   ├── routes/                # API routes
│   ├── services/              # Business logic services
│   ├── sockets/               # Socket.IO handlers
│   ├── types/                 # TypeScript type definitions
│   └── workers/               # Background job workers
├── .env                       # Environment variables
├── .env.example               # Example environment variables
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Docker configuration
├── package.json               # Project dependencies
└── tsconfig.json              # TypeScript configuration
```

## Key Components

### Subscription Management

The subscription system supports:
- Monthly, yearly, and lifetime subscription plans
- Receipt validation with Apple/Google stores
- Subscription status tracking
- Secure webhook handling for subscription events with signature verification
- Comprehensive subscription event tracking and history
- Support for both Apple App Store and Google Play Store

### Real-time Chat

The chat system provides:
- Real-time messaging with Socket.IO
- Message history storage and retrieval
- Read receipts
- Typing indicators

### Report Generation

The report generation system:
- Creates personalized astrological reports with detailed interpretations
- Generates professional PDF reports with PDFKit
- Supports multiple report types (natal, compatibility, transit, etc.)
- Processes reports asynchronously with BullMQ and Redis
- Stores reports securely in Supabase Storage
- Provides secure, time-limited download links
- Tracks report generation status and history

### Horoscope Services

The horoscope system:
- Retrieves daily horoscopes for all zodiac signs
- Caches results in Redis for performance
- Provides personalized horoscopes based on birth date

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

## Deployment

The API can be deployed using Docker:

```bash
docker build -t corp-astro-api .
docker run -p 3000:3000 --env-file .env corp-astro-api
```

## Frontend-Backend Interaction

This API interacts with the [Corp Astro Mobile](https://github.com/Project-Corp-Astro/Dif_Mobile) application in the following ways:

1. **Authentication**: Provides JWT tokens and refresh mechanisms for secure user sessions
2. **Data Services**: Delivers user profiles, horoscopes, and reports to the mobile app
3. **WebSockets**: Maintains real-time connections for chat and notifications
4. **Push Notifications**: Sends FCM notifications to registered mobile devices
5. **IAP Verification**: Validates in-app purchase receipts from Apple/Google stores

## Related Repositories

- [Corp Astro Mobile](https://github.com/Project-Corp-Astro/Dif_Mobile) - React Native mobile application

## License

This project is proprietary and confidential.
