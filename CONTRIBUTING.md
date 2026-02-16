# Contributing to HabitFlow Authentication Service

Thank you for considering contributing to the HabitFlow Authentication Service! This document outlines the development workflow, coding standards, and best practices.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)

## Getting Started

1. **Fork the repository** and clone your fork locally
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env` and configure
4. **Start services**: `docker-compose up` (recommended) or run PostgreSQL/Redis locally
5. **Run migrations**: `npm run migration:run`
6. **Start development server**: `npm run start:dev`

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features (e.g., `feature/add-password-reset`)
- `fix/*`: Bug fixes (e.g., `fix/login-rate-limit`)
- `refactor/*`: Code refactoring without behavior changes
- `test/*`: Test improvements or additions

### Creating a Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

## Code Style Guidelines

### TypeScript Standards
- **Use TypeScript strict mode** - No `any` types unless absolutely necessary
- **Explicit return types** on all public methods and functions
- **Interface over type** for object shapes
- **Prefer const** over let when variables don't need reassignment

### Naming Conventions
- **Classes**: PascalCase (`UserService`, `AuthController`)
- **Interfaces**: PascalCase with descriptive names (`UserEntity`, `JwtPayload`)
- **Functions/Methods**: camelCase (`getUserById`, `validateToken`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`, `DEFAULT_PAGE_SIZE`)
- **Files**: kebab-case (`auth.service.ts`, `user.controller.ts`)
- **Test files**: Match source file with `.spec.ts` or `.e2e-spec.ts` suffix

### NestJS Conventions
- **Modules**: Group related functionality (auth, user, google-oauth)
- **Controllers**: Thin layer, delegate business logic to services
- **Services**: Business logic and data access
- **DTOs**: Validation with `class-validator` decorators
- **Guards**: Authorization and authentication checks
- **Interceptors**: Cross-cutting concerns (logging, transformation)
- **Pipes**: Data transformation and validation

### Code Organization
```typescript
// 1. Imports (external, then internal)
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

// 2. Decorators and class declaration
@Injectable()
export class UserService {
  // 3. Properties (private first, then public)
  private readonly logger = new Logger(UserService.name);

  // 4. Constructor
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  // 5. Public methods
  async findById(id: string): Promise<UserEntity> {
    // Implementation
  }

  // 6. Private methods
  private async hashPassword(password: string): Promise<string> {
    // Implementation
  }
}
```

### Documentation
- **JSDoc comments** for all public methods, complex logic, and non-obvious code
- **Inline comments** for clarifying intent, not describing what code does
- **README updates** when adding new features or changing configuration

### Code Quality
- **Run linter**: `npm run lint` before committing
- **Format code**: `npm run format` (Prettier)
- **No console.logs** in production code (use Logger from `@nestjs/common`)
- **Error handling**: Always handle errors gracefully, use proper HTTP status codes

## Testing Requirements

### Test Coverage Requirements
- **Minimum 60% overall coverage** (aim for 80%+)
- **All new features** must include tests
- **Bug fixes** should include regression tests

### Unit Tests
- **Location**: Co-located with source files (`*.spec.ts`)
- **Naming**: `describe('ClassName', () => { it('should behavior', () => {}) })`
- **Coverage**: Services, controllers, guards, pipes, utilities
- **Mocking**: Use Jest mocks for external dependencies

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockRepository<UserEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password on registration', async () => {
    // Test implementation
  });
});
```

### Integration Tests (E2E)
- **Location**: `test/*.e2e-spec.ts`
- **Purpose**: Test complete API flows end-to-end
- **Run with**: `NODE_ENV=test npm run test:e2e`
- **Requirements**: All authentication flows must have e2e tests

### Running Tests
```bash
# Unit tests
npm run test

# Watch mode (for TDD)
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
NODE_ENV=test npm run test:e2e

# Specific test file
npm run test -- auth.service.spec.ts
```

### Test Best Practices
- **AAA Pattern**: Arrange, Act, Assert
- **One assertion per test** (when possible)
- **Descriptive test names**: `it('should return 401 when password is incorrect')`
- **Test edge cases**: empty inputs, null values, boundary conditions
- **Clean up**: Reset mocks, close connections in `afterEach`/`afterAll`

## Git Workflow

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature or bug fix)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)
- `perf`: Performance improvements

**Examples:**
```
feat(auth): add password reset functionality

Implements password reset with email verification.
Includes new endpoints, email service integration, and tests.

Closes #42
```

```
fix(user): prevent duplicate email registration

Added unique constraint check before user creation.
Returns 409 Conflict when email already exists.
```

### Pre-Commit Checklist
- [ ] Code compiles without errors: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] All tests pass: `npm run test`
- [ ] Code formatted: `npm run format`
- [ ] No console.log statements in code
- [ ] Environment variables documented in `.env.example`
- [ ] Commit message follows conventional commits

### Keeping Your Branch Updated
```bash
# Update your local develop branch
git checkout develop
git pull origin develop

# Rebase your feature branch
git checkout feature/your-feature
git rebase develop

# Resolve conflicts if any, then continue
git add .
git rebase --continue
```

## Pull Request Process

### Before Creating a PR
1. **Ensure all tests pass** locally
2. **Run linter and formatter**
3. **Update documentation** if needed
4. **Rebase on latest develop** branch
5. **Test in Docker** environment: `docker-compose up --build`

### PR Guidelines
- **Title**: Use conventional commit format (e.g., `feat(auth): add 2FA support`)
- **Description**: Explain what, why, and how
  - **What**: Summary of changes
  - **Why**: Motivation and context
  - **How**: Technical approach (if non-obvious)
  - **Testing**: How to test the changes
  - **Screenshots**: For UI changes
- **Link issues**: Reference related issues (e.g., `Closes #123`)
- **Small PRs**: Keep changes focused and reviewable (<400 lines when possible)

### PR Template
```markdown
## Description
Brief description of the changes

## Motivation
Why is this change needed?

## Changes
- Added X
- Modified Y
- Removed Z

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linter passes
- [ ] All tests pass
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

### Code Review Process
- **At least 1 approval** required before merging
- **Address all comments** or explain why they're not applicable
- **CI/CD must pass** (linting, tests, build)
- **No merge conflicts** with target branch

### After PR Approval
1. **Squash and merge** to keep clean history (unless preserving commits is important)
2. **Delete feature branch** after merging
3. **Update related issues** with PR link

## Development Environment Setup

### Recommended VS Code Extensions
- **ESLint**: Linting support
- **Prettier**: Code formatting
- **TypeScript**: Enhanced TS support
- **Jest**: Test runner integration
- **REST Client**: API testing (alternative to Postman)
- **Docker**: Container management

### Debugging
Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:dev"],
      "console": "integratedTerminal",
      "restart": true
    }
  ]
}
```

## Database Migrations

### Creating Migrations
```bash
# Make entity changes
# Generate migration automatically
npm run migration:generate -- src/database/migrations/MigrationName

# Review generated migration
# Run migration
npm run migration:run
```

### Migration Best Practices
- **Descriptive names**: `AddPasswordResetTokenToUser`
- **Test rollback**: Ensure `down()` method works correctly
- **Data migrations**: Handle existing data carefully
- **Never edit** applied migrations (create new ones instead)

## Security Considerations

### Sensitive Data
- **Never commit** secrets, API keys, or passwords
- **Use environment variables** for configuration
- **Add to .gitignore**: `.env`, credentials files
- **Rotate secrets** if accidentally committed (and report immediately)

### Security Best Practices
- **Validate all inputs** with class-validator DTOs
- **Sanitize outputs** to prevent XSS
- **Use parameterized queries** (TypeORM handles this)
- **Rate limiting** on authentication endpoints
- **HTTPS only** in production
- **Keep dependencies updated**: `npm audit` regularly

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check README.md and inline code comments
- **Swagger**: `http://localhost:3000/api/v1/docs` for API reference

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
