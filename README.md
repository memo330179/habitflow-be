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
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings
- `JWT_SECRET`: Secret for signing JWT access tokens
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

## API Documentation

Once the server is running, API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api/docs`

### Main Endpoints

**Authentication:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

**Google OAuth:**
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/google/status` - Check connection status
- `POST /auth/google/disconnect` - Disconnect calendar
- `GET /auth/google/calendars` - List calendars
- `POST /auth/google/calendar/select` - Select calendar

**User Management:**
- `GET /users/me` - Get user profile
- `PUT /users/me` - Update profile
- `DELETE /users/me` - Delete account

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

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

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
