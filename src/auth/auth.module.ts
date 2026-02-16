import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { ValidationService } from './services/validation.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../database/redis.module';

/**
 * Authentication Module
 * Handles user authentication, JWT tokens, and validation
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiry', '1h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
    UserModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    ValidationService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, PasswordService, TokenService, ValidationService, JwtAuthGuard],
})
export class AuthModule {}
