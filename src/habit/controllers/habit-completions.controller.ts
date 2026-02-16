import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { HabitCompletionService } from '../services/habit-completion.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../user/user.entity';
import {
  CreateCompletionDto,
  CompletionResponseDto,
  UndoCompletionDto,
  TodayScheduleResponseDto,
} from '../dto';

/**
 * Habit Completions Controller
 * Handles completion tracking operations
 */
@ApiTags('completions')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HabitCompletionsController {
  constructor(private readonly habitCompletionService: HabitCompletionService) {}

  /**
   * Mark habit as complete for a date
   * POST /habits/:habitId/completions
   */
  @Post('habits/:habitId/completions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark habit as complete' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiBody({ type: CreateCompletionDto })
  @ApiResponse({ status: 201, description: 'Completion recorded successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or future date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  @ApiResponse({ status: 409, description: 'Conflict - already completed for this date' })
  async markCompletion(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
    @Body() createCompletionDto: CreateCompletionDto,
  ): Promise<CompletionResponseDto> {
    const completion = await this.habitCompletionService.markComplete(
      habitId,
      user.id,
      createCompletionDto,
    );
    return CompletionResponseDto.fromEntity(completion);
  }

  /**
   * Undo a completion (within 24 hour window)
   * POST /completions/:completionId/undo
   */
  @Post('completions/:completionId/undo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo a completion (within 24 hours)' })
  @ApiParam({ name: 'completionId', type: String, format: 'uuid' })
  @ApiBody({ type: UndoCompletionDto, required: false })
  @ApiResponse({ status: 200, description: 'Completion undone successfully' })
  @ApiResponse({ status: 400, description: 'Undo window expired or already undone' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Completion not found' })
  async undoCompletion(
    @CurrentUser() user: User,
    @Param('completionId', ParseUUIDPipe) completionId: string,
    @Body() undoCompletionDto?: UndoCompletionDto,
  ): Promise<{ success: boolean }> {
    await this.habitCompletionService.undoCompletion(completionId, user.id);
    return { success: true };
  }

  /**
   * Get completions for a specific habit
   * GET /habits/:habitId/completions
   */
  @Get('habits/:habitId/completions')
  @ApiOperation({ summary: 'Get completions for a habit' })
  @ApiParam({ name: 'habitId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Completions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  async getCompletionsByHabit(
    @CurrentUser() user: User,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<CompletionResponseDto[]> {
    const completions = await this.habitCompletionService.getCompletionsByHabit(
      habitId,
      user.id,
    );
    return completions.map((c) => CompletionResponseDto.fromEntity(c));
  }

  /**
   * Get today's scheduled habits with completion status
   * GET /completions/today
   */
  @Get('completions/today')
  @ApiOperation({ summary: 'Get today\'s scheduled habits with status' })
  @ApiResponse({ status: 200, description: 'Today schedule retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTodayScheduledHabits(
    @CurrentUser() user: User,
  ): Promise<TodayScheduleResponseDto> {
    return this.habitCompletionService.getTodayScheduledHabits(user.id);
  }
}
