# HabitFlow Authentication Service

Authentication and User Management microservice for the HabitFlow habit tracking application.

## Features

- ✅ User Registration & Login with JWT
- ✅ Google Calendar OAuth Integration
- ✅ Session Management with Redis
- ✅ Rate Limiting & CSRF Protection
- ✅ Password Hashing with bcrypt
- ✅ TypeORM with PostgreSQL
- ✅ RESTful API with NestJS
- ✅ Dockerized Development Environment

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** & **Docker Compose** (optional, for containerized setup)
- **PostgreSQL** 15.x (if running locally without Docker)
- **Redis** 7.x (if running locally without Docker)

## Installation

### Option 1: Local Development (Without Docker)

1. **Clone the repository:**
   ```bash
   cd /path/to/habitflow-auth-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Ensure PostgreSQL and Redis are running locally**

5. **Run database migrations:**
   ```bash
   npm run migration:run
   ```

6. **Start the development server:**
   ```bash
   npm run start:dev
   ```

   The API will be available at `http://localhost:3000`

### Option 2: Docker Development (Recommended)

1. **Ensure Docker and Docker Compose are installed**

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work with Docker Compose)
   ```

3. **Start all services:**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL on port 5432
   - Redis on port 6379
   - Auth Service on port 3000

4. **Run migrations in the container:**
   ```bash
   docker-compose exec app npm run migration:run
   ```

## Available Scripts

```bash
# Development
npm run start          # Start with ts-node
npm run start:dev      # Start with hot-reload (ts-node-dev)
npm run start:prod     # Start production build

# Building
npm run build          # Compile TypeScript to JavaScript

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:e2e       # Run end-to-end tests

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format code with Prettier

# Database
npm run migration:generate  # Generate a new migration
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration
npm run seed                # Seed database with sample data
npm run db:reset            # Reset database (WARNING: Deletes all data)
```

## Environment Variables

See `.env.example` for all available configuration options.

### Application Configuration
- `NODE_ENV`: Environment (`development`, `production`, or `test`)
- `PORT`: Server port (default: `3000`)
- `APP_URL`: Application base URL

### Database (PostgreSQL)
- `DATABASE_HOST`: PostgreSQL host (default: `localhost`)
- `DATABASE_PORT`: PostgreSQL port (default: `5432`)
- `DATABASE_USER`: Database username
- `DATABASE_PASSWORD`: Database password
- `DATABASE_NAME`: Database name
- `DATABASE_SSL`: Enable SSL connection (`true`/`false`)

### Redis
- `REDIS_HOST`: Redis host (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)
- `REDIS_TTL`: Session TTL in seconds (default: `3600`)

### JWT Configuration
- `JWT_SECRET`: Secret for signing access tokens (min 32 characters)
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens (min 32 characters)
- `JWT_ACCESS_EXPIRY`: Access token expiration (default: `1h`)
- `JWT_REFRESH_EXPIRY`: Refresh token expiration (default: `7d`)

### Google OAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: OAuth callback URL (e.g., `http://localhost:3000/auth/google/callback`)

### Security
- `ENCRYPTION_KEY`: 32-byte key for encrypting OAuth tokens
- `ENCRYPTION_IV`: 16-byte initialization vector for encryption

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: `900000` = 15 min)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: `5` for login)

### CORS
- `CORS_ORIGIN`: Allowed origin for CORS (e.g., `http://localhost:3001`)

## API Documentation

Once the server is running, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api/v1/docs`

The Swagger interface provides:
- Complete endpoint reference with request/response schemas
- Interactive API testing capabilities
- Authentication flow examples
- DTO validation rules

### Main Endpoints

All endpoints are prefixed with `/api/v1`.

**Authentication:**
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user (requires auth)
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user (requires auth)

**Google OAuth:**
- `GET /api/v1/auth/google` - Initiate Google OAuth flow
- `GET /api/v1/auth/google/callback` - OAuth callback
- `GET /api/v1/auth/google/status` - Check connection status (requires auth)
- `POST /api/v1/auth/google/disconnect` - Disconnect calendar (requires auth)
- `GET /api/v1/auth/google/calendars` - List calendars (requires auth)
- `POST /api/v1/auth/google/calendar/select` - Select calendar (requires auth)

**User Management:**
- `GET /api/v1/users/me` - Get user profile (requires auth)
- `PUT /api/v1/users/me` - Update profile (requires auth)
- `DELETE /api/v1/users/me` - Delete account (requires auth)

**Health Check:**
- `GET /api/v1/health` - Service health status

## Project Structure

```
src/
├── auth/               # Authentication module
│   ├── controllers/    # HTTP controllers
│   ├── services/       # Business logic
│   ├── guards/         # Auth guards
│   ├── strategies/     # Passport strategies
│   └── dto/            # Data transfer objects
├── user/               # User management module
├── google-oauth/       # Google OAuth module
├── common/             # Shared utilities
│   ├── decorators/     # Custom decorators
│   ├── guards/         # Global guards
│   ├── filters/        # Exception filters
│   └── middleware/     # Middleware
├── config/             # Configuration module
├── database/           # Database configuration
└── main.ts             # Application entry point
```

## Testing

The project includes comprehensive test coverage:
- **Unit Tests**: 104 tests covering services, controllers, guards, and utilities
- **Integration Tests**: 23 e2e tests covering complete authentication flows
- **Test Coverage**: ~65% code coverage

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run e2e/integration tests
NODE_ENV=test npm run test:e2e

# Generate coverage report
npm run test:cov
```

**Test Database Setup:**
- E2E tests use the same database/Redis as development
- Set `NODE_ENV=test` to disable CSRF protection during testing
- Tests automatically clean up created data after execution

## Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Remove volumes (WARNING: Deletes data)
docker-compose down -v
```

## Security

- Passwords are hashed using bcrypt (12 rounds)
- JWT tokens stored in HTTP-only cookies
- CSRF protection on state-changing routes
- Rate limiting on authentication endpoints (5 attempts)
- Input validation on all endpoints
- SQL injection prevention via TypeORM parameterized queries
- OAuth tokens encrypted at rest

## Contributing

See `CONTRIBUTING.md` for development guidelines.

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
