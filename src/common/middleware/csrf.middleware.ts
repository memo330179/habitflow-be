import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens on state-changing requests
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokenHeaderName = 'x-csrf-token';
  private readonly tokenCookieName = 'csrf-token';

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF in development for easier integration
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    // Get token from header
    const headerToken = req.headers[this.tokenHeaderName] as string;

    // Get token from cookie
    const cookieToken = req.cookies?.[this.tokenCookieName];

    // Validate tokens match
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }

  /**
   * Generate a CSRF token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
