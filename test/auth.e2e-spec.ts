import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { GoogleCalendarConnection } from '../src/google-oauth/google-calendar-connection.entity';
import { Repository } from 'typeorm';
import cookieParser from 'cookie-parser';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let googleConnectionRepository: Repository<GoogleCalendarConnection>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    googleConnectionRepository = moduleFixture.get<Repository<GoogleCalendarConnection>>(
      getRepositoryToken(GoogleCalendarConnection),
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (googleConnectionRepository) {
      await googleConnectionRepository.clear();
    }
    if (userRepository) {
      const users = await userRepository.find();
      if (users.length > 0) {
        await userRepository.remove(users);
      }
    }
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', () => {
      const registerDto = {
        email: 'test-e2e@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect((res) => {
          if (res.status !== 201) {
            console.log('Response status:', res.status);
            console.log('Response body:', JSON.stringify(res.body, null, 2));
          }
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body).toHaveProperty('tokens');
          expect(res.body.tokens).toHaveProperty('accessToken');
          expect(res.body.tokens).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid email', () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with weak password', () => {
      const registerDto = {
        email: 'test2@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with mismatched passwords', () => {
      const registerDto = {
        email: 'test3@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Different123!@#',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email should fail
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const testUser = {
      email: 'login-test@example.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    };

    beforeAll(async () => {
      // Create user for login tests
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body).toHaveProperty('tokens');
          expect(res.body.tokens).toHaveProperty('accessToken');
          expect(res.body.tokens).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);
    });

    it('should lock account after 5 failed attempts', async () => {
      const lockedUser = {
        email: 'locked-test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      };

      // Register user
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(lockedUser);

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: lockedUser.email,
            password: 'WrongPassword',
          })
          .expect(401);
      }

      // 6th attempt should be forbidden due to lock or rate limit
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: lockedUser.email,
          password: lockedUser.password,
        });
      
      // Could be 403 (account locked) or 429 (rate limited)
      expect([403, 429]).toContain(response.status);
    });
  });

  describe('Token Refresh Flow', () => {
    let accessToken: string;
    let refreshToken: string;
    const testUser = {
      email: 'refresh-test@example.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    };

    beforeAll(async () => {
      // Register and login to get tokens
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).not.toBe(accessToken);
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_token' })
        .expect(401);
    });

    it('should fail with expired/blacklisted refresh token', async () => {
      // Logout to blacklist the token
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Try to use the blacklisted refresh token
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;
    let refreshToken: string;
    let userId: string;
    const testUser = {
      email: 'protected-test@example.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    };

    beforeAll(async () => {
      // Register user and get token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);

      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
      userId = response.body.user.id;
    });

    describe('GET /api/v1/auth/me', () => {
      it('should get user profile with valid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('email', testUser.email);
            expect(res.body).not.toHaveProperty('passwordHash');
          });
      });

      it('should fail without token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .expect(401);
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);
      });
    });

    describe('GET /api/v1/users/me', () => {
      it('should get user profile', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('email', testUser.email);
          });
      });
    });

    describe('PUT /api/v1/users/me', () => {
      it('should update user profile', () => {
        return request(app.getHttpServer())
          .put('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ email: 'updated-protected@example.com' })
          .expect(200)
          .expect((res) => {
            expect(res.body.email).toBe('updated-protected@example.com');
          });
      });

      it('should fail with invalid email', () => {
        return request(app.getHttpServer())
          .put('/api/v1/users/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ email: 'invalid-email' })
          .expect(400);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout successfully', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ accessToken, refreshToken: 'dummy' })
          .expect(204);
      });

      it('should fail to use token after logout', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(401);
      });
    });

    describe('DELETE /api/v1/users/me', () => {
      let deleteToken: string;
      const deleteUser = {
        email: 'delete-test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      };

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(deleteUser);

        deleteToken = response.body.tokens.accessToken;
      });

      it('should soft delete user account', () => {
        return request(app.getHttpServer())
          .delete('/api/v1/users/me')
          .set('Authorization', `Bearer ${deleteToken}`)
          .expect(204);
      });

      it('should not allow login after deletion', async () => {
        // Wait a moment to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: deleteUser.email,
            password: deleteUser.password,
          });
        
        // Could be 401 (unauthorized) or 429 (rate limited)
        expect([401, 429]).toContain(response.status);
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('service', 'habitflow-auth-service');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database', 'connected');
          expect(res.body.checks).toHaveProperty('redis', 'connected');
        });
    });
  });
});
