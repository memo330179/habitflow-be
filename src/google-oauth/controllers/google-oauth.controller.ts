import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../user/user.entity';
import { SelectCalendarDto } from '../dto/select-calendar.dto';

/**
 * Google OAuth Controller
 * Handles Google Calendar OAuth integration
 */
@ApiTags('google-oauth')
@Controller('auth/google')
export class GoogleOAuthController {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  /**
   * Initiate Google OAuth flow
   * GET /auth/google
   */
  @Get()
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Handle Google OAuth callback
   * GET /auth/google/callback
   */
  @Get('callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects after OAuth' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // User is attached by GoogleOAuthGuard
    // const googleUser = req.user as any;

    // In a real implementation, you would:
    // 1. Find or create user based on googleUser.email
    // 2. Handle the OAuth callback with the authorization code
    // 3. Redirect to frontend with success/error

    res.redirect('/auth/google/success');
  }

  /**
   * Get Google Calendar connection status
   * GET /auth/google/status
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Google Calendar connection status' })
  @ApiResponse({ status: 200, description: 'Connection status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConnectionStatus(@CurrentUser() user: User) {
    const connection = await this.googleOAuthService.getConnectionStatus(user.id);

    return {
      connected: !!connection,
      connectedAt: connection?.connectedAt,
      selectedCalendarId: connection?.selectedCalendarId,
      lastSyncAt: connection?.lastSyncAt,
    };
  }

  /**
   * Disconnect Google Calendar
   * POST /auth/google/disconnect
   */
  @UseGuards(JwtAuthGuard)
  @Post('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  @ApiResponse({ status: 204, description: 'Disconnected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disconnect(@CurrentUser() user: User): Promise<void> {
    await this.googleOAuthService.disconnect(user.id);
  }

  /**
   * List available calendars
   * GET /auth/google/calendars
   */
  @UseGuards(JwtAuthGuard)
  @Get('calendars')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List available Google Calendars' })
  @ApiResponse({ status: 200, description: 'Calendars retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Not connected to Google Calendar' })
  async listCalendars(@CurrentUser() user: User) {
    return this.googleOAuthService.listCalendars(user.id);
  }

  /**
   * Select a calendar for habit tracking
   * POST /auth/google/calendar/select
   */
  @UseGuards(JwtAuthGuard)
  @Post('calendar/select')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Select a calendar for habit tracking' })
  @ApiBody({ type: SelectCalendarDto })
  @ApiResponse({ status: 200, description: 'Calendar selected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Not connected to Google Calendar' })
  async selectCalendar(@CurrentUser() user: User, @Body() selectCalendarDto: SelectCalendarDto) {
    await this.googleOAuthService.selectCalendar(user.id, selectCalendarDto.calendarId);

    return {
      message: 'Calendar selected successfully',
      calendarId: selectCalendarDto.calendarId,
    };
  }
}
