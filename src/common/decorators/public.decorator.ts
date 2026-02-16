import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator
 * Marks routes that bypass JWT authentication
 * Usage: @Public()
 */
export const Public = () => SetMetadata('isPublic', true);
