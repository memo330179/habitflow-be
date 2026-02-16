import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModuleSetup } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './database/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GoogleOAuthModule } from './google-oauth/google-oauth.module';
import { HabitModule } from './habit/habit.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModuleSetup,

    // Database
    DatabaseModule,
    RedisModule,

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute per IP
      },
    ]),

    // Feature Modules
    AuthModule,
    UserModule,
    GoogleOAuthModule,
    HabitModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Auth Guard (can be bypassed with @Public decorator)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply CSRF protection to all routes except GET/HEAD/OPTIONS
    // Skip CSRF in test environment
    if (process.env.NODE_ENV !== 'test') {
      consumer.apply(CsrfMiddleware).forRoutes('*');
    }
  }
}
