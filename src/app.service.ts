import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RedisService } from './database/redis.service';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  getWelcome() {
    return {
      name: 'HabitFlow Authentication Service',
      version: '1.0.0',
      description: 'Authentication and User Management API',
      status: 'Phase 1 Complete - Scaffolding ✅',
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/v1/docs (coming soon)',
      },
      phase1_completed: [
        '✅ NestJS project initialized',
        '✅ TypeScript configured with strict mode',
        '✅ All dependencies installed',
        '✅ Docker configuration created',
        '✅ Environment files configured',
        '✅ Git repository initialized',
      ],
      next_phase: 'Phase 2 - Project Structure & Modules',
    };
  }

  async checkHealth() {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
    };

    // Check database connection
    try {
      await this.connection.query('SELECT 1');
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
    }

    // Check Redis connection
    try {
      await this.redisService.set('health:check', 'ok', 5);
      const result = await this.redisService.get('health:check');
      checks.redis = result === 'ok' ? 'connected' : 'disconnected';
    } catch (error) {
      checks.redis = 'disconnected';
    }

    const allHealthy = checks.database === 'connected' && checks.redis === 'connected';

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'habitflow-auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}
