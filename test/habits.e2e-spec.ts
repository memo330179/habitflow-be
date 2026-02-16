import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { Habit } from '../src/habit/entities/habit.entity';
import { HabitCompletion } from '../src/habit/entities/habit-completion.entity';
import { HabitStreak } from '../src/habit/entities/habit-streak.entity';
import { Repository } from 'typeorm';
import cookieParser from 'cookie-parser';

describe('Habit Management (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let habitRepository: Repository<Habit>;
  let completionRepository: Repository<HabitCompletion>;
  let streakRepository: Repository<HabitStreak>;
  
  let accessToken: string;
  let testUserId: string;
  let testHabitId: string;
  let testCompletionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
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

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    habitRepository = moduleFixture.get<Repository<Habit>>(getRepositoryToken(Habit));
    completionRepository = moduleFixture.get<Repository<HabitCompletion>>(getRepositoryToken(HabitCompletion));
    streakRepository = moduleFixture.get<Repository<HabitStreak>>(getRepositoryToken(HabitStreak));

    // Create test user and get access token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'habit-test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
      });

    accessToken = registerResponse.body.tokens?.accessToken;
    testUserId = registerResponse.body.user?.id;
  });

  afterAll(async () => {
    // Clean up in correct order (foreign key constraints)
    if (completionRepository) {
      await completionRepository.delete({});
    }
    if (streakRepository) {
      await streakRepository.delete({});
    }
    if (habitRepository) {
      await habitRepository.delete({});
    }
    if (userRepository && testUserId) {
      await userRepository.delete({ id: testUserId });
    }
    await app.close();
  });

  describe('Habit CRUD Operations', () => {
    describe('POST /api/v1/habits', () => {
      it('should create a daily habit', async () => {
        const createDto = {
          name: 'Morning Meditation',
          description: 'Daily meditation practice',
          frequencyType: 'DAILY',
          frequencyDetails: { time: '07:00' },
          durationMinutes: 15,
          timezone: 'America/New_York',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/habits')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(createDto.name);
        expect(response.body.frequencyType).toBe('DAILY');
        expect(response.body.status).toBe('ACTIVE');
        
        testHabitId = response.body.id;
      });

      it('should create a weekly habit', async () => {
        const createDto = {
          name: 'Gym Workout',
          frequencyType: 'WEEKLY',
          frequencyDetails: { days: [1, 3, 5], time: '18:00' },
          durationMinutes: 60,
          timezone: 'America/New_York',
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/habits')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto)
          .expect(201);

        expect(response.body.frequencyType).toBe('WEEKLY');
        expect(response.body.frequencyDetails.days).toEqual([1, 3, 5]);
      });

      it('should fail without authentication', async () => {
        const createDto = {
          name: 'Test Habit',
          frequencyType: 'DAILY',
          frequencyDetails: { time: '09:00' },
          timezone: 'UTC',
        };

        await request(app.getHttpServer())
          .post('/api/v1/habits')
          .send(createDto)
          .expect(401);
      });

      it('should fail with invalid frequency type', async () => {
        const createDto = {
          name: 'Invalid Habit',
          frequencyType: 'INVALID',
          frequencyDetails: { time: '09:00' },
          timezone: 'UTC',
        };

        await request(app.getHttpServer())
          .post('/api/v1/habits')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto)
          .expect(400);
      });

      it('should fail with empty name', async () => {
        const createDto = {
          name: '',
          frequencyType: 'DAILY',
          frequencyDetails: { time: '09:00' },
          timezone: 'UTC',
        };

        await request(app.getHttpServer())
          .post('/api/v1/habits')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto)
          .expect(400);
      });
    });

    describe('GET /api/v1/habits', () => {
      it('should return user habits', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/habits')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('habits');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(Array.isArray(response.body.habits)).toBe(true);
        expect(response.body.habits.length).toBeGreaterThan(0);
      });

      it('should filter habits by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/habits')
          .query({ status: 'ACTIVE' })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        for (const habit of response.body.habits) {
          expect(habit.status).toBe('ACTIVE');
        }
      });

      it('should filter habits by frequency type', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/habits')
          .query({ frequencyType: 'DAILY' })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        for (const habit of response.body.habits) {
          expect(habit.frequencyType).toBe('DAILY');
        }
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/habits')
          .query({ page: 1, pageSize: 1 })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.habits.length).toBeLessThanOrEqual(1);
        expect(response.body.page).toBe(1);
        expect(response.body.pageSize).toBe(1);
      });
    });

    describe('GET /api/v1/habits/:id', () => {
      it('should return a specific habit', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/habits/${testHabitId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.id).toBe(testHabitId);
        expect(response.body.name).toBe('Morning Meditation');
      });

      it('should return 404 for non-existent habit', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/habits/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });

      it('should include streak information', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/habits/${testHabitId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('streak');
        expect(response.body.streak).toHaveProperty('currentStreak');
        expect(response.body.streak).toHaveProperty('longestStreak');
        expect(response.body.streak).toHaveProperty('totalCompletions');
      });
    });

    describe('PATCH /api/v1/habits/:id', () => {
      it('should update habit name', async () => {
        const updateDto = {
          name: 'Updated Meditation',
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/habits/${testHabitId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.name).toBe('Updated Meditation');
      });

      it('should update habit frequency', async () => {
        const updateDto = {
          frequencyType: 'WEEKLY',
          frequencyDetails: { days: [0, 2, 4, 6], time: '08:00' },
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v1/habits/${testHabitId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.frequencyType).toBe('WEEKLY');
        expect(response.body.frequencyDetails.days).toEqual([0, 2, 4, 6]);
      });
    });

    describe('POST /api/v1/habits/:id/pause', () => {
      it('should pause an active habit', async () => {
        // First reset to active
        await request(app.getHttpServer())
          .patch(`/api/v1/habits/${testHabitId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'ACTIVE' });

        const response = await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/pause`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.status).toBe('PAUSED');
        expect(response.body.nextOccurrenceAt).toBeNull();
      });
    });

    describe('POST /api/v1/habits/:id/resume', () => {
      it('should resume a paused habit', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/resume`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.status).toBe('ACTIVE');
        expect(response.body.nextOccurrenceAt).not.toBeNull();
      });
    });
  });

  describe('Habit Completions', () => {
    describe('POST /api/v1/habits/:habitId/completions', () => {
      it('should mark habit as complete', async () => {
        const today = new Date().toISOString().split('T')[0];
        const createCompletionDto = {
          scheduledFor: today,
          notes: 'Great session today!',
        };

        const response = await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/completions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createCompletionDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.habitId).toBe(testHabitId);
        expect(response.body.notes).toBe('Great session today!');
        
        testCompletionId = response.body.id;
      });

      it('should fail to complete same date twice', async () => {
        const today = new Date().toISOString().split('T')[0];
        const createCompletionDto = {
          scheduledFor: today,
        };

        await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/completions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createCompletionDto)
          .expect(409); // Conflict
      });

      it('should fail to complete for future date', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const createCompletionDto = {
          scheduledFor: futureDate.toISOString().split('T')[0],
        };

        await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/completions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createCompletionDto)
          .expect(400);
      });
    });

    describe('GET /api/v1/habits/:habitId/completions', () => {
      it('should return completions for a habit', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/habits/${testHabitId}/completions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('completedAt');
      });
    });

    describe('GET /api/v1/completions/today', () => {
      it('should return today schedule', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/completions/today')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('date');
        expect(response.body).toHaveProperty('habits');
        expect(response.body).toHaveProperty('summary');
        expect(response.body.summary).toHaveProperty('total');
        expect(response.body.summary).toHaveProperty('completed');
        expect(response.body.summary).toHaveProperty('pending');
      });
    });

    describe('POST /api/v1/completions/:completionId/undo', () => {
      it('should undo a completion', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/completions/${testCompletionId}/undo`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verify it was undone by trying to complete again
        const today = new Date().toISOString().split('T')[0];
        const response = await request(app.getHttpServer())
          .post(`/api/v1/habits/${testHabitId}/completions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ scheduledFor: today })
          .expect(201);

        testCompletionId = response.body.id;
      });

      it('should fail to undo already undone completion', async () => {
        // First undo
        await request(app.getHttpServer())
          .post(`/api/v1/completions/${testCompletionId}/undo`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Try to undo again
        await request(app.getHttpServer())
          .post(`/api/v1/completions/${testCompletionId}/undo`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });
    });
  });

  describe('DELETE /api/v1/habits/:id', () => {
    it('should delete a habit', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/habits/${testHabitId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/api/v1/habits/${testHabitId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
