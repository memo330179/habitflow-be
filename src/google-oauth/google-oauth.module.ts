import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleOAuthController } from './controllers/google-oauth.controller';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';

/**
 * Google OAuth Module
 * Handles Google Calendar OAuth integration
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'google' }),
    TypeOrmModule.forFeature([GoogleCalendarConnection]),
    ConfigModule,
  ],
  controllers: [GoogleOAuthController],
  providers: [GoogleOAuthService, GoogleStrategy, GoogleOAuthGuard],
  exports: [GoogleOAuthService],
})
export class GoogleOAuthModule {}
