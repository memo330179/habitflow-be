import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'change_this_secret_key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));
