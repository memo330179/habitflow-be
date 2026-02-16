import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * Google OAuth2 Strategy
 * Handles Google OAuth authentication flow
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId'),
      clientSecret: configService.get<string>('google.clientSecret'),
      callbackURL: configService.get<string>('google.redirectUri'),
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validate Google OAuth response
   * Called automatically by Passport after successful OAuth
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      displayName,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
